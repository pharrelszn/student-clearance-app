import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { parse as parseCookieHeader } from "cookie";
import { ROLE_SESSION_COOKIE, readRoleSession } from "./cookies";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  userRole?: string | null;
  userDepartment?: string | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  const roleSession = readRoleSession(parseCookieHeader(opts.req.headers.cookie ?? "")[ROLE_SESSION_COOKIE]);
  const userRole = roleSession?.role ?? null;
  const userDepartment = roleSession?.department ?? null;
  const passcodeUser: User | null = roleSession
    ? {
        id: 0,
        openId: `passcode:${roleSession.role}`,
        name: roleSession.department,
        email: null,
        loginMethod: "passcode",
        role: roleSession.role === "super_admin" ? "admin" : "user",
        department: roleSession.role,
        createdAt: new Date(0),
        updatedAt: new Date(0),
        lastSignedIn: new Date(),
      }
    : null;

  return {
    req: opts.req,
    res: opts.res,
    user: user ?? passcodeUser,
    userRole,
    userDepartment,
  };
}
