import type { Express, Request, Response } from "express";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { upsertUser, getUserByOpenId, validateDepartmentPasscode } from "../db";

export function registerOAuthRoutes(app: Express) {
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

      const openId = `local:${credentials.role}`;
      await upsertUser({
        openId,
        name: credentials.department,
        email: null,
        loginMethod: "local-passcode",
        role: "user",
        lastSignedIn: new Date(),
      });

      const user = await getUserByOpenId(openId);
      if (!user) {
        res.status(500).json({ error: "Unable to create local user" });
        return;
      }

      const token = await sdk.createSessionToken(openId, {
        name: user.name ?? credentials.department,
        role: credentials.role,
        department: credentials.department,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 30 * 60 * 1000 });
      res.cookie("userRole", encodeURIComponent(credentials.role), { ...cookieOptions, maxAge: 30 * 60 * 1000 });
      res.cookie("userDepartment", encodeURIComponent(credentials.department), { ...cookieOptions, maxAge: 30 * 60 * 1000 });

      res.json({ success: true, role: credentials.role, department: credentials.department });
    } catch (error) {
      console.error("[Auth] Local login failed", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const options = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, options);
    res.clearCookie("userRole", options);
    res.clearCookie("userDepartment", options);
    res.json({ success: true });
  });
}
