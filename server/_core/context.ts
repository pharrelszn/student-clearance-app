import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { authenticateLocalRequest } from "./localAuth";

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
  let userRole: string | null = null;
  let userDepartment: string | null = null;

  try {
    user = await authenticateLocalRequest(opts.req);
    if (user) {
      userRole = user.department === "Super Admin" ? "super_admin" : user.department?.toLowerCase() ?? user.role;
      userDepartment = user.department;
    }
  } catch (error) {
    console.warn("[Auth] Local session validation failed", error);
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    userRole,
    userDepartment,
  };
}
