# Role-Based Multi-Department Clearance System - Implementation Plan

## Existing Architecture Analysis

### ✅ What Already Exists
1. **Users Table** - Has `role` and `department` fields ready for role-based system
2. **Students Table** - Single student record per student ID (good foundation)
3. **Clearances Table** - Tracks overall clearance process
4. **Department Sign-Offs** - Tracks each department's approval status
5. **Department-Specific Tables** - Finance, Lab, Sports, Classroom, Dorm, Library, ICT, Medical, Registrar
6. **tRPC API Layer** - Already in place for backend procedures
7. **Authentication System** - Keyword-based login exists

### ❌ What Needs to Be Added
1. **Super Admin role** - Add to role enum
2. **Audit Logging Table** - Track all actions with user, timestamp, action, values
3. **Final Clearance Table** - Track when Super Admin performs final clearance
4. **Reopen Clearance Table** - Track reopened clearances with reason
5. **Backend Permission Enforcement** - Verify user role/department on every API call
6. **Department-Specific Dashboards** - Filter data by user's department
7. **Super Admin Dashboard** - Show all departments and analytics
8. **Final Clearance Workflow** - Only Super Admin can final-clear

## Implementation Steps

### Phase 1: Database Schema Updates
- [ ] Add `super_admin` role to users.role enum
- [ ] Create `auditLogs` table
- [ ] Create `finalClearances` table
- [ ] Create `reopenClearances` table
- [ ] Add `finalClearedAt` to clearances table
- [ ] Add `finalClearedBy` to clearances table

### Phase 2: Authentication & Authorization
- [ ] Extend login system to support department user login
- [ ] Create Super Admin account
- [ ] Add role/department verification to context
- [ ] Create permission checking utility functions

### Phase 3: Backend API Updates
- [ ] Add permission checks to all department edit endpoints
- [ ] Implement audit logging on all mutations
- [ ] Create final clearance endpoint (Super Admin only)
- [ ] Create reopen clearance endpoint (Super Admin only)
- [ ] Create department dashboard endpoints

### Phase 4: Frontend Updates
- [ ] Update StudentSearch to show role-specific Edit buttons
- [ ] Create department-specific dashboards
- [ ] Create Super Admin dashboard
- [ ] Add final clearance workflow UI
- [ ] Add reopen clearance UI

### Phase 5: Testing
- [ ] Test Library user permissions
- [ ] Test Lab user permissions
- [ ] Test Sports user permissions
- [ ] Test Finance user permissions
- [ ] Test Super Admin permissions
- [ ] Test audit logging
- [ ] Test final clearance workflow

## Key Design Decisions

1. **Single Student Record** - All departments work on the same student (already implemented)
2. **Backend-Enforced Permissions** - Every API endpoint verifies user role/department
3. **Audit Trail** - Every action is logged with user, timestamp, before/after values
4. **Two-Step Final Clearance** - Department clearances don't auto-clear student; Super Admin must explicitly final-clear
5. **Reopen Capability** - Super Admin can reopen final clearances with reason tracking

## Database Relationships
```
User (role: super_admin | department_user)
  |
  ├── Department (if department_user)
  |
Student (single record)
  |
  ├── Clearance (overall status)
  |   |
  |   ├── DepartmentSignOff (per department)
  |   |
  |   ├── FinanceCheck
  |   ├── LibraryBooks
  |   ├── LabChecks
  |   ├── SportsChecks
  |   ├── ClassroomChecks
  |   ├── DormChecks
  |   ├── ICTChecks
  |   ├── MedicalChecks
  |   └── RegistrarChecks
  |
  ├── FinalClearance (Super Admin only)
  |
  └── ReopenClearance (Super Admin only)

AuditLog
  ├── User
  ├── Department
  ├── Student
  ├── Action
  └── Values (before/after)
```

## Security Checklist
- [ ] Backend verifies user authentication on every endpoint
- [ ] Backend verifies user role on every endpoint
- [ ] Backend verifies user department on every department-specific endpoint
- [ ] Department users cannot call Super Admin endpoints
- [ ] Super Admin can call all endpoints
- [ ] All mutations are logged to audit table
- [ ] Audit logs show who did what and when
