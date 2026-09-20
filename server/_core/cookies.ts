import type { CookieOptions, Request } from "express";
import crypto from "node:crypto";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
export const ROLE_SESSION_COOKIE = "clearance_role";
export const LOOKUP_SESSION_COOKIE = "clearance_lookup";
const ROLE_SESSION_MAX_AGE_MS = 40 * 60 * 1000;
const LOOKUP_SESSION_MAX_AGE_MS = 5 * 60 * 1000;

type RoleSession = { role: string; department: string; exp: number };
type LookupSession = { role: string; department: string; studentIds: number[]; exp: number };

function getRoleSessionSecret() {
  const preferredSecret = [process.env.JWT_SECRET, process.env.BUILT_IN_FORGE_API_KEY]
    .find((candidate) => candidate && candidate.length >= 32);
  const secret = preferredSecret || process.env.DATABASE_URL;
  if (!secret) {
    throw new Error("A server-side role-session signing secret is not configured");
  }
  return secret;
}

function sign(value: string) {
  return crypto.createHmac("sha256", getRoleSessionSecret()).update(value).digest("base64url");
}

export function createRoleSession(role: string, department: string) {
  const payload: RoleSession = { role, department, exp: Date.now() + ROLE_SESSION_MAX_AGE_MS };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function readRoleSession(value: string | undefined): RoleSession | null {
  if (!value) return null;
  const [encoded, signature] = value.split(".");
  if (!encoded || !signature) return null;
  const expected = sign(encoded);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as RoleSession;
    if (!payload.role || !payload.department || !Number.isFinite(payload.exp) || payload.exp <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function createLookupSession(role: string, department: string, studentIds: number[]) {
  const payload: LookupSession = {
    role,
    department,
    studentIds: Array.from(new Set(studentIds)).slice(0, 100),
    exp: Date.now() + LOOKUP_SESSION_MAX_AGE_MS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function readLookupSession(value: string | undefined): LookupSession | null {
  if (!value) return null;
  const [encoded, signature] = value.split(".");
  if (!encoded || !signature) return null;
  const expected = sign(encoded);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as LookupSession;
    if (!payload.role || !payload.department || !Array.isArray(payload.studentIds) || !Number.isFinite(payload.exp) || payload.exp <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getRoleSessionCookieOptions(req: Request): CookieOptions {
  return { ...getSessionCookieOptions(req), maxAge: ROLE_SESSION_MAX_AGE_MS };
}

export function getLookupSessionCookieOptions(req: Request): CookieOptions {
  return { ...getSessionCookieOptions(req), maxAge: LOOKUP_SESSION_MAX_AGE_MS };
}

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  // const hostname = req.hostname;
  // const shouldSetDomain =
  //   hostname &&
  //   !LOCAL_HOSTS.has(hostname) &&
  //   !isIpAddress(hostname) &&
  //   hostname !== "127.0.0.1" &&
  //   hostname !== "::1";

  // const domain =
  //   shouldSetDomain && !hostname.startsWith(".")
  //     ? `.${hostname}`
  //     : shouldSetDomain
  //       ? hostname
  //       : undefined;

  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req),
  };
}
