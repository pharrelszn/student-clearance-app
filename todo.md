# Student Clearance App - TODO

## Database & Backend
- [x] Design and implement database schema (students, clearances, department checks, sign-offs)
- [x] Create tRPC procedures for student search, clearance initiation, and department operations
- [x] Implement department sign-off workflow logic
- [x] Build clearance status calculation and tracking
- [x] Create certificate generation endpoint

## Frontend - Layout & Design
- [x] Set up editorial design system (cream background, serif typography, geometric lines)
- [x] Create DashboardLayout customization with editorial aesthetic
- [x] Implement global styling with Tailwind and CSS variables
- [x] Set up navigation structure for admin dashboard

## Frontend - Core Features
- [x] Build student search and profile view page
- [x] Implement clearance initiation workflow
- [x] Create finance department check UI
- [x] Create lab department check UI
- [x] Create sports department check UI
- [x] Create classroom breakage check UI
- [x] Create dormitory breakage check UI
- [x] Build overall clearance status dashboard

## Frontend - Clearance Workflow
- [x] Implement per-department sign-off UI components
- [x] Build department approval/flag workflow
- [x] Create clearance status tracking display
- [x] Implement real-time status updates

## Certificate & Export
- [x] Build clearance certificate template
- [x] Implement PDF generation for certificates
- [x] Create certificate download functionality
- [x] Auto-trigger certificate generation on full clearance

## Testing & Demo Data
- [x] Seed demo students and clearance records
- [x] Test all department workflows
- [x] Verify certificate generation
- [x] Test status dashboard calculations
- [x] Create checkpoint for deployment

## Recent Fixes (Current Session)
- [x] Fixed TypeScript compilation errors (0 errors)
- [x] Added departmentSignOffs creation to registerStudentWithDepartments
- [x] Fixed updateAdminConfig to return config object
- [x] Added missing React imports to StudentRegistration
- [x] Student registration form works end-to-end

## Library Management Implementation
- [x] Add library_books table to database schema
- [x] Add ictChecks, medicalChecks, registrarChecks tables
- [x] Implement backend procedures for creating/updating library books
- [x] Implement individual book approval workflow (libraryBook.approveBook)
- [x] Implement Library clearance status logic (cleared when all books approved)
- [x] Update registration form to include Library section with "Add Lost Book" functionality
- [x] Update clearance detail page to display individual books
- [x] Harden approveBook with validation (verify book exists and belongs to clearance)
- [x] Test Library data persistence and approval workflow
- [x] Final checkpoint and deployment (version: a6c6c42e)

## Edit Student Feature (Current)
- [x] Add Edit button to StudentSearch page
- [x] Create EditStudent modal/form component
- [x] Add student.update tRPC procedure with validation
- [x] Harden update with duplicate studentId checking
- [x] Test edit workflow end-to-end (TypeScript: 0 errors)
- [x] Save checkpoint with Edit Student feature


## Role-Based Multi-Department System (NEW)

### Phase 1: Database Schema
- [x] Add auditLogs table to track all actions
- [x] Add finalClearances table to track Super Admin clearances
- [x] Add reopenClearances table to track clearance reopenings
- [x] Add departmentPasscodes table to store/manage passcodes
- [x] Seed department passcodes (superadminkabianga2026, librarykabianga2026, etc.)
- [x] Generate and apply migration SQL (version: 91d35f2b)

### Phase 2: Authentication & Authorization
- [x] Update login system to support department passcodes (version: 883424af)
- [x] Create Super Admin login flow
- [x] Add role/department verification to ProtectedRoute
- [ ] Create permission checking utility functions
- [ ] Implement backend permission enforcement

### Phase 3: Backend API Updates
- [x] Add permission checks to all department edit endpoints (requireDepartmentAccess middleware)
- [x] Implement audit logging on all mutations (logAuditAction in approve/flag)
- [x] Create Super Admin dashboard endpoints (getAuditLogs, getClearanceSummary, getAllClearances)
- [ ] Create final clearance endpoint (Super Admin only)
- [ ] Create reopen clearance endpoint (Super Admin only)
- [ ] Create department-specific dashboard endpoints

### Phase 4: Frontend Updates
- [x] Update login page for department passcodes (version: c8ced47a)
- [x] Create Super Admin dashboard component (SuperAdminDashboard.tsx)
- [x] Add Super Admin dashboard route (/admin/dashboard)
- [x] Add Super Admin dashboard button to Dashboard
- [ ] Create department-specific dashboards
- [ ] Add final clearance workflow UI
- [ ] Add reopen clearance UI

### Phase 5: Testing & Deployment
- [ ] Test Library user permissions
- [ ] Test Lab user permissions
- [ ] Test Sports user permissions
- [ ] Test Finance user permissions
- [ ] Test Super Admin permissions
- [ ] Test audit logging
- [ ] Test final clearance workflow
- [ ] Save final checkpoint


## Critical Gaps to Address Before Next Checkpoint

### Backend Permission & Audit Coverage
- [ ] Apply requireDepartmentAccess/requireSuperAdmin to ALL department mutation endpoints (finance/lab/sports/classroom/dorm/library/ict/medical/registrar add/update)
- [ ] Add audit logging to student registration (registerWithDepartments)
- [ ] Add audit logging to student update endpoint
- [ ] Add audit logging to student delete endpoint
- [ ] Add audit logging to library book approval (libraryBook.approveBook)
- [ ] Add audit logging to admin config changes
- [ ] Verify all mutations log to auditLogs table with proper user/role/department context

### Testing & Verification
- [ ] Write vitest test: Department user cannot approve clearance for different department
- [ ] Write vitest test: Department user cannot flag clearance for different department
- [ ] Write vitest test: Super Admin can approve/flag any department clearance
- [ ] Write vitest test: Audit logs created for each approval/flag action
- [ ] Write vitest test: Student registration creates audit log entry
- [ ] Manual testing: Department users can only see/edit their own department data
- [ ] Manual testing: Super Admin can view all audit logs and clearances
