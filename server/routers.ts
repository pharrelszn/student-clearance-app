import { COOKIE_NAME } from "@shared/const";
import { students as studentsTable } from "../drizzle/schema";
import { createLookupSession, createRoleSession, getLookupSessionCookieOptions, getRoleSessionCookieOptions, getSessionCookieOptions, LOOKUP_SESSION_COOKIE, readLookupSession, ROLE_SESSION_COOKIE } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import {
  searchStudents,
  listAllStudents,
  getOrCreateClearance,
  getClearanceWithDetails,
  getClearanceStatusSummary,
  getDb,
  getAdminConfig,
  updateAdminConfig,
  registerStudentWithDepartments,
  getStudentById,
  getAllStudents,
  createStudent,
  deleteStudent,
  validateDepartmentPasscode,
  logAuditAction,
} from "./db";
import {
  clearances,
  departmentSignOffs,
  financeChecks,
  labChecks,
  sportsChecks,
  classroomChecks,
  dormChecks,
  students,
  departmentSignOffs as deptSignOffs,
  libraryBooks,
  ictChecks,
  medicalChecks,
  departmentPasscodes,
} from "../drizzle/schema";
import { eq, sql, inArray, and, ne } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { parse as parseCookieHeader } from "cookie";

const failedPasscodeAttempts = new Map<string, { count: number; resetAt: number }>();
const PASSCODE_MAX_ATTEMPTS = 10;
const PASSCODE_WINDOW_MS = 15 * 60 * 1000;

const DEPARTMENT_ALIASES: Record<string, string> = {
  finance: "finance",
  "finance department": "finance",
  lab: "lab",
  "lab/ict": "lab",
  "lab/ict department": "lab",
  sports: "sports",
  "sports department": "sports",
  classroom: "classroom",
  "classroom department": "classroom",
  dorm: "dorm",
  "dorm/hostel": "dorm",
  "dorm/hostel department": "dorm",
  library: "library",
  "library department": "library",
  ict: "ict",
  "ict department": "ict",
  medical: "medical",
  "medical department": "medical",
};

function normalizeDepartmentKey(value: string | null | undefined) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return DEPARTMENT_ALIASES[normalized] ?? normalized;
}

function assertPasscodeRateLimit(key: string) {
  const now = Date.now();
  const current = failedPasscodeAttempts.get(key);
  if (!current || current.resetAt <= now) {
    failedPasscodeAttempts.set(key, { count: 0, resetAt: now + PASSCODE_WINDOW_MS });
    return;
  }
  if (current.count >= PASSCODE_MAX_ATTEMPTS) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many login attempts. Try again later." });
  }
}

function recordFailedPasscode(key: string) {
  const current = failedPasscodeAttempts.get(key) ?? { count: 0, resetAt: Date.now() + PASSCODE_WINDOW_MS };
  current.count += 1;
  failedPasscodeAttempts.set(key, current);
}

// Permission check helpers
function requireSuperAdmin(ctx: any) {
  if (ctx.userRole !== "super_admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only Super Admin can perform this action",
    });
  }
}

function requireDepartmentAccess(ctx: any, requiredDepartment: string | null | undefined) {
  if (ctx.userRole === "super_admin") return; // Super Admin has access to everything
  const normalizedUserDepartment = normalizeDepartmentKey(ctx.userDepartment);
  const normalizedRequiredDepartment = normalizeDepartmentKey(requiredDepartment);
  if (!normalizedRequiredDepartment || normalizedUserDepartment !== normalizedRequiredDepartment) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Access denied. You can only manage ${ctx.userDepartment} department clearances`,
    });
  }
}

function requireExplicitLookup(ctx: any, studentId: number) {
  if (ctx.userRole === "super_admin") return;
  const lookup = readLookupSession(parseCookieHeader(ctx.req.headers.cookie ?? "")[LOOKUP_SESSION_COOKIE]);
  if (!lookup || lookup.role !== ctx.userRole || normalizeDepartmentKey(lookup.department) !== normalizeDepartmentKey(ctx.userDepartment) || !lookup.studentIds.includes(studentId)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Search for this student explicitly before opening the record" });
  }
}

async function requireExplicitClearanceAccess(ctx: any, clearanceId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  const clearance = await db.select({ studentId: clearances.studentId }).from(clearances).where(eq(clearances.id, clearanceId)).limit(1);
  if (clearance.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Clearance not found" });
  requireExplicitLookup(ctx, clearance[0].studentId);
  return db;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      ctx.res.clearCookie(ROLE_SESSION_COOKIE, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    // Backend passcode validation
    loginWithPasscode: publicProcedure
      .input(z.object({ passcode: z.string().trim().min(1).max(128) }))
      .mutation(async ({ input, ctx }) => {
        const attemptKey = ctx.req.ip || "unknown";
        assertPasscodeRateLimit(attemptKey);
        let credentials;
        try {
          credentials = await validateDepartmentPasscode(input.passcode);
        } catch (error) {
          console.error("[Auth] Department passcode lookup failed:", error);
          throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database temporarily unavailable. Please try again." });
        }
        if (!credentials) {
          recordFailedPasscode(attemptKey);
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid passcode",
          });
        }
        failedPasscodeAttempts.delete(attemptKey);
        ctx.res.cookie(
          ROLE_SESSION_COOKIE,
          createRoleSession(credentials.role, credentials.role),
          getRoleSessionCookieOptions(ctx.req),
        );
        return {
          success: true,
          role: credentials.role,
          department: credentials.department,
        };
      }),
  }),

  // Student management
  student: router({
    listAll: protectedProcedure
      .use(({ ctx, next }) => { requireSuperAdmin(ctx); return next({ ctx }); })
      .query(async () => listAllStudents()),

    search: protectedProcedure
      .input(z.object({
        query: z.string().default(""),
        status: z.enum(["pending", "in_progress", "completed"]).optional(),
        department: z.enum(["finance", "lab", "sports", "classroom", "dorm", "library", "ict", "medical"]).optional(),
      }))
      .query(async ({ input, ctx }) => {
        const isAdmin = ctx.userRole === "super_admin";
        const query = input.query.trim();
        if (!isAdmin && query.length < 3) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Enter at least 3 characters to search for a student" });
        }
        if (!isAdmin && (input.status || input.department)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Departmental users may only perform explicit student searches" });
        }
        const results = await searchStudents({
          ...input,
          query,
          scopeDepartment: isAdmin ? null : normalizeDepartmentKey(ctx.userDepartment),
        });
        if (!isAdmin) {
          ctx.res.cookie(
            LOOKUP_SESSION_COOKIE,
            createLookupSession(ctx.userRole as string, normalizeDepartmentKey(ctx.userDepartment), results.map((student) => student.id)),
            getLookupSessionCookieOptions(ctx.req),
          );
        }
        return results;
      }),

    getById: protectedProcedure
      .use(({ ctx, next }) => { requireSuperAdmin(ctx); return next({ ctx }); })
      .input(z.object({ studentId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        const result = await db
          .select()
          .from(students)
          .where(eq(students.id, input.studentId))
          .limit(1);

        return result.length > 0 ? result[0] : null;
      }),

    create: protectedProcedure
      .use(({ ctx, next }) => { requireSuperAdmin(ctx); return next({ ctx }); })
      .input(z.object({
        studentId: z.string().min(1),
        name: z.string().min(1),
        program: z.string().min(1),
        graduationYear: z.number().min(2020).max(2100),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        const result = await db.insert(students).values({
          studentId: input.studentId,
          name: input.name,
          program: input.program,
          graduationYear: input.graduationYear,
        });

        return { success: true, message: "Student created successfully" };
      }),

    bulkCreate: protectedProcedure
      .use(({ ctx, next }) => { requireSuperAdmin(ctx); return next({ ctx }); })
      .input(z.object({
        rows: z.array(z.object({
          studentId: z.string().trim().min(1).max(64),
          name: z.string().trim().min(1).max(255),
          email: z.string().trim().max(320).optional(),
          phone: z.string().trim().max(20).optional(),
          program: z.string().trim().max(255).optional(),
          stream: z.string().trim().max(64).optional(),
          upi: z.string().trim().max(64).optional(),
          kcpeScore: z.number().int().min(0).max(500).optional(),
          gender: z.string().trim().max(32).optional(),
          yearOfStudy: z.number().int().positive().optional(),
          graduationYear: z.number().int().min(1900).max(2200).optional(),
          admissionNumber: z.string().trim().max(64).optional(),
        })).min(1).max(1000),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        const requestedIds = Array.from(new Set(input.rows.map((row) => row.studentId)));
        const existing = await db.select({ studentId: students.studentId }).from(students).where(inArray(students.studentId, requestedIds));
        const existingIds = new Set(existing.map((row) => row.studentId));
        const seen = new Set<string>();
        let imported = 0;
        let skipped = 0;
        const currentYear = new Date().getFullYear();

        for (const row of input.rows) {
          if (seen.has(row.studentId) || existingIds.has(row.studentId)) {
            skipped += 1;
            continue;
          }
          seen.add(row.studentId);
          await db.insert(students).values({
            studentId: row.studentId,
            name: row.name,
            email: row.email || null,
            phone: row.phone || null,
            program: row.program || "Not provided",
            stream: row.stream || null,
            upi: row.upi || null,
            kcpeScore: row.kcpeScore ?? null,
            gender: row.gender || null,
            yearOfStudy: row.yearOfStudy ?? null,
            graduationYear: row.graduationYear ?? currentYear,
            admissionNumber: row.admissionNumber || null,
          });
          imported += 1;
        }

        if (ctx.user && imported > 0) {
          await logAuditAction({
            userId: ctx.user.id,
            userRole: ctx.userRole as string,
            userDepartment: ctx.userDepartment as string,
            action: "BULK_IMPORT_STUDENTS",
            newValue: JSON.stringify({ imported, skipped }),
            notes: `Bulk student import completed: ${imported} imported, ${skipped} skipped`,
          });
        }
        return { imported, skipped };
      }),

    registerWithDepartments: protectedProcedure
      .use(({ ctx, next }) => {
        requireSuperAdmin(ctx);
        return next({ ctx });
      })
      .input(z.object({
        studentId: z.string().min(1),
        name: z.string().min(1),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        program: z.string().min(1),
        yearOfStudy: z.number().optional(),
        graduationYear: z.number().min(2020).max(2100),
        admissionNumber: z.string().optional(),
        finance: z.object({
          outstandingBalance: z.string().min(1),
          description: z.string().optional(),
        }),
        departments: z.object({
          lab: z.object({
            equipmentName: z.string(),
            damageAmount: z.string(),
            description: z.string().optional(),
          }).optional(),
          sports: z.object({
            equipmentName: z.string(),
            description: z.string().optional(),
          }).optional(),
          classroom: z.object({
            itemName: z.string(),
            damageAmount: z.string(),
          }).optional(),
          dorm: z.object({
            itemName: z.string(),
            damageAmount: z.string(),
          }).optional(),
          library: z.object({
            books: z.array(z.object({
              title: z.string(),
              bookNumber: z.string(),
              isbn: z.string().optional(),
              author: z.string().optional(),
              fine: z.string().optional(),
            })),
          }).optional(),
          ict: z.object({
            equipmentType: z.string(),
            equipmentDescription: z.string().optional(),
            damageAmount: z.string().optional(),
          }).optional(),
          medical: z.object({
            notes: z.string().optional(),
          }).optional(),
        }).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
        const result = await registerStudentWithDepartments(input);
        
        // Log audit action
        await logAuditAction({
          userId: ctx.user.id,
          userRole: ctx.userRole as string,
          userDepartment: ctx.userDepartment as string,
          studentId: result.studentId,
          action: "REGISTER_STUDENT",
          newValue: JSON.stringify({ name: input.name, studentId: input.studentId, program: input.program }),
          notes: `Student registered: ${input.name} (${input.studentId})`,
        });
        
        return { success: true, studentId: result.studentId, clearanceId: result.clearanceId };
      }),

    update: protectedProcedure
      .use(({ ctx, next }) => { requireSuperAdmin(ctx); return next({ ctx }); })
      .input(z.object({
        id: z.number(),
        name: z.string().min(1),
        studentId: z.string().min(1),
        email: z.string().email().nullable(),
        phone: z.string().nullable(),
        program: z.string().min(1),
        yearOfStudy: z.number().nullable(),
        graduationYear: z.number().min(2020).max(2100),
        admissionNumber: z.string().nullable(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        // Verify student exists
        const existingStudent = await db.select().from(students).where(eq(students.id, input.id)).limit(1);
        if (!existingStudent || existingStudent.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Student not found" });
        }

        // Check for duplicate studentId (if changed)
        if (existingStudent[0].studentId !== input.studentId) {
          const duplicate = await db.select().from(students).where(eq(students.studentId, input.studentId)).limit(1);
          if (duplicate && duplicate.length > 0) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Student ID already exists" });
          }
        }

        await db.update(students).set({
          name: input.name,
          studentId: input.studentId,
          email: input.email,
          phone: input.phone,
          program: input.program,
          yearOfStudy: input.yearOfStudy,
          graduationYear: input.graduationYear,
          admissionNumber: input.admissionNumber,
        }).where(eq(students.id, input.id));

        return { success: true, message: "Student updated successfully" };
      }),

    delete: protectedProcedure
      .use(({ ctx, next }) => { requireSuperAdmin(ctx); return next({ ctx }); })
      .input(z.object({ studentId: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        // Delete related clearances first
        const clearancesToDelete = await db
          .select({ id: clearances.id })
          .from(clearances)
          .where(eq(clearances.studentId, input.studentId));

        for (const clearance of clearancesToDelete) {
          await db.delete(departmentSignOffs).where(eq(departmentSignOffs.clearanceId, clearance.id));
          await db.delete(financeChecks).where(eq(financeChecks.clearanceId, clearance.id));
          await db.delete(labChecks).where(eq(labChecks.clearanceId, clearance.id));
          await db.delete(sportsChecks).where(eq(sportsChecks.clearanceId, clearance.id));
          await db.delete(classroomChecks).where(eq(classroomChecks.clearanceId, clearance.id));
          await db.delete(dormChecks).where(eq(dormChecks.clearanceId, clearance.id));
          await db.delete(libraryBooks).where(eq(libraryBooks.clearanceId, clearance.id));
          const { ictChecks, medicalChecks, finalClearances, reopenClearances } = await import("../drizzle/schema");
          await db.delete(ictChecks).where(eq(ictChecks.clearanceId, clearance.id));
          await db.delete(medicalChecks).where(eq(medicalChecks.clearanceId, clearance.id));
          await db.delete(finalClearances).where(eq(finalClearances.clearanceId, clearance.id));
          await db.delete(reopenClearances).where(eq(reopenClearances.clearanceId, clearance.id));
          await db.delete(clearances).where(eq(clearances.id, clearance.id));
        }

        // Delete student
        await db.delete(students).where(eq(students.id, input.studentId));

        return { success: true, message: "Student and related data deleted successfully" };
      }),
  }),

  // Clearance management
  clearance: router({
    bulkUpdateStatus: protectedProcedure
      .use(({ ctx, next }) => { requireSuperAdmin(ctx); return next({ ctx }); })
      .input(z.object({
        studentIds: z.array(z.number().int().positive()).min(1).max(100),
        status: z.enum(["pending", "in_progress", "completed"]),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        const requestedIds = Array.from(new Set(input.studentIds));
        const existingStudents = await db
          .select({ id: students.id })
          .from(students)
          .where(inArray(students.id, requestedIds));
        const existingIds = new Set(existingStudents.map((student) => student.id));
        const missing = requestedIds.filter((studentId) => !existingIds.has(studentId));
        const now = new Date();

        for (const studentId of Array.from(existingIds)) {
          const clearance = await getOrCreateClearance(studentId);
          await db.update(clearances).set({
            status: input.status,
            completedAt: input.status === "completed" ? now : null,
            updatedAt: now,
          }).where(eq(clearances.id, clearance.id));
        }

        if (ctx.user) {
          await logAuditAction({
            userId: ctx.user.id,
            userRole: ctx.userRole as string,
            userDepartment: ctx.userDepartment as string,
            action: "BULK_UPDATE_CLEARANCE_STATUS",
            newValue: JSON.stringify({ studentIds: Array.from(existingIds), status: input.status }),
            notes: `Bulk clearance status update: ${input.status} for ${existingIds.size} students`,
          });
        }

        return { updated: existingIds.size, skipped: 0, missing };
      }),

    initiate: protectedProcedure
      .input(z.object({ studentId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
        requireExplicitLookup(ctx, input.studentId);

        const clearance = await getOrCreateClearance(input.studentId);
        if (!clearance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create clearance" });

        return clearance;
      }),

    getDetails: protectedProcedure
      .input(z.object({ clearanceId: z.number() }))
      .query(async ({ input, ctx }) => {
        const details = await getClearanceWithDetails(input.clearanceId);
        if (!details) throw new TRPCError({ code: "NOT_FOUND", message: "Clearance not found" });
        if (ctx.userRole === "super_admin") return details;

        requireExplicitLookup(ctx, details.studentId);
        const department = normalizeDepartmentKey(ctx.userDepartment);
        return {
          ...details,
          certificateUrl: null,
          finance: department === "finance" ? details.finance : null,
          lab: department === "lab" ? details.lab : null,
          sports: department === "sports" ? details.sports : null,
          classroom: department === "classroom" ? details.classroom : null,
          dorm: department === "dorm" ? details.dorm : null,
          library: department === "library" ? details.library : [],
          ict: department === "ict" ? details.ict : null,
          medical: department === "medical" ? details.medical : null,
          departmentSignOffs: details.departmentSignOffs.filter((signOff) => signOff.department === department),
        };
      }),

    getStatus: protectedProcedure
      .input(z.object({ clearanceId: z.number() }))
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        const result = await db
          .select()
          .from(clearances)
          .where(eq(clearances.id, input.clearanceId))
          .limit(1);

        if (result.length === 0) return null;
        if (ctx.userRole !== "super_admin") requireExplicitLookup(ctx, result[0].studentId);
        return result[0];
      }),

    getSummary: protectedProcedure
      .use(({ ctx, next }) => { requireSuperAdmin(ctx); return next({ ctx }); })
      .query(async () => {
      // Summary data is global and is therefore Admin-only.
      // The client disables this query for departmental users.
      return await getClearanceStatusSummary();
    }),

    listAll: protectedProcedure
      .use(({ ctx, next }) => { requireSuperAdmin(ctx); return next({ ctx }); })
      .query(async () => {
      const db = await getDb();
      if (!db) return [];

      const results = await db
        .select({
          id: clearances.id,
          studentId: clearances.studentId,
          status: clearances.status,
          initiatedAt: clearances.initiatedAt,
          completedAt: clearances.completedAt,
          studentName: students.name,
          studentIdValue: students.studentId,
          program: students.program,
        })
        .from(clearances)
        .leftJoin(students, eq(clearances.studentId, students.id))
        .orderBy(sql`${clearances.createdAt} DESC`);

      return results;
    }),
  }),

  // Department-owned clearance information. Each department can add or edit only its own record.
  departmentData: router({
    upsert: protectedProcedure
      .input(z.object({
        clearanceId: z.number().int().positive(),
        department: z.enum(["finance", "lab", "sports", "classroom", "dorm", "library", "ict", "medical"]),
        id: z.number().int().positive().optional(),
        outstandingBalance: z.string().optional(),
        equipmentName: z.string().optional(),
        equipmentType: z.string().optional(),
        equipmentDescription: z.string().optional(),
        damageAmount: z.string().optional(),
        description: z.string().optional(),
        quantity: z.number().int().positive().optional(),
        itemName: z.string().optional(),
        title: z.string().optional(),
        bookNumber: z.string().optional(),
        isbn: z.string().optional(),
        author: z.string().optional(),
        fine: z.string().optional(),
        notes: z.string().optional(),
        status: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        requireDepartmentAccess(ctx, input.department);
        if (input.department === "library" && input.fine?.trim() && !/^\d+(\.\d{1,2})?$/.test(input.fine.trim())) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Fine must contain numbers only, for example 4000 or 4000.50. Put payment or replacement details in Notes.",
          });
        }
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        const clearance = await db.select({ id: clearances.id }).from(clearances).where(eq(clearances.id, input.clearanceId)).limit(1);
        if (clearance.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Clearance not found" });
        const clearanceOwner = await db.select({ studentId: clearances.studentId }).from(clearances).where(eq(clearances.id, input.clearanceId)).limit(1);
        requireExplicitLookup(ctx, clearanceOwner[0].studentId);

        const now = new Date();
        const updateOrInsert = async (table: any, values: Record<string, unknown>) => {
          if (input.id) {
            const existing = await db.select({ id: table.id }).from(table).where(and(eq(table.id, input.id), eq(table.clearanceId, input.clearanceId))).limit(1);
            if (existing.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Department record not found for this clearance" });
            await db.update(table).set({ ...values, updatedAt: now }).where(and(eq(table.id, input.id), eq(table.clearanceId, input.clearanceId)));
            return input.id;
          }
          const result = await db.insert(table).values({ clearanceId: input.clearanceId, ...values });
          return (result as any).insertId;
        };

        let recordId: number;
        switch (input.department) {
          case "finance":
            if (!input.outstandingBalance) throw new TRPCError({ code: "BAD_REQUEST", message: "Outstanding balance is required" });
            recordId = await updateOrInsert(financeChecks, { outstandingBalance: input.outstandingBalance, description: input.description });
            break;
          case "lab":
            if (!input.equipmentName || !input.damageAmount) throw new TRPCError({ code: "BAD_REQUEST", message: "Equipment name and damage amount are required" });
            recordId = await updateOrInsert(labChecks, { equipmentName: input.equipmentName, damageAmount: input.damageAmount, description: input.description });
            break;
          case "sports":
            if (!input.equipmentName) throw new TRPCError({ code: "BAD_REQUEST", message: "Equipment name is required" });
            recordId = await updateOrInsert(sportsChecks, { equipmentName: input.equipmentName, quantity: input.quantity ?? 1, description: input.description });
            break;
          case "classroom":
            if (!input.itemName || !input.damageAmount) throw new TRPCError({ code: "BAD_REQUEST", message: "Item name and damage amount are required" });
            recordId = await updateOrInsert(classroomChecks, { itemName: input.itemName, damageAmount: input.damageAmount, description: input.description });
            break;
          case "dorm":
            if (!input.itemName || !input.damageAmount) throw new TRPCError({ code: "BAD_REQUEST", message: "Item name and damage amount are required" });
            recordId = await updateOrInsert(dormChecks, { itemName: input.itemName, damageAmount: input.damageAmount, description: input.description });
            break;
          case "library":
            if (!input.title || !input.bookNumber) throw new TRPCError({ code: "BAD_REQUEST", message: "Book title and number are required" });
            recordId = await updateOrInsert(libraryBooks, {
              title: input.title,
              bookNumber: input.bookNumber,
              isbn: input.isbn?.trim() || null,
              author: input.author?.trim() || null,
              fine: input.fine?.trim() || null,
              notes: input.notes?.trim() || null,
            });
            break;
          case "ict":
            if (!input.equipmentType) throw new TRPCError({ code: "BAD_REQUEST", message: "Equipment type is required" });
            recordId = await updateOrInsert(ictChecks, { equipmentType: input.equipmentType, equipmentDescription: input.equipmentDescription, damageAmount: input.damageAmount, notes: input.notes, status: input.status });
            break;
          case "medical":
            recordId = await updateOrInsert(medicalChecks, { notes: input.notes, status: input.status ?? "pending" });
            break;
        }

        await db.update(clearances).set({ updatedAt: now }).where(eq(clearances.id, input.clearanceId));
        const signOff = await db.select({ id: departmentSignOffs.id }).from(departmentSignOffs).where(and(eq(departmentSignOffs.clearanceId, input.clearanceId), eq(departmentSignOffs.department, input.department))).limit(1);
        if (signOff.length === 0) {
          await db.insert(departmentSignOffs).values({ clearanceId: input.clearanceId, department: input.department, status: "pending" });
        }
        return { success: true, id: recordId };
      }),

    delete: protectedProcedure
      .use(({ ctx, next }) => { requireSuperAdmin(ctx); return next({ ctx }); })
      .input(z.object({
        clearanceId: z.number().int().positive(),
        department: z.enum(["finance", "lab", "sports", "classroom", "dorm", "library", "ict", "medical"]),
        id: z.number().int().positive(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        const tables: Record<string, any> = {
          finance: financeChecks,
          lab: labChecks,
          sports: sportsChecks,
          classroom: classroomChecks,
          dorm: dormChecks,
          library: libraryBooks,
          ict: ictChecks,
          medical: medicalChecks,
        };
        const table = tables[input.department];
        const existing = await db.select({ id: table.id })
          .from(table)
          .where(and(eq(table.id, input.id), eq(table.clearanceId, input.clearanceId)))
          .limit(1);
        if (existing.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Department record not found for this clearance" });

        await db.delete(table).where(and(eq(table.id, input.id), eq(table.clearanceId, input.clearanceId)));
        await db.update(departmentSignOffs)
          .set({ status: "pending", signedOffBy: null, signedOffAt: null, updatedAt: new Date() })
          .where(and(eq(departmentSignOffs.clearanceId, input.clearanceId), eq(departmentSignOffs.department, input.department)));
        await db.update(clearances).set({ updatedAt: new Date() }).where(eq(clearances.id, input.clearanceId));
        return { success: true };
      }),
  }),

  // Department sign-offs
  departmentSignOff: router({
    approve: protectedProcedure
      .use(({ ctx, next }) => {
        requireDepartmentAccess(ctx, ctx.userDepartment);
        return next({ ctx });
      })
      .input(
        z.object({
          clearanceId: z.number(),
          department: z.enum(["finance", "lab", "sports", "classroom", "dorm", "library", "ict", "medical"]),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
        
        // Verify the department matches the user's normalized department alias
        if (ctx.userRole !== "super_admin" && input.department !== normalizeDepartmentKey(ctx.userDepartment)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `You can only approve ${ctx.userDepartment} department clearances`,
          });
        }

        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        // Get clearance to find student ID for audit logging
        const clearanceData = await db.select().from(clearances).where(eq(clearances.id, input.clearanceId)).limit(1);
        const studentId = clearanceData?.[0]?.studentId;
        if (studentId === undefined) throw new TRPCError({ code: "NOT_FOUND", message: "Clearance not found" });
        requireExplicitLookup(ctx, studentId);

        const now = new Date();

        // Update sign-off status
        await db
          .update(departmentSignOffs)
          .set({
            status: "approved",
            signedOffBy: ctx.user.id,
            signedOffAt: now,
            notes: input.notes,
            updatedAt: now,
          })
          .where(
            sql`${departmentSignOffs.clearanceId} = ${input.clearanceId} AND ${departmentSignOffs.department} = ${input.department}`
          );

        // Log audit action
        await logAuditAction({
          userId: ctx.user.id,
          userRole: ctx.userRole as string,
          userDepartment: ctx.userDepartment as string,
          studentId,
          action: "APPROVE_DEPARTMENT_CLEARANCE",
          department: input.department,
          newValue: JSON.stringify({ status: "approved", notes: input.notes }),
          notes: `Department ${input.department} clearance approved`,
        });

        // Check if all departments are approved
        const allSignOffs = await db
          .select()
          .from(departmentSignOffs)
          .where(eq(departmentSignOffs.clearanceId, input.clearanceId));

        const allApproved = allSignOffs.every((s) => s.status === "approved");

        if (allApproved) {
          await db
            .update(clearances)
            .set({
              status: "completed",
              completedAt: now,
              updatedAt: now,
            })
            .where(eq(clearances.id, input.clearanceId));

          // Log final clearance completion
          await logAuditAction({
            userId: ctx.user.id,
            userRole: ctx.userRole as string,
            userDepartment: ctx.userDepartment as string,
            studentId,
            action: "COMPLETE_CLEARANCE",
            newValue: JSON.stringify({ status: "completed" }),
            notes: "All departments have approved clearance",
          });
        }

        return { success: true, allApproved };
      }),

    flag: protectedProcedure
      .use(({ ctx, next }) => {
        requireDepartmentAccess(ctx, ctx.userDepartment);
        return next({ ctx });
      })
      .input(
        z.object({
          clearanceId: z.number(),
          department: z.enum(["finance", "lab", "sports", "classroom", "dorm", "library", "ict", "medical"]),
          notes: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
        
        // Verify the department matches the user's normalized department alias
        if (ctx.userRole !== "super_admin" && input.department !== normalizeDepartmentKey(ctx.userDepartment)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `You can only flag ${ctx.userDepartment} department clearances`,
          });
        }

        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        // Get clearance to find student ID for audit logging
        const clearanceData = await db.select().from(clearances).where(eq(clearances.id, input.clearanceId)).limit(1);
        const studentId = clearanceData?.[0]?.studentId;
        if (studentId === undefined) throw new TRPCError({ code: "NOT_FOUND", message: "Clearance not found" });
        requireExplicitLookup(ctx, studentId);

        const now = new Date();

        await db
          .update(departmentSignOffs)
          .set({
            status: "flagged",
            signedOffBy: ctx.user.id,
            signedOffAt: now,
            notes: input.notes,
            updatedAt: now,
          })
          .where(
            sql`${departmentSignOffs.clearanceId} = ${input.clearanceId} AND ${departmentSignOffs.department} = ${input.department}`
          );

        // Log audit action
        await logAuditAction({
          userId: ctx.user.id,
          userRole: ctx.userRole as string,
          userDepartment: ctx.userDepartment as string,
          studentId,
          action: "FLAG_DEPARTMENT_CLEARANCE",
          department: input.department,
          newValue: JSON.stringify({ status: "flagged", notes: input.notes }),
          notes: `Department ${input.department} clearance flagged: ${input.notes}`,
        });

        return { success: true };
      }),

    getForClearance: protectedProcedure
      .input(z.object({ clearanceId: z.number() }))
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) return [];

        const signOffs = await db
          .select()
          .from(departmentSignOffs)
          .where(eq(departmentSignOffs.clearanceId, input.clearanceId));
        if (ctx.userRole === "super_admin") return signOffs;
        const clearance = await db.select({ studentId: clearances.studentId }).from(clearances).where(eq(clearances.id, input.clearanceId)).limit(1);
        if (clearance.length === 0) return [];
        requireExplicitLookup(ctx, clearance[0].studentId);
        return signOffs.filter((signOff) => signOff.department === normalizeDepartmentKey(ctx.userDepartment));
      }),
  }),

  // Finance checks
  financeCheck: router({
    add: protectedProcedure
      .use(({ ctx, next }) => { requireDepartmentAccess(ctx, "finance"); return next({ ctx }); })
      .input(
        z.object({
          clearanceId: z.number(),
          outstandingBalance: z.string(),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        const result = await db.insert(financeChecks).values({
          clearanceId: input.clearanceId,
          outstandingBalance: input.outstandingBalance,
          description: input.description,
        });

        return { success: true, id: (result as any).insertId };
      }),

    getForClearance: protectedProcedure
      .input(z.object({ clearanceId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        return await db
          .select()
          .from(financeChecks)
          .where(eq(financeChecks.clearanceId, input.clearanceId));
      }),
  }),

  // Lab checks
  labCheck: router({
    add: protectedProcedure
      .use(({ ctx, next }) => { requireDepartmentAccess(ctx, "lab"); return next({ ctx }); })
      .input(
        z.object({
          clearanceId: z.number(),
          equipmentName: z.string(),
          damageAmount: z.string(),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        const result = await db.insert(labChecks).values({
          clearanceId: input.clearanceId,
          equipmentName: input.equipmentName,
          damageAmount: input.damageAmount,
          description: input.description,
        });

        return { success: true, id: (result as any).insertId };
      }),

    getForClearance: protectedProcedure
      .input(z.object({ clearanceId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        return await db
          .select()
          .from(labChecks)
          .where(eq(labChecks.clearanceId, input.clearanceId));
      }),
  }),

  // Sports checks
  sportsCheck: router({
    add: protectedProcedure
      .use(({ ctx, next }) => { requireDepartmentAccess(ctx, "sports"); return next({ ctx }); })
      .input(
        z.object({
          clearanceId: z.number(),
          equipmentName: z.string(),
          quantity: z.number().optional().default(1),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        const result = await db.insert(sportsChecks).values({
          clearanceId: input.clearanceId,
          equipmentName: input.equipmentName,
          quantity: input.quantity,
          description: input.description,
        });

        return { success: true, id: (result as any).insertId };
      }),

    getForClearance: protectedProcedure
      .input(z.object({ clearanceId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        return await db
          .select()
          .from(sportsChecks)
          .where(eq(sportsChecks.clearanceId, input.clearanceId));
      }),
  }),

  // Classroom checks
  classroomCheck: router({
    add: protectedProcedure
      .use(({ ctx, next }) => { requireDepartmentAccess(ctx, "classroom"); return next({ ctx }); })
      .input(
        z.object({
          clearanceId: z.number(),
          itemName: z.string(),
          damageAmount: z.string(),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        const result = await db.insert(classroomChecks).values({
          clearanceId: input.clearanceId,
          itemName: input.itemName,
          damageAmount: input.damageAmount,
          description: input.description,
        });

        return { success: true, id: (result as any).insertId };
      }),

    getForClearance: protectedProcedure
      .input(z.object({ clearanceId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        return await db
          .select()
          .from(classroomChecks)
          .where(eq(classroomChecks.clearanceId, input.clearanceId));
      }),
  }),

  // Dorm checks
  dormCheck: router({
    add: protectedProcedure
      .use(({ ctx, next }) => { requireDepartmentAccess(ctx, "dorm"); return next({ ctx }); })
      .input(
        z.object({
          clearanceId: z.number(),
          itemName: z.string(),
          damageAmount: z.string(),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        const result = await db.insert(dormChecks).values({
          clearanceId: input.clearanceId,
          itemName: input.itemName,
          damageAmount: input.damageAmount,
          description: input.description,
        });

        return { success: true, id: (result as any).insertId };
      }),

    getForClearance: protectedProcedure
      .input(z.object({ clearanceId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        return await db
          .select()
          .from(dormChecks)
          .where(eq(dormChecks.clearanceId, input.clearanceId));
      }),
    }),

  // Admin configuration
  adminConfig: router({
    get: protectedProcedure
      .use(({ ctx, next }) => { requireSuperAdmin(ctx); return next({ ctx }); })
      .query(async () => {
      const config = await getAdminConfig();
      return config || { enableSports: false, enableDorm: false, enableLab: false, enableClassroom: false, enableFinance: false };
    }),

    update: protectedProcedure
      .use(({ ctx, next }) => { requireSuperAdmin(ctx); return next({ ctx }); })
      .input(
        z.object({
          enableSports: z.boolean().optional(),
          enableDorm: z.boolean().optional(),
          enableLab: z.boolean().optional(),
          enableClassroom: z.boolean().optional(),
          enableFinance: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const config = await updateAdminConfig(input);
        return config || { enableSports: false, enableDorm: false, enableLab: false, enableClassroom: false, enableFinance: false };
      }),
  }),

  // Department credential management
  departmentCredentials: router({
    list: protectedProcedure
      .use(({ ctx, next }) => { requireSuperAdmin(ctx); return next({ ctx }); })
      .query(async () => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        return db
          .select({ role: departmentPasscodes.role, updatedAt: departmentPasscodes.updatedAt })
          .from(departmentPasscodes)
          .where(ne(departmentPasscodes.role, "super_admin"))
          .orderBy(departmentPasscodes.role);
      }),

    update: protectedProcedure
      .use(({ ctx, next }) => { requireSuperAdmin(ctx); return next({ ctx }); })
      .input(z.object({
        role: z.enum(["finance", "lab", "sports", "classroom", "dorm", "library", "ict", "medical"]),
        passcode: z.string().trim().min(8, "Passcode must be at least 8 characters").max(128),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        const [target] = await db
          .select({ role: departmentPasscodes.role })
          .from(departmentPasscodes)
          .where(eq(departmentPasscodes.role, input.role))
          .limit(1);
        if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Department credential not found" });

        const [duplicate] = await db
          .select({ role: departmentPasscodes.role })
          .from(departmentPasscodes)
          .where(and(eq(departmentPasscodes.passcode, input.passcode), ne(departmentPasscodes.role, input.role)))
          .limit(1);
        if (duplicate) {
          throw new TRPCError({ code: "CONFLICT", message: "That passcode is already assigned to another department" });
        }

        const now = new Date();
        await db
          .update(departmentPasscodes)
          .set({ passcode: input.passcode, updatedAt: now })
          .where(eq(departmentPasscodes.role, input.role));

        await logAuditAction({
          userId: ctx.user.id,
          userRole: ctx.userRole,
          userDepartment: ctx.userDepartment,
          action: "CHANGE_DEPARTMENT_PASSCODE",
          department: input.role,
          notes: `Department passcode changed for ${input.role}`,
        });

        return { success: true, role: input.role, updatedAt: now } as const;
      }),
  }),

  // Library book management
  libraryBook: router({
    approveBook: protectedProcedure
      .use(({ ctx, next }) => { requireDepartmentAccess(ctx, "library"); return next({ ctx }); })
      .input(
        z.object({
          bookId: z.number(),
          clearanceId: z.number(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        // Verify the book exists and belongs to the specified clearance
        const bookData = await db
          .select()
          .from(libraryBooks)
          .where(eq(libraryBooks.id, input.bookId))
          .limit(1);

        if (!bookData || bookData.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Book not found" });
        }

        const book = bookData[0];
        if (book.clearanceId !== input.clearanceId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Book does not belong to this clearance" });
        }

        const now = new Date();

        // Update book status to resolved
        await db
          .update(libraryBooks)
          .set({
            status: "resolved",
            approvedAt: now,
            approvedBy: ctx.user.id,
            updatedAt: now,
          })
          .where(eq(libraryBooks.id, input.bookId));

        // Check if all books for this clearance are resolved
        const allBooks = await db
          .select()
          .from(libraryBooks)
          .where(eq(libraryBooks.clearanceId, input.clearanceId));

        if (allBooks.length === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "No books found for this clearance" });
        }

        const allResolved = allBooks.every((b) => b.status === "resolved");

        if (allResolved) {
          // Update library department sign-off to approved
          await db
            .update(departmentSignOffs)
            .set({
              status: "approved",
              signedOffBy: ctx.user.id,
              signedOffAt: now,
              updatedAt: now,
            })
            .where(
              sql`${departmentSignOffs.clearanceId} = ${input.clearanceId} AND ${departmentSignOffs.department} = 'library'`
            );

          // Check if all departments are approved
          const allSignOffs = await db
            .select()
            .from(departmentSignOffs)
            .where(eq(departmentSignOffs.clearanceId, input.clearanceId));

          const allApproved = allSignOffs.every((s) => s.status === "approved");

          if (allApproved) {
            await db
              .update(clearances)
              .set({
                status: "completed",
                completedAt: now,
                updatedAt: now,
              })
              .where(eq(clearances.id, input.clearanceId));
          }
        }

        return { success: true, allResolved };
      }),

    getBooksForClearance: protectedProcedure
      .input(z.object({ clearanceId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        return await db
          .select()
          .from(libraryBooks)
          .where(eq(libraryBooks.clearanceId, input.clearanceId));
      }),
  }),

  // Super Admin procedures
  superAdmin: router({
    // Get all audit logs
    getAuditLogs: protectedProcedure
      .use(({ ctx, next }) => {
        requireSuperAdmin(ctx);
        return next({ ctx });
      })
      .input(
        z.object({
          limit: z.number().optional().default(50),
          offset: z.number().optional().default(0),
        })
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        const { auditLogs } = await import("../drizzle/schema");
        return await db
          .select()
          .from(auditLogs)
          .orderBy((t) => sql`${t.createdAt} DESC`)
          .limit(input.limit)
          .offset(input.offset);
      }),

    // Get clearance summary for dashboard
    getClearanceSummary: protectedProcedure
      .use(({ ctx, next }) => {
        requireSuperAdmin(ctx);
        return next({ ctx });
      })
      .query(async () => {
        return await getClearanceStatusSummary();
      }),

    // Get all clearances with student info
    getAllClearances: protectedProcedure
      .use(({ ctx, next }) => {
        requireSuperAdmin(ctx);
        return next({ ctx });
      })
      .query(async () => {
        const db = await getDb();
        if (!db) return [];

        const allClearances = await db
          .select()
          .from(clearances);

        // Enrich with student info
        const enriched = await Promise.all(
          allClearances.map(async (c) => {
            const student = await db
              .select()
              .from(students)
              .where(eq(students.id, c.studentId))
              .limit(1);
            return {
              ...c,
              student: student?.[0] || null,
            };
          })
        );

        return enriched;
      }),
  }),
});
export type AppRouter = typeof appRouter;
