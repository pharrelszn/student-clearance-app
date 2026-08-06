import { COOKIE_NAME } from "@shared/const";
import { students as studentsTable } from "../drizzle/schema";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import {
  searchStudents,
  getOrCreateClearance,
  getClearanceWithDetails,
  getClearanceStatusSummary,
  getDb,
  getUserById,
  getAdminConfig,
  updateAdminConfig,
  registerStudentWithDepartments,
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
} from "../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Student management
  student: router({
    search: protectedProcedure
      .input(z.object({ query: z.string().min(1) }))
      .query(async ({ input }) => {
        const results = await searchStudents(input.query);
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
        }).optional(),
      }))
      .mutation(async ({ input }) => {
        const result = await registerStudentWithDepartments(input);
        return { success: true, studentId: result.studentId, clearanceId: result.clearanceId };
      }),

    delete: protectedProcedure
      .input(z.object({ studentId: z.number() }))
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
          await db.delete(clearances).where(eq(clearances.id, clearance.id));
        }

        // Delete student
        await db.delete(students).where(eq(students.id, input.studentId));

        return { success: true, message: "Student and related data deleted successfully" };
      }),
  }),

  // Clearance management
  clearance: router({
    initiate: protectedProcedure
      .input(z.object({ studentId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

        const clearance = await getOrCreateClearance(input.studentId, ctx.user.id);
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

  // Department sign-offs
  departmentSignOff: router({
    approve: protectedProcedure
      .input(
        z.object({
          clearanceId: z.number(),
          department: z.enum(["finance", "lab", "sports", "classroom", "dorm"]),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

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

        return { success: true, allApproved };
      }),

    flag: protectedProcedure
      .input(
        z.object({
          clearanceId: z.number(),
          department: z.enum(["finance", "lab", "sports", "classroom", "dorm"]),
          notes: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

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
    get: protectedProcedure.query(async () => {
      const config = await getAdminConfig();
      return config || { enableSports: false, enableDorm: false, enableLab: false, enableClassroom: false, enableFinance: false };
    }),

    update: protectedProcedure
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
});
export type AppRouter = typeof appRouter;
