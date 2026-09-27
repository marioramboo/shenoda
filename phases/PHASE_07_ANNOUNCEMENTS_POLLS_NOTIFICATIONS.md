# Phase 7 — Announcements, Polls & Notifications

**Document ID:** CSMS-PLAN-PHASE-07  
**Phase:** 7 of 9  
**Status:** Ready for Implementation  
**Estimated Effort:** 2 Sprints (2–3 weeks)  
**Target Systems:** Next.js (App Router), Express API, Prisma ORM, Web Push (VAPID/FCM), BullMQ / Redis Task Queue  
**Source Traceability:**
- **SRS References:** §1.4 (Assumption A5 Announcement Authority & Upward Addressing Ban), §3.3.9 (Stage Secretary Announcement Rights), §3.4.7 (Sector Secretary Announcement Rights), §3.5.7 (General Secretary Announcement Rights), §5.9 (FR-9.1 Poll Creation, FR-9.2 Real-Time Tallies), §5.10 (FR-10.1 Authoring Tiers, FR-10.2 Strict Audience-Scoping Algorithm, FR-10.3 Recipient Viewing), §5.11 (FR-11.1 Absence Alerts, FR-11.2 Multi-Channel Push/SMS/Email, FR-11.3 Deadline & Meeting Reminders, FR-11.4 Channel Preferences).
- **Figma Prototype:** [Figma Design File](https://www.figma.com/design/BSSLc7uXAfjZUIg60Ghjl5) (Screen: Announcements Feed / الإعلانات, Screen: Poll View / استطلاع الرأي, Viewport 390px).
- **Agile Plan Reference:** Section 9 (Phase 7 — Announcements, Polls, Notifications).

---

## 1. Executive Summary & Objective

The objective of **Phase 7** is to deliver the church's unified communication and broadcast infrastructure:
1. **Announcements (الإعلانات):** A formal publishing channel starting at Stage Secretary level (`امين الخدمة`).
2. **The Upward-Addressing Ban (FR-10.2 & Assumption A5):** The system enforces the **strictest audience-filtering algorithm** in the platform: *An announcer can only target users within their geographic/administrative scope and strictly AT OR BELOW their own hierarchical tier.* A Stage Secretary can never dispatch an announcement to a Sector Secretary or the General Secretary.
3. **Interactive Polls (استطلاعات الرأي):** Rapid opinion gathering for ministry councils with real-time response aggregation (FR-9.1, FR-9.2).
4. **Multi-Channel Notification Dispatcher (FR-11.1–11.4):** A unified notification pipeline delivering push notifications (primary, mobile-first Web Push / Firebase), SMS, and email for announcements, prep deadlines, meetings, and urgent absence alerts.

---

## 2. Previous Phase Summary & System State Baseline

### 2.1 Accomplishments from Phase 6 (Year Plan & Calendar)
- **Year Plan Engine:** Annual plan authoring for stages and sectors with curriculum milestones and feast dates.
- **Servant Participation:** Volunteer opt-in mechanism and stage-scoped servant posts (FR-7.4).
- **Interactive Calendar:** Mobile monthly/weekly agenda grid with direct check-in syncing to `ServantAttendance` (FR-12.2).

### 2.2 System State Entering Phase 7
- Events and curriculum exist, but there is no mechanism to broadcast emergency announcements, distribute meeting agendas, or poll servants on event dates.
- Consecutive absence alerts generated in Phase 4 exist only as database records without outbound mobile notifications.

---

## 3. Detailed Architecture & Technical Specifications for Phase 7

### 3.1 Relational Schema (`prisma/schema.prisma`)

```prisma
// -------------------------------------------------------------
// 1. ANNOUNCEMENTS (الإعلانات)
// -------------------------------------------------------------

enum TargetScopeLevel {
  STAGE_SUBSET   // خدام محددين بالمرحلة
  STAGE_ALL      // كل خدام المرحلة
  SECTOR_ALL     // كل خدام وأمناء القطاع
  ORG_ALL        // الكنيسة بالكامل
}

model Announcement {
  id              String           @id @default(uuid())
  authorUserId    String           // Must have roleLevel >= 3 (امين الخدمة+)
  title           String
  content         String           // Rich text / Markdown
  targetScopeType TargetScopeLevel
  targetStageId   String?
  targetSectorId  String?
  isPinned        Boolean          @default(false)
  expiresAt       DateTime?
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  author          User             @relation("AuthoredAnnouncements", fields: [authorUserId], references: [id])
  targetStage     Stage?           @relation(fields: [targetStageId], references: [id], onDelete: Cascade)
  targetSector    Sector?          @relation(fields: [targetSectorId], references: [id], onDelete: Cascade)
  recipients      AnnouncementRecipient[]

  @@index([createdAt])
  @@index([targetStageId])
  @@map("announcements")
}

// Explicit Recipient Linking for Granular Audience Delivery
model AnnouncementRecipient {
  id              String       @id @default(uuid())
  announcementId  String
  userId          String
  isRead          Boolean      @default(false)
  readAt          DateTime?

  announcement    Announcement @relation(fields: [announcementId], references: [id], onDelete: Cascade)
  user            User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([announcementId, userId])
  @@index([userId, isRead])
  @@map("announcement_recipients")
}

// -------------------------------------------------------------
// 2. POLLS (استطلاعات الرأي)
// -------------------------------------------------------------

model Poll {
  id             String       @id @default(uuid())
  createdById    String       // Must have roleLevel >= 3
  stageId        String?      // Scope of the poll
  sectorId       String?
  question       String       // e.g. "ما هو الموعد الأنسب لليوم الرياضي؟"
  allowMultiple  Boolean      @default(false)
  closesAt       DateTime
  isClosed       Boolean      @default(false)
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  createdBy      User         @relation("CreatedPolls", fields: [createdById], references: [id])
  stage          Stage?       @relation(fields: [stageId], references: [id], onDelete: Cascade)
  sector         Sector?      @relation(fields: [sectorId], references: [id], onDelete: Cascade)
  options        PollOption[]
  votes          PollVote[]

  @@index([stageId])
  @@map("polls")
}

model PollOption {
  id        String     @id @default(uuid())
  pollId    String
  text      String     // e.g. "الجمعة القادمة بعد القداس"
  order     Int        @default(0)

  poll      Poll       @relation(fields: [pollId], references: [id], onDelete: Cascade)
  votes     PollVote[]

  @@map("poll_options")
}

model PollVote {
  id           String     @id @default(uuid())
  pollId       String
  optionId     String
  userId       String     // Voter
  createdAt    DateTime   @default(now())

  poll         Poll       @relation(fields: [pollId], references: [id], onDelete: Cascade)
  option       PollOption @relation(fields: [optionId], references: [id], onDelete: Cascade)
  user         User       @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([pollId, userId, optionId])
  @@map("poll_votes")
}

// -------------------------------------------------------------
// 3. NOTIFICATION DISPATCHER & PREFERENCES (FR-11.1–11.4)
// -------------------------------------------------------------

enum NotificationChannel {
  PUSH
  SMS
  EMAIL
}

enum NotificationType {
  ABSENCE_ALERT       // تنبيه غياب متكرر لمخدوم
  NEW_ANNOUNCEMENT    // إعلان جديد
  PREP_DEADLINE       // تذكير بتحضير الدرس
  SERVICE_MEETING     // تذكير باجتماع الخدمة
  POLL_CREATED        // استطلاع رأي جديد
}

model NotificationLog {
  id             String              @id @default(uuid())
  userId         String              // Recipient
  type           NotificationType
  channel        NotificationChannel
  title          String
  body           String
  dataPayload    Json?               // Deep-link metadata
  isDelivered    Boolean             @default(false)
  sentAt         DateTime            @default(now())

  user           User                @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, sentAt])
  @@map("notification_logs")
}

model UserNotificationPreference {
  id             String   @id @default(uuid())
  userId         String   @unique
  enablePush     Boolean  @default(true)
  enableSms      Boolean  @default(true)
  enableEmail    Boolean  @default(false)
  pushSubscription Json?  // Web Push VAPID subscription object

  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_notification_preferences")
}
```

---

### 3.2 The Upward-Addressing Ban Algorithm (FR-10.2 & Assumption A5)

This rule is enforced at the core API validation layer:

```typescript
// apps/api/src/services/announcementAudience.service.ts

export async function validateAndResolveAudience(
  author: UserContext,
  input: {
    targetScopeType: TargetScopeLevel;
    targetStageId?: string;
    targetSectorId?: string;
    specificUserIds?: string[];
  }
): Promise<string[]> {
  // 1. Author must have roleLevel >= 3 (Stage Secretary+)
  if (author.roleLevel < 3) {
    throw new ForbiddenError('Announcement creation requires Stage Secretary role or above.');
  }

  // 2. Fetch candidate recipient users based on scope
  let candidateUsers: Array<{ id: string; roleLevel: number }> = [];

  if (input.specificUserIds && input.specificUserIds.length > 0) {
    candidateUsers = await prisma.user.findMany({
      where: { id: { in: input.specificUserIds } },
      select: { id: true, role: { select: { level: true } } },
    }).then(res => res.map(u => ({ id: u.id, roleLevel: u.role.level })));
  } else if (input.targetStageId) {
    // Stage-wide targeting
    candidateUsers = await getUsersByStage(input.targetStageId);
  } else if (input.targetSectorId) {
    // Sector-wide targeting
    if (author.roleLevel < 4) {
      throw new ForbiddenError('Only Sector Secretary or above can target an entire sector.');
    }
    candidateUsers = await getUsersBySector(input.targetSectorId);
  }

  // 3. THE UPWARD ADDRESSING BAN (FR-10.2 & Assumption A5):
  // Filter out any user whose roleLevel > author.roleLevel
  // If author explicitly targeted an individual above them, throw an error
  const invalidRecipients = candidateUsers.filter(u => u.roleLevel > author.roleLevel);
  if (invalidRecipients.length > 0) {
    throw new ForbiddenError(
      `Violation of Hierarchical Rule (FR-10.2): You cannot target users with a higher role level (${invalidRecipients.length} higher-tier users blocked).`
    );
  }

  // 4. Return valid recipient IDs (all at or below author's tier)
  return candidateUsers.map(u => u.id);
}
```

---

### 3.3 Multi-Channel Notification Pipeline (FR-11.1–11.4)

Implemented as a provider-agnostic dispatch engine backed by a background worker queue:

```text
[Event Trigger: Absence Alert / Announcement / Reminder]
                         │
                         ▼
             [Notification Dispatcher]
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
   [Web Push]          [SMS]           [Email]
  (VAPID / FCM)    (Twilio / Local)  (Resend / SMTP)
        │                │                │
        └────────────────┼────────────────┘
                         ▼
            [Write NotificationLog]
```

1. **Absence Alert Wiring (FR-11.1):** When Phase 4's `absenceDetector` flags 2 consecutive absences, it immediately calls `notifyAbsenceAlert(servantId, memberId, count)`.
2. **Upcoming Prep Reminders (FR-11.3):** A scheduled cron triggers every Wednesday at 6:00 PM, querying servants whose lesson preparations are missing for the upcoming Friday.

---

### 3.4 Backend API Endpoints & Contracts

#### 1. `POST /api/v1/announcements` (FR-10.1, FR-10.2)
- **Protected:** Requires `roleLevel >= 3`.
- Validates audience via `validateAndResolveAudience`.
- Inserts `Announcement` and batch-creates `AnnouncementRecipient` records.
- Dispatches notifications via push/SMS.

#### 2. `GET /api/v1/announcements` (FR-10.3)
- Returns announcements where caller is in `recipients` or targeted scope.
- Includes read/unread indicators.

#### 3. `PATCH /api/v1/announcements/:id/read`
- Marks announcement as read for caller.

#### 4. `POST /api/v1/polls` (FR-9.1)
- **Protected:** Requires `roleLevel >= 3`.
- Request contains question, options array, scope, and expiration datetime.

#### 5. `POST /api/v1/polls/:id/vote`
- Records voter's choice in `PollVote`. Prevents duplicate voting if `allowMultiple = false`.

#### 6. `GET /api/v1/polls/:id/results` (FR-9.2)
- Returns real-time vote tallies with percentage breakdown.

#### 7. `GET /api/v1/notifications/preferences` & `PUT /api/v1/notifications/preferences` (FR-11.4)
- Manage user's push, SMS, and email delivery toggles and Web Push keys.

---

### 3.5 Frontend UI Specifications — Figma Screens (`apps/web`)

#### 1. Announcements Feed Screen (`apps/web/app/(dashboard)/announcements/page.tsx`)
- **Header:** Title "الإعلانات والتنبيهات", New Announcement button (`Button primary`, visible only if `roleLevel >= 3`).
- **Announcement Cards:**
  - Pinned announcement indicator (Gold cross badge).
  - Author badge with role pill (e.g. `امين الخدمة / بيشوي عادل`).
  - Formatted text body with links.
  - Read/unread unread indicator dot in `brand-accent`.
- **Composer Drawer (`/announcements/new`):**
  - Title, rich text body.
  - **Audience Target Picker:**
    - Segment: "خدام مرحلتي فقط" (Default).
    - If user is `امين قطاع`: "كل قطاع الشباب".
    - System UI automatically disables options for tiers above the user.

#### 2. Poll Card Component (`apps/web/components/polls/PollCard.tsx`)
- Question in `font-h2`.
- Radio options with live visual progress bars showing vote distribution (e.g. `65%` [============  ]).
- Badge showing voting deadline: *"ينتهي الاستطلاع غداً الساعة 10 مساءً"*.

#### 3. Notification Center Drawer (`apps/web/components/layout/NotificationDrawer.tsx`)
- Slide-over drawer listing recent alerts, absence warnings, and prep reminders.

---

## 4. Step-by-Step Task Breakdown

| Task ID | Work Area | Description | Deliverable / Path |
|---|---|---|---|
| **TASK-07-1** | Prisma Migration | Add `Announcement`, `AnnouncementRecipient`, `Poll`, `PollOption`, `PollVote`, and notification tables. | `prisma/schema.prisma` |
| **TASK-07-2** | Audience Validator | Implement the Upward-Addressing Ban algorithm strictly enforcing FR-10.2 and Assumption A5. | `apps/api/src/services/announcementAudience.service.ts` |
| **TASK-07-3** | Announcement API | Build creation and recipient-feed endpoints with auto-notification dispatch. | `apps/api/src/controllers/announcement.controller.ts` |
| **TASK-07-4** | Polls Engine | Build poll creation, voting, and real-time tally endpoints (FR-9.1, FR-9.2). | `apps/api/src/controllers/poll.controller.ts` |
| **TASK-07-5** | Notification Queue | Implement multi-channel notification dispatcher (Web Push, SMS, Email) with BullMQ / Redis. | `apps/api/src/services/notificationQueue.service.ts` |
| **TASK-07-6** | Cron Reminders | Implement scheduled jobs for absence warnings and preparation submission reminders. | `apps/api/src/jobs/reminderCron.ts` |
| **TASK-07-7** | Figma Announcements | Build Announcements feed and composer drawer matching Figma layout. | `apps/web/app/(dashboard)/announcements/page.tsx` |
| **TASK-07-8** | Interactive Poll UI | Build responsive poll voting component with animated live percentage bars. | `apps/web/components/polls/PollCard.tsx` |

---

## 5. Testing & Quality Assurance Plan

1. **Upward-Addressing Ban Tests (FR-10.2 & Assumption A5):**
   - Authenticate as `امين الخدمة` (Level 3).
   - Create announcement targeting an `امين قطاع` (Level 4) or `امين عام` (Level 5) user ID → Expect immediate `403 Forbidden` (`ERR_UPWARD_ADDRESSING_PROHIBITED`).
   - Create announcement targeting `خدام` (Level 1) in own stage → Expect `201 Created`.
2. **Announcement Scope Isolation Tests:**
   - `امين الخدمة` of `Prep Boys` publishes an announcement for his stage.
   - User in `Prep Girls` queries announcements → Does NOT receive or see the announcement.
3. **Poll Voting Integrity Tests (FR-9.1 & FR-9.2):**
   - Servant votes on an option → Real-time tally increments by 1.
   - Servant attempts to vote a second time on a single-choice poll → Expect `400 Bad Request` (`ERR_ALREADY_VOTED`).
4. **Notification Dispatch Verification (FR-11.1–11.4):**
   - Simulate a consecutive absence alert from Phase 4 → Verify `NotificationLog` captures outbound SMS/Push record.

---

## 6. Definition of Done (DoD) Checklist

- [ ] Announcements can only be created by Stage Secretary or above (Assumption A5).
- [ ] Upward-addressing ban algorithm verified: authors cannot address superiors (FR-10.2).
- [ ] Users see only announcements explicitly addressed to their scope.
- [ ] Interactive polls calculate real-time percentage tallies accurately.
- [ ] Multi-channel notification pipeline dispatches push alerts and logs delivery status.
- [ ] User notification preference toggles allow opt-out of SMS or Email channels.

---

## 7. Next Phase Handoff & Prerequisites

**Handoff to Phase 8 (Analytics, Reports & Export):**
- System-wide engagement data (announcement read rates, poll results, attendance rates) ready for executive reporting.
- Audit logger ready to track administrative data exports.
- Core operational features fully complete, ready for analytics synthesis.
