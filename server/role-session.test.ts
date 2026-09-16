import { afterEach, describe, expect, it } from "vitest";
import { createRoleSession, readRoleSession } from "./_core/cookies";

describe("role sessions", () => {
  it("round-trips a signed role session", () => {
    process.env.JWT_SECRET = "a".repeat(32);
    const token = createRoleSession("finance", "Finance");
    expect(readRoleSession(token)).toMatchObject({ role: "finance", department: "Finance" });
  });

  it("uses the server-only Forge key when JWT_SECRET is unavailable", () => {
    delete process.env.JWT_SECRET;
    process.env.BUILT_IN_FORGE_API_KEY = "b".repeat(32);
    const token = createRoleSession("library", "Library");
    expect(readRoleSession(token)).toMatchObject({ role: "library", department: "Library" });
  });

  it("uses the server-only database URL when other signing keys are unavailable", () => {
    delete process.env.JWT_SECRET;
    delete process.env.BUILT_IN_FORGE_API_KEY;
    process.env.DATABASE_URL = "mysql://server:password@db.example/app";
    const token = createRoleSession("finance", "Finance");
    expect(readRoleSession(token)).toMatchObject({ role: "finance", department: "Finance" });
  });

  it("rejects tampered sessions", () => {
    process.env.JWT_SECRET = "a".repeat(32);
    const token = createRoleSession("finance", "Finance");
    const [payload] = token.split(".");
    expect(readRoleSession(`${payload}.tampered`)).toBeNull();
  });

  it("rejects malformed sessions", () => {
    process.env.JWT_SECRET = "a".repeat(32);
    expect(readRoleSession("not-a-session")).toBeNull();
    expect(readRoleSession(undefined)).toBeNull();
  });
});

afterEach(() => {
  delete process.env.JWT_SECRET;
  delete process.env.BUILT_IN_FORGE_API_KEY;
  delete process.env.DATABASE_URL;
});
