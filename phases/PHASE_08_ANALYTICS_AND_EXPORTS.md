# Phase 8 — Analytics, Reports & Export

**Document ID:** CSMS-PLAN-PHASE-08  
**Phase:** 8 of 9  
**Status:** Ready for Implementation  
**Estimated Effort:** 2 Sprints (2–3 weeks)  
**Target Systems:** Next.js (App Router), Express API, Prisma ORM, PDFKit / Puppeteer, ExcelJS, Recharts / Chart.js  
**Source Traceability:**
- **SRS References:** §3.2.5 (Assistant Secretary Stage Analytics), §3.3.7 (Stage Secretary Analytics), §3.4.6 (Sector Secretary Analytics), §3.5.6 (General Secretary Org-Wide Analytics), §5.13 (FR-13.1 Scoped Secretarial Analytics Dashboards), §5.14 (FR-14.1 PDF/Excel Report Exporting, FR-14.2 Sensitive Export Scoping & Audit Logging), §6.3 (NFR-3.3 Access Logging for Sensitive Fields, NFR-3.4 Absolute Exclusion of Spiritual Data).
- **Figma Prototype:** [Figma Design File](https://www.figma.com/design/BSSLc7uXAfjZUIg60Ghjl5) (Screen: Analytics Dashboard / لوحة الإحصائيات, Modal: Export Report / تصدير التقارير, Viewport 390px & Desktop Reflow).
- **Agile Plan Reference:** Section 10 (Phase 8 — Analytics, Reports & Export).

---

## 1. Executive Summary & Objective

The objective of **Phase 8** is to synthesize the platform's operational data into actionable intelligence for church leaders:
1. **Tier-Scoped Analytics Dashboards (FR-13.1):** Secretarial dashboards dynamically tailored to the user's scope: Stage Secretaries see stage-level metrics; Sector Secretaries compare stages within their sector; the General Secretary monitors the health of the entire congregation.
2. **The Spiritual Data Blacklist (NFR-3.4):** Enforcing an automated, architectural assertion that **spiritual life data (تناول / اعتراف / صلاة) can never be queried, aggregated, or displayed in any executive dashboard or export file**.
3. **Formal PDF & Excel Report Generator (FR-14.1):** High-fidelity, RTL-formatted PDF dossiers (for pastoral visitations and archpriest briefings) and Excel spreadsheets (for administrative archiving).
4. **Export Audit & Sensitive Field Redaction (FR-14.2 & NFR-3.3):** Every report export is logged in the immutable audit table, and sensitive fields (financial status, minor phone numbers) are restricted strictly to authorized scope holders.

---

## 2. Previous Phase Summary & System State Baseline

### 2.1 Accomplishments from Phase 7 (Announcements, Polls & Notifications)
- **Announcements Engine:** Stage Secretaries and above can publish announcements enforcing the Upward-Addressing Ban (Assumption A5 & FR-10.2).
- **Interactive Polls:** Ministry councils can vote on topics with real-time percentage tallies.
- **Multi-Channel Notification Dispatcher:** Web Push, SMS, and Email pipelines operational for absence alerts and reminders.

### 2.2 System State Entering Phase 8
- All operational modules (Members, Servants, Attendance, Lesson Preps, Year Plan, Events, Announcements) are actively capturing data.
- However, leadership lacks high-level visual charts, retention curves, comparative stage metrics, and exportable PDF/Excel rosters.

---

## 3. Detailed Architecture & Technical Specifications for Phase 8

### 3.1 Tier-Scoped Analytics Architecture (FR-13.1)

The analytics engine calculates metrics through three hierarchical aggregators:

```text
                               ┌─────────────────────────────────┐
                               │  General Secretary (Level 5)    │
                               │  - Org-wide Attendance Trends   │
                               │  - Cross-Sector Health Index    │
                               └────────────────┬────────────────┘
                                                │
                               ┌────────────────▼────────────────┐
                               │   Sector Secretary (Level 4)    │
                               │   - Stages Comparison Matrix    │
                               │   - Prep Submission % by Stage  │
                               └────────────────┬────────────────┘
                                                │
                               ┌────────────────▼────────────────┐
                               │ Assistant & Stage Sec (Level 2/3)│
                               │ - Member Retention & Absences   │
                               │ - Servants Attendance Breakdown │
                               └─────────────────────────────────┘
```

#### Metrics Catalog per Tier:
1. **Stage Dashboard (مساعد & امين الخدمة):**
   - Attendance rate over time (weekly trend line for Mass vs Service).
   - Lesson Preparation submission compliance rate (% of servants who submitted prep by Friday).
   - Member retention / absence risk funnel (Regular, Inconsistent, Consecutive Absent).
   - Evaluative field summary (distribution of behavior notes and peer integration flags).
2. **Sector Dashboard (امين قطاع):**
   - Side-by-side stage comparison: Which stage in the sector has the lowest attendance rate?
   - Sector-wide servant meeting attendance.
3. **Organization Dashboard (امين عام):**
   - Total active congregation count across all 9 stages.
   - Org-wide servant retention index.
   - Absence alerts resolution rate (% of absence flags resolved within 7 days).

---

### 3.2 The Spiritual Life Data Blacklist (NFR-3.4)

To guarantee that no developer or future query accidentally exposes private spiritual records:

```typescript
// apps/api/src/services/analytics/securityAssert.ts

export const BLACKLISTED_ANALYTICS_MODELS = [
  'spiritualLifeEntry',
  'SpiritualLifeEntry',
  'spiritual_life_entries',
  'sacrament',
  'confession',
  'communion',
];

export function assertNoSpiritualDataInPayload(data: any): void {
  const jsonString = JSON.stringify(data).toLowerCase();
  for (const term of BLACKLISTED_ANALYTICS_MODELS) {
    if (jsonString.includes(term.toLowerCase())) {
      throw new Error(`CRITICAL SECURITY VIOLATION (NFR-3.4): Spiritual life data detected in analytics payload! Term: ${term}`);
    }
  }
}
```
Every analytics endpoint and report builder runs this assertion before serializing HTTP responses or generating documents.

---

### 3.3 Report Generation Engine (FR-14.1 & FR-14.2)

#### 1. PDF Generation Engine (Puppeteer / PDFKit)
- Configured with native Cairo font embedding to guarantee immaculate Arabic RTL typography.
- Standard Church Letterhead:
  - Header: Cross symbol, Church Name (*كنيسة القديس العظيم أنبا شنودة*), Stage Name, Export Date, Exported By.
  - Footer: Confidentiality warning, Page X of Y, System Hash ID.
- **Available PDF Report Types:**
  1. **Member Pastoral Dossier:** Individual profile, family contacts, 12-week attendance calendar, visitation notes.
  2. **Stage Weekly Attendance Sheet:** Tabular roster with checkboxes for mass, Sunday school, and visits.
  3. **Stage Summary Briefing:** Monthly overview for the parish priest (Abouna) and archpriest.

#### 2. Excel Generation Engine (`ExcelJS`)
- Native Arabic RTL worksheet support (`worksheet.views = [{ rtl: true }]`).
- Formatted tables with banded rows, colored attendance badges, and auto-fitted columns.
- **Available Excel Report Types:**
  1. Complete Stage Member Roster with guardian contacts.
  2. Multi-Week Attendance Matrix (Sessions on columns, Members on rows).
  3. Servant Evaluation & Follow-up History (Restricted to Stage Secretary+).

#### 3. Sensitive Export Audit Logging (FR-14.2 & NFR-3.3)
When an export includes financial status or minor phone numbers:
```typescript
await prisma.sensitiveAccessLog.create({
  data: {
    userId: req.user.id,
    field: SensitiveField.FINANCIAL_STATUS,
    accessType: AccessType.EXPORT,
    ipAddress: req.ip,
  },
});
```

---

### 3.4 Backend API Endpoints & Contracts

#### 1. `GET /api/v1/analytics/dashboard` (FR-13.1)
- **Scope-Driven:** Automatically resolves user's tier and scope from `req.user`.
- Returns metrics payload verified against `assertNoSpiritualDataInPayload`.

#### 2. `POST /api/v1/reports/pdf/member-dossier/:memberId` (FR-14.1)
- Generates binary PDF stream for individual member.
- Logs sensitive field access.

#### 3. `POST /api/v1/reports/excel/stage-attendance` (FR-14.1)
- **Body:** `{ "stageId": "uuid", "startDate": "2026-09-01", "endDate": "2026-10-31" }`.
- Returns binary `.xlsx` stream with `Content-Disposition: attachment; filename="stage_attendance.xlsx"`.

#### 4. `POST /api/v1/reports/pdf/stage-summary` (FR-14.1)
- Generates official executive PDF for the church council.

---

### 3.5 Frontend UI Specifications — Figma Screens (`apps/web`)

#### 1. Analytics Dashboard Screen (`apps/web/app/(dashboard)/analytics/page.tsx`)
- **Header:** Title "لوحة الإحصائيات والمتابعة", Date range selector (Last 4 weeks / 8 weeks / Full Year).
- **Executive Metric Cards (Row of 4):**
  - Average Attendance Rate (e.g. `84%` with green delta `+3%`).
  - Active Members Tracked (e.g. `142 مخدوم`).
  - Prep Submission Rate (e.g. `90%`).
  - Outstanding Absence Alerts (e.g. `3 بحاجة لافتقاد`).
- **Interactive Visual Charts (Cairo Arabic, RTL Tooltips):**
  - Chart 1: Attendance Trends (Area chart comparing Mass vs Sunday School).
  - Chart 2: Absence Distribution by Grade (Bar chart).
  - Chart 3: Pastoral Visit Coverage (Donut chart showing visited vs pending).
- **Export Trigger Button:** Floating/Header CTA "تصدير تقرير" (`Button outline` with download icon).

#### 2. Export Report Modal (`apps/web/components/reports/ExportReportModal.tsx`)
- Modal dialog with Cairo typography:
  - Report Type Picker: "تقرير حضور وغياب تفصيلي", "ملف مخدوم للافتقاد", "كشف درجات وسلوك".
  - Format Toggle: PDF document (`.pdf`) vs Excel spreadsheet (`.xlsx`).
  - Sensitive Data Toggle: "تضمين أرقام الهواتف والحالة المادية" (disabled if user lacks permission).
  - Privacy Warning Banner: *"تنبيه: هذا التقرير يحتوي على بيانات خاصة بالقُصّر ومسجلة في سجل تدقيق الوصول."*
  - Action Button: "بدء التصدير والتحميل" with loading spinner.

---

## 4. Step-by-Step Task Breakdown

| Task ID | Work Area | Description | Deliverable / Path |
|---|---|---|---|
| **TASK-08-1** | Analytics Aggregator | Implement SQL aggregation service for Stage, Sector, and Org analytics. | `apps/api/src/services/analytics/dashboardAnalytics.service.ts` |
| **TASK-08-2** | Security Assertion | Implement `assertNoSpiritualDataInPayload` firewall check (NFR-3.4). | `apps/api/src/services/analytics/securityAssert.ts` |
| **TASK-08-3** | PDF Builder | Build Puppeteer/PDFKit template engine with Cairo font and Arabic RTL letterhead. | `apps/api/src/services/reports/pdfGenerator.service.ts` |
| **TASK-08-4** | Excel Builder | Build ExcelJS generator creating formatted RTL worksheets with styled headers. | `apps/api/src/services/reports/excelGenerator.service.ts` |
| **TASK-08-5** | Reports API | Implement endpoints for PDF and Excel export with audit logging (FR-14.1, FR-14.2). | `apps/api/src/controllers/report.controller.ts` |
| **TASK-08-6** | Figma Dashboard UI | Construct executive analytics page with responsive charts and metrics cards. | `apps/web/app/(dashboard)/analytics/page.tsx` |
| **TASK-08-7** | Export Modal UI | Build export configuration modal with format selection and privacy notices. | `apps/web/components/reports/ExportReportModal.tsx` |

---

## 5. Testing & Quality Assurance Plan

1. **Spiritual Data Exclusion Automated Test (NFR-3.4):**
   - Execute test across all analytics endpoints (`/analytics/dashboard`, `/reports/*`).
   - Assert that no response JSON or generated document contains any fields from `spiritual_life_entries`.
2. **Scope-Enforced Analytics Tests (FR-13.1):**
   - Authenticate as `امين الخدمة` of `Prep Boys`.
   - Query `/analytics/dashboard` → Verify metrics calculate data strictly from `Prep Boys` stage.
   - Attempt to pass query param `stageId=prep-girls` → Verify request is rejected or filtered out.
3. **Export Audit Logging Verification (FR-14.2 & NFR-3.3):**
   - Trigger export of member attendance spreadsheet.
   - Verify `sensitive_access_logs` table has inserted a record with `accessType = EXPORT` and caller's `userId`.
4. **PDF & Excel RTL Visual Verification:**
   - Open generated PDF: Arabic text must connect smoothly in Cairo font without detached letters or reversed numbers.
   - Open generated `.xlsx`: Sheet direction must be Right-to-Left by default.

---

## 6. Definition of Done (DoD) Checklist

- [ ] Analytics dashboards display live, accurate data scoped to Stage, Sector, or Org.
- [ ] Automated tests guarantee zero spiritual life data leaks into analytics or exports (NFR-3.4).
- [ ] PDF reports render in flawless Arabic RTL with embedded Cairo font and church branding.
- [ ] Excel exports generate valid `.xlsx` files with native RTL worksheet direction.
- [ ] Exporting sensitive member fields creates an immutable audit record in `sensitive_access_logs`.
- [ ] Dashboard charts render responsively on mobile (390px) and expand smoothly on desktop.

---

## 7. Next Phase Handoff & Prerequisites

**Handoff to Phase 9 (Hardening, Performance, Reliability & Deployment):**
- Complete feature set (Phases 0 through 8) delivered and functional.
- Platform ready for performance profiling, 4G throttling tests, automated security scans, and production deployment configuration.
