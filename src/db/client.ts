import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

// Used only when DATABASE_URL is unset outside production (local dev without a
// provisioned database yet, CI, `next build`). Constructing the client does not
// open a network connection, so this never masks a real, reachable database.
const FALLBACK_LOCAL_CONNECTION_STRING = "postgres://user:password@localhost:5432/propertyops";

function resolveConnectionString(): string {
  const url = process.env.DATABASE_URL;
  if (url) {
    return url;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL must be set in production.");
  }

  return FALLBACK_LOCAL_CONNECTION_STRING;
}

function createDb() {
  return drizzle(neon(resolveConnectionString()), { schema });
}

type Db = ReturnType<typeof createDb>;

let instance: Db | undefined;

function getInstance(): Db {
  if (!instance) {
    instance = createDb();
  }
  return instance;
}

// Lazily constructed on first real query, not at module import time. `next build`
// imports every route module to collect its config without calling anything in
// it, so an eager construction here would run the production DATABASE_URL check
// during build rather than at actual request time.
export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    return Reflect.get(getInstance(), prop, receiver);
  },
});
