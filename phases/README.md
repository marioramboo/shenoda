# Church Service Management System — Full Agile Implementation Plan

**Source Specifications:**
- SRS Specification: [`Church_Service_Management_System_SRS.md`](../Church_Service_Management_System_SRS%20(1).md)
- Figma Design Prototype: [Figma Design System](https://www.figma.com/design/BSSLc7uXAfjZUIg60Ghjl5)
- Original High-Level Plan: [`AGILE_IMPLEMENTATION_PLAN.md`](../AGILE_IMPLEMENTATION_PLAN.md)

---

## Master Architecture & Phase Progression

This directory contains the **modular, phase-by-phase implementation plan** for the Church Service Management System. Each document represents a complete, self-contained development phase featuring:
1. **SRS & Figma Traceability**
2. **Previous Phase Retrospective & System State Baseline** (summarizing exactly what was completed in the preceding plan and the current operational state of the database, API, and frontend)
3. **Exhaustive Technical Specifications** for the phase (Prisma schemas, API contracts, algorithms, mobile-first Cairo RTL UI components, and NFR enforcement)
4. **Step-by-Step Task Breakdown**
5. **Testing & QA Verification Matrix**
6. **Definition of Done (DoD) Checklist**
7. **Handoff Artifacts for the Next Phase**

---

## Phase Navigation Matrix

| Phase | Title | Primary Deliverable | Traceability & Key Rules | Documentation Link |
|:---:|---|---|---|:---:|
| **0** | **Project Foundations & Design System** | Monorepo scaffold, Tailwind Figma tokens, Cairo RTL setup, shared atomic UI components. | NFR-1.1, NFR-1.2, NFR-1.3, Figma Foundations | [PHASE_00_FOUNDATIONS.md](./PHASE_00_FOUNDATIONS.md) |
| **1** | **Data Model, Roles & Permission Engine** | Relational schema, cumulative 5-tier role hierarchy, scope resolution engine, auth middleware. | NFR-6.1, §3.1–3.6, Assumptions A1, A3, A6, A7 | [PHASE_01_DATA_MODEL_AND_PERMISSIONS.md](./PHASE_01_DATA_MODEL_AND_PERMISSIONS.md) |
| **2** | **Authentication & Account Management** | Argon2id hashing, JWT/cookie refresh, brute-force rate limiter, scoped account creation, Figma login screen. | FR-1.1–1.4, NFR-3.2, Assumption A7 (No self-reg) | [PHASE_02_AUTH_AND_ACCOUNT_MANAGEMENT.md](./PHASE_02_AUTH_AND_ACCOUNT_MANAGEMENT.md) |
| **3** | **Servant & Member Records** | Served member dossier (no login), Assumption A2 3-field rule for servants, upward confidential notes, sensitive access logs. | FR-2.1–2.3, FR-3.1–3.4, FR-8.1–8.2, NFR-3.1, NFR-3.3, Assumption A2 | [PHASE_03_SERVANT_AND_MEMBER_RECORDS.md](./PHASE_03_SERVANT_AND_MEMBER_RECORDS.md) |
| **4** | **Attendance & Follow-up (جدول المتابعة)** | Weekly follow-up tables for servants & members, Assumption A4 rules, rolling attendance (4/8/12 wks), absence alert engine, Figma attendance UI. | FR-4.1–4.3, FR-11.1, NFR-2.1, NFR-4.2, Assumption A4 | [PHASE_04_ATTENDANCE_AND_FOLLOW_UP.md](./PHASE_04_ATTENDANCE_AND_FOLLOW_UP.md) |
| **5** | **Servant Self-Service: تحضير & Spiritual Life** | Lesson prep submission & secretarial review, spiritual life journal with absolute privacy firewall, personal servant dashboard. | FR-5.1–5.2, FR-6.1–6.2, FR-13.2, NFR-3.4 (Zero leak assertion) | [PHASE_05_SERVANT_SELF_SERVICE.md](./PHASE_05_SERVANT_SELF_SERVICE.md) |
| **6** | **Year Plan (تدبير السنة) & Calendar** | Curriculum planning, volunteer opt-ins, stage-scoped servant posts (FR-7.4), interactive calendar with direct follow-up sync. | FR-7.1–7.4, FR-12.1–12.2 | [PHASE_06_YEAR_PLAN_AND_CALENDAR.md](./PHASE_06_YEAR_PLAN_AND_CALENDAR.md) |
| **7** | **Announcements, Polls & Notifications** | Announcement authoring, Upward-Addressing Ban algorithm, interactive polls, multi-channel notification engine (Push/SMS/Email). | FR-9.1–9.2, FR-10.1–10.3, FR-11.1–11.4, Assumption A5 | [PHASE_07_ANNOUNCEMENTS_POLLS_NOTIFICATIONS.md](./PHASE_07_ANNOUNCEMENTS_POLLS_NOTIFICATIONS.md) |
| **8** | **Analytics, Reports & Export** | Executive dashboards scoped by tier, spiritual data blacklist assertion, Cairo RTL PDF letterhead dossiers, Excel export with RTL sheets. | FR-13.1, FR-14.1–14.2, NFR-3.3, NFR-3.4 | [PHASE_08_ANALYTICS_AND_EXPORTS.md](./PHASE_08_ANALYTICS_AND_EXPORTS.md) |
| **9** | **Hardening, Performance, Reliability & Deployment** | Throttled 4G performance (<2s), synthetic congregation load testing, idempotency keys, automated security sweep, encrypted backups, client sign-off matrix. | NFR-1.1–1.3, NFR-2.1–2.2, NFR-3.1–3.5, NFR-4.1–4.2, Assumptions A1–A7 | [PHASE_09_HARDENING_PERFORMANCE_DEPLOYMENT.md](./PHASE_09_HARDENING_PERFORMANCE_DEPLOYMENT.md) |

---

## Architectural Principles to Uphold Across All Phases

1. **Cumulative Role Hierarchy:**
   `خادم` (1) → `مساعد امين الخدمة` (2) → `امين الخدمة` (3) → `امين قطاع` (4) → `امين عام` (5).
   Each role automatically inherits the capabilities of the tier below it, scoped to its designated administrative boundaries.
2. **Data-Driven Permissions (NFR-6.1):**
   Never hard-code role checks (`if (role === 'خادم')`). All authorization goes through the central `hasPermission(user, action, targetScope)` engine and `requirePermission` Express middleware.
3. **Minors' Privacy & Server-Side Enforcement (NFR-3.1):**
   All served members are minors without accounts. Frontend UI hiding is never adequate; every API endpoint enforces strict server-side scope validation.
4. **The Absolute Spiritual Privacy Firewall (NFR-3.4):**
   Confession, communion, and personal prayer logs belong exclusively to the individual servant. They are architecturally quarantined from all shared queries, dashboards, and export builders.
5. **Mobile-First Cairo RTL Ergonomics (NFR-1.1–1.3):**
   Every screen is designed primarily for a 390px mobile viewport in right-to-left orientation, with touch targets `>= 44px` and familiar Arabic church terminology.
