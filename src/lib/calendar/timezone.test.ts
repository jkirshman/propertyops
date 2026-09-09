import { describe, expect, it } from "vitest";

import {
  formatDateOnly,
  getTimezoneOffsetMinutes,
  isDateOnlyValue,
  todayInTimezone,
  utcToZonedInputValue,
  zonedTimeToUtc,
} from "./timezone";

describe("isDateOnlyValue", () => {
  it("recognizes a plain calendar date", () => {
    expect(isDateOnlyValue("2026-09-10")).toBe(true);
  });

  it("rejects a full ISO timestamp", () => {
    expect(isDateOnlyValue("2026-09-10T14:00:00.000Z")).toBe(false);
  });
});

describe("todayInTimezone", () => {
  it("resolves the calendar date for America/Detroit near a UTC day boundary", () => {
    // 2026-09-10 02:00 UTC is still 2026-09-09 evening in America/Detroit (UTC-4 in September).
    const now = new Date("2026-09-10T02:00:00.000Z");
    expect(todayInTimezone("America/Detroit", now)).toBe("2026-09-09");
  });

  it("resolves the calendar date directly for UTC", () => {
    const now = new Date("2026-09-10T02:00:00.000Z");
    expect(todayInTimezone("UTC", now)).toBe("2026-09-10");
  });
});

describe("formatDateOnly", () => {
  it("never shifts the calendar day regardless of host timezone", () => {
    expect(formatDateOnly("2026-01-01")).toBe("Jan 1, 2026");
    expect(formatDateOnly("2026-12-31")).toBe("Dec 31, 2026");
  });
});

describe("getTimezoneOffsetMinutes", () => {
  it("returns 0 for UTC", () => {
    expect(getTimezoneOffsetMinutes(new Date("2026-09-10T12:00:00.000Z"), "UTC")).toBe(0);
  });

  it("returns -240 for America/Detroit during EDT (September)", () => {
    expect(getTimezoneOffsetMinutes(new Date("2026-09-10T12:00:00.000Z"), "America/Detroit")).toBe(-240);
  });

  it("returns -300 for America/Detroit during EST (January)", () => {
    expect(getTimezoneOffsetMinutes(new Date("2026-01-10T12:00:00.000Z"), "America/Detroit")).toBe(-300);
  });
});

describe("zonedTimeToUtc", () => {
  it("converts a Detroit wall-clock time to the correct UTC instant (EDT, UTC-4)", () => {
    const utc = zonedTimeToUtc("2026-09-10T14:00", "America/Detroit");
    expect(utc.toISOString()).toBe("2026-09-10T18:00:00.000Z");
  });

  it("converts a Detroit wall-clock time to the correct UTC instant (EST, UTC-5)", () => {
    const utc = zonedTimeToUtc("2026-01-10T14:00", "America/Detroit");
    expect(utc.toISOString()).toBe("2026-01-10T19:00:00.000Z");
  });

  it("round-trips through utcToZonedInputValue", () => {
    const original = "2026-09-10T14:00";
    const utc = zonedTimeToUtc(original, "America/Detroit");
    expect(utcToZonedInputValue(utc.toISOString(), "America/Detroit")).toBe(original);
  });
});
