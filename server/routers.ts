import { COOKIE_NAME } from "@shared/const";
import { students as studentsTable } from "../drizzle/schema";
import { createRoleSession, getRoleSessionCookieOptions, getSessionCookieOptions, ROLE_SESSION_COOKIE } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import {
  searchStudents,
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
  registrarChecks,
} from "../drizzle/schema";
import { eq, sql, inArray, and } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

const failedPasscodeAttempts = new Map<string, { count: number; resetAt: number }>();
const PASSCODE_MAX_ATTEMPTS = 10;
const PASSCODE_WINDOW_MS = 15 * 60 * 1000;

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
  const normalizedUserDepartment = String(ctx.userDepartment ?? "").toLowerCase().replace("/ict", "");
  const normalizedRequiredDepartment = String(requiredDepartment ?? "").toLowerCase().replace("/ict", "");
  if (!normalizedRequiredDepartment || normalizedUserDepartment !== normalizedRequiredDepartment) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Access denied. You can only manage ${ctx.userDepartment} department clearances`,
    });
  }
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
        const credentials = await validateDepartmentPasscode(input.passcode);
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
          createRoleSession(credentials.role, credentials.department),
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
    search: protectedProcedure
      .input(z.object({
        query: z.string().default(""),
        status: z.enum(["pending", "in_progress", "completed"]).optional(),
        department: z.enum(["finance", "lab", "sports", "classroom", "dorm", "library", "ict", "medical", "registrar"]).optional(),
      }))
      .query(async ({ input }) => {
        const results = await searchStudents(input);
        return results;
      }),

    getById: protectedProcedure
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
          registrar: z.object({
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
          const { ictChecks, medicalChecks, registrarChecks, finalClearances, reopenClearances } = await import("../drizzle/schema");
          await db.delete(ictChecks).where(eq(ictChecks.clearanceId, clearance.id));
          await db.delete(medicalChecks).where(eq(medicalChecks.clearanceId, clearance.id));
          await db.delete(registrarChecks).where(eq(registrarChecks.clearanceId, clearance.id));
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

        const clearance = await getOrCreateClearance(input.studentId);
        if (!clearance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create clearance" });

        return clearance;
      }),

    getDetails: protectedProcedure
      .input(z.object({ clearanceId: z.number() }))
      .query(async ({ input }) => {
        const details = await getClearanceWithDetails(input.clearanceId);
        if (!details) throw new TRPCError({ code: "NOT_FOUND", message: "Clearance not found" });
        return details;
      }),

    getStatus: protectedProcedure
      .input(z.object({ clearanceId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        const result = await db
          .select()
          .from(clearances)
          .where(eq(clearances.id, input.clearanceId))
          .limit(1);

        return result.length > 0 ? result[0] : null;
      }),

    getSummary: protectedProcedure.query(async () => {
      return await getClearanceStatusSummary();
    }),

    listAll: protectedProcedure.query(async () => {
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
        department: z.enum(["finance", "lab", "sports", "classroom", "dorm", "library", "ict", "medical", "registrar"]),
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
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        const clearance = await db.select({ id: clearances.id }).from(clearances).where(eq(clearances.id, input.clearanceId)).limit(1);
        if (clearance.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Clearance not found" });

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
            recordId = await updateOrInsert(libraryBooks, { title: input.title, bookNumber: input.bookNumber, isbn: input.isbn, author: input.author, fine: input.fine, notes: input.notes });
            break;
          case "ict":
            if (!input.equipmentType) throw new TRPCError({ code: "BAD_REQUEST", message: "Equipment type is required" });
            recordId = await updateOrInsert(ictChecks, { equipmentType: input.equipmentType, equipmentDescription: input.equipmentDescription, damageAmount: input.damageAmount, notes: input.notes, status: input.status });
            break;
          case "medical":
            recordId = await updateOrInsert(medicalChecks, { notes: input.notes, status: input.status ?? "pending" });
            break;
          case "registrar":
            recordId = await updateOrInsert(registrarChecks, { notes: input.notes, status: input.status ?? "pending" });
            break;
        }

        await db.update(clearances).set({ updatedAt: now }).where(eq(clearances.id, input.clearanceId));
        const signOff = await db.select({ id: departmentSignOffs.id }).from(departmentSignOffs).where(and(eq(departmentSignOffs.clearanceId, input.clearanceId), eq(departmentSignOffs.department, input.department))).limit(1);
        if (signOff.length === 0) {
          await db.insert(departmentSignOffs).values({ clearanceId: input.clearanceId, department: input.department, status: "pending" });
        }
        return { success: true, id: recordId };
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
          department: z.enum(["finance", "lab", "sports", "classroom", "dorm", "library", "ict", "medical", "registrar"]),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
        
        // Verify the department matches the user's normalized department alias
        if (ctx.userRole !== "super_admin" && input.department !== String(ctx.userDepartment ?? "").toLowerCase().replace("/ict", "")) {
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
          department: z.enum(["finance", "lab", "sports", "classroom", "dorm", "library", "ict", "medical", "registrar"]),
          notes: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
        
        // Verify the department matches the user's normalized department alias
        if (ctx.userRole !== "super_admin" && input.department !== String(ctx.userDepartment ?? "").toLowerCase().replace("/ict", "")) {
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
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        return await db
          .select()
          .from(departmentSignOffs)
          .where(eq(departmentSignOffs.clearanceId, input.clearanceId));
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
