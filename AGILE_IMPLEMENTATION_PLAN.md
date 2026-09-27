# Church Service Management System — Agile Implementation Plan
**For: AI coding agent (Claude Code or similar) & Engineering Team**  
**Source of truth:** `Church_Service_Management_System_SRS.md` (SRS v1.0) + Figma prototype: https://www.figma.com/design/BSSLc7uXAfjZUIg60Ghjl5  
**Detailed Phase Specifications Directory:** [`phases/`](./phases/README.md)

> [!IMPORTANT]
> Each phase has been expanded into a fully detailed, self-contained implementation specification containing previous phase retrospectives, complete Prisma schemas, API contracts, algorithms, Figma UI layouts, and test plans:
> - **Phase 0:** [Foundations & Design System](./phases/PHASE_00_FOUNDATIONS.md)
> - **Phase 1:** [Data Model, Roles & Permission Engine](./phases/PHASE_01_DATA_MODEL_AND_PERMISSIONS.md)
> - **Phase 2:** [Authentication & Account Management](./phases/PHASE_02_AUTH_AND_ACCOUNT_MANAGEMENT.md)
> - **Phase 3:** [Servant & Member Records](./phases/PHASE_03_SERVANT_AND_MEMBER_RECORDS.md)
> - **Phase 4:** [Attendance & Follow-up (جدول المتابعة)](./phases/PHASE_04_ATTENDANCE_AND_FOLLOW_UP.md)
> - **Phase 5:** [Servant Self-Service: تحضير & Spiritual Life](./phases/PHASE_05_SERVANT_SELF_SERVICE.md)
> - **Phase 6:** [Year Plan (تدبير السنة) & Calendar](./phases/PHASE_06_YEAR_PLAN_AND_CALENDAR.md)
> - **Phase 7:** [Announcements, Polls & Notifications](./phases/PHASE_07_ANNOUNCEMENTS_POLLS_NOTIFICATIONS.md)
> - **Phase 8:** [Analytics, Reports & Export](./phases/PHASE_08_ANALYTICS_AND_EXPORTS.md)
> - **Phase 9:** [Hardening, Performance, Reliability & Deployment](./phases/PHASE_09_HARDENING_PERFORMANCE_DEPLOYMENT.md)

---

## 0. How to use this plan

- Work **one phase at a time, in order**. Each phase ends with a working, demoable increment and a Definition of Done (DoD) that must pass before moving on.
- Every task references an SRS requirement ID (`FR-x.x` / `NFR-x.x`) — go back to the SRS for full wording if a task is ambiguous.
- **Never hardcode role/permission logic.** NFR-6.1 requires a data-driven permission matrix. Build the roles table + permission rules as configurable data from Phase 1 onward; every later phase's access checks must read from it, not from `if (role === 'خادم')` branches scattered in code.
- The SRS lists 7 open items (A1–A7, §1.4) the client hasn't formally confirmed. Build to the **stated default assumption** for each, but keep each one isolated and easy to change (a config flag, a single permission-matrix row, etc.) — don't let an assumption leak into five different files. They are cross-referenced below wherever relevant.
- **UI must match the Figma prototype**: component shapes, spacing, the color tokens and Cairo type scale defined on the Foundations page, and RTL layout throughout (`dir="rtl"` at the root, not per-component patches). Pull exact hex values / font weights from Figma rather than eyeballing screenshots.
- Every phase that touches مخدومين (minor) data must enforce **server-side** scope checks (NFR-3.1) — UI hiding is never sufficient on its own.
- Write tests as you go (unit for permission logic, integration for API scope enforcement, at least smoke E2E for each screen). Don't defer testing to a later phase.
- Commit at the end of each completed task with a message referencing its FR/NFR ID.

---

## 1. Tech Stack & Architecture (locked in)

| Layer | Choice |
|---|---|
| Frontend | Next.js (React), App Router, TypeScript |
| Backend | Node.js + Express, TypeScript |
| Database | PostgreSQL |
| ORM | Prisma (recommended — makes the data-driven permission matrix and audit logging easier) |
| Auth | Session or JWT-based, server-issued only — no self-registration (A7) |
| Styling | Tailwind CSS, configured with the Figma color tokens and Cairo font |
| Hosting target | Any Node-friendly host (Vercel for frontend, Railway/Render/Fly for API+DB, or a single VPS) — not fixed yet, keep infra config env-driven |

**Monorepo layout (suggested):**
```
/apps
  /web        → Next.js frontend
  /api        → Express backend
/packages
  /shared     → shared TypeScript types, permission-matrix definitions, constants
/prisma       → schema, migrations, seed
```

---

## Phase 0 — Project Foundations & Design System

**Goal:** A running skeleton app with the design system wired up, before any real feature exists.

**Tasks:**
- [ ] Scaffold the monorepo (Next.js `apps/web`, Express `apps/api`, shared `packages/shared`).
- [ ] Set up PostgreSQL + Prisma, connect both to local/dev env via `.env`.
- [ ] Import design tokens from Figma Foundations page into Tailwind config: colors (`brand/primary #1F3A5F`, `brand/primary-dark #152A47`, `brand/primary-soft #E6ECF5`, `brand/accent #B8892B`, `brand/accent-soft #F7EDD5`, `bg/app #F6F4EE`, `bg/surface #FFFFFF`, `bg/muted #EFECE3`, `border/default #E3DFD3`, `text/primary #1B2432`, `text/secondary #5F6A7A`, `text/disabled #9AA3AF`, `status/success #2F855A`, `status/danger #C0392B`, `status/warning #B7791F` + soft variants), and the type scale (Display/Title, Heading/H1, Heading/H2, Body/Default, Body/Medium, Body/Small, Caption, Label/Button — all Cairo).
- [ ] Load Cairo font (Google Fonts or self-hosted), set `dir="rtl"` and `lang="ar"` on the HTML root globally.
- [ ] Build the shared component library matching Figma 1:1: `Button` (Primary/Secondary/Outline/Danger), `Badge` (6 tones), `Input` (Default/Focused/Error), `Chip` (Selected true/false), `TabBar` (5 items), `AppBar`, `MemberRow`, `StatCard` (4 tones), `AttendanceToggle` (4 states).
- [ ] Set up a base mobile-first layout shell (status-bar-safe spacing, bottom tab bar, app bar) reusable across all screens.
- [ ] CI: lint + typecheck + test on every push.

**Definition of Done:** App boots locally, shows a placeholder RTL screen using at least 3 of the shared components styled correctly against Figma, CI green.

---

## Phase 1 — Data Model, Roles & Permission Engine

**Goal:** The organizational hierarchy and the permission matrix exist and are enforced server-side, before any screen depends on them.

**Tasks:**
- [ ] Design and migrate core schema: `Organization`, `Sector` (قطاع), `Stage` (مرحلة, from the fixed taxonomy in §2.1B — include the بنين/بنات split for اعدادي/ثانوي), `User` (خدام + secretarial roles share one table with a `role` field), `Membership`/scope-assignment linking a user to their مرحلة or قطاع.
- [ ] Model the 5-level role hierarchy as data (§2.1A): خادم → مساعد امين الخدمة → امين الخدمة → امين قطاع → امين عام. Store as an ordered `Role` table with a `level` integer, not an enum with hardcoded ordering logic.
- [ ] Build the **permission matrix** (NFR-6.1): a data table of `(role, action, scope-rule)` — cumulative per §3 ("each role inherits everything below it"). Implement inheritance by level comparison, not by duplicating permission rows per role.
- [ ] Implement scope resolution: given a logged-in user, compute what مرحلة(s)/قطاع(s)/org they can act on, based on their role + assignment.
- [ ] **A1 handling:** امين الخدمة's own evaluative fields are set by his امين قطاع (not self-evaluated). Model "who evaluates whom" as a lookup derived from the hierarchy (superior-of), not a special case.
- [ ] **A3 handling:** امين عام has identity fields only, no evaluative fields — make evaluative-field visibility conditional on "has a superior," which naturally resolves to false for امين عام.
- [ ] **A7 handling:** No public signup route exists at all. Account creation is an authenticated, scoped action (built in Phase 2).
- [ ] Build the authorization middleware: every API route declares required action + scope; middleware checks against the matrix and the request's target scope, rejecting with 403 if outside it. This is the single enforcement point — no per-route ad hoc checks.
- [ ] Unit tests: permission inheritance (a خادم cannot do what a مساعد can; a مساعد can do everything a خادم can), scope isolation (a user in one مرحلة cannot read/write another مرحلة's data even with a guessed ID).

**Definition of Done:** A seed script creates a small fake org (1 قطاع, 2 مراحل, users at each role level) and a test suite proves cumulative permissions and scope isolation via real API calls, not just unit-level matrix logic.

---

## Phase 2 — Authentication & Account Management

**Goal:** Login works end-to-end, matching the Figma Login screen, and secretaries can create accounts within their scope.

**Tasks:**
- [ ] Build login API: phone/email + password, server-issued session/JWT. Passwords hashed + salted (NFR-3.2, bcrypt/argon2).
- [ ] Login rate-limiting (NFR-3.2) — lock out or backoff after N failed attempts per account/IP.
- [ ] Build the **Login screen** per Figma exactly: logo mark, title, phone/email input, password input, "remember me," forgot-password link, primary login button, the "accounts are created by the secretary — no self-registration" note card.
- [ ] Build "Create account" flow, scoped: امين الخدمة+ can create خادم/مساعد accounts within their مرحلة; امين قطاع can create امين الخدمة accounts within their قطاع; امين عام can create امين قطاع accounts. Enforce via the Phase 1 permission matrix, not new logic.
- [ ] Forgot-password flow (reset token via whatever channel is configured — email at minimum for Phase 1).
- [ ] Session handling: logout, token refresh/expiry, "logged in as" context available to the whole frontend app.
- [ ] Audit-log account creation/role changes (ties into NFR-3.3's spirit even though that NFR is about data fields specifically — sets the pattern used again in later phases).

**Definition of Done:** A secretary can log in, create a new خادم account scoped to their مرحلة, log out, and the new خادم can log in and see only their own scope. Login screen pixel-matches Figma at 390px width and reflows sensibly on desktop.

---

## Phase 3 — Servant (خادم) & Member (مخدوم) Records

**Goal:** The two core entities of the system — servants and served members — are fully modeled, listable, and viewable/editable per scope.

**Tasks:**
- [ ] Extend `User` (خدام) profile: non-evaluative fields editable by self (§3.1.3); evaluative fields (per role) editable only per the Phase 1 "who evaluates whom" resolution.
- [ ] Model `ServedMember` (مخدوم) — **records only, no login** (§1.2): identity fields, guardian/contact info, assigned مرحلة, assigned خادم(s).
- [ ] **A2 handling:** خادم can add/edit exactly three evaluative fields (الحالة المادية، سلوكه في الخدمة، اندماجه) only for مخدومين directly assigned to him — a narrower permission than his general "view only" scope. Model this as its own matrix row (field-level, not record-level, permission), not a bypass of the general rule.
- [ ] Full مخدوم-record editing (all fields) reserved for مساعد and above within their مرحلة.
- [ ] Build **Members List screen** per Figma: search, stage filter chips, member rows with status badges, FAB to add a new مخدوم (visible only where the current user has create permission).
- [ ] Build **Member Profile screen** per Figma: avatar/name header, stat cards (attendance %, افتقاد count), contact info card, evaluative "Status & Evaluation" card visibly marked as entered by the assigned خادم, edit action gated by permission.
- [ ] Sensitive-field access logging (NFR-3.3): every view/edit of financial status, address, or phone recorded with who/when — build this as a reusable "log field access" utility now, since Phase 8 (exports) and analytics will need to respect it too.
- [ ] Tests: خادم can edit only his 3 fields on his own assigned مخدومين and gets 403 on others; مساعد can edit full records within مرحلة only.

**Definition of Done:** Members list + profile screens work against real scoped data for at least 3 different role logins, matching Figma layout; access log table has entries after viewing a sensitive field.

---

## Phase 4 — Attendance & Follow-up (جدول المتابعة)

**Goal:** The core weekly workflow — recording attendance — is fully functional.

**Tasks:**
- [ ] Model attendance/follow-up records: session type (القداس / الخدمة / الافتقاد / الأنشطة — note مساعد's table mirrors خادم's per **A4**, i.e. includes الأنشطة but not اجتماع الأمناء, which starts at امين الخدمة), date, subject (خادم or مخدوم), status (Present/Absent/Excused), recorded-by.
- [ ] Enforce §3.1.2: خادم can only **view** his own follow-up history, never add/edit it — it's recorded by his supervising secretary. Build this as a read-only scope, not a hidden edit button.
- [ ] Build **Attendance Entry screen** per Figma: date picker, session-type chips, summary badges (present/absent counts), per-member 3-way toggle (Present/Absent/Excused), save action.
- [ ] Absence-threshold alerting (FR-4.3/FR-11.1): configurable consecutive-absence threshold per scope; trigger an alert to the responsible خادم/امين when crossed. Build the notification *dispatch* as a stub/log for now — full channel delivery is Phase 6.
- [ ] Aggregate attendance % calculation used by profile stat cards (Phase 3) and dashboards (Phase 7) — build this once as a shared query/service, don't recompute ad hoc in each screen.
- [ ] Tests: attendance save persists correctly per session type; خادم gets 403 attempting to POST his own attendance edit; threshold alert fires at the configured count and not before.

**Definition of Done:** A مساعد/امين can record a full session's attendance for their روster in under the screen's intended flow, matching Figma; a خادم can view but not edit his own history; an absence alert record is created when the threshold is crossed.

---

## Phase 5 — Servant Self-Service: تحضير & Spiritual Life

**Goal:** خادم-facing personal tools, including the system's one hard privacy boundary (spiritual life data).

**Tasks:**
- [ ] Build تحضير (lesson prep) submission: خادم submits, امين الخدمة+ within scope can view all submissions in scope (FR-5.1/5.2).
- [ ] Build spiritual-life tracking (تناول/اعتراف/صلاة) — **strictly private** (FR-6.2, NFR-3.4): visible only to the user themself, never in any export, aggregate, or another user's view, ever. Implement this as a hard exclusion in the query layer (e.g., a separate table/service never joined into reporting queries) rather than a permission-matrix row that could accidentally be granted.
- [ ] Build personal dashboard (FR-13.2): خادم's own attendance + spiritual-life trend view, reusing Phase 4's aggregate service for the attendance half.
- [ ] Tests: an امين الخدمة (even org-wide امين عام) gets 403/empty on any attempt to read another user's spiritual-life data via the API directly, not just via the UI.

**Definition of Done:** خادم can submit تحضير and log spiritual-life entries; a scripted attempt by a higher-role account to read another user's spiritual data fails at the API level.

---

## Phase 6 — Year Plan (تدبير السنة) & Calendar

**Goal:** Annual planning and the calendar/event system, including خادم's limited posting right.

**Tasks:**
- [ ] Model the Year Plan as scoped content (مرحلة/قطاع/org) authored by امين الخدمة+ (FR-7.1).
- [ ] Build view + opt-in for all users (FR-7.2) — e.g., signing up for an activity.
- [ ] **FR-7.4:** خادم can post an item/update visible only to خدام within his own مرحلة, explicitly not affecting the official plan — model this as a separate "servant post" entity linked to but distinct from the official plan, so it can never be confused with authored content in permission checks.
- [ ] Build Calendar module (FR-12.1) reflecting the Year Plan, scoped to the logged-in user.
- [ ] Event attendance confirmation feeds directly into جدول المتابعة (FR-12.2) — reuse Phase 4's attendance recording service rather than building a parallel path.
- [ ] Tests: خادم's plan post never appears in another مرحلة's feed and never mutates the official plan record.

**Definition of Done:** امين الخدمة can publish a Year Plan item; it appears on the calendar; a user can confirm attendance on a calendar event and see it reflected in their follow-up table.

---

## Phase 7 — Announcements, Polls, Notifications

**Goal:** Scoped communication tools and the notification delivery system.

**Tasks:**
- [ ] Build announcement composition (FR-10.1, starts at امين الخدمة — **A5**: مساعد and خادم cannot compose).
- [ ] **Audience-scoping rule (FR-10.2)** — this is the trickiest permission logic in the whole system: an author selects individuals/groups within their own scope and **at or below their own hierarchy level only** (e.g. امين الخدمة can never target امين قطاع or امين عام). Implement as a query against the Phase 1 role-level data (reject any selection where `target.level < author.level`), not a hardcoded per-role list.
- [ ] Build announcement viewing for anyone in the selected audience (FR-10.3).
- [ ] Build polls (FR-9.1/9.2): امين الخدمة+ creates, scoped audience, real-time tally view for the creator.
- [ ] Build the notification delivery layer (FR-11.1–11.4): push (primary), SMS, email — implement behind a provider-agnostic interface so a real SMS/push provider can be swapped in later; per-user channel preferences (FR-11.4); wire up the Phase 4 absence-alert stub and تحضير/meeting reminders (FR-11.3) to actually send now.
- [ ] Tests: an امين الخدمة attempting to target امين قطاع in an announcement is rejected; a user only sees announcements/polls within their selected audience.

**Definition of Done:** An امين الخدمة can publish an announcement to a chosen sub-scope audience and it's correctly received only by that audience; a poll shows live tallies; an absence alert actually reaches the configured channel (even if via a sandbox/test provider).

---

## Phase 8 — Analytics, Reports & Export

**Goal:** Dashboards and exports, respecting every privacy rule established so far.

**Tasks:**
- [ ] Build scoped analytics dashboards (FR-13.1) per secretarial level: attendance trends, تحضير submission rates, evaluative-field distributions, outstanding absence alerts — all built on the Phase 4 aggregate service, scoped via the Phase 1 middleware.
- [ ] **Hard exclusion check:** confirm no dashboard query can surface spiritual-life data (NFR-3.4) — add this as an explicit test, not just a code review note.
- [ ] Build PDF/Excel export (FR-14.1): individual profile + follow-up history, aggregated attendance, poll results.
- [ ] Restrict + audit-log sensitive exports (FR-14.2): reuse the Phase 3 field-access-logging utility for export events specifically.
- [ ] Tests: exported files never contain spiritual-life fields; export of another scope's data is rejected; every export call produces an audit log entry.

**Definition of Done:** Each role level sees a correctly scoped dashboard; a PDF and an Excel export both generate correctly and are logged; an automated check confirms spiritual data cannot appear in any export/dashboard payload.

---

## Phase 9 — Hardening, Performance, Reliability & Deployment

**Goal:** Production-readiness against the NFRs that don't map to a single feature.

**Tasks:**
- [ ] Performance pass: confirm attendance entry and profile view load within 2s on a throttled 4G profile (NFR-2.1); add DB indexes for the common scoped queries; load-test with a synthetic dataset of several thousand مخدومين / several hundred خدام (NFR-2.2).
- [ ] Retry-safe form submission for intermittent connectivity (NFR-4.2) — idempotency keys on attendance/تحضير submits at minimum.
- [ ] Encrypted, scheduled DB backups (NFR-3.5).
- [ ] Security pass: confirm every route re-checks server-side scope (NFR-3.1) with an automated route-permission test sweep, not just the tests written per phase; verify rate-limiting still holds; dependency audit.
- [ ] Mobile-first usability pass against every screen at 375–414px widths plus a basic desktop reflow check (NFR-1.1); full RTL audit — no stray LTR-leaking components (NFR-1.2); simplicity/low-friction review for non-technical users (NFR-1.3), e.g. reduce jargon, add inline hints where SRS terms appear.
- [ ] Localization scaffolding (NFR-7.1): even though Arabic-only is required now, make sure UI strings run through a single i18n layer so English can be added later without a rewrite.
- [ ] Set up staging + production environments, CI/CD deploy pipeline, uptime monitoring toward the 99.5% target (NFR-4.1).
- [ ] Final walkthrough of all 7 open assumptions (A1–A7) as a checklist to hand back to the client for confirmation before go-live — each should map to one identifiable config point in the code, per the "How to use this plan" note above.

**Definition of Done:** Load test passes at target scale, full RTL/mobile QA pass complete, backups running on schedule, CI/CD deploys to staging automatically, and the A1–A7 checklist is ready to send to the client.

---

## Appendix — Traceability Quick-Reference

Use this to sanity-check nothing from the SRS was dropped:

| SRS Section | Covered in Phase |
|---|---|
| §3 Roles & Permissions, NFR-6.1 | Phase 1 |
| §5.1 Auth/Accounts (FR-1.x), A7 | Phase 2 |
| §5.2–5.3 خادم/مخدوم profiles, A1–A3 | Phase 3 |
| §5.4 Attendance/Follow-up (FR-4.x), A2, A4 | Phase 3–4 |
| §5.5 تحضير (FR-5.x) | Phase 5 |
| §5.6 Spiritual Life (FR-6.x, NFR-3.4) | Phase 5 |
| §5.7 Year Plan (FR-7.x) | Phase 6 |
| §5.8 Notes & Evaluations (FR-8.x) | Phase 3 (evaluator resolution) / Phase 6 (notes UI can slot in here if not built earlier) |
| §5.9 Polls (FR-9.x) | Phase 7 |
| §5.10 Announcements (FR-10.x), A5 | Phase 7 |
| §5.11 Notifications (FR-11.x) | Phase 7 |
| §5.12 Calendar (FR-12.x) | Phase 6 |
| §5.13 Analytics (FR-13.x) | Phase 8 |
| §5.14 Reports Export (FR-14.x) | Phase 8 |
| §6 all NFRs | Phase 9 (plus enforced incrementally per phase as noted) |

**Note:** §5.8 (Notes & Evaluations) wasn't given its own phase above — add a short task for it in Phase 3 (a private note an امين can attach to a خادم/امين in scope, visible only up the reporting chain per FR-8.2) since it reuses the same scope/hierarchy logic already being built there.
