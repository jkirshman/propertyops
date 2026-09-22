import { describe, expect, it, vi } from "vitest";

import { handleForgotPasswordRequest, type ScheduleAfterResponse } from "./forgot-password-handler";
import { FORGOT_PASSWORD_RESPONSE } from "./password-reset-messages";

function postRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://propertyops.lawassetgroup.com/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

/** Captures scheduled tasks instead of running them, the way after() defers them past the response. */
function captureSchedule() {
  const tasks: (() => Promise<void>)[] = [];
  const schedule: ScheduleAfterResponse = vi.fn((task) => {
    tasks.push(task);
  });
  return { schedule, tasks, runAll: () => Promise.all(tasks.map((task) => task())) };
}

async function snapshot(response: Response) {
  return {
    status: response.status,
    contentType: response.headers.get("content-type"),
    body: await response.text(),
  };
}

describe("handleForgotPasswordRequest", () => {
  it("runs reset processing only through the injected post-response scheduler", async () => {
    const { schedule, tasks, runAll } = captureSchedule();
    const process = vi.fn(async () => "email_sent");

    const response = await handleForgotPasswordRequest(
      postRequest({ email: " Active@Example.com " }, { "x-forwarded-for": "203.0.113.7, 10.0.0.1" }),
      { schedule, process },
    );

    expect(schedule).toHaveBeenCalledTimes(1);
    expect(tasks).toHaveLength(1);
    // Nothing runs until the scheduled task executes.
    expect(process).not.toHaveBeenCalled();
    expect(response.status).toBe(200);

    await runAll();
    expect(process).toHaveBeenCalledWith({ email: "active@example.com", clientIp: "203.0.113.7" });
  });

  it("returns the response without waiting for processing to finish", async () => {
    const { schedule, runAll } = captureSchedule();
    let release!: () => void;
    const process = vi.fn(() => new Promise<void>((resolve) => (release = resolve)));

    const response = await handleForgotPasswordRequest(postRequest({ email: "a@example.com" }), { schedule, process });
    expect(await response.json()).toEqual(FORGOT_PASSWORD_RESPONSE);

    const settled = runAll();
    release();
    await settled;
  });

  it("returns a byte-identical response for every account outcome", async () => {
    const outcomes = ["email_sent", "no_account", "inactive", "pending_activation", "rate_limited", "email_not_sent"];
    const snapshots = [];
    for (const [index, outcome] of outcomes.entries()) {
      const { schedule, runAll } = captureSchedule();
      const response = await handleForgotPasswordRequest(postRequest({ email: `user${index}@example.com` }), {
        schedule,
        process: async () => outcome,
      });
      await runAll();
      snapshots.push(await snapshot(response));
    }

    for (const current of snapshots) {
      expect(current).toEqual(snapshots[0]);
    }
    expect(snapshots[0]).toEqual({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(FORGOT_PASSWORD_RESPONSE),
    });
  });

  it("a processing failure is contained and never logs the email", async () => {
    const { schedule, runAll } = captureSchedule();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await handleForgotPasswordRequest(postRequest({ email: "secret@example.com" }), {
      schedule,
      process: async () => {
        throw new Error("db down for secret@example.com");
      },
    });

    await expect(runAll()).resolves.toBeDefined();
    expect(await response.json()).toEqual(FORGOT_PASSWORD_RESPONSE);
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("secret@example.com");
    errorSpy.mockRestore();
  });

  it("malformed input is rejected without scheduling any work", async () => {
    const { schedule } = captureSchedule();
    const process = vi.fn();
    const response = await handleForgotPasswordRequest(postRequest({ email: "not-an-email" }), { schedule, process });
    expect(response.status).toBe(400);
    expect(schedule).not.toHaveBeenCalled();
  });
});
