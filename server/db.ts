import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, students, clearances, financeChecks, labChecks, sportsChecks, classroomChecks, dormChecks, adminConfigs, departmentSignOffs, libraryBooks, ictChecks, medicalChecks, registrarChecks } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

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

export async function getStudentById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.select().from(students).where(eq(students.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getStudentByStudentId(studentId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.select().from(students).where(eq(students.studentId, studentId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getAllStudents() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return await db.select().from(students);
}

export async function createStudent(data: {
  studentId: string;
  name: string;
  email?: string;
  phone?: string;
  program: string;
  yearOfStudy?: number;
  graduationYear: number;
  admissionNumber?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  // Check if student already exists
  const existing = await db.select().from(students).where(eq(students.studentId, data.studentId)).limit(1);
  if (existing && existing.length > 0) {
    throw new Error(`Student with ID ${data.studentId} already exists`);
  }

  const insertData: any = {
    studentId: String(data.studentId),
    name: String(data.name),
    program: String(data.program),
    graduationYear: Number(data.graduationYear),
  };

  if (data.email) insertData.email = String(data.email);
  if (data.phone) insertData.phone = String(data.phone);
  if (data.yearOfStudy !== undefined && data.yearOfStudy !== null) insertData.yearOfStudy = Number(data.yearOfStudy);
  if (data.admissionNumber) insertData.admissionNumber = String(data.admissionNumber);

  try {
    await db.insert(students).values(insertData);
  } catch (error: any) {
    console.error("[Database] Student insert error:", error.message);
    throw new Error(`Failed to insert student: ${error.message}`);
  }
  
  // Retrieve the inserted student
  const result = await db.select().from(students).where(eq(students.studentId, data.studentId)).limit(1);
  if (!result || result.length === 0) {
    throw new Error("Failed to retrieve inserted student");
  }
  return result[0];
}

export async function deleteStudent(studentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  // Delete related records first
  const clearanceRecords = await db.select().from(clearances).where(eq(clearances.studentId, studentId));
  
  for (const clearance of clearanceRecords) {
    await db.delete(departmentSignOffs).where(eq(departmentSignOffs.clearanceId, clearance.id));
    await db.delete(financeChecks).where(eq(financeChecks.clearanceId, clearance.id));
    await db.delete(labChecks).where(eq(labChecks.clearanceId, clearance.id));
    await db.delete(sportsChecks).where(eq(sportsChecks.clearanceId, clearance.id));
    await db.delete(classroomChecks).where(eq(classroomChecks.clearanceId, clearance.id));
    await db.delete(dormChecks).where(eq(dormChecks.clearanceId, clearance.id));
    await db.delete(libraryBooks).where(eq(libraryBooks.clearanceId, clearance.id));
    await db.delete(ictChecks).where(eq(ictChecks.clearanceId, clearance.id));
    await db.delete(medicalChecks).where(eq(medicalChecks.clearanceId, clearance.id));
    await db.delete(registrarChecks).where(eq(registrarChecks.clearanceId, clearance.id));
  }

  await db.delete(clearances).where(eq(clearances.studentId, studentId));
  await db.delete(students).where(eq(students.id, studentId));
}

export async function getClearanceWithDetails(clearanceId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const clearanceData = await db.select().from(clearances).where(eq(clearances.id, clearanceId)).limit(1);
  if (!clearanceData || clearanceData.length === 0) return null;

  const clearance = clearanceData[0];
  const financeData = await db.select().from(financeChecks).where(eq(financeChecks.clearanceId, clearanceId));
  const labData = await db.select().from(labChecks).where(eq(labChecks.clearanceId, clearanceId));
  const sportsData = await db.select().from(sportsChecks).where(eq(sportsChecks.clearanceId, clearanceId));
  const classroomData = await db.select().from(classroomChecks).where(eq(classroomChecks.clearanceId, clearanceId));
  const dormData = await db.select().from(dormChecks).where(eq(dormChecks.clearanceId, clearanceId));
  const libraryData = await db.select().from(libraryBooks).where(eq(libraryBooks.clearanceId, clearanceId));
  const ictData = await db.select().from(ictChecks).where(eq(ictChecks.clearanceId, clearanceId));
  const medicalData = await db.select().from(medicalChecks).where(eq(medicalChecks.clearanceId, clearanceId));
  const registrarData = await db.select().from(registrarChecks).where(eq(registrarChecks.clearanceId, clearanceId));
  const signOffsData = await db.select().from(departmentSignOffs).where(eq(departmentSignOffs.clearanceId, clearanceId));

  return {
    ...clearance,
    finance: financeData.length > 0 ? financeData[0] : null,
    lab: labData.length > 0 ? labData[0] : null,
    sports: sportsData.length > 0 ? sportsData[0] : null,
    classroom: classroomData.length > 0 ? classroomData[0] : null,
    dorm: dormData.length > 0 ? dormData[0] : null,
    library: libraryData,
    ict: ictData.length > 0 ? ictData[0] : null,
    medical: medicalData.length > 0 ? medicalData[0] : null,
    registrar: registrarData.length > 0 ? registrarData[0] : null,
    departmentSignOffs: signOffsData,
  };
}

export async function getAdminConfig() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.select().from(adminConfigs).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateAdminConfig(config: {
  enableFinance?: boolean;
  enableLab?: boolean;
  enableSports?: boolean;
  enableClassroom?: boolean;
  enableDorm?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const existing = await getAdminConfig();
  
  if (existing) {
    await db.update(adminConfigs).set(config).where(eq(adminConfigs.id, existing.id));
    return { ...existing, ...config };
  } else {
    const newConfig = {
      enableFinance: config.enableFinance ?? false,
      enableLab: config.enableLab ?? false,
      enableSports: config.enableSports ?? false,
      enableClassroom: config.enableClassroom ?? false,
      enableDorm: config.enableDorm ?? false,
    };
    await db.insert(adminConfigs).values(newConfig);
    return newConfig;
  }
}

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
    library?: { books: Array<{ title: string; bookNumber: string; isbn?: string; author?: string; fine?: string }> };
    ict?: { equipmentType: string; equipmentDescription?: string; damageAmount?: string };
    medical?: { notes?: string };
    registrar?: { notes?: string };
  };
}): Promise<{ studentId: number; clearanceId: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  try {
    // 1. Create student
    const student = await createStudent({
      studentId: input.studentId,
      name: input.name,
      email: input.email,
      phone: input.phone,
      program: input.program,
      yearOfStudy: input.yearOfStudy,
      graduationYear: input.graduationYear,
      admissionNumber: input.admissionNumber,
    });

    const newStudentId = student.id;

    // 2. Create clearance
    const now = new Date();
    await db.insert(clearances).values({
      studentId: newStudentId,
      status: 'in_progress',
      initiatedBy: 1,
      initiatedAt: now,
      completedAt: null,
      certificateUrl: null,
    });

    // Get the clearance ID
    const clearanceData = await db.select().from(clearances).where(eq(clearances.studentId, newStudentId)).limit(1);
    if (!clearanceData || clearanceData.length === 0) {
      throw new Error("Failed to create clearance");
    }
    const newClearanceId = clearanceData[0].id;

    // 3. Create departmentSignOffs for Finance (mandatory)
    await db.insert(departmentSignOffs).values({
      clearanceId: newClearanceId,
      department: 'finance',
      status: 'pending',
    });

    // 4. Create finance check (mandatory)
    await db.insert(financeChecks).values({
      clearanceId: newClearanceId,
      outstandingBalance: input.finance.outstandingBalance as any,
      description: input.finance.description || null,
    });

    // 6. Create optional department checks and sign-offs
    if (input.departments?.lab) {
      await db.insert(departmentSignOffs).values({
        clearanceId: newClearanceId,
        department: 'lab',
        status: 'pending',
      });
      await db.insert(labChecks).values({
        clearanceId: newClearanceId,
        equipmentName: input.departments.lab.equipmentName,
        damageAmount: input.departments.lab.damageAmount as any,
        description: input.departments.lab.description || null,
      });
    }

    if (input.departments?.sports) {
      await db.insert(departmentSignOffs).values({
        clearanceId: newClearanceId,
        department: 'sports',
        status: 'pending',
      });
      await db.insert(sportsChecks).values({
        clearanceId: newClearanceId,
        equipmentName: input.departments.sports.equipmentName,
        description: input.departments.sports.description || null,
      });
    }

    if (input.departments?.classroom) {
      await db.insert(departmentSignOffs).values({
        clearanceId: newClearanceId,
        department: 'classroom',
        status: 'pending',
      });
      await db.insert(classroomChecks).values({
        clearanceId: newClearanceId,
        itemName: input.departments.classroom.itemName,
        damageAmount: input.departments.classroom.damageAmount as any,
        description: null,
      });
    }

    if (input.departments?.dorm) {
      await db.insert(departmentSignOffs).values({
        clearanceId: newClearanceId,
        department: 'dorm',
        status: 'pending',
      });
      await db.insert(dormChecks).values({
        clearanceId: newClearanceId,
        itemName: input.departments.dorm.itemName,
        damageAmount: input.departments.dorm.damageAmount as any,
        description: null,
      });
    }

    if (input.departments?.library) {
      await db.insert(departmentSignOffs).values({
        clearanceId: newClearanceId,
        department: 'library',
        status: 'pending',
      });
      for (const book of input.departments.library.books) {
        await db.insert(libraryBooks).values({
          clearanceId: newClearanceId,
          title: book.title,
          bookNumber: book.bookNumber,
          isbn: book.isbn || null,
          author: book.author || null,
          fine: book.fine ? (book.fine as any) : null,
          status: 'pending',
        });
      }
    }

    if (input.departments?.ict) {
      await db.insert(departmentSignOffs).values({
        clearanceId: newClearanceId,
        department: 'ict',
        status: 'pending',
      });
      await db.insert(ictChecks).values({
        clearanceId: newClearanceId,
        equipmentType: input.departments.ict.equipmentType,
        equipmentDescription: input.departments.ict.equipmentDescription || null,
        damageAmount: input.departments.ict.damageAmount ? (input.departments.ict.damageAmount as any) : null,
      });
    }

    if (input.departments?.medical) {
      await db.insert(departmentSignOffs).values({
        clearanceId: newClearanceId,
        department: 'medical',
        status: 'pending',
      });
      await db.insert(medicalChecks).values({
        clearanceId: newClearanceId,
        notes: input.departments.medical.notes || null,
      });
    }

    if (input.departments?.registrar) {
      await db.insert(departmentSignOffs).values({
        clearanceId: newClearanceId,
        department: 'registrar',
        status: 'pending',
      });
      await db.insert(registrarChecks).values({
        clearanceId: newClearanceId,
        notes: input.departments.registrar.notes || null,
      });
    }

    return { studentId: newStudentId, clearanceId: newClearanceId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Database] Failed to register student:", errorMessage);
    throw new Error(`Failed to register student: ${errorMessage}`);
  }
}


export async function searchStudents(query: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  
  return await db.select().from(students).where(
    query ? eq(students.studentId, query) : undefined
  ).limit(10);
}

export async function getClearanceStatusSummary() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const allClearances = await db.select().from(clearances);
  
  const pending = allClearances.filter(c => c.status === 'pending').length;
  const inProgress = allClearances.filter(c => c.status === 'in_progress').length;
  const completed = allClearances.filter(c => c.status === 'completed').length;

  return { pending, inProgress, completed, total: allClearances.length };
}

export async function getOrCreateClearance(studentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const existing = await db.select().from(clearances).where(eq(clearances.studentId, studentId)).limit(1);
  
  if (existing && existing.length > 0) {
    return existing[0];
  }

  const now = new Date();
  await db.insert(clearances).values({
    studentId,
    status: 'pending',
    initiatedBy: 1,
    initiatedAt: now,
  });

  const created = await db.select().from(clearances).where(eq(clearances.studentId, studentId)).limit(1);
  return created[0];
}
