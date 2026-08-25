import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";
import { validateDepartmentPasscode } from "./db";
import { sdk } from "./_core/sdk";
import { getSessionCookieOptions } from "./_core/cookies";

type CookieCall = { name: string; options: Record<string, unknown> };
type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];
  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "local-passcode",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: (name: string, options: Record<string, unknown>) => clearedCookies.push({ name, options }) } as TrpcContext["res"],
  };
  return { ctx, clearedCookies };
}

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({ maxAge: -1, secure: false, sameSite: "lax", httpOnly: true, path: "/" });
  });

  it("accepts seeded demo passcodes even when the database is unavailable", async () => {
    await expect(validateDepartmentPasscode("superadminkabianga2026")).resolves.toMatchObject({
      role: "super_admin",
      department: "Super Admin",
    });
  });

  it("creates local session tokens without external auth env config", async () => {
    const token = await sdk.createSessionToken("local:test-user", {
      role: "super_admin",
      department: "Super Admin",
      name: "Test Admin",
    });

    expect(token).toEqual(expect.any(String));
    expect(token.length).toBeGreaterThan(20);
  });

  it("uses browser-safe cookies on localhost development", () => {
    const options = getSessionCookieOptions({ protocol: "http", headers: {}, hostname: "localhost" } as any);

    expect(options.sameSite).toBe("lax");
    expect(options.secure).toBe(false);
  });
});
