export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "student-clearance-local-dev-secret",
  databaseUrl: process.env.DATABASE_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "local-owner",
  isProduction: process.env.NODE_ENV === "production",
};
