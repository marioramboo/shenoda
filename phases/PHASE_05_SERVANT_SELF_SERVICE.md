# Phase 5 — Servant Self-Service: تحضير & Spiritual Life

**Document ID:** CSMS-PLAN-PHASE-05  
**Phase:** 5 of 9  
**Status:** Ready for Implementation  
**Estimated Effort:** 1–2 Sprints (2 weeks)  
**Target Systems:** Next.js (App Router), Express API, Prisma ORM, Isolated Storage / Encrypted Vault  
**Source Traceability:**
- **SRS References:** §3.1.4 (Servant Prep Submission), §3.1.5 (Servant Spiritual Life Record), §5.5 (FR-5.1 Lesson Prep Submission, FR-5.2 Secretarial Scope Prep Review), §5.6 (FR-6.1 Spiritual Life Logging, FR-6.2 Absolute Privacy Firewall), §5.13 (FR-13.2 Personal Servant Dashboard), §6.3 (NFR-3.4 Strict Exclusion of Spiritual Data from Exports and Analytics).
- **Figma Prototype:** [Figma Design File](https://www.figma.com/design/BSSLc7uXAfjZUIg60Ghjl5) (Screen: Lesson Prep / التحضير, Screen: Personal Dashboard / لوحتي الشخصية, Viewport 390px).
- **Agile Plan Reference:** Section 7 (Phase 5 — Servant Self-Service: تحضير & Spiritual Life).

---

## 1. Executive Summary & Objective

The objective of **Phase 5** is to empower church servants (الخدام) with dedicated, high-utility self-service tools:
1. **Lesson Preparation (التحضير):** Servants write, organize, and submit their weekly Bible and doctrinal lessons with curriculum topics, scriptures, pedagogical aids, and multimedia attachments. Stage Secretaries and above can review submissions within their scope.
2. **Spiritual Life Tracking (الحياة الروحية):** A private journal for servants to track personal sacraments: Holy Communion (التناول), Confession (الاعتراف مع أب الاعتراف), and Personal Prayer (قانون الصلاة).
3. **The Absolute Privacy Firewall (NFR-3.4 & FR-6.2):** Spiritual life data is subject to the **strictest data quarantine in the entire system**. It is visible **exclusively to the servant themself**. It is architecturally prohibited from ever being joined into administrative dashboards, reports, or exports—even the General Secretary (`امين عام`) is strictly blocked from viewing another servant's spiritual records.
4. **Personal Servant Dashboard (FR-13.2):** A personalized landing page displaying the servant's own attendance records, upcoming teaching schedule, and private spiritual rhythm.

---

## 2. Previous Phase Summary & System State Baseline

### 2.1 Accomplishments from Phase 4 (Attendance & Follow-up)
- **Attendance Architecture:** `MemberAttendance` and `ServantAttendance` schemas migrated and active.
- **Supervisor-Only Servant Follow-up:** Servants can view their own attendance history, but cannot record or edit it (FR-4.1).
- **Rolling Aggregations:** Calculation service providing 4-, 8-, and 12-week attendance percentages.
- **Consecutive Absence Detection:** Automated alerts dispatched when members miss consecutive sessions.
- **Figma Attendance Screen:** Mobile-first batch entry active in `apps/web`.

### 2.2 System State Entering Phase 5
- Servants have accounts and attendance records, but have no way to draft or submit lesson preparations.
- There is no spiritual life tracking mechanism.
- The servant's home tab lacks personal metrics and actionable teaching schedules.

---

## 3. Detailed Architecture & Technical Specifications for Phase 5

### 3.1 Relational Schema & Isolated Spiritual Vault (`prisma/schema.prisma`)

```prisma
// -------------------------------------------------------------
// 1. LESSON PREPARATION (التحضير)
// -------------------------------------------------------------

enum PrepStatus {
  DRAFT
  SUBMITTED
  REVIEWED
}

model LessonPreparation {
  id             String      @id @default(uuid())
  authorUserId   String      // The خادم author
  stageId        String      // The مرحلة this lesson is for
  lessonDate     DateTime    // Date the lesson will be taught
  title          String      // e.g. "مثل الابن الضال"
  scriptureRef   String?     // e.g. "لوقا 15: 11-32"
  mainObjective  String?     // الهدف العام للدرس
  content        String      // Rich text or Markdown lesson body
  attachments    Json?       // Array of { url, fileName, fileType, sizeBytes }
  status         PrepStatus  @default(SUBMITTED)
  reviewerNotes  String?     // Optional feedback from امين الخدمة
  reviewedById   String?
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  author         User        @relation("PrepAuthor", fields: [authorUserId], references: [id], onDelete: Cascade)
  stage          Stage       @relation(fields: [stageId], references: [id])
  reviewedBy     User?       @relation("PrepReviewer", fields: [reviewedById], references: [id])

  @@index([stageId, lessonDate])
  @@index([authorUserId])
  @@map("lesson_preparations")
}

// -------------------------------------------------------------
// 2. SPIRITUAL LIFE TRACKING (الحياة الروحية) — STRICTLY PRIVATE (NFR-3.4)
// -------------------------------------------------------------

enum SpiritualSacrament {
  COMMUNION   // تناول الأسرار المقدسة
  CONFESSION  // سر الاعتراف
  FASTING     // الصوم الكنسي
  PRAYER_RULE // قانون الصلاة اليومي
}

model SpiritualLifeEntry {
  id             String             @id @default(uuid())
  userId         String             // Owner ONLY
  sacrament      SpiritualSacrament
  entryDate      DateTime           // YYYY-MM-DD
  notes          String?            // Encrypted private reflections
  fatherName     String?            // e.g. Father confessor visited
  createdAt      DateTime           @default(now())
  updatedAt      DateTime           @updatedAt

  // Strict relation: only user can query their own entries
  user           User               @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, entryDate])
  @@map("spiritual_life_entries")
}
```

---

### 3.2 The Architectural Privacy Firewall (NFR-3.4)

To guarantee that spiritual life records can **never** leak into administrative views, reports, or aggregations:

1. **Query-Level Isolation:**
   - The `SpiritualLifeEntry` model is strictly isolated in its own service module (`apps/api/src/services/spiritualLife.service.ts`).
   - It is **explicitly prohibited** from being included (`include:` or `join:`) in any user query, stage query, or export pipeline.
   - Any API request attempting to fetch spiritual entries enforces a hard equality check:
     ```typescript
     if (req.params.userId !== req.user.id) {
       // Even if req.user.roleLevel === 5 (امين عام), REJECT
       return res.status(403).json({
         error: 'Forbidden: Spiritual life records are strictly private to the user.',
         code: 'ERR_SPIRITUAL_DATA_FIREWALL'
       });
     }
     ```
2. **Export & Analytics Blacklist:**
   - The export and analytics services in Phase 8 maintain an automated schema blacklist that asserts `spiritual_life_entries` is never queried.

---

### 3.3 Backend API Endpoints & Contracts

#### 1. `POST /api/v1/preparations` (FR-5.1)
- **Protected:** Any authenticated servant or secretary (`roleLevel >= 1`).
- **Request Body:**
  ```json
  {
    "stageId": "stage-uuid-prep-boys",
    "lessonDate": "2026-10-09",
    "title": "دعوة إبراهيم الخليل وطاعته",
    "scriptureRef": "تكوين 12: 1-9",
    "mainObjective": "أن يتعلم المخدوم أهمية الثقة في مواعيد الله والطاعة الفورية",
    "content": "مقدمة الدرس: مناقشة مفهوم السفر إلى مكان مجهول...",
    "attachments": [
      {
        "url": "https://storage.church.org/preps/doc1.pdf",
        "fileName": "نشاط_الدرس.pdf",
        "fileType": "application/pdf",
        "sizeBytes": 245000
      }
    ]
  }
  ```
- **Response (201 Created):** Returns created preparation record.

#### 2. `GET /api/v1/preparations` (FR-5.2)
- **Scope-Driven Query:**
  - If caller is `خادم` (Level 1): Returns only preparations where `authorUserId === req.user.id`.
  - If caller is `امين الخدمة` (Level 3): Returns all preparations authored by servants in caller's assigned `stageId`.
  - If caller is `امين قطاع` (Level 4): Returns all preparations across stages in caller's `sectorId`.
  - If caller is `امين عام` (Level 5): Returns all preparations org-wide.

#### 3. `GET /api/v1/preparations/:id`
- Returns full preparation detail. Scope verified against author's stage.

#### 4. `POST /api/v1/spiritual-life` (FR-6.1, FR-6.2)
- **Protected:** Authenticated user. Always writes with `userId = req.user.id`.
- **Request Body:**
  ```json
  {
    "sacrament": "COMMUNION",
    "entryDate": "2026-09-27",
    "fatherName": "أبونا أنطونيوس",
    "notes": "القداس الإلهي بكنيسة العذراء مريم"
  }
  ```

#### 5. `GET /api/v1/spiritual-life/me` (NFR-3.4)
- Returns caller's own spiritual life journal with date filtering.
- Rejects any attempt to query by `userId` query parameter.

#### 6. `GET /api/v1/dashboard/servant-summary` (FR-13.2)
- Aggregates personal metrics for the logged-in servant:
  - Last 8 weeks personal attendance rate (Mass, Service, Meetings).
  - Next upcoming lesson preparation requirement.
  - Days since last confession log.
  - Assigned members quick-access roster with absence flags.

---

### 3.4 Frontend UI Specifications — Figma Screens (`apps/web`)

#### 1. Lesson Preparation Screen (`apps/web/app/(dashboard)/preparations/page.tsx`)
- **App Bar:** Title "تحضير الدروس", button "تحضير جديد" (`Button accent`).
- **Filter Tabs:** "تحضيراتي" (My Preps) and "تحضيرات المرحلة" (Stage Preps — visible to Stage Secretaries+).
- **Prep Card Item:**
  - Date pill badge, lesson title in `font-h2`, scripture reference badge, stage name, status pill (`SUBMITTED` / `REVIEWED`).
  - Attachment counter chip (e.g. `2 ملفات مرفقة`).
- **Prep Editor Form (`/preparations/new`):**
  - Date picker, stage dropdown, title input, scripture input, objective input.
  - Rich text or markdown textarea for lesson content.
  - Drag-and-drop file attachment container with upload progress bar.

#### 2. Spiritual Life Tracker Drawer (`apps/web/components/spiritual/SpiritualJournal.tsx`)
- Accessed via a private lock icon in the servant's profile.
- **Privacy Assurance Banner:**
  - Soft gold banner: *"بياناتك الروحية مشفرة وخاصة بك بالكامل. لا يمكن لأي أمين أو مسؤول الاطلاع عليها."*
- **Quick Sacrament Action Buttons (Row of 3):**
  - "تناول الأسرار" (Communion)
  - "اعتراف" (Confession)
  - "قانون الصلاة" (Prayer Rule)
- **Visual Rhythm Tracker:**
  - Monthly calendar view showing discrete icons for days with recorded communion or confession.

#### 3. Personal Servant Dashboard (`apps/web/app/(dashboard)/page.tsx` for Servants)
- **Greeting Card:** "أهلاً بك يا خادم المسيح / شنودة" with today's Coptic date.
- **Personal Metrics Row (StatCards):**
  - StatCard 1: Attendance rate (e.g. `92%` over last 8 weeks).
  - StatCard 2: Lessons prepared this term (e.g. `6 دروس`).
  - StatCard 3: Assigned members under care (e.g. `8 مخدومين`).
- **Action Required Alert Section:**
  - Highlights members assigned to this servant who have accumulated consecutive absences:
  - Card: *"تنبيه افتقاد: كيرلس مينا غائب لأسبوعين متتاليين"* with direct "اتصال هاتفي" (Call) and "تسجيل افتقاد" (Log Visit) buttons.

---

## 4. Step-by-Step Task Breakdown

| Task ID | Work Area | Description | Deliverable / Path |
|---|---|---|---|
| **TASK-05-1** | Prisma Migration | Add `LessonPreparation` and `SpiritualLifeEntry` models. Migrate database. | `prisma/schema.prisma` |
| **TASK-05-2** | Storage Service | Implement local/S3 file attachment upload service for lesson prep documents. | `apps/api/src/services/storage.service.ts` |
| **TASK-05-3** | Lesson Prep API | Build CRUD endpoints for lesson preparations with role/scope-based review access. | `apps/api/src/controllers/preparation.controller.ts` |
| **TASK-05-4** | Spiritual Firewall | Implement strictly isolated spiritual life service enforcing self-only access (NFR-3.4). | `apps/api/src/services/spiritualLife.service.ts` |
| **TASK-05-5** | Dashboard API | Implement `/dashboard/servant-summary` aggregating personal attendance and member alerts. | `apps/api/src/controllers/dashboard.controller.ts` |
| **TASK-05-6** | Figma Prep Screen | Build Next.js lesson preparation list and form matching Figma layout. | `apps/web/app/(dashboard)/preparations/page.tsx` |
| **TASK-05-7** | Spiritual Journal UI | Build private spiritual journal modal/drawer with privacy banner and sacrament logger. | `apps/web/components/spiritual/SpiritualJournal.tsx` |
| **TASK-05-8** | Servant Dashboard | Construct the personal servant landing page with attendance trends and absence alerts. | `apps/web/app/(dashboard)/page.tsx` |

---

## 5. Testing & Quality Assurance Plan

1. **Lesson Preparation Scope Tests (FR-5.1 & FR-5.2):**
   - `خادم A` submits a preparation for `Prep Boys`.
   - `خادم B` (in `Prep Boys`) queries preparations → Cannot see `خادم A`'s draft prep.
   - `امين الخدمة` of `Prep Boys` queries preparations → Can view `خادم A`'s preparation.
   - `امين الخدمة` of `Prep Girls` queries preparations → Cannot view `خادم A`'s preparation (`403 Forbidden` / filtered).
2. **Absolute Privacy Firewall Verification (FR-6.2 & NFR-3.4):**
   - Authenticate as `امين عام` (Level 5 General Secretary).
   - Attempt to call `GET /api/v1/spiritual-life?userId=servant-uuid-a` → Expect immediate `403 Forbidden` (`ERR_SPIRITUAL_DATA_FIREWALL`).
   - Run a direct SQL verification asserting no administrative query links `spiritual_life_entries` to other users.
3. **Personal Dashboard Metrics Integrity (FR-13.2):**
   - Verify personal attendance percentage reflects exactly the servant's own records from Phase 4.
   - Verify assigned member absence alerts appear only for members linked to the logged-in servant.

---

## 6. Definition of Done (DoD) Checklist

- [ ] Lesson preparation submission supports rich text content and file attachments.
- [ ] Stage Secretaries and above can review preparations submitted within their scope.
- [ ] Spiritual life records are strictly private; automated tests prove no higher role can access them.
- [ ] No spiritual life data is joined into any administrative query or reporting schema (NFR-3.4).
- [ ] Personal servant dashboard displays accurate personal attendance trends and urgent member absence alerts.
- [ ] All screens conform to Figma typography (Cairo), color tokens, and 390px mobile responsiveness.

---

## 7. Next Phase Handoff & Prerequisites

**Handoff to Phase 6 (Year Plan & Calendar):**
- Lesson preparation scheduling ready to sync with the annual ministry curriculum.
- Servant dashboard ready to display scheduled events and activities from the Year Plan.
- Calendar module ready to accept lesson dates and service events.
