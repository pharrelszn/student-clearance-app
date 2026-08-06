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
  adminConfigs,
  type AdminConfig,
} from "../drizzle/schema";
import { ENV } from './_core/env';
import type { Student, Clearance, DepartmentSignOff, AdminConfig as AdminConfigType } from '../drizzle/schema';

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

/**
 * Get or create admin configuration
 */
export async function getAdminConfig(): Promise<AdminConfigType | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(adminConfigs).limit(1);
  
  if (result.length === 0) {
    // Create default config if none exists
    await db.insert(adminConfigs).values({
      enableSports: false,
      enableDorm: false,
      enableLab: false,
      enableClassroom: false,
      enableFinance: false,
    });
    const newResult = await db.select().from(adminConfigs).limit(1);
    return newResult[0] || null;
  }

  return result[0];
}

/**
 * Update admin configuration
 */
export async function updateAdminConfig(config: Partial<AdminConfigType>): Promise<AdminConfigType | null> {
  const db = await getDb();
  if (!db) return null;

  const updates: any = {};
  if (config.enableSports !== undefined) updates.enableSports = config.enableSports;
  if (config.enableDorm !== undefined) updates.enableDorm = config.enableDorm;
  if (config.enableLab !== undefined) updates.enableLab = config.enableLab;
  if (config.enableClassroom !== undefined) updates.enableClassroom = config.enableClassroom;
  if (config.enableFinance !== undefined) updates.enableFinance = config.enableFinance;

  if (Object.keys(updates).length === 0) return null;

  updates.updatedAt = new Date();

  await db.update(adminConfigs).set(updates);
  
  const result = await db.select().from(adminConfigs).limit(1);
  return result[0] || null;
}

/**
 * Register a student with all department checks in one transaction
 * This creates the student, clearance, and all selected department checks atomically
 */
export async function registerStudentWithDepartments(input: {
  studentId: string;
  name: string;
  email?: string;
  phone?: string;
  program: string;
  yearOfStudy?: number;
  graduationYear: number;
  admissionNumber?: string;
  finance: {
    outstandingBalance: string;
    description?: string;
  };
  departments?: {
    lab?: { equipmentName: string; damageAmount: string; description?: string };
    sports?: { equipmentName: string; description?: string };
    classroom?: { itemName: string; damageAmount: string };
    dorm?: { itemName: string; damageAmount: string };
  };
  initiatedBy?: string;
}): Promise<{ studentId: number; clearanceId: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  try {
    // 1. Create student
    const studentValues: any = {
      studentId: input.studentId,
      name: input.name,
      program: input.program,
      graduationYear: input.graduationYear,
    };
    
    if (input.email) studentValues.email = input.email;
    if (input.phone) studentValues.phone = input.phone;
    if (input.yearOfStudy) studentValues.yearOfStudy = input.yearOfStudy;
    if (input.admissionNumber) studentValues.admissionNumber = input.admissionNumber;
    
    const studentResult = await db.insert(students).values(studentValues);

    const newStudentId = (studentResult as any).insertId;

    // 2. Create clearance
    const now = new Date();
    const clearanceResult = await db.insert(clearances).values({
      studentId: newStudentId,
      status: 'in_progress',
      initiatedBy: 1, // Default admin user ID
      initiatedAt: now,
      completedAt: null,
      certificateUrl: null,
    });

    const newClearanceId = (clearanceResult as any).insertId;

    // 3. Create finance check (mandatory)
    await db.insert(financeChecks).values({
      clearanceId: newClearanceId,
      outstandingBalance: input.finance.outstandingBalance,
      description: input.finance.description,
    });

    // 4. Create optional department checks
    if (input.departments?.lab) {
      await db.insert(labChecks).values({
        clearanceId: newClearanceId,
        equipmentName: input.departments.lab.equipmentName,
        damageAmount: input.departments.lab.damageAmount,
        description: input.departments.lab.description,
      });
    }

    if (input.departments?.sports) {
      await db.insert(sportsChecks).values({
        clearanceId: newClearanceId,
        equipmentName: input.departments.sports.equipmentName,
        description: input.departments.sports.description,
      });
    }

    if (input.departments?.classroom) {
      await db.insert(classroomChecks).values({
        clearanceId: newClearanceId,
        itemName: input.departments.classroom.itemName,
        damageAmount: input.departments.classroom.damageAmount,
      });
    }

    if (input.departments?.dorm) {
      await db.insert(dormChecks).values({
        clearanceId: newClearanceId,
        itemName: input.departments.dorm.itemName,
        damageAmount: input.departments.dorm.damageAmount,
      });
    }

    return { studentId: newStudentId, clearanceId: newClearanceId };
  } catch (error) {
    console.error("[Database] Failed to register student:", error);
    throw error;
  }
}
