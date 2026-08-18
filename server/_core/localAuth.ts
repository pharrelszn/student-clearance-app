import type { Express, Request, Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import { parse as parseCookieHeader } from "cookie";
import { eq } from "drizzle-orm";
import { getSessionCookieOptions } from "./cookies";
import { COOKIE_NAME } from "@shared/const";
import { validateDepartmentPasscode, getDb } from "../db";
import { users } from "../../drizzle/schema";
import { ENV } from "./env";

const SESSION_TTL_MS = 30 * 60 * 1000;

type LocalSession = {
  userId: number;
  role: string;
  department: string;
};

function getSecret() {
  if (!ENV.cookieSecret) {
    throw new Error("JWT_SECRET must be configured");
  }
  return new TextEncoder().encode(ENV.cookieSecret);
}

async function getOrCreateLocalUser(role: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const openId = `local:${role}`;
  const existing = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  if (existing.length > 0) return existing[0];

  await db.insert(users).values({
    openId,
    name: role === "super_admin" ? "Super Admin" : `${role.charAt(0).toUpperCase()}${role.slice(1)} Department`,
    loginMethod: "local",
    role: "user",
    department: role,
    lastSignedIn: new Date(),
  });

  const created = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  if (created.length === 0) throw new Error("Failed to create local user");
  return created[0];
}

export async function createLocalSession(session: LocalSession) {
  return new SignJWT(session)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(Math.floor((Date.now() + SESSION_TTL_MS) / 1000))
    .sign(getSecret());
}

export async function verifyLocalSession(token: string | undefined): Promise<LocalSession | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
    });

    if (
      typeof payload.userId !== "number" ||
      typeof payload.role !== "string" ||
      typeof payload.department !== "string"
    ) {
      return null;
    }

    return {
      userId: payload.userId,
      role: payload.role,
      department: payload.department,
    };
  } catch {
    return null;
  }
}

export async function authenticateLocalRequest(req: Request) {
  const cookies = parseCookieHeader(req.headers.cookie ?? "");
  const token = cookies[COOKIE_NAME];
  const session = await verifyLocalSession(token);
  if (!session) return null;

  const user = await getOrCreateLocalUser(session.role);
  if (!user || user.id !== session.userId) return null;
  return user;
}

export function registerLocalAuthRoutes(app: Express) {
  app.post("/api/auth/passcode", async (req: Request, res: Response) => {
    try {
      const passcode = typeof req.body?.passcode === "string" ? req.body.passcode.trim() : "";
      if (!passcode) {
        res.status(400).json({ error: "Passcode is required" });
        return;
      }

      const credentials = await validateDepartmentPasscode(passcode);
      if (!credentials) {
        res.status(401).json({ error: "Invalid passcode" });
        return;
      }

      const user = await getOrCreateLocalUser(credentials.role);
      const token = await createLocalSession({
        userId: user.id,
        role: credentials.role,
        department: credentials.role,
      });

      res.cookie(COOKIE_NAME, token, {
        ...getSessionCookieOptions(req),
        maxAge: SESSION_TTL_MS,
      });

      res.json({
        success: true,
        role: credentials.role,
        department: credentials.department,
      });
    } catch (error) {
      console.error("[Auth] Local login failed", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    res.json({ success: true });
  });
}
