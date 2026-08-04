import { eq, sql, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  students,
  clearances,
  departmentSignOffs,
  financeChecks,
  labChecks,
  sportsChecks,
  classroomChecks,
  dormChecks,
} from "../drizzle/schema";
import { ENV } from './_core/env';
import type { Student, Clearance, DepartmentSignOff } from '../drizzle/schema';

let _db: ReturnType<typeof drizzle> | null = null;

// Re-export for convenience
export type { Student, Clearance, DepartmentSignOff };

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Get user by ID
 */
export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Get student by ID with full clearance details
 */
export async function getStudentWithClearance(studentId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(students)
    .where(eq(students.id, studentId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Search students by name or student ID
 */
export async function searchStudents(query: string) {
  const db = await getDb();
  if (!db) return [];

  const searchPattern = `%${query}%`;

  const results = await db
    .select()
    .from(students)
    .where(
      query.length > 0
        ? like(students.name, searchPattern)
        : undefined
    )
    .limit(20);

  return results;
}

/**
 * Get or create clearance for a student
 */
export async function getOrCreateClearance(studentId: number, initiatedBy: number) {
  const db = await getDb();
  if (!db) return undefined;

  // Check if clearance exists
  const existing = await db
    .select()
    .from(clearances)
    .where(eq(clearances.studentId, studentId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  // Create new clearance and department sign-offs
  const departments = ['finance', 'lab', 'sports', 'classroom', 'dorm'] as const;
  const now = new Date();

  const insertResult = await db.insert(clearances).values({
    studentId,
    status: 'in_progress',
    initiatedBy,
    initiatedAt: now,
  });

  const clearanceId = (insertResult as any).insertId;

  // Create sign-off records for each department
  await db.insert(departmentSignOffs).values(
    departments.map((dept) => ({
      clearanceId,
      department: dept,
      status: 'pending' as const,
    }))
  );

  return {
    id: clearanceId,
    studentId,
    status: 'in_progress',
    initiatedBy,
    initiatedAt: now,
    completedAt: null,
    certificateUrl: null,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Get all clearances with their department sign-offs
 */
export async function getClearanceWithDetails(clearanceId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(clearances)
    .where(eq(clearances.id, clearanceId))
    .limit(1);

  if (result.length === 0) return undefined;

  const clearance = result[0];

  const [signOffs, financeData, labData, sportsData, classroomData, dormData] = await Promise.all([
    db.select().from(departmentSignOffs).where(eq(departmentSignOffs.clearanceId, clearanceId)),
    db.select().from(financeChecks).where(eq(financeChecks.clearanceId, clearanceId)),
    db.select().from(labChecks).where(eq(labChecks.clearanceId, clearanceId)),
    db.select().from(sportsChecks).where(eq(sportsChecks.clearanceId, clearanceId)),
    db.select().from(classroomChecks).where(eq(classroomChecks.clearanceId, clearanceId)),
    db.select().from(dormChecks).where(eq(dormChecks.clearanceId, clearanceId)),
  ]);

  return {
    ...clearance,
    departmentSignOffs: signOffs,
    financeChecks: financeData,
    labChecks: labData,
    sportsChecks: sportsData,
    classroomChecks: classroomData,
    dormChecks: dormData,
  };
}

/**
 * Get clearance status summary
 */
export async function getClearanceStatusSummary() {
  const db = await getDb();
  if (!db) return { pending: 0, inProgress: 0, completed: 0 };

  const results = await db
    .select({
      status: clearances.status,
      count: sql<number>`COUNT(*) as count`,
    })
    .from(clearances)
    .groupBy(clearances.status);

  const summary = { pending: 0, inProgress: 0, completed: 0 };
  results.forEach((row) => {
    if (row.status === 'pending') summary.pending = row.count;
    if (row.status === 'in_progress') summary.inProgress = row.count;
    if (row.status === 'completed') summary.completed = row.count;
  });

  return summary;
}
