# Phase 1 — Data Model, Roles & Permission Engine

**Document ID:** CSMS-PLAN-PHASE-01  
**Phase:** 1 of 9  
**Status:** Ready for Implementation  
**Estimated Effort:** 1–2 Sprints (2–3 weeks)  
**Target Systems:** Express.js API, Prisma ORM, PostgreSQL, `packages/shared`  
**Source Traceability:**
- **SRS References:** §2.1 (Organizational Model), §2.2 (Roles Summary), §3 (User Roles & Permissions §3.1–§3.6 Permission Matrix), §4.1 (User/Servant Profile Data Model), §6.3 (NFR-3.1 Server-Enforced Scope Access Control), §6.5 (NFR-5.1 Scalability), §6.6 (NFR-6.1 Data-Driven Permission Matrix).
- **Assumptions Addressed:** A1 (Evaluator of امين الخدمة is امين قطاع), A3 (امين عام has identity fields only, no evaluator), A6 (Single church/org in Phase 1), A7 (No public self-registration).
- **Agile Plan Reference:** Section 3 (Phase 1 — Data Model, Roles & Permission Engine).

---

## 1. Executive Summary & Objective

The primary objective of **Phase 1** is to construct the database schema representing the church's organizational hierarchy and implement a resilient, data-driven **Permission Engine**. 

Per **NFR-6.1**, permissions must **never** be hard-coded into `if (role === 'خادم')` conditional branches scattered across route handlers. Instead, this phase introduces a central permission matrix with cumulative inheritance (each hierarchical tier inherits the capabilities of the tier below it) combined with scope evaluation (ensuring a Stage Secretary in Prep Boys cannot view or mutate Prep Girls or Primary stages). By completing this phase, every subsequent feature (Auth, Members, Attendance, Announcements) will plug into a single, bulletproof authorization middleware.

---

## 2. Previous Phase Summary & System State Baseline

### 2.1 Accomplishments from Phase 0 (Foundations)
- **Monorepo Architecture:** Established workspaces for `apps/web` (Next.js), `apps/api` (Express), `packages/shared` (TypeScript contracts), and `prisma/`.
- **Design System:** Tailwind CSS configured with exact Figma tokens (Deep Coptic Blue `#1F3A5F`, Gold Accent `#B8892B`, Warm App BG `#F6F4EE`).
- **Typography & RTL:** Global Arabic layout configured with `dir="rtl"` and Google Cairo font.
- **Component Primitives:** Reusable components (`Button`, `Badge`, `Input`, `Chip`, `AttendanceToggle`, `StatCard`, `MemberRow`, `AppBar`, `TabBar`) tested on a design catalog page.
- **Environment & DB:** Local PostgreSQL running in Docker, Prisma CLI operational, and `/health` endpoint responding with `200 OK`.

### 2.2 System State Entering Phase 1
- Database is currently empty with only baseline connection verification.
- No user tables, roles, stages, or access rules exist yet.
- The system is ready to receive relational schema migrations and backend domain services.

---

## 3. Detailed Architecture & Technical Specifications for Phase 1

### 3.1 Domain Hierarchy & Relational Schema (`prisma/schema.prisma`)

The organizational model is strictly relational and supports future multi-church scalability (NFR-5.1) while scoping to a single church in Phase 1 (Assumption A6):

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// -------------------------------------------------------------
// 1. ORGANIZATIONAL HIERARCHY
// -------------------------------------------------------------

model Organization {
  id          String    @id @default(uuid())
  name        String    // e.g. "كنيسة القديس العظيم أنبا شنودة رئيس المتوحدين"
  code        String    @unique // e.g. "SHENODA_MAIN"
  address     String?
  phone       String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  sectors     Sector[]
  users       User[]

  @@map("organizations")
}

model Sector {
  id             String       @id @default(uuid())
  organizationId String
  name           String       // e.g. "قطاع الطفولة" or "قطاع الشباب"
  code           String       // e.g. "SECTOR_CHILDREN"
  description    String?
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  stages         Stage[]
  assignments    ScopeAssignment[]

  @@unique([organizationId, code])
  @@map("sectors")
}

enum StageGender {
  COED   // مختلط (حضانة، ابتدائي، جامعة)
  MALE   // بنين (إعدادي بنين، ثانوي بنين)
  FEMALE // بنات (إعدادي بنات، ثانوي بنات)
}

model Stage {
  id             String       @id @default(uuid())
  sectorId       String
  name           String       // e.g. "إعدادي بنين"
  code           String       // Canonical taxonomy code: NURSERY, PRIMARY_1_2, etc.
  gender         StageGender  @default(COED)
  orderIndex     Int          // Display order
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  sector         Sector       @relation(fields: [sectorId], references: [id], onDelete: Cascade)
  assignments    ScopeAssignment[]

  @@unique([sectorId, code])
  @@map("stages")
}

// -------------------------------------------------------------
// 2. ROLES & DATA-DRIVEN PERMISSIONS (NFR-6.1)
// -------------------------------------------------------------

model Role {
  id          String   @id @default(uuid())
  name        String   // Arabic display name: "خادم", "مساعد امين الخدمة", etc.
  code        String   @unique // SERVANT, ASSISTANT_SECRETARY, STAGE_SECRETARY, SECTOR_SECRETARY, GENERAL_SECRETARY
  level       Int      @unique // 1 = خادم, 2 = مساعد, 3 = امين الخدمة, 4 = امين قطاع, 5 = امين عام
  description String?

  users       User[]
  permissions RolePermissionRule[]

  @@map("roles")
}

enum PermissionAction {
  LOGIN
  VIEW_OWN_PROFILE
  EDIT_OWN_PROFILE
  VIEW_OWN_FOLLOWUP
  SUBMIT_LESSON_PREP
  EDIT_OWN_SPIRITUAL_LIFE
  VIEW_YEAR_PLAN
  OPT_IN_YEAR_PLAN
  POST_STAGE_YEAR_PLAN_UPDATE // خادم limited post (FR-7.4)
  MANAGE_YEAR_PLAN_FULL       // امين الخدمة+
  EDIT_ASSIGNED_MEMBER_EVAL   // خادم 3 fields (FR-3.1, A2)
  MANAGE_MEMBER_FULL          // مساعد+ full member CRUD
  VIEW_ANNOUNCEMENT
  CREATE_ANNOUNCEMENT         // امين الخدمة+ with audience cap (FR-10.1, A5)
  ADD_PRIVATE_NOTES           // امين الخدمة+ up reporting chain (FR-8.1)
  CREATE_POLL                 // امين الخدمة+
  EDIT_SERVANT_PROFILE_EVAL   // Evaluator logic (A1, A3)
  EDIT_SERVANT_FOLLOWUP       // Supervising secretary (FR-4.1)
  VIEW_SERVANT_LESSON_PREP    // امين الخدمة+
  EDIT_SECRETARY_DATA         // امين قطاع+
  TRANSFER_SUSPEND_SERVANT    // امين عام only (FR-1.4)
  VIEW_ANALYTICS_STAGE        // مساعد & امين الخدمة
  VIEW_ANALYTICS_SECTOR       // امين قطاع
  VIEW_ANALYTICS_ORG          // امين عام
  EXPORT_REPORTS              // امين الخدمة+
}

enum ScopeRule {
  SELF                // Restricted to own record
  ASSIGNED_MEMBERS    // Restricted to directly assigned members
  STAGE               // Restricted to assigned مرحلة
  SECTOR              // Restricted to all مراحل within assigned قطاع
  ORGANIZATION        // Organization-wide
}

model RolePermissionRule {
  id          String           @id @default(uuid())
  roleId      String
  action      PermissionAction
  scopeRule   ScopeRule
  createdAt   DateTime         @default(now())

  role        Role             @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@unique([roleId, action])
  @@map("role_permission_rules")
}

// -------------------------------------------------------------
// 3. USER & SCOPE ASSIGNMENT
// -------------------------------------------------------------

enum UserStatus {
  ACTIVE
  SUSPENDED
  TRANSFERRED
}

model User {
  id             String       @id @default(uuid())
  organizationId String
  roleId         String
  fullName       String
  phoneNumber    String       @unique
  email          String?      @unique
  passwordHash   String
  status         UserStatus   @default(ACTIVE)

  // Basic Non-Evaluative Profile Fields (Editable by Self per §4.1)
  fatherConfessor     String?  // اب الاعتراف
  dateOfBirth         DateTime?
  address             String?
  maritalStatus       String?  // Single / Married
  spouseName          String?
  educationOrCareer   String?  // Studying / Military / Graduated
  childrenInfo        Json?    // Array of { name, age }

  // System & Audit
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  organization   Organization @relation(fields: [organizationId], references: [id])
  role           Role         @relation(fields: [roleId], references: [id])
  scopeAssignments ScopeAssignment[]
  evaluationsReceived ServantEvaluation[] @relation("SubjectEvaluations")
  evaluationsWritten  ServantEvaluation[] @relation("EvaluatorEvaluations")

  @@index([organizationId, roleId])
  @@map("users")
}

model ScopeAssignment {
  id        String   @id @default(uuid())
  userId    String
  sectorId  String?  // Set if user is scoped to a sector (امين قطاع)
  stageId   String?  // Set if user is scoped to a stage (خادم, مساعد, امين الخدمة)
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  sector    Sector?  @relation(fields: [sectorId], references: [id], onDelete: Cascade)
  stage     Stage?   @relation(fields: [stageId], references: [id], onDelete: Cascade)

  @@unique([userId, stageId, sectorId])
  @@map("scope_assignments")
}

// Evaluative Fields Model (Separated for Audit & Strict Access Control)
model ServantEvaluation {
  id                     String   @id @default(uuid())
  subjectUserId          String   // The servant/secretary being evaluated
  evaluatorUserId        String   // The supervisor setting the marks
  financialStatus        String?  // الحالة المادية
  behaviorWithMembers    String?  // السلوك مع المخدومين
  behaviorWithServants   String?  // السلوك مع الزملاء الخدام
  cooperation            String?  // التعاون
  individualInitiative   String?  // العمل الفردي والمبادرة
  notes                  String?
  updatedAt              DateTime @updatedAt
  createdAt              DateTime @default(now())

  subject                User     @relation("SubjectEvaluations", fields: [subjectUserId], references: [id], onDelete: Cascade)
  evaluator              User     @relation("EvaluatorEvaluations", fields: [evaluatorUserId], references: [id], onDelete: Cascade)

  @@unique([subjectUserId])
  @@map("servant_evaluations")
}
```

---

### 3.2 Canonical Stage Taxonomy Seed Data (§2.1B)

The database seed must prepopulate the verified fixed taxonomy:
1. `NURSERY`: حضانة (Co-ed)
2. `PRIMARY_1_2`: ابتدائي 1 و 2 (Co-ed)
3. `PRIMARY_3_4`: ابتدائي 3 و 4 (Co-ed)
4. `PRIMARY_5_6`: ابتدائي 5 و 6 (Co-ed)
5. `PREP_BOYS`: اعدادي بنين (Boys)
6. `PREP_GIRLS`: اعدادي بنات (Girls)
7. `SECONDARY_BOYS`: ثانوي بنين (Boys)
8. `SECONDARY_GIRLS`: ثانوي بنات (Girls)
9. `UNIVERSITY`: جامعة (Co-ed)

---

### 3.3 The Cumulative Permission Engine & Scope Resolution

#### 1. Cumulative Inheritance Model
Roles have an integer level:
- Level 1: `خادم` (Servant)
- Level 2: `مساعد امين الخدمة` (Assistant Stage Secretary)
- Level 3: `امين الخدمة` (Stage Secretary)
- Level 4: `امين قطاع` (Sector Secretary)
- Level 5: `امين عام` (General Secretary)

When checking if a user has permission for an action, the engine executes:
```typescript
// packages/shared/src/permissions/evaluator.ts

export interface UserContext {
  userId: string;
  roleLevel: number;
  roleCode: string;
  stageIds: string[];  // Stages user has explicit or inherited access to
  sectorIds: string[]; // Sectors user has explicit or inherited access to
  orgId: string;
}

export function hasPermission(
  user: UserContext,
  requiredAction: PermissionAction,
  targetScope: { stageId?: string; sectorId?: string; orgId?: string; targetUserId?: string }
): boolean {
  // 1. Fetch minimum role level required for action from Permission Matrix
  const rule = PERMISSION_MATRIX[requiredAction];
  if (!rule) return false;

  // 2. Cumulative level check: User's level must be >= required level
  if (user.roleLevel < rule.minLevel) {
    return false;
  }

  // 3. Organization-level authority (Level 5 - امين عام) bypasses stage/sector boundaries
  if (user.roleLevel === 5 && user.orgId === targetScope.orgId) {
    return true;
  }

  // 4. Sector-level authority (Level 4 - امين قطاع)
  if (user.roleLevel === 4) {
    if (targetScope.sectorId && user.sectorIds.includes(targetScope.sectorId)) {
      return true;
    }
    // If target is a stage, verify stage belongs to one of user's assigned sectors
    if (targetScope.stageId && isStageInSectors(targetScope.stageId, user.sectorIds)) {
      return true;
    }
    return false;
  }

  // 5. Stage-level authority (Level 2 & 3 - مساعد & امين الخدمة)
  if (user.roleLevel >= 2) {
    if (targetScope.stageId && user.stageIds.includes(targetScope.stageId)) {
      return true;
    }
    return false;
  }

  // 6. Servant (Level 1 - خادم)
  if (rule.scopeRule === 'SELF') {
    return targetScope.targetUserId === user.userId;
  }

  return false;
}
```

#### 2. Resolving Evaluator Relationships (Assumptions A1 & A3)
The system resolves "Who evaluates whom" programmatically based on superior hierarchy:
- If Subject is `خادم` or `مساعد`: Evaluator is `امين الخدمة` of that مرحلة.
- If Subject is `امين الخدمة`: Evaluator is `امين قطاع` of the parent قطاع (**Assumption A1**).
- If Subject is `امين قطاع`: Evaluator is `امين عام` (**Assumption A1**).
- If Subject is `امين عام`: Has no evaluator (**Assumption A3**). Evaluative fields are disabled and hidden.

---

### 3.4 Authorization Middleware (`apps/api/src/middleware/authorize.ts`)

Every secured Express endpoint uses a declarative, type-safe middleware:

```typescript
import { Request, Response, NextFunction } from 'express';
import { PermissionAction } from '@prisma/client';
import { hasPermission } from '@shenoda/shared';

export function requirePermission(action: PermissionAction) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user; // populated by authenticateToken middleware
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' });
    }

    const targetScope = {
      stageId: req.params.stageId || req.body.stageId || req.query.stageId as string,
      sectorId: req.params.sectorId || req.body.sectorId || req.query.sectorId as string,
      orgId: user.organizationId,
      targetUserId: req.params.userId || req.body.userId as string,
    };

    const allowed = hasPermission(user, action, targetScope);
    if (!allowed) {
      return res.status(403).json({
        error: 'Forbidden: Insufficient privileges or scope mismatch',
        code: 'ACCESS_DENIED_SCOPE',
        details: { action, requiredLevel: PERMISSION_MATRIX[action].minLevel, userLevel: user.roleLevel }
      });
    }

    next();
  };
}
```

---

## 4. Step-by-Step Task Breakdown

| Task ID | Work Area | Description | Deliverable / Path |
|---|---|---|---|
| **TASK-01-1** | Prisma Schema | Write and migrate full relational schema: `Organization`, `Sector`, `Stage`, `Role`, `User`, `ScopeAssignment`, `ServantEvaluation`. | `prisma/schema.prisma` |
| **TASK-01-2** | Shared Contracts | Export `RoleLevel`, `PermissionAction`, and `PERMISSION_MATRIX` configuration table in shared package. | `packages/shared/src/permissions/*` |
| **TASK-01-3** | Evaluation Resolver | Implement domain helper `getEvaluatorForUser(userId)` implementing Assumptions A1 and A3. | `apps/api/src/services/evaluationHierarchy.service.ts` |
| **TASK-01-4** | Scope Resolver | Build service that hydrates a user's full reachable stages and sectors upon request context creation. | `apps/api/src/services/scopeResolver.service.ts` |
| **TASK-01-5** | Express Middleware | Create `requirePermission(action)` middleware with server-side 403 enforcement. | `apps/api/src/middleware/authorize.ts` |
| **TASK-01-6** | Seed Script | Create realistic seed data containing 1 Church, 2 Sectors, 9 Stages, and 5 demo users (one for each role tier). | `prisma/seed.ts` |
| **TASK-01-7** | Unit Test Suite | Write unit tests for cumulative role inheritance and permission matrix rules. | `packages/shared/tests/permissions.test.ts` |
| **TASK-01-8** | Integration Tests | Write API integration tests testing real HTTP requests against secured routes for scope isolation. | `apps/api/tests/scopeIsolation.test.ts` |

---

## 5. Testing & Quality Assurance Plan

1. **Permission Matrix Unit Tests:**
   - Verify `خادم` (Level 1) receives `false` when requesting `MANAGE_MEMBER_FULL`.
   - Verify `مساعد` (Level 2) receives `true` for `MANAGE_MEMBER_FULL` on own مرحلة.
   - Verify `امين الخدمة` (Level 3) receives `true` for all actions allowed to Level 1 and 2.
   - Verify `امين قطاع` (Level 4) can access any مرحلة belonging to their sector, but cannot access an unrelated sector.
2. **Scope Isolation Integration Tests:**
   - User `servant_prep_boys` attempts to query or edit data for `stage_prep_girls` using direct UUID parameter manipulation → Expect immediate `403 Forbidden` (`ACCESS_DENIED_SCOPE`).
3. **Assumptions A1 & A3 Verification:**
   - Attempt by `امين الخدمة` to set his own evaluation fields → Rejected with `403 Forbidden`.
   - Evaluation update for `امين الخدمة` executed by `امين قطاع` → `200 OK`.
   - Verify `امين عام` user profile exposes no evaluative fields or endpoints.

---

## 6. Definition of Done (DoD) Checklist

- [ ] Prisma migration runs successfully against local PostgreSQL with 0 errors.
- [ ] Database contains the 9 canonical stages with correct genders and sectors.
- [ ] Role table seeded with 5 levels (1 to 5).
- [ ] Permission matrix table populated with all actions from SRS §3.6.
- [ ] Scope resolution service resolves child stages from parent sectors correctly.
- [ ] Authorization middleware blocks unpermitted actions and unpermitted scopes with HTTP 403.
- [ ] Assumptions A1, A3, A6, and A7 pass explicit automated test assertions.
- [ ] Test coverage on permission and scope logic exceeds 95%.

---

## 7. Next Phase Handoff & Prerequisites

**Handoff to Phase 2 (Authentication & Account Management):**
- Schema models `User`, `Role`, and `ScopeAssignment` ready for authentication credentials.
- Permission rules for `CREATE_USER` and `TRANSFER_SUSPEND_SERVANT` ready in authorization engine.
- Seed data has test accounts with known credentials ready for login validation.
