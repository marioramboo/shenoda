# Phase 3 — Servant (خادم) & Member (مخدوم) Records

**Document ID:** CSMS-PLAN-PHASE-03  
**Phase:** 3 of 9  
**Status:** Ready for Implementation  
**Estimated Effort:** 2 Sprints (2–3 weeks)  
**Target Systems:** Next.js (App Router), Express API, Prisma ORM, PostgreSQL, Audit Logger  
**Source Traceability:**
- **SRS References:** §1.2 (Scope: Records only for مخدومين — no login), §1.4 (Assumption A1 Evaluator Hierarchy, Assumption A2 Servant Field-Level Permissions, Assumption A3 General Secretary Profile), §4.1 (Servant Profile Data Model), §4.2 (Served Member Data Model), §5.2 (FR-2.1 Self-Profile Edit, FR-2.2 Supervisor Evaluative Edit, FR-2.3 Evaluative Audit Trail), §5.3 (FR-3.1 Servant 3-Field Update, FR-3.2 Assistant Secretary Member CRUD, FR-3.3 Bulk Member Import, FR-3.4 Member No Login), §5.8 (FR-8.1 Private Notes, FR-8.2 Upward-Only Visibility), §6.3 (NFR-3.1 Minor Data Server-Side Scope, NFR-3.3 Sensitive Field Access Logging).
- **Figma Prototype:** [Figma Design File](https://www.figma.com/design/BSSLc7uXAfjZUIg60Ghjl5) (Screen: Members List / قائمة المخدومين, Screen: Member Profile / ملف المخدوم, Viewport 390px).
- **Agile Plan Reference:** Section 5 (Phase 3 — Servant & Member Records).

---

## 1. Executive Summary & Objective

The objective of **Phase 3** is to model and deliver the system's two core human entities: **Servants (الخدام)** and **Served Members (المخدومين)**.

This phase is critical for data privacy and role enforcement:
1. **Served Members are strictly records with NO authentication capabilities** (FR-3.4). Because most members are minors, **NFR-3.1** demands bulletproof server-side scope validation.
2. In accordance with **Assumption A2**, servants have a granular, field-level permission: a servant can view and edit *only* 3 specific evaluative fields (financial status, behavior, and integration) exclusively for members directly assigned to them.
3. Full record creation, editing, and reassignment is restricted to Assistant Secretaries (`مساعد امين الخدمة`) and above within their stage.
4. An immutable **Sensitive Field Access Logger** (NFR-3.3) tracks every view and mutation of financial data, phone numbers, and addresses.
5. Private supervisory notes (FR-8.1, FR-8.2) are introduced with upward-only reporting chain visibility.

---

## 2. Previous Phase Summary & System State Baseline

### 2.1 Accomplishments from Phase 2 (Authentication & Accounts)
- **Production Auth Pipeline:** Argon2id password hashing, JWT access tokens with silent refresh cycles, and brute-force lockout.
- **Account Provisioning:** Scoped servant account creation executed by authorized secretaries; no self-registration.
- **General Secretary Control:** Ability to suspend accounts or transfer servants across stages with full audit history (`account_status_logs`).
- **Figma Login Screen:** 390px mobile-first Arabic RTL login screen active and connected to state.
- **Session Context:** `req.user` hydrated with role level, stage IDs, and sector IDs on all authenticated API requests.

### 2.2 System State Entering Phase 3
- Servants can authenticate and obtain JWTs.
- `User` table holds identity and basic profile information, but served members (`ServedMember`) do not yet exist in the schema.
- No member lists, member profiles, bulk import tools, or confidential notes exist.

---

## 3. Detailed Architecture & Technical Specifications for Phase 3

### 3.1 Extended Relational Schema (`prisma/schema.prisma`)

```prisma
// -------------------------------------------------------------
// 1. SERVED MEMBERS (المخدومين) — RECORDS ONLY (FR-3.4)
// -------------------------------------------------------------

model ServedMember {
  id                  String       @id @default(uuid())
  stageId             String
  fullName            String
  dateOfBirth         DateTime
  address             String
  phoneNumber         String?      // Minor or primary guardian phone
  fatherConfessor     String?      // Optional for younger stages

  // Family & Academic Background
  fatherName          String?
  fatherAge           Int?
  motherName          String?
  motherAge           Int?
  schoolOrUniversity  String?
  educationalGrade    String?      // e.g. "الصف الثاني الإعدادي"
  siblingsInfo        Json?        // Array of { name, age }

  // Evaluative Fields (Editable by assigned servant per A2)
  financialStatus     String?      // الحالة المادية
  behaviorInService   String?      // سلوكه في الخدمة
  peerIntegration     String?      // اندماجه مع زملائه

  createdAt           DateTime     @default(now())
  updatedAt           DateTime     @updatedAt

  stage               Stage        @relation(fields: [stageId], references: [id])
  servantAssignments MemberServantAssignment[]
  auditLogs           MemberAuditLog[]
  sensitiveAccessLogs SensitiveAccessLog[]

  @@index([stageId])
  @@map("served_members")
}

model MemberServantAssignment {
  id             String       @id @default(uuid())
  memberId       String
  servantUserId  String       // Must have role خادم or above
  assignedAt     DateTime     @default(now())
  assignedById   String       // Assistant Secretary or above who made the assignment

  member         ServedMember @relation(fields: [memberId], references: [id], onDelete: Cascade)
  servant        User         @relation("AssignedMembers", fields: [servantUserId], references: [id], onDelete: Cascade)
  assignedBy     User         @relation("AssignmentCreators", fields: [assignedById], references: [id])

  @@unique([memberId, servantUserId])
  @@index([servantUserId])
  @@map("member_servant_assignments")
}

// -------------------------------------------------------------
// 2. AUDIT LOGS & SENSITIVE ACCESS (NFR-3.3 & FR-2.3)
// -------------------------------------------------------------

enum SensitiveField {
  FINANCIAL_STATUS
  PHONE_NUMBER
  HOME_ADDRESS
  GUARDIAN_INFO
}

enum AccessType {
  VIEW
  UPDATE
  EXPORT
}

model SensitiveAccessLog {
  id             String         @id @default(uuid())
  userId         String         // Who accessed the data
  memberId       String?        // If member data accessed
  targetUserId   String?        // If servant data accessed
  field          SensitiveField
  accessType     AccessType
  ipAddress      String?
  createdAt      DateTime       @default(now())

  user           User           @relation(fields: [userId], references: [id])
  member         ServedMember?  @relation(fields: [memberId], references: [id], onDelete: SetNull)

  @@index([userId, createdAt])
  @@map("sensitive_access_logs")
}

model MemberAuditLog {
  id          String       @id @default(uuid())
  memberId    String
  changedById String
  fieldName   String
  oldValue    String?
  newValue    String?
  createdAt   DateTime     @default(now())

  member      ServedMember @relation(fields: [memberId], references: [id], onDelete: Cascade)
  changedBy   User         @relation(fields: [changedById], references: [id])

  @@index([memberId])
  @@map("member_audit_logs")
}

// -------------------------------------------------------------
// 3. PRIVATE SUPERVISORY NOTES (FR-8.1 & FR-8.2)
// -------------------------------------------------------------

model SupervisoryNote {
  id             String   @id @default(uuid())
  targetUserId   String   // The servant or secretary this note is about
  authorUserId   String   // Must be امين الخدمة or above
  stageId        String   // Scope of the note
  content        String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  targetUser     User     @relation("SubjectNotes", fields: [targetUserId], references: [id], onDelete: Cascade)
  authorUser     User     @relation("AuthorNotes", fields: [authorUserId], references: [id], onDelete: Cascade)
  stage          Stage    @relation(fields: [stageId], references: [id], onDelete: Cascade)

  @@index([targetUserId])
  @@map("supervisory_notes")
}
```

---

### 3.2 Granular Permission Logic — Assumption A2 Enforcement

The system distinguishes between **Full Member Management** and **Assigned Member Evaluative Updates**:

```typescript
// packages/shared/src/permissions/memberAccess.ts

export enum MemberAccessLevel {
  NONE,
  ASSIGNED_EVALUATIVE_ONLY, // خادم (Level 1) assigned to this member (Assumption A2)
  STAGE_FULL_ACCESS,        // مساعد (Level 2) and امين الخدمة (Level 3) within stage
  SECTOR_FULL_ACCESS,       // امين قطاع (Level 4) within sector
  ORG_FULL_ACCESS           // امين عام (Level 5) org-wide
}

export async function resolveMemberAccess(
  user: UserContext,
  member: { id: string; stageId: string }
): Promise<MemberAccessLevel> {
  // Org-wide admin
  if (user.roleLevel === 5) return MemberAccessLevel.ORG_FULL_ACCESS;

  // Sector Secretary
  if (user.roleLevel === 4) {
    const isStageInSector = await verifyStageInUserSectors(user.userId, member.stageId);
    return isStageInSector ? MemberAccessLevel.SECTOR_FULL_ACCESS : MemberAccessLevel.NONE;
  }

  // Assistant or Stage Secretary
  if (user.roleLevel >= 2) {
    const isUserInStage = user.stageIds.includes(member.stageId);
    return isUserInStage ? MemberAccessLevel.STAGE_FULL_ACCESS : MemberAccessLevel.NONE;
  }

  // Servant (Level 1) - Check assignment for Assumption A2
  if (user.roleLevel === 1) {
    const isAssigned = await prisma.memberServantAssignment.findUnique({
      where: {
        memberId_servantUserId: {
          memberId: member.id,
          servantUserId: user.userId,
        },
      },
    });
    return isAssigned ? MemberAccessLevel.ASSIGNED_EVALUATIVE_ONLY : MemberAccessLevel.NONE;
  }

  return MemberAccessLevel.NONE;
}
```

---

### 3.3 Private Notes Visibility Engine (FR-8.1 & FR-8.2)

Per **FR-8.2**, supervisory notes are **strictly confidential**. They are visible **only to the author and superiors up the reporting chain**:
- If `امين الخدمة` writes a note on `خادم A`:
  - `خادم A` can **never** see it.
  - Fellow servants or other assistants can **never** see it.
  - `امين قطاع` of that sector **can** view it.
  - `امين عام` **can** view it.
- **Enforcement Rule:** Any query fetching notes on a user verifies:
  `requestUser.roleLevel >= note.authorRoleLevel && isUserInReportingChain(requestUser, note.targetUserId)`.

---

### 3.4 Sensitive Field Access Logger (NFR-3.3)

To ensure privacy compliance regarding minors and sensitive financial situations:
```typescript
// apps/api/src/services/sensitiveLogger.service.ts

export async function logSensitiveAccess(params: {
  userId: string;
  memberId?: string;
  targetUserId?: string;
  field: SensitiveField;
  accessType: AccessType;
  req: Request;
}) {
  await prisma.sensitiveAccessLog.create({
    data: {
      userId: params.userId,
      memberId: params.memberId,
      targetUserId: params.targetUserId,
      field: params.field,
      accessType: params.accessType,
      ipAddress: params.req.ip || params.req.socket.remoteAddress,
    },
  });
}
```
Whenever an endpoint serializes `financialStatus`, `phoneNumber`, or `address`, this utility is asynchronously called to guarantee an auditable log.

---

### 3.5 Backend API Endpoints & Request/Response Contracts

#### 1. `GET /api/v1/members`
- **Query Params:** `stageId` (optional, scoped), `search` (name query), `page`, `limit`.
- **Scope Rule:** Returns only members within user's permitted stages. For Level 1 (`خادم`), returns assigned members marked with `isAssigned: true` and peers within stage in read-only mode.

#### 2. `GET /api/v1/members/:id`
- Returns full member dossier.
- Triggers `logSensitiveAccess` for phone, address, and financial status.

#### 3. `POST /api/v1/members` (FR-3.2)
- **Protected:** Requires Level 2 (`مساعد`) or above.
- Creates new member record in user's assigned stage.

#### 4. `PATCH /api/v1/members/:id` (FR-3.1 & FR-3.2)
- Evaluates `resolveMemberAccess`:
  - If `ASSIGNED_EVALUATIVE_ONLY` (Level 1 Servant per **A2**):
    - Payload can **only** contain `{ financialStatus, behaviorInService, peerIntegration }`.
    - Any attempt to update `fullName`, `dateOfBirth`, `address`, or `stageId` results in `403 Forbidden` (`ERR_FIELD_UPDATE_RESTRICTED`).
  - If `STAGE_FULL_ACCESS` or higher: Allows full field mutation.
- Writes diffs to `MemberAuditLog`.

#### 5. `POST /api/v1/members/bulk-import` (FR-3.3)
- Accepts CSV or Excel (`.xlsx`) multipart upload.
- Validates columns: Arabic Name, DOB (YYYY-MM-DD), Phone, Address, Father's Name, Mother's Name.
- Inserts members inside a Prisma transaction, linking to the provided `stageId`.

#### 6. `POST /api/v1/members/:id/assign-servant`
- Links a servant to a member in `MemberServantAssignment`. Restricted to Level 2 (`مساعد`) and above.

#### 7. `POST /api/v1/notes` & `GET /api/v1/notes/:targetUserId` (FR-8.1, FR-8.2)
- Creation restricted to Level 3 (`امين الخدمة`) and above.
- Read query filters by upward chain hierarchy.

---

### 3.6 Frontend UI Specifications — Figma Members Screens (`apps/web`)

#### 1. Members List Screen (`apps/web/app/(dashboard)/members/page.tsx`)
- **Top App Bar:** Title "المخدومين", Search Bar with real-time debounce, Filter icon.
- **Stage Filter Bar:** Horizontal scrollable row of `Chip` components (Nursery, Primary, Prep, Secondary, etc.) filtered by user's permitted scopes.
- **Member Card List:**
  - Rendered using `MemberRow` component:
  - Avatar with Arabic initials, full name in `font-h2`, grade badge (`Badge neutral`), attendance percentage pill (`Badge success/warning`).
  - Tapping navigates to `/members/[id]`.
- **Floating Action Button (FAB):**
  - "إضافة مخدوم" (Add Member) in `brand-accent` gold.
  - Visible **only** if user has `roleLevel >= 2` (`مساعد` or higher).

#### 2. Member Profile Screen (`apps/web/app/(dashboard)/members/[id]/page.tsx`)
- **Header Card:**
  - Large avatar, full name (`font-display`), stage label, assigned servant badge.
  - Quick actions row: Call button (phone dialer), WhatsApp launcher, Map location launcher.
- **Quick Statistics Cards (2 Columns):**
  - Card 1: Attendance rate (e.g. `85%` with green progress indicator).
  - Card 2: Pastoral visits count (e.g. `4 افتقادات هذا الترم`).
- **Personal & Family Data Section:**
  - Date of birth, school, father's and mother's names, siblings accordion.
- **Evaluative & Spiritual Status Card:**
  - Clear banner: *"تقييم الخادم المسئول"* (Assigned Servant's Evaluation).
  - Displays Financial Status, Behavior, and Peer Integration.
  - Shows "تعديل التقييم" (Edit Evaluation) button for the assigned `خادم`.
- **Edit Modal:**
  - Dynamic fields based on role: Servants see only the 3 evaluative textareas; Assistant Secretaries see the full profile editor.

---

## 4. Step-by-Step Task Breakdown

| Task ID | Work Area | Description | Deliverable / Path |
|---|---|---|---|
| **TASK-03-1** | Prisma Migration | Migrate `ServedMember`, `MemberServantAssignment`, `SensitiveAccessLog`, `MemberAuditLog`, and `SupervisoryNote`. | `prisma/schema.prisma` |
| **TASK-03-2** | Access Resolver | Implement `resolveMemberAccess` enforcing Assumption A2 field restrictions vs full CRUD. | `apps/api/src/services/memberAccess.service.ts` |
| **TASK-03-3** | Sensitive Logger | Create reusable logging middleware/utility for tracking views of minor and financial PII. | `apps/api/src/services/sensitiveLogger.service.ts` |
| **TASK-03-4** | Member API CRUD | Implement member listing, detail, creation, and update endpoints with strict scope checks. | `apps/api/src/controllers/member.controller.ts` |
| **TASK-03-5** | Bulk Import Service | Build Excel/CSV parser validating and inserting bulk member records into a stage. | `apps/api/src/services/bulkImport.service.ts` |
| **TASK-03-6** | Supervisory Notes | Implement creation and upward-only viewing API for confidential notes. | `apps/api/src/controllers/note.controller.ts` |
| **TASK-03-7** | Members List Screen | Build mobile-first Figma Members List with search, stage chips, and permission-gated FAB. | `apps/web/app/(dashboard)/members/page.tsx` |
| **TASK-03-8** | Member Profile Screen | Build Figma Member Profile with stat cards, contact actions, and assigned evaluation card. | `apps/web/app/(dashboard)/members/[id]/page.tsx` |
| **TASK-03-9** | Member Edit Drawer | Build role-aware slide-over drawer toggling between 3-field servant edit and full secretary edit. | `apps/web/components/members/MemberEditDrawer.tsx` |

---

## 5. Testing & Quality Assurance Plan

1. **Assumption A2 Automated Tests:**
   - Authenticate as `خادم A` assigned to `Member X`.
   - Update `financialStatus` on `Member X` → Expect `200 OK`.
   - Update `fullName` or `dateOfBirth` on `Member X` as `خادم A` → Expect `403 Forbidden` (`ERR_FIELD_UPDATE_RESTRICTED`).
   - Attempt to update `financialStatus` on `Member Y` (assigned to `خادم B`) as `خادم A` → Expect `403 Forbidden`.
2. **Assistant Secretary Scope Tests (FR-3.2):**
   - Authenticate as `مساعد` in `Stage 1`.
   - Update `fullName`, `address`, and `financialStatus` on any member in `Stage 1` → Expect `200 OK`.
   - Attempt same update on member in `Stage 2` → Expect `403 Forbidden` (`ACCESS_DENIED_SCOPE`).
3. **Supervisory Notes Upward-Only Visibility Tests (FR-8.2):**
   - `امين الخدمة` posts private note on `خادم A`.
   - `خادم A` queries notes on himself → Response returns empty array `[]`.
   - Fellow servant queries notes on `خادم A` → Expect `403 Forbidden`.
   - `امين قطاع` queries notes on `خادم A` → Response contains note written by `امين الخدمة`.
4. **Sensitive Field Audit Verification (NFR-3.3):**
   - Execute `GET /api/v1/members/:id`.
   - Verify `sensitive_access_logs` table has inserted records for `FINANCIAL_STATUS`, `PHONE_NUMBER`, and `HOME_ADDRESS` with caller's `userId`.

---

## 6. Definition of Done (DoD) Checklist

- [ ] `ServedMember` records cannot authenticate and have no login credentials in schema (FR-3.4).
- [ ] Assumption A2 strictly enforced: Servants update only 3 evaluative fields on assigned members.
- [ ] Assistant Secretaries and above can create, edit, and reassign full member records in scope.
- [ ] Bulk spreadsheet import successfully parses and ingests sample dataset of 100 members.
- [ ] Confidential supervisory notes visible only up the reporting chain (FR-8.2).
- [ ] Every sensitive field read/write produces an entry in `sensitive_access_logs` (NFR-3.3).
- [ ] Members List and Member Profile screens match Figma prototype at 390px mobile viewport.

---

## 7. Next Phase Handoff & Prerequisites

**Handoff to Phase 4 (Attendance & Follow-up):**
- Member records and servant rosters available in database by stage.
- Relational keys (`memberId`, `servantUserId`, `stageId`) ready to receive weekly attendance records.
- Member profile stat cards ready to wire real attendance percentages from Phase 4's aggregation service.
