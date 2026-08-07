import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "finance", "lab", "sports", "classroom", "dorm"]).default("user").notNull(),
  department: varchar("department", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Admin configuration table - stores which information categories are enabled
 */
export const adminConfigs = mysqlTable("adminConfigs", {
  id: int("id").autoincrement().primaryKey(),
  enableSports: boolean("enableSports").default(false).notNull(),
  enableDorm: boolean("enableDorm").default(false).notNull(),
  enableLab: boolean("enableLab").default(false).notNull(),
  enableClassroom: boolean("enableClassroom").default(false).notNull(),
  enableFinance: boolean("enableFinance").default(false).notNull(),
  configuredAt: timestamp("configuredAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AdminConfig = typeof adminConfigs.$inferSelect;
export type InsertAdminConfig = typeof adminConfigs.$inferInsert;

/**
 * Students table - core student records
 */
export const students = mysqlTable("students", {
  id: int("id").autoincrement().primaryKey(),
  studentId: varchar("studentId", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  program: varchar("program", { length: 255 }).notNull(),
  yearOfStudy: int("yearOfStudy"),
  graduationYear: int("graduationYear").notNull(),
  admissionNumber: varchar("admissionNumber", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Student = typeof students.$inferSelect;
export type InsertStudent = typeof students.$inferInsert;

/**
 * Clearances table - tracks clearance process per student
 */
export const clearances = mysqlTable("clearances", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("studentId").notNull(),
  status: mysqlEnum("status", ["pending", "in_progress", "completed"]).default("pending").notNull(),
  initiatedBy: int("initiatedBy"),
  initiatedAt: timestamp("initiatedAt"),
  completedAt: timestamp("completedAt"),
  certificateUrl: text("certificateUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Clearance = typeof clearances.$inferSelect;
export type InsertClearance = typeof clearances.$inferInsert;

/**
 * Department sign-offs table - tracks each department's approval/flag status
 */
export const departmentSignOffs = mysqlTable("departmentSignOffs", {
  id: int("id").autoincrement().primaryKey(),
  clearanceId: int("clearanceId").notNull(),
  department: mysqlEnum("department", ["finance", "lab", "sports", "classroom", "dorm"]).notNull(),
  status: mysqlEnum("status", ["pending", "approved", "flagged"]).default("pending").notNull(),
  signedOffBy: int("signedOffBy"),
  signedOffAt: timestamp("signedOffAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DepartmentSignOff = typeof departmentSignOffs.$inferSelect;
export type InsertDepartmentSignOff = typeof departmentSignOffs.$inferInsert;

/**
 * Finance checks table - tracks outstanding fees
 */
export const financeChecks = mysqlTable("financeChecks", {
  id: int("id").autoincrement().primaryKey(),
  clearanceId: int("clearanceId").notNull(),
  outstandingBalance: decimal("outstandingBalance", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FinanceCheck = typeof financeChecks.$inferSelect;
export type InsertFinanceCheck = typeof financeChecks.$inferInsert;

/**
 * Lab checks table - tracks lab equipment breakages
 */
export const labChecks = mysqlTable("labChecks", {
  id: int("id").autoincrement().primaryKey(),
  clearanceId: int("clearanceId").notNull(),
  equipmentName: varchar("equipmentName", { length: 255 }).notNull(),
  damageAmount: decimal("damageAmount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  resolved: boolean("resolved").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LabCheck = typeof labChecks.$inferSelect;
export type InsertLabCheck = typeof labChecks.$inferInsert;

/**
 * Sports checks table - tracks unreturned sports equipment
 */
export const sportsChecks = mysqlTable("sportsChecks", {
  id: int("id").autoincrement().primaryKey(),
  clearanceId: int("clearanceId").notNull(),
  equipmentName: varchar("equipmentName", { length: 255 }).notNull(),
  quantity: int("quantity").default(1).notNull(),
  returned: boolean("returned").default(false).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SportsCheck = typeof sportsChecks.$inferSelect;
export type InsertSportsCheck = typeof sportsChecks.$inferInsert;

/**
 * Classroom breakage checks table
 */
export const classroomChecks = mysqlTable("classroomChecks", {
  id: int("id").autoincrement().primaryKey(),
  clearanceId: int("clearanceId").notNull(),
  itemName: varchar("itemName", { length: 255 }).notNull(),
  damageAmount: decimal("damageAmount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  resolved: boolean("resolved").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ClassroomCheck = typeof classroomChecks.$inferSelect;
export type InsertClassroomCheck = typeof classroomChecks.$inferInsert;

/**
 * Dormitory breakage checks table
 */
export const dormChecks = mysqlTable("dormChecks", {
  id: int("id").autoincrement().primaryKey(),
  clearanceId: int("clearanceId").notNull(),
  itemName: varchar("itemName", { length: 255 }).notNull(),
  damageAmount: decimal("damageAmount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  resolved: boolean("resolved").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DormCheck = typeof dormChecks.$inferSelect;
export type InsertDormCheck = typeof dormChecks.$inferInsert;

/**
 * Library books table - tracks individual lost/damaged books
 */
export const libraryBooks = mysqlTable("libraryBooks", {
  id: int("id").autoincrement().primaryKey(),
  clearanceId: int("clearanceId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  bookNumber: varchar("bookNumber", { length: 64 }).notNull(),
  isbn: varchar("isbn", { length: 20 }),
  author: varchar("author", { length: 255 }),
  fine: decimal("fine", { precision: 10, scale: 2 }),
  status: mysqlEnum("status", ["lost", "damaged", "pending", "resolved"]).default("pending").notNull(),
  approvedAt: timestamp("approvedAt"),
  approvedBy: int("approvedBy"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LibraryBook = typeof libraryBooks.$inferSelect;
export type InsertLibraryBook = typeof libraryBooks.$inferInsert;

/**
 * ICT checks table - tracks ICT equipment and issues
 */
export const ictChecks = mysqlTable("ictChecks", {
  id: int("id").autoincrement().primaryKey(),
  clearanceId: int("clearanceId").notNull(),
  equipmentType: varchar("equipmentType", { length: 255 }).notNull(),
  equipmentDescription: varchar("equipmentDescription", { length: 255 }),
  status: mysqlEnum("status", ["pending", "returned", "damaged", "resolved"]).default("pending").notNull(),
  damageAmount: decimal("damageAmount", { precision: 10, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type IctCheck = typeof ictChecks.$inferSelect;
export type InsertIctCheck = typeof ictChecks.$inferInsert;

/**
 * Medical checks table - tracks medical clearance
 */
export const medicalChecks = mysqlTable("medicalChecks", {
  id: int("id").autoincrement().primaryKey(),
  clearanceId: int("clearanceId").notNull(),
  status: mysqlEnum("status", ["pending", "cleared", "flagged"]).default("pending").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MedicalCheck = typeof medicalChecks.$inferSelect;
export type InsertMedicalCheck = typeof medicalChecks.$inferInsert;

/**
 * Registrar checks table - tracks registrar clearance
 */
export const registrarChecks = mysqlTable("registrarChecks", {
  id: int("id").autoincrement().primaryKey(),
  clearanceId: int("clearanceId").notNull(),
  status: mysqlEnum("status", ["pending", "cleared", "flagged"]).default("pending").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RegistrarCheck = typeof registrarChecks.$inferSelect;
export type InsertRegistrarCheck = typeof registrarChecks.$inferInsert;

/**
 * Relations
 */
export const clearancesRelations = relations(clearances, ({ one, many }) => ({
  student: one(students, {
    fields: [clearances.studentId],
    references: [students.id],
  }),
  departmentSignOffs: many(departmentSignOffs),
  financeChecks: many(financeChecks),
  labChecks: many(labChecks),
  sportsChecks: many(sportsChecks),
  classroomChecks: many(classroomChecks),
  dormChecks: many(dormChecks),
  libraryBooks: many(libraryBooks),
  ictChecks: many(ictChecks),
  medicalChecks: many(medicalChecks),
  registrarChecks: many(registrarChecks),
}));

export const departmentSignOffsRelations = relations(departmentSignOffs, ({ one }) => ({
  clearance: one(clearances, {
    fields: [departmentSignOffs.clearanceId],
    references: [clearances.id],
  }),
}));

export const financeChecksRelations = relations(financeChecks, ({ one }) => ({
  clearance: one(clearances, {
    fields: [financeChecks.clearanceId],
    references: [clearances.id],
  }),
}));

export const labChecksRelations = relations(labChecks, ({ one }) => ({
  clearance: one(clearances, {
    fields: [labChecks.clearanceId],
    references: [clearances.id],
  }),
}));

export const sportsChecksRelations = relations(sportsChecks, ({ one }) => ({
  clearance: one(clearances, {
    fields: [sportsChecks.clearanceId],
    references: [clearances.id],
  }),
}));

export const classroomChecksRelations = relations(classroomChecks, ({ one }) => ({
  clearance: one(clearances, {
    fields: [classroomChecks.clearanceId],
    references: [clearances.id],
  }),
}));

export const dormChecksRelations = relations(dormChecks, ({ one }) => ({
  clearance: one(clearances, {
    fields: [dormChecks.clearanceId],
    references: [clearances.id],
  }),
}));

export const libraryBooksRelations = relations(libraryBooks, ({ one }) => ({
  clearance: one(clearances, {
    fields: [libraryBooks.clearanceId],
    references: [clearances.id],
  }),
}));

export const ictChecksRelations = relations(ictChecks, ({ one }) => ({
  clearance: one(clearances, {
    fields: [ictChecks.clearanceId],
    references: [clearances.id],
  }),
}));

export const medicalChecksRelations = relations(medicalChecks, ({ one }) => ({
  clearance: one(clearances, {
    fields: [medicalChecks.clearanceId],
    references: [clearances.id],
  }),
}));

export const registrarChecksRelations = relations(registrarChecks, ({ one }) => ({
  clearance: one(clearances, {
    fields: [registrarChecks.clearanceId],
    references: [clearances.id],
  }),
}));