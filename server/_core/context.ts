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

  return {
    req: opts.req,
    res: opts.res,
    user,
    userRole,
    userDepartment,
  };
}
