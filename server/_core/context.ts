import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

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

  // Extract role and department from cookies
  const cookies = opts.req.headers.cookie || '';
  const userRoleMatch = cookies.match(/userRole=([^;]+)/);
  const userDepartmentMatch = cookies.match(/userDepartment=([^;]+)/);
  
  const userRole = userRoleMatch ? decodeURIComponent(userRoleMatch[1]) : null;
  const userDepartment = userDepartmentMatch ? decodeURIComponent(userDepartmentMatch[1]) : null;

  return {
    req: opts.req,
    res: opts.res,
    user,
    userRole,
    userDepartment,
  };
}
