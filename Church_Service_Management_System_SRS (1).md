# Software Requirements Specification (SRS)
## Church Service (خدمة) Management System

**Version:** 1.0 (Draft)
**Based on:** `الخادم.pdf` and `الخادم_final.docx` (role/permission structure provided by client)
**Platform target:** Responsive web application, mobile-first

---

## 1. Introduction

### 1.1 Purpose
This document specifies the functional and non-functional requirements for a web-based system to manage a church's youth/Sunday-school ministry ("الخدمة"). The system tracks **servants** (الخدام — volunteer teachers/leaders), their supervisory hierarchy, and the **served members** (المخدومين — the children/students), including attendance, spiritual life, lesson preparation, and administrative oversight.

### 1.2 Scope — Phase 1
Phase 1 covers:
- Full account/permission system for the five servant-hierarchy roles.
- Complete data model and tracking for خدام (servants).
- Data model and record-keeping for مخدومين (served members) **as records only** — no login/self-service for مخدومين in this phase (confirmed with client).
- Notifications (absence alerts + announcements).
- Calendar/events module for تدبير السنة (the year plan).
- Report export (PDF/Excel).

**Out of scope for Phase 1** (see §7 Future Scope): مخدومين/parent self-service accounts, multi-church/diocese support, financial-aid workflow automation, in-app messaging.

### 1.3 Definitions & Glossary
See §9 Appendix for the full Arabic–English glossary. Key terms used throughout:

| Arabic term | Meaning |
|---|---|
| خادم (خدام) | Servant(s) — volunteer teacher/leader |
| مخدوم (مخدومين) | Served member(s) — the child/student(s) under care |
| مرحلة (مراحل) | Age/education stage (Nursery, Primary, Prep, Secondary, University) |
| قطاع | Sector — an administrative grouping of several مراحل |
| تحضير | Lesson preparation submitted by a servant |
| تدبير السنة | The annual ministry/curriculum plan |
| جدول المتابعة | Follow-up/attendance tracking table |
| الافتقاد | Pastoral home visit |
| اجتماع الأمناء | Secretaries' meeting |

### 1.4 Assumptions & Open Items Requiring Client Confirmation
The source documents are internally consistent on most points, but the following items were ambiguous or inconsistent between drafts. I've made a stated default assumption for each so the spec is complete and buildable; please confirm or correct:

| # | Item | Ambiguity found | Assumption used in this spec |
|---|---|---|---|
| A1 | Who evaluates امين الخدمة | مساعد's evaluative fields (الحالة المادية، السلوك، التعاون، العمل الفردي) are set by "امين المرحلة." امين الخدمة's *own* profile lists the identical source, which would mean he evaluates himself. | "امين المرحلة" is treated as another name for امين الخدمة (head of a مرحلة). His own evaluative fields are instead set by his direct superior, **امين قطاع** — consistent with امين قطاع's own fields being set by امين عام. |
| A2 | خادم's ability to enter مخدوم data | خادم's own permission list doesn't mention editing مخدوم records, yet the مخدوم data model explicitly says three fields (الحالة المادية، سلوكه في الخدمة، اندماجه) are "added by الخادم." | خادم **can** add/edit those specific fields for the مخدومين directly assigned to him, even though full مخدوم-record editing is reserved for مساعد and above. |
| A3 | امين عام's own profile/follow-up | Unlike every other role, the امين عام section has no "بيانات الخادم" or "جدول المتابعة" subsection — he has no one above him to evaluate him. | امين عام has a basic profile (identity fields only, no evaluative fields, since there's no superior role to set them). |
| A4 | مساعد's follow-up table appears to omit "الأنشطة" (and does not show "اجتماع الأمناء") that خادم and امين الخدمة respectively have | Likely a documentation gap rather than an intentional difference. | مساعد's follow-up table mirrors خادم's (includes الأنشطة); he does **not** get اجتماع الأمناء (that starts at امين الخدمة). |
| A5 | Announcement authority & audience | Original draft restricted announcement *creation* to امين قطاع/امين عام, with مساعد and above able to view. How the recipient audience is chosen was undefined. | **Resolved by client:** Announcement creation starts at **امين الخدمة** (i.e. امين الخدمة, امين قطاع, and امين عام can each compose announcements — not مساعد or خادم). Each announcer **selects the specific audience** for their announcement, but that audience is limited to their own scope and to roles **at or below their own level** in the hierarchy — an announcer can never address someone above them (e.g. امين الخدمة cannot send to امين قطاع or امين عام). See §3.3–3.5 and §5.10. |
| A6 | Organizational scope | Document doesn't state whether this is for one church or multiple. | Assumed **single church/single خدمة organization** for Phase 1; multi-church support is listed under Future Scope. |
| A7 | Account creation | No self-registration is mentioned anywhere — only "Login." | Assumed accounts are **created by an authorized secretary** (امين الخدمة or above) for their scope, not self-service sign-up. |

---

## 2. System Overview

### 2.1 Organizational Model
The system models two overlapping hierarchies:

**A. Servant hierarchy (roles, cumulative — each role inherits everything the one below it can do):**

```
امين عام (General Secretary)              — organization-wide
   └── امين قطاع (Sector Secretary)        — scope: one قطاع (sector)
          └── امين الخدمة (Stage Secretary) — scope: one مرحلة (stage)
                 └── مساعد امين الخدمة (Assistant) — scope: one مرحلة
                        └── خادم (Servant)  — scope: himself + his assigned مخدومين
```

**B. Age/education stage taxonomy (مراحل), grouped into قطاعات (sectors):**

| Stage (مرحلة) | Notes |
|---|---|
| حضانة (Nursery) | |
| ابتدائي 1 و 2 (Primary 1–2) | |
| ابتدائي 3 و 4 (Primary 3–4) | |
| ابتدائي 5 و 6 (Primary 5–6) | |
| اعدادي (Prep) | split: بنين (boys) / بنات (girls) |
| ثانوي (Secondary) | split: بنين (boys) / بنات (girls) |
| جامعة (University) | |

Each مرحلة has its own امين خدمة, مساعد(ين), and roster of خدام/مخدومين. Several مراحل are grouped under a قطاع, overseen by an امين قطاع. All قطاعات report to a single امين عام.

### 2.2 Roles Summary

| Role | Arabic | Scope of authority |
|---|---|---|
| Servant | خادم | Self + assigned مخدومين |
| Assistant Secretary | مساعد امين الخدمة | One مرحلة |
| Stage Secretary | امين الخدمة (= امين المرحلة) | One مرحلة |
| Sector Secretary | امين قطاع | One قطاع (all its مراحل) |
| General Secretary | امين عام | Entire organization |

### 2.3 Operating Environment
- Responsive web application, **designed mobile-first**, fully usable on desktop browsers as well.
- Primary language: Arabic, with **right-to-left (RTL)** layout throughout.
- Should function acceptably on low/medium bandwidth mobile connections.

---

## 3. User Roles & Permissions

Permissions are strictly cumulative: each role has everything the role(s) below it has, scoped to its own level, plus the additions below.

### 3.1 خادم (Servant) — base role
1. Log in.
2. View his own attendance/follow-up history (view-only — entries are recorded by his supervising secretary; he cannot add or edit his own follow-up records).
3. Edit/add his own profile data (non-evaluative fields only).
4. Submit lesson preparation (تحضير) entries.
5. Edit his own spiritual-life record (communion, confession, prayer).
6. View the Year Plan (تدبير السنة) and select/sign up for applicable items (e.g. an activity).
7. Post an item/update to the Year Plan, visible only to خدام within his own مرحلة (this is distinct from full plan authoring, which remains restricted to امين الخدمة and above — see FR-7.4).
8. *(A2)* Add/edit the evaluative fields (financial status, behavior, integration) for the specific مخدومين assigned to him.

### 3.2 مساعد امين الخدمة (Assistant Secretary) — adds:
1. All خادم permissions (he also holds a servant profile).
2. Edit any مخدوم's full profile data (within his مرحلة).
3. Edit any مخدوم's follow-up record (within his مرحلة).
4. View announcements addressed to him (per the sender's chosen audience — see §5.10).
5. View analytics for خدام and مخدومين, scoped to his مرحلة.

### 3.3 امين الخدمة (Stage Secretary) — adds:
1. All مساعد permissions, scoped to his مرحلة.
2. Add private notes on any خادم in his مرحلة.
3. Create a poll targeted at his مرحلة (or a subset).
4. Edit any خادم's profile data (his مرحلة).
5. Edit any خادم's follow-up record (his مرحلة).
6. View any خادم's submitted تحضير (his مرحلة).
7. View analytics for خدام/مخدومين, scoped to his مرحلة.
8. Create/manage the Year Plan (تدبير السنة) for his مرحلة.
9. Compose and publish announcements to an audience he selects from within his مرحلة — limited to his own level and below (مساعد, خادم); he cannot address امين قطاع or امين عام.

### 3.4 امين قطاع (Sector Secretary) — adds, scope widens to whole قطاع:
1. All امين الخدمة permissions, scoped to every مرحلة in his قطاع.
2. Add notes on any secretary (امين الخدمة/مساعد) and any خادم in his قطاع.
3. Edit profile data of any secretary and any خادم in his قطاع.
4. Edit follow-up records of any secretary and any خادم in his قطاع.
5. View any خادم's تحضير, across the قطاع.
6. View analytics for خدام/مخدومين, scoped to the قطاع.
7. Compose and publish announcements to an audience he selects from within his قطاع — limited to his own level and below (امين الخدمة, مساعد, خادم); he cannot address امين عام.

### 3.5 امين عام (General Secretary) — adds, scope = entire organization:
1. All امين قطاع permissions, organization-wide.
2. Edit profile data of any امين قطاع.
3. Edit follow-up records of any امين قطاع.
4. **Transfer** a خادم between مراحل/قطاعات, or **suspend** a خادم's account (نقل / وقف خادم).
5. View any خادم's تحضير, organization-wide.
6. View organization-wide analytics (خدام/مخدومين across all مراحل).
7. Compose and publish announcements to an audience he selects org-wide (no role sits above him, so this is unrestricted within the organization).

### 3.6 Permission Matrix

✅ = full access (scoped as noted) · 🔒 = own record only · — = no access

| Action | خادم | مساعد | امين الخدمة | امين قطاع | امين عام |
|---|:---:|:---:|:---:|:---:|:---:|
| Log in | ✅ | ✅ | ✅ | ✅ | ✅ |
| View/edit own profile (basic fields) | 🔒 | 🔒 | 🔒 | 🔒 | 🔒 |
| View own follow-up (جدول المتابعة) — view only, cannot self-edit | 🔒 | 🔒 | 🔒 | 🔒 | 🔒 |
| Submit تحضير | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit own spiritual-life record | 🔒 | 🔒 | 🔒 | 🔒 | 🔒 |
| View Year Plan / select items | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create/manage Year Plan (full authoring) | — | — | ✅ (مرحلة) | ✅ (قطاع) | ✅ (org) |
| Post an item/update to the Year Plan | ✅ (visible only to خدام in his own مرحلة) | ✅ (مرحلة) | ✅ (مرحلة) | ✅ (قطاع) | ✅ (org) |
| Edit evaluative fields for own assigned مخدومين | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit any مخدوم's full record | — | ✅ (مرحلة) | ✅ (مرحلة) | ✅ (قطاع) | ✅ (org) |
| View announcements addressed to you | ✅ | ✅ | ✅ | ✅ | ✅ |
| Post announcements (audience selected by sender, never above sender's own level) | — | — | ✅ (مرحلة) | ✅ (قطاع) | ✅ (org) |
| Add private notes on a خادم | — | — | ✅ (مرحلة) | ✅ (قطاع) | ✅ (org) |
| Create polls | — | — | ✅ (مرحلة) | ✅ (قطاع) | ✅ (org) |
| Edit another خادم's profile/follow-up | — | — | ✅ (مرحلة) | ✅ (قطاع) | ✅ (org) |
| View any خادم's تحضير | — | — | ✅ (مرحلة) | ✅ (قطاع) | ✅ (org) |
| Edit an أمين's (secretary's) profile/follow-up | — | — | — | ✅ (قطاع) | ✅ (org) |
| Transfer/suspend a خادم | — | — | — | — | ✅ |
| View analytics | 🔒 own | ✅ مرحلة | ✅ مرحلة | ✅ قطاع | ✅ org |
| Export reports | — | — | ✅ مرحلة | ✅ قطاع | ✅ org |

---

## 4. Data Model

### 4.1 User / Servant Profile (applies to all 5 roles — every account is fundamentally a خادم profile with a role and a scope attached)

**Self-editable fields:**
| Field | Notes |
|---|---|
| Full name | |
| Father confessor (اب الاعتراف) | |
| Date of birth | |
| Address | |
| Phone number | |
| Marital status | if married, spouse's name |
| Educational/career stage | studying / military service / graduated |
| Children (optional) | names + ages |

**Evaluative fields (read-only to the subject; set by the supervisor per §1.4 A1):**
| Field | Set by (for خادم/مساعد) | Set by (for امين الخدمة) | Set by (for امين قطاع) |
|---|---|---|---|
| Financial status | امين الخدمة | امين قطاع | امين عام |
| Behavior with مخدومين | امين الخدمة | امين قطاع | امين عام |
| Behavior with fellow خدام | امين الخدمة | امين قطاع | امين عام |
| Cooperation | امين الخدمة | امين قطاع | امين عام |
| Individual work / initiative | امين الخدمة | امين قطاع | امين عام |

**System fields:** Role, assigned مرحلة, assigned قطاع (derived), account status (Active / Suspended / Transferred), transfer history log.

### 4.2 المخدوم (Served Member) — Phase 1: records only, no login

| # | Field | Notes |
|---|---|---|
| 1 | Full name | |
| 2 | Father confessor | optional — typically absent for حضانة and most ابتدائي stages |
| 3 | Date of birth | |
| 4 | Address | |
| 5 | Phone number | |
| 6 | Financial status | evaluative — entered by assigned خادم |
| 7 | Father's name & age | |
| 8 | Mother's name & age | |
| 9 | School / university | |
| 10 | Educational stage | |
| 11 | Behavior in service | evaluative — entered by assigned خادم |
| 12 | Behavior/integration with other مخدومين | evaluative — entered by assigned خادم |
| 13 | Siblings & ages | optional |
| — | Assigned مرحلة | system field |
| — | Assigned خادم(s) | system field, supports reassignment |

### 4.3 Follow-up Records (جدول المتابعة)

**(a) Servant follow-up** (tracked for خادم, مساعد, امين الخدمة, امين قطاع):
القداس (Mass) · التحضير (Prep submitted) · الخدمة (Service attendance) · الافتقاد (Home visit) · اجتماع الخدمة (Service meeting) · اجتماع الصلاة/الأسرة (Prayer/family meeting) · الأنشطة (Activities)
— plus **اجتماع الأمناء** (added from امين الخدمة level up)
— plus **اجتماع أمناء المراحل** (added from امين قطاع level up)

**(b) Served-member follow-up** (tracked for مخدوم):
القداس (Mass) · الخدمة (Service attendance) · الافتقاد (Home visit) · أنشطة الخدمة — نادي / رحلة / مؤتمر (club/trip/conference — this is also where financial-status/integration/behavior notes surface)

### 4.4 Other Entities
| Entity | Key fields |
|---|---|
| تحضير (Lesson Prep) | author (خادم), date, مرحلة, topic/content, attachments (optional), status |
| تدبير السنة (Year Plan) | title, scope (مرحلة/قطاع), schedule of topics & events, created by, items servants can "select" |
| ملاحظة (Note) | subject (خادم or أمين), author, date, content — visible only within the reporting chain |
| استطلاع (Poll) | created by, question, options, target audience/scope, responses, deadline |
| إعلان (Announcement) | author (امين الخدمة/قطاع/عام), title, content, target audience (specific users/groups selected by the author, constrained to the author's scope and to roles at or below the author's level), date, delivery channels |
| مرحلة (Stage) | name, parent قطاع, assigned امين الخدمة/مساعد, roster |
| قطاع (Sector) | name, assigned امين قطاع, list of مراحل |

---

## 5. Functional Requirements

### 5.1 Authentication & Account Management
- **FR-1.1** The system shall allow login via phone number (or email) + password.
- **FR-1.2** Accounts shall be created by an authorized secretary (امين الخدمة or above) for users within their scope (per §1.4 A7), not via public self-registration.
- **FR-1.3** The system shall support password reset (via SMS/email OTP).
- **FR-1.4** امين عام shall be able to transfer a خادم to a different مرحلة/قطاع, or suspend/reactivate a خادم's account, with a logged history of changes.

### 5.2 Profile Management
- **FR-2.1** Every user shall be able to view and edit their own non-evaluative profile fields (§4.1).
- **FR-2.2** Evaluative fields shall only be editable by the correct supervising role (§4.1 table); attempts by others shall be rejected at the API level, not just hidden in the UI.
- **FR-2.3** A full edit history/audit trail shall be kept for evaluative fields.

### 5.3 المخدومين (Served Member) Management
- **FR-3.1** خادم shall be able to enter/update the three evaluative fields for مخدومين assigned to him (§1.4 A2).
- **FR-3.2** مساعد and above shall be able to create, edit, and reassign full مخدوم records within their scope.
- **FR-3.3** The system shall support bulk-import of مخدومين (e.g. from a spreadsheet) to ease initial data entry.
- **FR-3.4** مخدومين shall have no login capability in Phase 1 (§7 for Phase 2).

### 5.4 Follow-up / Attendance Tracking
- **FR-4.1** The supervising secretary role responsible for a خادم or مخدوم (per §3's role/scope rules) shall record attendance/status for each item in the relevant جدول المتابعة (§4.3), per session/date. The subject of the record (the خادم or مخدوم themself) shall be able to **view only** their own follow-up history — they cannot add or edit their own entries.
- **FR-4.2** The system shall compute rolling attendance summaries (e.g. % attendance over last 4/8/12 weeks) per خادم/مخدوم.
- **FR-4.3** The system shall flag consecutive absences (configurable threshold, default 2) for follow-up alerts (see §5.11).

### 5.5 Lesson Preparation (تحضير)
- **FR-5.1** خادم (and all higher roles) shall be able to submit a تحضير entry with topic/content and optional attachments.
- **FR-5.2** امين الخدمة and above shall be able to view any تحضير submitted within their scope.

### 5.6 Spiritual Life Tracking
- **FR-6.1** Each user shall be able to log their own communion (تناول), confession (اعتراف), and prayer (صلاة) records.
- **FR-6.2** This data shall be treated as private/sensitive (visible only to the user themself; not exposed in general analytics or reports).

### 5.7 Year Plan (تدبير السنة)
- **FR-7.1** امين الخدمة and above shall be able to create and publish a Year Plan for their scope (مرحلة/قطاع/organization).
- **FR-7.2** All users shall be able to view the Year Plan applicable to their مرحلة and select/opt into applicable items (e.g. signing up to lead an activity).
- **FR-7.3** The Year Plan shall integrate with the Calendar module (§5.12).
- **FR-7.4** خادم shall be able to post an item/update to the Year Plan; such posts shall be visible only to خدام within his own مرحلة, and shall not affect the official plan content managed under FR-7.1.

### 5.8 Notes & Evaluations
- **FR-8.1** امين الخدمة and above shall be able to add private notes on any خادم/أمين within their scope.
- **FR-8.2** Notes shall be visible only to the author and users above them in the same reporting chain — never to the subject or to peers.

### 5.9 Polls
- **FR-9.1** امين الخدمة and above shall be able to create a poll targeted at a chosen scope (a مرحلة, a قطاع, or org-wide if امين عام).
- **FR-9.2** The system shall present real-time response tallies to the poll's creator.

### 5.10 Announcements
- **FR-10.1** امين الخدمة, امين قطاع, and امين عام shall be able to compose and publish announcements.
- **FR-10.2** When composing an announcement, the author shall select the specific target audience (individual users and/or groups, e.g. "all خدام in a مرحلة"). The system shall restrict the selectable audience to the author's own scope (مرحلة/قطاع/organization) and to roles **at or below the author's own level** in the hierarchy — an author shall never be able to address a role above them (e.g. امين الخدمة cannot target امين قطاع or امين عام; امين قطاع cannot target امين عام).
- **FR-10.3** Any user included in an announcement's selected audience shall be able to view it.

### 5.11 Notifications
- **FR-11.1** The system shall send an automatic alert to the responsible خادم/امين when a خادم or مخدوم accumulates consecutive absences past the configured threshold (§4.3 / FR-4.3).
- **FR-11.2** The system shall push new announcements to affected users via their chosen channel(s): push notification (primary, mobile-first), SMS, and/or email.
- **FR-11.3** The system shall send reminders for upcoming تحضير deadlines, اجتماع الخدمة, and other scheduled events.
- **FR-11.4** Users shall be able to configure their notification channel preferences.

### 5.12 Calendar / Events Module
- **FR-12.1** The system shall provide a calendar view reflecting the Year Plan: activities, trips (رحلة), conferences (مؤتمر), service meetings, and secretaries' meetings, scoped to what's relevant to the logged-in user.
- **FR-12.2** Users shall be able to mark/confirm attendance for calendar events, which feeds directly into the relevant جدول المتابعة.

### 5.13 Analytics & Dashboards
- **FR-13.1** Each secretarial role shall see an analytics dashboard scoped to their authority level (مرحلة / قطاع / organization), covering: attendance trends, تحضير submission rates, evaluative-field distributions (e.g. behavior summary), and absence alerts outstanding.
- **FR-13.2** خادم shall see a personal dashboard of his own attendance/spiritual-life trends.

### 5.14 Reports Export
- **FR-14.1** امين الخدمة and above shall be able to export PDF/Excel reports: individual profile + follow-up history, aggregated attendance by مرحلة/قطاع/organization, and poll results.
- **FR-14.2** Exports containing sensitive fields (financial status, addresses, phone numbers of minors) shall be restricted to the exporting user's authorized scope and logged for audit purposes.

---

## 6. Non-Functional Requirements

### 6.1 Usability
- **NFR-1.1** Mobile-first responsive design; all core workflows must be fully usable on a phone screen.
- **NFR-1.2** Full right-to-left (RTL) Arabic UI throughout.
- **NFR-1.3** Interface must remain simple and low-friction for non-technical volunteer users (خدام are typically not tech-savvy).

### 6.2 Performance
- **NFR-2.1** Core screens (attendance entry, profile view) shall load within 2 seconds on a typical 4G mobile connection.
- **NFR-2.2** The system shall remain responsive with a full congregation's worth of data (assume up to several thousand مخدومين and several hundred خدام across all مراحل).

### 6.3 Security & Data Privacy
- **NFR-3.1** All data involving minors (most مخدومين) must be protected with strict, server-enforced role/scope-based access control — not just UI-level hiding.
- **NFR-3.2** Passwords hashed and salted; login rate-limiting to prevent brute force.
- **NFR-3.3** Sensitive fields (financial status, address, phone) shall be access-logged: every view/edit recorded with who/when.
- **NFR-3.4** Spiritual-life data (§5.6, FR-6.2) shall never appear in exports, analytics aggregates, or be visible to anyone but the individual.
- **NFR-3.5** Regular encrypted backups of the database.

### 6.4 Reliability & Availability
- **NFR-4.1** Target uptime of 99.5%, acceptable for a ministry-scale (not mission-critical) system.
- **NFR-4.2** Graceful handling of intermittent mobile connectivity (e.g. retry-safe form submissions).

### 6.5 Scalability
- **NFR-5.1** Architecture should allow adding new قطاعات/مراحل, and eventually additional churches (§7), without redesign.

### 6.6 Maintainability
- **NFR-6.1** Role/permission rules should be data-driven (a configurable permission matrix) rather than hard-coded, since ministry structures occasionally change.

### 6.7 Localization
- **NFR-7.1** Arabic is the only required language for Phase 1; architecture should not preclude adding English or other languages later.

---

## 7. Future Scope (Phase 2+)

- **مخدومين self-service / parent portal:** login for the served member or a parent, to view their own attendance and profile (per client's stated plan).
- **Financial-aid workflow:** turning the "الحالة المادية" field into an actual assistance-request/approval workflow.
- **Multi-church / diocese-level support:** a super-admin tier above امين عام managing multiple churches.
- **In-app messaging / chat** between خدام and secretaries.
- **Native mobile apps** (if the mobile-first web experience proves insufficient).

---

## 8. Summary of Recommendations Requiring Your Confirmation

Before development begins, please confirm or correct the seven assumptions in §1.4 (A1–A7). These affect the permission model and data model directly, so resolving them early avoids rework.

---

## 9. Appendix — Arabic/English Glossary

| Arabic | English |
|---|---|
| خادم / خدام | Servant(s) / volunteer teacher(s) |
| مخدوم / مخدومين | Served member(s) — child/student(s) |
| امين عام | General Secretary |
| امين قطاع | Sector Secretary |
| امين الخدمة / امين المرحلة | Service/Stage Secretary |
| مساعد امين الخدمة | Assistant Secretary |
| مرحلة / مراحل | Stage(s) — age/education group |
| قطاع | Sector — grouping of stages |
| تحضير | Lesson preparation |
| تدبير السنة | Annual ministry/curriculum plan |
| جدول المتابعة | Follow-up/attendance tracking table |
| القداس | Mass |
| الافتقاد | Pastoral home visit |
| اجتماع الخدمة | Service (team) meeting |
| اجتماع الصلاة (الأسرة) | Prayer meeting ("family" small group) |
| اجتماع الأمناء | Secretaries' meeting |
| اجتماع أمناء المراحل | Stage-secretaries' meeting |
| نقل / وقف خادم | Transfer / suspend a servant |
| اب الاعتراف | Father confessor |
| الحالة المادية | Financial status |
| السلوك / التعاون / العمل الفردي | Behavior / Cooperation / Individual initiative (evaluative fields) |
