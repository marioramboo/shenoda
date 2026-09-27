# Phase 6 — Year Plan (تدبير السنة) & Calendar Module

**Document ID:** CSMS-PLAN-PHASE-06  
**Phase:** 6 of 9  
**Status:** Ready for Implementation  
**Estimated Effort:** 2 Sprints (2–3 weeks)  
**Target Systems:** Next.js (App Router), Express API, Prisma ORM, FullCalendar/Custom Grid  
**Source Traceability:**
- **SRS References:** §3.1.6 (Servant View Year Plan & Opt-In), §3.1.7 (Servant Stage-Scoped Plan Post), §3.3.8 (Stage Secretary Full Plan Authoring), §5.7 (FR-7.1 Year Plan Management, FR-7.2 View & Opt-In, FR-7.3 Calendar Integration, FR-7.4 Servant Limited Plan Post), §5.12 (FR-12.1 Scoped Calendar View, FR-12.2 Event Attendance Direct Integration).
- **Figma Prototype:** [Figma Design File](https://www.figma.com/design/BSSLc7uXAfjZUIg60Ghjl5) (Screen: Year Plan / تدبير السنة, Screen: Calendar / النتيجة والتقويم, Viewport 390px).
- **Agile Plan Reference:** Section 8 (Phase 6 — Year Plan & Calendar).

---

## 1. Executive Summary & Objective

The objective of **Phase 6** is to deliver the annual organizational backbone of the church ministry: **The Year Plan (تدبير السنة)** and its interactive companion, the **Ministry Calendar (التقويم)**.

In church tradition, *Tadbeer El-Sana* (تدبير السنة) represents the structured annual curriculum and schedule of liturgical events, spiritual topics, retreats, retreats/conferences (مؤتمرات), community trips (رحلات), and administrative councils.

Key architectural and functional imperatives in this phase:
1. **Hierarchical Plan Authoring (FR-7.1):** Official year plans are authored and published by Stage Secretaries (`امين الخدمة`), Sector Secretaries (`امين قطاع`), and the General Secretary (`امين عام`) for their respective scopes.
2. **Servant Engagement & Opt-In (FR-7.2):** Servants can browse the annual schedule and volunteer/opt-in to take responsibility for teaching specific topics or organizing activities.
3. **Servant Plan Updates (FR-7.4):** Servants have the right to post stage-specific updates and notes. Crucially, these posts are visible **only to servants within their own stage** and **never mutate the official ecclesiastical plan**.
4. **Interactive Calendar Integration (FR-7.3 & FR-12.1):** Events from the plan populate a mobile-friendly monthly and weekly calendar.
5. **Direct Attendance Bridge (FR-12.2):** Checking in or confirming attendance on a calendar event feeds directly into Phase 4's follow-up table (`جدول المتابعة`), eliminating double data entry.

---

## 2. Previous Phase Summary & System State Baseline

### 2.1 Accomplishments from Phase 5 (Servant Self-Service)
- **Lesson Preparation:** Servants can draft and submit lessons with scripture references and attachments; Stage Secretaries can review submissions in scope.
- **Spiritual Life Tracking:** Private journal operational with an architectural privacy firewall (NFR-3.4) blocking all non-owner queries.
- **Personal Servant Dashboard:** Home tab displays individual attendance trends, lesson preparation requirements, and member absence alerts.

### 2.2 System State Entering Phase 6
- Lessons and attendance exist, but there is no overarching annual curriculum or timeline.
- Users have no shared calendar showing upcoming church feasts, service meetings, trips, or conferences.
- Event attendance cannot be logged directly from an agenda view.

---

## 3. Detailed Architecture & Technical Specifications for Phase 6

### 3.1 Relational Schema (`prisma/schema.prisma`)

```prisma
// -------------------------------------------------------------
// 1. YEAR PLAN (تدبير السنة)
// -------------------------------------------------------------

enum EventCategory {
  LITURGY_FEAST       // أعياد ومناسبات كنسية
  SPIRITUAL_LESSON    // درس روحي / موضوع دراسي
  SERVICE_MEETING     // اجتماع الخدمة الأسبوعي
  SECRETARIES_COUNCIL // اجتماع الأمناء
  TRIP_OR_OUTING      // رحلة
  CONFERENCE_RETREAT  // مؤتمر روحي
  COMMUNITY_ACTIVITY  // نشاط اجتماعي / يوم رياضي
}

enum PlanScopeType {
  STAGE               // خاص بمرحلة معينة
  SECTOR              // خاص بقطاع
  ORGANIZATION        // عام للكنيسة بأكملها
}

model YearPlan {
  id             String         @id @default(uuid())
  organizationId String
  title          String         // e.g. "تدبير سنة 2026 / 2027 - قطاع الشباب"
  academicYear   String         // e.g. "2026-2027"
  scopeType      PlanScopeType
  sectorId       String?
  stageId        String?
  publishedById  String
  isPublished    Boolean        @default(false)
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  organization   Organization   @relation(fields: [organizationId], references: [id])
  sector         Sector?        @relation(fields: [sectorId], references: [id], onDelete: Cascade)
  stage          Stage?         @relation(fields: [stageId], references: [id], onDelete: Cascade)
  publishedBy    User           @relation(fields: [publishedById], references: [id])
  events         CalendarEvent[]
  servantPosts   YearPlanServantPost[]

  @@index([stageId])
  @@index([sectorId])
  @@map("year_plans")
}

// -------------------------------------------------------------
// 2. CALENDAR EVENTS (أحداث التقويم)
// -------------------------------------------------------------

model CalendarEvent {
  id              String            @id @default(uuid())
  yearPlanId      String?
  stageId         String?           // Nullable for church-wide events
  sectorId        String?
  title           String            // e.g. "مؤتمر العقيدة الأرثوذكسية"
  description     String?
  category        EventCategory
  startDate       DateTime
  endDate         DateTime
  location        String?           // e.g. "بيت مارمرقس بالعجمي"
  maxVolunteers   Int?              // Maximum servants that can opt-in
  createdById     String
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  yearPlan        YearPlan?         @relation(fields: [yearPlanId], references: [id], onDelete: Cascade)
  stage           Stage?            @relation(fields: [stageId], references: [id], onDelete: Cascade)
  sector          Sector?           @relation(fields: [sectorId], references: [id], onDelete: Cascade)
  createdBy       User              @relation(fields: [createdById], references: [id])
  volunteers      EventVolunteer[]
  eventAttendances EventAttendanceConfirmation[]

  @@index([startDate, endDate])
  @@index([stageId])
  @@map("calendar_events")
}

// Volunteer Opt-In Model (FR-7.2)
model EventVolunteer {
  id          String        @id @default(uuid())
  eventId     String
  userId      String        // Servant who opted in
  roleInEvent String?       // e.g. "مسؤول التنظيم", "إلقاء الكلمة"
  createdAt   DateTime      @default(now())

  event       CalendarEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)
  user        User          @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([eventId, userId])
  @@map("event_volunteers")
}

// Servant Limited Plan Post Model (FR-7.4)
// Strictly isolated from official plan to prevent mutation
model YearPlanServantPost {
  id          String   @id @default(uuid())
  yearPlanId  String
  stageId     String   // Must match servant's assigned stage
  authorId    String   // خادم author
  title       String
  content     String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  yearPlan    YearPlan @relation(fields: [yearPlanId], references: [id], onDelete: Cascade)
  stage       Stage    @relation(fields: [stageId], references: [id], onDelete: Cascade)
  author      User     @relation(fields: [authorId], references: [id], onDelete: Cascade)

  @@index([stageId])
  @@map("year_plan_servant_posts")
}

// Direct Attendance Integration Model (FR-12.2)
model EventAttendanceConfirmation {
  id              String        @id @default(uuid())
  eventId         String
  userId          String        // Servant who attended
  confirmedById   String        // Secretary who verified
  confirmedAt     DateTime      @default(now())

  event           CalendarEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)
  user            User          @relation("ConfirmedEventUser", fields: [userId], references: [id], onDelete: Cascade)
  confirmedBy     User          @relation("EventAttendanceVerifier", fields: [confirmedById], references: [id])

  @@unique([eventId, userId])
  @@map("event_attendance_confirmations")
}
```

---

### 3.2 Domain Rules & Permission Enforcement

#### 1. Plan Authoring & Publishing (FR-7.1)
- Authoring requires `roleLevel >= 3` (`امين الخدمة` or higher).
- An `امين الخدمة` can author a plan **only** for his assigned `stageId`.
- An `امين قطاع` can author plans for stages within his `sectorId` or sector-wide plans.
- An `امين عام` can author organization-wide plans.

#### 2. Servant Plan Updates (FR-7.4)
- A `خادم` can submit a post via `POST /api/v1/year-plans/:id/servant-posts`.
- The system automatically links the post to the caller's assigned `stageId`.
- **Visibility Constraint:** When any user fetches servant updates for a Year Plan, the API filters records: `WHERE "stageId" = req.user.assignedStageId`. Servants in Prep Boys can never see posts from Prep Girls.
- These posts exist in `year_plan_servant_posts` and **cannot modify** the official `YearPlan` or `CalendarEvent` tables.

#### 3. Direct Attendance Bridge to جدول المتابعة (FR-12.2)
When an attendee's presence is verified at a calendar event:
1. Insert record into `EventAttendanceConfirmation`.
2. Check the event's `category`:
   - If `category === SERVICE_MEETING`: Automatically insert a record into `ServantAttendance` with `sessionType = SERVICE_MEETING` and `status = PRESENT`.
   - If `category === LITURGY_FEAST`: Insert into `ServantAttendance` with `sessionType = MASS`.
   - If `category === CONFERENCE_RETREAT` or `TRIP_OR_OUTING`: Insert with `sessionType = ACTIVITIES`.
3. This creates a seamless bridge between the calendar and the weekly follow-up matrix.

---

### 3.3 Backend API Endpoints & Contracts

#### 1. `POST /api/v1/year-plans` (FR-7.1)
- **Protected:** Requires `roleLevel >= 3`.
- Creates a new Year Plan container scoped to stage, sector, or org.

#### 2. `GET /api/v1/year-plans` (FR-7.2)
- Returns active Year Plans matching caller's permitted stages and sectors.

#### 3. `POST /api/v1/year-plans/:id/events`
- Adds curriculum lesson topics, feasts, or activities to the plan.

#### 4. `POST /api/v1/events/:id/volunteer` (FR-7.2)
- Servant opts in to volunteer for an event.
- Validates that `volunteers.count < event.maxVolunteers`.

#### 5. `DELETE /api/v1/events/:id/volunteer`
- Servant withdraws their volunteer registration.

#### 6. `POST /api/v1/year-plans/:id/servant-posts` (FR-7.4)
- Servant publishes an informal stage update.
- Body: `{ "title": "توزيع هدايا العيد", "content": "يرجى من جميع خدام أولى إعدادي التواجد..." }`.

#### 7. `GET /api/v1/calendar` (FR-12.1)
- **Query Params:** `startDate`, `endDate`, `stageId`, `category`.
- Returns merged list of official church events, stage events, and user's volunteered commitments.

#### 8. `POST /api/v1/events/:id/confirm-attendance` (FR-12.2)
- Secretary confirms attendance for a list of attendees.
- Automatically synchronizes with Phase 4's `ServantAttendance` table.

---

### 3.4 Frontend UI Specifications — Figma Screens (`apps/web`)

#### 1. Year Plan Screen (`apps/web/app/(dashboard)/year-plan/page.tsx`)
- **Top App Bar:** Title "تدبير السنة", Scope selector chip (المرحلة / القطاع / الكنيسة).
- **Academic Semester Selector:** Tabs for "الفصل الدراسي الأول", "الفصل الدراسي الثاني", "أنشطة الصيف".
- **Curriculum & Events Timeline:**
  - Card for each curriculum item with date, lesson title, category icon, and volunteer avatars.
  - "تطوع بالخدمة" (Volunteer) button on events accepting volunteers.
- **Stage Servants Bulletin (FR-7.4):**
  - Section titled: *"تحديثات خدام المرحلة"*
  - Displays informal updates submitted by fellow servants in the same stage.
  - Floating button: "إضافة تنويه للمرحلة" (visible to servants).

#### 2. Ministry Calendar Screen (`apps/web/app/(dashboard)/calendar/page.tsx`)
- **Header:** Month/Week toggle, Arabic month navigation (`أكتوبر 2026 / بابة 1743`).
- **Interactive Calendar Grid:**
  - Designed for mobile touch: each day box displays status dots color-coded by category:
    - Liturgy / Feast: Gold (`brand-accent`).
    - Lessons / Teaching: Deep Blue (`brand-primary`).
    - Trips / Retreats: Green (`status-success`).
    - Meetings: Blue Soft (`status-info`).
- **Selected Day Agenda List:**
  - Clicking a day reveals the day's events below the calendar:
  - Event Card: Title, time, location, volunteer badge, and quick action "تسجيل الحضور" (for secretaries).

#### 3. Event Detail & Attendance Modal (`apps/web/components/calendar/EventAttendanceModal.tsx`)
- Secretary views list of servants assigned or volunteered for the event.
- Fast checkbox or 3-way toggle to confirm attendance with instant sync to the follow-up table.

---

## 4. Step-by-Step Task Breakdown

| Task ID | Work Area | Description | Deliverable / Path |
|---|---|---|---|
| **TASK-06-1** | Prisma Migration | Add `YearPlan`, `CalendarEvent`, `EventVolunteer`, `YearPlanServantPost`, and `EventAttendanceConfirmation`. | `prisma/schema.prisma` |
| **TASK-06-2** | Year Plan API | Build authoring, publishing, and listing endpoints for Year Plans scoped by hierarchy. | `apps/api/src/controllers/yearPlan.controller.ts` |
| **TASK-06-3** | Volunteer Engine | Build opt-in and withdrawal endpoints with capacity validation (FR-7.2). | `apps/api/src/services/volunteer.service.ts` |
| **TASK-06-4** | Servant Post API | Build stage-isolated posting and querying endpoint enforcing FR-7.4. | `apps/api/src/controllers/servantPost.controller.ts` |
| **TASK-06-5** | Calendar API | Build aggregated calendar endpoint merging feasts, lessons, meetings, and events. | `apps/api/src/controllers/calendar.controller.ts` |
| **TASK-06-6** | Attendance Sync | Implement service synchronizing event check-ins directly into `ServantAttendance` (FR-12.2). | `apps/api/src/services/eventAttendanceSync.service.ts` |
| **TASK-06-7** | Figma Plan Screen | Build Year Plan timeline and semester view matching Figma layout. | `apps/web/app/(dashboard)/year-plan/page.tsx` |
| **TASK-06-8** | Figma Calendar UI | Build interactive mobile calendar grid with Arabic Coptic dates and day agenda view. | `apps/web/app/(dashboard)/calendar/page.tsx` |

---

## 5. Testing & Quality Assurance Plan

1. **Year Plan Authoring Hierarchy Tests (FR-7.1):**
   - `خادم` attempts to create a `YearPlan` → Expect `403 Forbidden`.
   - `امين الخدمة` of `Prep Boys` attempts to publish a plan for `Prep Girls` → Expect `403 Forbidden`.
   - `امين الخدمة` of `Prep Boys` publishes plan for `Prep Boys` → Expect `201 Created`.
2. **Servant Post Isolation Tests (FR-7.4):**
   - `خادم A` in `Prep Boys` posts an update to the Year Plan.
   - Verify the official `YearPlan` model fields are unmodified.
   - `خادم B` in `Prep Boys` queries posts → Sees `خادم A`'s post.
   - `خادم C` in `Prep Girls` queries posts → Returns empty array `[]`.
3. **Calendar to Follow-up Attendance Synchronization Tests (FR-12.2):**
   - Create a `SERVICE_MEETING` calendar event on `2026-10-09`.
   - Secretary confirms attendance for `خادم A`.
   - Query `servant_attendance` table for `خادم A` on `2026-10-09` → Verify record exists with `sessionType = SERVICE_MEETING` and `status = PRESENT`.

---

## 6. Definition of Done (DoD) Checklist

- [ ] Stage Secretaries and above can create and publish official Year Plans for their scope.
- [ ] Servants can browse the plan and opt in to volunteer for curriculum topics and events.
- [ ] Servant posts are strictly stage-scoped and cannot mutate official plan records (FR-7.4).
- [ ] Mobile calendar displays monthly grid with category color dots and daytime agenda list.
- [ ] Event attendance confirmation automatically inserts records into `servant_attendance` (FR-12.2).
- [ ] Arabic and Coptic date displays render correctly in Cairo font without layout jitter.

---

## 7. Next Phase Handoff & Prerequisites

**Handoff to Phase 7 (Announcements, Polls & Notifications):**
- Scheduled calendar events ready to trigger automated reminder notifications (FR-11.3).
- Scope engine ready to support announcement audience targeting (FR-10.2).
- User roster ready to receive broadcast announcements across push, SMS, and email.
