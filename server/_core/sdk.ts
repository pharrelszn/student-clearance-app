import { COOKIE_NAME } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

export type SessionPayload = {
  openId: string;
  role: string;
  department: string;
  name: string;
};

function parseCookies(cookieHeader: string | undefined) {
  if (!cookieHeader) return new Map<string, string>();
  const parsed = new Map<string, string>();
  for (const part of cookieHeader.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    parsed.set(part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1)));
  }
  return parsed;
}

function getSessionSecret() {
  if (!ENV.cookieSecret) throw new Error("JWT_SECRET must be configured");
  return new TextEncoder().encode(ENV.cookieSecret);
}

class LocalAuthService {
  async createSessionToken(
    openId: string,
    options: { expiresInMs?: number; name?: string; role?: string; department?: string } = {},
  ) {
    const expiresInMs = options.expiresInMs ?? 30 * 60 * 1000;
    return new SignJWT({
      openId,
      role: options.role ?? "user",
      department: options.department ?? "",
      name: options.name ?? "",
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuedAt()
      .setExpirationTime(Math.floor((Date.now() + expiresInMs) / 1000))
      .sign(getSessionSecret());
  }

  async verifySession(token: string | undefined): Promise<SessionPayload | null> {
    if (!token) return null;
    try {
      const { payload } = await jwtVerify(token, getSessionSecret(), { algorithms: ["HS256"] });
      if (
        typeof payload.openId !== "string" ||
        typeof payload.role !== "string" ||
        typeof payload.department !== "string" ||
        typeof payload.name !== "string"
      ) return null;
      return {
        openId: payload.openId,
        role: payload.role,
        department: payload.department,
        name: payload.name,
      };
    } catch {
      return null;
    }
  }

  async authenticateRequest(req: Request): Promise<AuthenticatedUser> {
    const cookies = parseCookies(req.headers.cookie);
    const session = await this.verifySession(cookies.get(COOKIE_NAME));
    if (!session) throw ForbiddenError("Invalid session cookie");

    const user = await db.getUserByOpenId(session.openId);
    if (!user) throw ForbiddenError("User not found");

    return user;
  }
}

export type AuthenticatedUser = User;
export const sdk = new LocalAuthService();
