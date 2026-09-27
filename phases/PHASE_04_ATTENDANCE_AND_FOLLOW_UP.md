# Phase 4 — Attendance & Follow-up (جدول المتابعة)

**Document ID:** CSMS-PLAN-PHASE-04  
**Phase:** 4 of 9  
**Status:** Ready for Implementation  
**Estimated Effort:** 2 Sprints (2–3 weeks)  
**Target Systems:** Next.js (App Router), Express API, Prisma ORM, PostgreSQL, Background Alert Worker  
**Source Traceability:**
- **SRS References:** §1.4 (Assumption A4 Assistant Follow-up Table Scope), §3.1.2 (Servant View-Only Follow-up History), §4.3 (Follow-up Records Specification for Servants and Members), §5.4 (FR-4.1 Supervisor Recording & Subject View-Only Access, FR-4.2 Rolling Attendance Summaries, FR-4.3 Consecutive Absence Alert Threshold), §5.11 (FR-11.1 Absence Alert Event Generation), §6.2 (NFR-2.1 Core Screens <2s Load Time), §6.4 (NFR-4.2 Idempotent Batch Submissions).
- **Figma Prototype:** [Figma Design File](https://www.figma.com/design/BSSLc7uXAfjZUIg60Ghjl5) (Screen: Attendance Entry / تسجيل الحضور, Components: `AttendanceToggle`, Viewport 390px).
- **Agile Plan Reference:** Section 6 (Phase 4 — Attendance & Follow-up).

---

## 1. Executive Summary & Objective

The objective of **Phase 4** is to deliver the core weekly operational rhythm of the church ministry: **Attendance and Pastoral Follow-up (جدول المتابعة)**.

Every week, church leaders track both:
1. **The spiritual attendance of Servants (الخدام)** across liturgies, prep submissions, service meetings, prayer groups, and secretarial councils.
2. **The attendance and pastoral home visits (الافتقاد) of Served Members (المخدومين)** across mass, Sunday school classes, and recreational/spiritual activities.

Key engineering imperatives in this phase:
- **Strict View-Only Rule for Servants (§3.1.2 & FR-4.1):** Servants can *never* record or edit their own attendance. Entries are submitted solely by their supervising secretary.
- **Assumption A4 Compliance:** Assistant Secretaries have the same follow-up activities as servants (including activities/أنشطة), but do *not* receive `اجتماع الأمناء` (which begins at Stage Secretary level).
- **Automated Absence Threshold Detection (FR-4.3 / FR-11.1):** When a servant or member misses consecutive sessions (default: 2 weeks), the system generates an actionable follow-up alert.
- **High-Performance Aggregations (FR-4.2 & NFR-2.1):** Precalculated rolling attendance statistics (4, 8, 12 weeks) powering profile badges and administrative dashboards.
- **Figma Attendance UI:** High-velocity mobile-first entry screen featuring the 3-state `AttendanceToggle`.

---

## 2. Previous Phase Summary & System State Baseline

### 2.1 Accomplishments from Phase 3 (Servant & Member Records)
- **Member Records Database:** `ServedMember` table populated with stage links and assigned servants.
- **Access Boundaries (Assumption A2):** Servants restricted to editing 3 evaluative fields on assigned members; Assistant Secretaries manage full records in their stage.
- **Audit & Privacy Infrastructure:** `SensitiveAccessLog` active for minor PII (phone, address, financial status).
- **Confidential Notes:** `SupervisoryNote` implemented with upward-only reporting chain visibility.
- **Figma Screens:** Members list and Member Profile screens active in frontend.

### 2.2 System State Entering Phase 4
- Members and servants exist in the system, but there are no tables or APIs to record weekly mass attendance, meetings, pastoral visits, or absence flags.
- Profile stat cards currently display static placeholder data for attendance percentages.

---

## 3. Detailed Architecture & Technical Specifications for Phase 4

### 3.1 Session Taxonomy & Follow-up Schema (`prisma/schema.prisma`)

Per §4.3 and Assumption A4, tracking sessions differ between Servants and Members:

```prisma
// -------------------------------------------------------------
// ATTENDANCE & FOLLOW-UP (جدول المتابعة)
// -------------------------------------------------------------

enum AttendanceStatus {
  PRESENT  // حاضر
  ABSENT   // غائب
  EXCUSED  // معتذر
  LATE     // متأخر
}

enum ServantSessionType {
  MASS                    // القداس الإلهي
  LESSON_PREPARATION      // التحضير
  SERVICE_ATTENDANCE      // الخدمة
  PASTORAL_VISITATION     // الافتقاد
  SERVICE_MEETING         // اجتماع الخدمة
  PRAYER_FAMILY_MEETING   // اجتماع الصلاة / الأسرة
  ACTIVITIES              // الأنشطة
  SECRETARIES_MEETING     // اجتماع الأمناء (Stage Secretary+)
  STAGE_SECRETARIES_MEET  // اجتماع أمناء المراحل (Sector Secretary+)
}

enum MemberSessionType {
  MASS                    // القداس الإلهي
  SERVICE_ATTENDANCE      // الخدمة / حصة مدارس الأحد
  PASTORAL_VISITATION     // الافتقاد المنزلي
  ACTIVITY_CLUB_TRIP_CONF // نادي / رحلة / مؤتمر
}

// Attendance Record for Served Members (المخدومين)
model MemberAttendance {
  id              String            @id @default(uuid())
  memberId        String
  stageId         String
  sessionType     MemberSessionType
  sessionDate     DateTime          // YYYY-MM-DD
  status          AttendanceStatus
  notes           String?           // Notes on behavior/visitation
  recordedById    String            // Secretary or assigned servant who logged it
  idempotencyKey  String?           // NFR-4.2 retry-safe token
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  member          ServedMember      @relation(fields: [memberId], references: [id], onDelete: Cascade)
  stage           Stage             @relation(fields: [stageId], references: [id])
  recordedBy      User              @relation("MemberAttendanceRecorder", fields: [recordedById], references: [id])

  @@unique([memberId, sessionType, sessionDate])
  @@index([stageId, sessionDate])
  @@index([memberId, sessionDate])
  @@map("member_attendance")
}

// Attendance Record for Servants & Secretaries (الخدام والأمناء)
model ServantAttendance {
  id              String             @id @default(uuid())
  servantUserId   String
  stageId         String?            // Nullable for Sector/General Secretaries
  sessionType     ServantSessionType
  sessionDate     DateTime           // YYYY-MM-DD
  status          AttendanceStatus
  notes           String?
  recordedById    String             // Supervising Secretary ONLY (FR-4.1)
  idempotencyKey  String?            // NFR-4.2 retry-safe token
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt

  servantUser     User               @relation("ServantAttendanceSubject", fields: [servantUserId], references: [id], onDelete: Cascade)
  recordedBy      User               @relation("ServantAttendanceRecorder", fields: [recordedById], references: [id])

  @@unique([servantUserId, sessionType, sessionDate])
  @@index([servantUserId, sessionDate])
  @@map("servant_attendance")
}

// Consecutive Absence Alert Tracking (FR-4.3 & FR-11.1)
enum AlertTargetType {
  MEMBER
  SERVANT
}

enum AlertStatus {
  ACTIVE
  RESOLVED
  DISMISSED
}

model AbsenceAlert {
  id                 String          @id @default(uuid())
  targetType         AlertTargetType
  memberId           String?
  servantUserId      String?
  stageId            String
  consecutiveCount   Int             // e.g. 2, 3, 4 weeks
  lastAttendedDate   DateTime?
  alertStatus        AlertStatus     @default(ACTIVE)
  assignedFollowUpId String?         // Servant responsible for home visit/call
  resolutionNotes    String?
  resolvedAt         DateTime?
  createdAt          DateTime        @default(now())
  updatedAt          DateTime        @updatedAt

  stage              Stage           @relation(fields: [stageId], references: [id])
  member             ServedMember?   @relation(fields: [memberId], references: [id], onDelete: Cascade)
  servantUser        User?           @relation("AbsenceAlertServant", fields: [servantUserId], references: [id], onDelete: Cascade)
  assignedFollowUp   User?           @relation("AbsenceAlertFollowUp", fields: [assignedFollowUpId], references: [id])

  @@index([stageId, alertStatus])
  @@map("absence_alerts")
}
```

---

### 3.2 Permission Rules & Assumption A4 Enforcement

1. **Servant Follow-up Recording Authorization (FR-4.1):**
   - A `خادم` attempting to submit a `ServantAttendance` record for himself receives `403 Forbidden` (`ERR_CANNOT_SELF_RECORD_ATTENDANCE`).
   - Attendance for a `خادم` or `مساعد` can **only** be recorded by `امين الخدمة` (or above) in that stage.
   - Attendance for `امين الخدمة` can **only** be recorded by `امين قطاع` (or above).
   - Attendance for `امين قطاع` can **only** be recorded by `امين عام`.
2. **Session Availability Matrix (Assumption A4):**
   ```typescript
   export function getAllowedSessionsForRole(roleLevel: number): ServantSessionType[] {
     const baseSessions = [
       ServantSessionType.MASS,
       ServantSessionType.LESSON_PREPARATION,
       ServantSessionType.SERVICE_ATTENDANCE,
       ServantSessionType.PASTORAL_VISITATION,
       ServantSessionType.SERVICE_MEETING,
       ServantSessionType.PRAYER_FAMILY_MEETING,
       ServantSessionType.ACTIVITIES, // Included for مساعد per A4
     ];

     // Level 3 (امين الخدمة) adds اجتماع الأمناء
     if (roleLevel >= 3) {
       baseSessions.push(ServantSessionType.SECRETARIES_MEETING);
     }

     // Level 4 (امين قطاع) adds اجتماع أمناء المراحل
     if (roleLevel >= 4) {
       baseSessions.push(ServantSessionType.STAGE_SECRETARIES_MEET);
     }

     return baseSessions;
   }
   ```

---

### 3.3 Rolling Attendance Calculation Engine (FR-4.2)

To satisfy **NFR-2.1** (<2s screen load), attendance percentages are calculated using an optimized SQL aggregation service:

```typescript
// apps/api/src/services/attendanceAnalytics.service.ts

export interface AttendanceSummary {
  presentCount: number;
  absentCount: number;
  excusedCount: number;
  totalSessions: number;
  attendanceRatePercentage: number; // 0 - 100
}

export async function calculateMemberAttendanceRate(
  memberId: string,
  weeks: number = 8
): Promise<AttendanceSummary> {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - weeks * 7);

  const stats = await prisma.$queryRaw<Array<{ status: AttendanceStatus; count: bigint }>>`
    SELECT status, COUNT(*) as count
    FROM member_attendance
    WHERE "memberId" = ${memberId}
      AND "sessionDate" >= ${sinceDate}
      AND "sessionType" IN ('MASS', 'SERVICE_ATTENDANCE')
    GROUP BY status
  `;

  let present = 0, absent = 0, excused = 0;
  for (const row of stats) {
    const c = Number(row.count);
    if (row.status === AttendanceStatus.PRESENT) present += c;
    else if (row.status === AttendanceStatus.ABSENT) absent += c;
    else if (row.status === AttendanceStatus.EXCUSED) excused += c;
  }

  const total = present + absent + excused;
  const rate = total > 0 ? Math.round((present / total) * 100) : 100;

  return {
    presentCount: present,
    absentCount: absent,
    excusedCount: excused,
    totalSessions: total,
    attendanceRatePercentage: rate,
  };
}
```

---

### 3.4 Consecutive Absence Detection Pipeline (FR-4.3 / FR-11.1)

Triggered automatically upon attendance submission:
1. When attendance is saved for a session, query the last `N` historical sessions for each member in that stage (configurable threshold: default `2`).
2. If a member has accumulated `>= 2` consecutive `ABSENT` statuses:
   - Check if an active `AbsenceAlert` already exists.
   - If not, create an `AbsenceAlert` linked to the member and their assigned servant (`assignedFollowUpId`).
   - If member has no assigned servant, assign the alert to the stage's `مساعد` or `امين الخدمة`.
3. When the member attends a future session (`PRESENT`), the alert is automatically resolved (`alertStatus = RESOLVED`).

---

### 3.5 Backend API Endpoints & Contracts

#### 1. `POST /api/v1/attendance/members/batch` (FR-4.1, NFR-4.2)
- **Protected:** Requires Level 2 (`مساعد`) or above.
- **Idempotency:** Header `X-Idempotency-Key` prevents double-submits on flaky 4G connections.
- **Request Body:**
  ```json
  {
    "stageId": "stage-uuid-prep-boys",
    "sessionType": "SERVICE_ATTENDANCE",
    "sessionDate": "2026-10-02",
    "records": [
      { "memberId": "m-uuid-1", "status": "PRESENT" },
      { "memberId": "m-uuid-2", "status": "ABSENT", "notes": "سفر عائلي" },
      { "memberId": "m-uuid-3", "status": "EXCUSED" }
    ]
  }
  ```
- **Execution:** Runs inside a Prisma transaction, updates records, executes absence threshold checks, and returns updated stage attendance counts.

#### 2. `GET /api/v1/attendance/members`
- Fetch attendance table by `stageId`, `sessionType`, and date range.

#### 3. `POST /api/v1/attendance/servants/batch` (FR-4.1)
- **Protected:** Restricted to supervising secretaries (Level 3+ for servants; Level 4+ for stage secretaries).
- Rejects any payload where `records` contains `req.user.id`.

#### 4. `GET /api/v1/attendance/servants/history` (FR-4.1 & §3.1.2)
- Servant views their own follow-up table across all session types. View-only.

#### 5. `GET /api/v1/attendance/alerts` (FR-4.3)
- List unresolved absence alerts scoped to user's assigned members or stage.

#### 6. `PATCH /api/v1/attendance/alerts/:id/resolve`
- Marks alert as resolved with follow-up outcome (e.g., "تم الافتقاد التليفوني وسيحضر الجمعة القادمة").

---

### 3.6 Frontend UI Implementation — Figma Attendance Screen (`apps/web`)

#### Screen Architecture (`apps/web/app/(dashboard)/attendance/page.tsx`)
1. **Header App Bar & Date Navigator:**
   - Title: "تسجيل الحضور والمتابعة".
   - Date selector: Defaults to current Friday / Sunday with quick-jump arrows.
2. **Session Type Selector (`Chip` Group):**
   - Tabs: القداس الإلهي (Mass), الخدمة (Service), الافتقاد (Home Visit), الأنشطة (Activity).
3. **Session Summary Stats Bar:**
   - 3 badges: حاضر (24) in green, غائب (4) in red, معتذر (2) in yellow.
   - Quick action: "تحديد الكل حاضر" (Mark All Present) for rapid batch entry.
4. **Member Attendance List:**
   - Rendered using virtualized scroll for large stages (up to 200 members).
   - Each row contains:
     - Member name & avatar.
     - `AttendanceToggle` component: 3 buttons (`حاضر`, `غائب`, `معتذر`). Tapping immediately updates local state with tactile feedback.
     - Optional "ملاحظة" (Note) icon that opens a quick text drawer for visit notes.
5. **Fixed Bottom Action Bar:**
   - Button variant `primary`, label: "حفظ الحضور (30 مخدوم)".
   - Features optimistic UI feedback and automatic retry handling.

---

## 4. Step-by-Step Task Breakdown

| Task ID | Work Area | Description | Deliverable / Path |
|---|---|---|---|
| **TASK-04-1** | Prisma Migration | Add `MemberAttendance`, `ServantAttendance`, and `AbsenceAlert` tables. Migrate database. | `prisma/schema.prisma` |
| **TASK-04-2** | Attendance Matrix | Define `ServantSessionType` availability per role level enforcing Assumption A4. | `packages/shared/src/constants/sessions.ts` |
| **TASK-04-3** | Aggregation Service | Write SQL aggregation queries for 4-, 8-, and 12-week rolling attendance percentages. | `apps/api/src/services/attendanceAnalytics.service.ts` |
| **TASK-04-4** | Absence Detector | Implement background service scanning for consecutive absences and triggering alerts. | `apps/api/src/services/absenceDetector.service.ts` |
| **TASK-04-5** | Member Attendance API | Build batch record creation and update routes with idempotency key verification. | `apps/api/src/controllers/memberAttendance.controller.ts` |
| **TASK-04-6** | Servant Attendance API | Build supervisor-only servant attendance entry route with self-record prevention. | `apps/api/src/controllers/servantAttendance.controller.ts` |
| **TASK-04-7** | Alerts API | Build list and resolution endpoints for absence alerts. | `apps/api/src/controllers/alert.controller.ts` |
| **TASK-04-8** | Figma Attendance Screen | Build mobile-first attendance recording screen matching Figma layout and `AttendanceToggle`. | `apps/web/app/(dashboard)/attendance/page.tsx` |
| **TASK-04-9** | Follow-up Table View | Build read-only follow-up history matrix view for individual servant profiles. | `apps/web/components/attendance/FollowUpTable.tsx` |

---

## 5. Testing & Quality Assurance Plan

1. **Self-Attendance Prevention Tests (§3.1.2 & FR-4.1):**
   - Authenticate as `خادم A`.
   - Submit `POST /api/v1/attendance/servants/batch` attempting to mark `خادم A` as `PRESENT` → Expect `403 Forbidden` (`ERR_CANNOT_SELF_RECORD_ATTENDANCE`).
   - Authenticate as `امين الخدمة` and submit attendance for `خادم A` → Expect `200 OK`.
2. **Assumption A4 Verification Tests:**
   - Verify session options query for `مساعد امين الخدمة` includes `ACTIVITIES` but omits `SECRETARIES_MEETING`.
   - Verify session options query for `امين الخدمة` includes `SECRETARIES_MEETING`.
3. **Absence Threshold Alert Tests (FR-4.3):**
   - Record `ABSENT` for `Member M` on Week 1.
   - Record `ABSENT` for `Member M` on Week 2.
   - Query `absence_alerts` → Verify an active alert was generated with `consecutiveCount = 2` assigned to `Member M`'s servant.
   - Record `PRESENT` for `Member M` on Week 3 → Verify alert transitions to `RESOLVED`.
4. **Idempotency & Mobile Network Tests (NFR-4.2):**
   - Send the same batch submission twice with the same `X-Idempotency-Key` → Second request returns cached 200 without inserting duplicate rows.

---

## 6. Definition of Done (DoD) Checklist

- [ ] `MemberAttendance` and `ServantAttendance` schemas migrated and indexed.
- [ ] Servants are strictly blocked from adding/editing their own attendance records at the API level.
- [ ] Assumption A4 confirmed: Assistant Secretaries have activities but not secretaries' meetings.
- [ ] Consecutive absence alert triggers automatically when threshold (default: 2) is crossed.
- [ ] Attendance percentage calculation runs under 100ms for stages with 200+ members.
- [ ] Figma Attendance screen operates smoothly with responsive 3-way toggle at 390px mobile width.
- [ ] Idempotency keys protect against duplicate submits on connection retries.

---

## 7. Next Phase Handoff & Prerequisites

**Handoff to Phase 5 (Servant Self-Service: تحضير & Spiritual Life):**
- Servant profile foundation ready to host personal spiritual dashboards.
- Attendance service ready to feed servant's personal attendance trend into the Phase 5 dashboard.
- Database ready to receive lesson prep (`LessonPreparation`) and private spiritual records (`SpiritualLifeEntry`).
