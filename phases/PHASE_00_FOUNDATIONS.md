# Phase 0 — Project Foundations & Design System

**Document ID:** CSMS-PLAN-PHASE-00  
**Phase:** 0 of 9  
**Status:** Ready for Implementation  
**Estimated Effort:** 1 Sprint (1–2 weeks)  
**Target Architecture:** Turborepo / NPM Workspaces (Next.js 14+ App Router, Express.js TypeScript API, PostgreSQL + Prisma, Tailwind CSS, Cairo Font)  
**Source Traceability:**
- **SRS References:** §2.3 (Operating Environment), §6.1 (NFR-1.1 Mobile-First, NFR-1.2 RTL Arabic UI, NFR-1.3 Low-friction UX), §6.7 (NFR-7.1 Localization Scaffolding).
- **Figma Prototype:** [Figma Design File](https://www.figma.com/design/BSSLc7uXAfjZUIg60Ghjl5) (Foundations page, Design Tokens, Base Components).
- **Agile Plan Reference:** Section 1 (Tech Stack & Architecture) & Section 2 (Phase 0).

---

## 1. Executive Summary & Objective

The objective of **Phase 0** is to establish a rock-solid, production-grade monorepo foundation, development workflow, and atomic UI design system before writing any domain logic or business tables. By the end of this phase, the engineering team and AI coding agents will have a fully reproducible local and CI environment, strict TypeScript contracts shared between client and server, an RTL-native UI library that matches the Figma design system 1:1, and a verified PostgreSQL/Prisma pipeline.

---

## 2. Previous Phase Summary & System State Baseline

### 2.1 Pre-Project State (Greenfield Baseline)
- **Current Repository State:** Pre-scaffolded workspace containing only the project requirements (`Church_Service_Management_System_SRS.md`) and high-level roadmap (`AGILE_IMPLEMENTATION_PLAN.md`).
- **Prerequisites Available:**
  1. Business domain definition: Hierarchical Coptic Orthodox Church Service (خدمة) tracking خدام (servants), مخدومين (served members), and secretarial tiers.
  2. Visual design system specifications: Verified color palette, Cairo typographic scale, and mobile-first responsive viewport specifications from the Figma prototype.
  3. Technology stack lock-in: Next.js (App Router, React 18/19), Express.js (Node.js LTS), PostgreSQL (v15+), Prisma ORM, Tailwind CSS, TypeScript (v5+).

### 2.2 Starting Environment Requirements
- Node.js `>= 20.x LTS`
- Package manager: `pnpm` (recommended for monorepos) or `npm` (workspaces)
- Docker & Docker Compose (for local PostgreSQL instance)
- Git with conventional commits configuration

---

## 3. Detailed Architecture & Technical Specifications for Phase 0

### 3.1 Monorepo Structure & Workspace Layout
The repository is structured as a monorepo separating frontend presentation, backend business logic, database configuration, and shared cross-boundary contracts:

```text
/shenoda
├── .github/
│   └── workflows/
│       └── ci.yml                     # Automated Lint, Typecheck, and Test runner
├── apps/
│   ├── web/                           # Next.js App Router Frontend
│   │   ├── app/
│   │   │   ├── layout.tsx             # Root layout with dir="rtl", lang="ar", Cairo font
│   │   │   ├── page.tsx               # Design System Catalog / Smoke-test page
│   │   │   └── globals.css            # Tailwind directives + design token root variables
│   │   ├── components/                # Shared atomic & molecular component library
│   │   │   ├── ui/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Badge.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Chip.tsx
│   │   │   │   ├── StatCard.tsx
│   │   │   │   ├── AttendanceToggle.tsx
│   │   │   │   └── MemberRow.tsx
│   │   │   └── layout/
│   │   │       ├── AppBar.tsx
│   │   │       ├── TabBar.tsx
│   │   │       └── MobileShell.tsx
│   │   ├── tailwind.config.ts         # Tokens imported from Figma Foundations
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── api/                           # Express.js REST API Backend
│       ├── src/
│       │   ├── server.ts              # Express application bootstrap & listener
│       │   ├── app.ts                 # Middleware mounting (CORS, Helmet, BodyParser)
│       │   ├── routes/
│       │   │   └── health.routes.ts   # System and DB healthcheck endpoints
│       │   └── config/
│       │       └── env.ts             # Validated environment variables (Zod)
│       ├── tsconfig.json
│       └── package.json
├── packages/
│   └── shared/                        # Shared TypeScript definitions & Constants
│       ├── src/
│       │   ├── types/
│       │   │   └── common.ts          # API response wrappers, Pagination types
│       │   ├── constants/
│       │   │   ├── roles.ts           # Role definition metadata
│       │   │   └── stages.ts          # Canonical list of Church Stages (مراحل)
│       │   └── index.ts
│       ├── tsconfig.json
│       └── package.json
├── prisma/
│   ├── schema.prisma                  # Initial baseline connection schema
│   ├── seed.ts                        # Seed execution runner
│   └── .env.example
├── docker-compose.yml                 # Local PostgreSQL development service
├── package.json                       # Root workspace orchestration
├── pnpm-workspace.yaml                # Monorepo workspace mapping
├── tsconfig.base.json                 # Shared base TypeScript compiler options
└── .editorconfig                      # Universal code formatting settings
```

---

### 3.2 Design System Tokens & Tailwind CSS Configuration

Per the Figma prototype Foundations page, Tailwind CSS must be strictly configured with exact hex values, spacing scales, and Cairo typography. Ad-hoc utility colors (e.g., arbitrary `bg-blue-600` or `text-red-500`) are strictly forbidden.

#### Color Tokens Palette (`apps/web/tailwind.config.ts`)
```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#1F3A5F',        // Deep Coptic Blue (Header, Primary CTA)
          'primary-dark': '#152A47', // Active/Hover Deep Blue
          'primary-soft': '#E6ECF5', // Light tint for selection & active tabs
          accent: '#B8892B',         // Liturgical Gold / Warm Ochre
          'accent-soft': '#F7EDD5',  // Subtle gold highlight
        },
        bg: {
          app: '#F6F4EE',            // Warm off-white / parchment background
          surface: '#FFFFFF',        // Card and container surface
          muted: '#EFECE3',          // Neutral container background / dividers
        },
        border: {
          default: '#E3DFD3',        // Input & card border
          focus: '#1F3A5F',          // Focused input ring
        },
        text: {
          primary: '#1B2432',        // High-contrast charcoal text
          secondary: '#5F6A7A',      // Supporting & metadata label text
          disabled: '#9AA3AF',       // Inactive states & placeholders
          inverse: '#FFFFFF',        // White text on dark brand surfaces
        },
        status: {
          success: '#2F855A',        // Present / Good standing / Green
          'success-soft': '#E6F4EA',
          danger: '#C0392B',         // Absent / Alert / Red
          'danger-soft': '#FCE8E6',
          warning: '#B7791F',        // Excused / Late / Warning Ochre
          'warning-soft': '#FEF7E0',
          info: '#2B6CB0',           // General notices
          'info-soft': '#EBF8FF',
        },
      },
      fontFamily: {
        cairo: ['var(--font-cairo)', 'sans-serif'],
      },
      fontSize: {
        'display': ['1.75rem', { lineHeight: '2.25rem', fontWeight: '700' }], // 28px
        'h1': ['1.375rem', { lineHeight: '1.875rem', fontWeight: '700' }],     // 22px
        'h2': ['1.125rem', { lineHeight: '1.625rem', fontWeight: '600' }],     // 18px
        'body-default': ['0.9375rem', { lineHeight: '1.375rem', fontWeight: '400' }], // 15px
        'body-medium': ['0.9375rem', { lineHeight: '1.375rem', fontWeight: '500' }],
        'body-small': ['0.8125rem', { lineHeight: '1.125rem', fontWeight: '400' }],  // 13px
        'caption': ['0.75rem', { lineHeight: '1rem', fontWeight: '500' }],            // 12px
        'button': ['0.9375rem', { lineHeight: '1.25rem', fontWeight: '600' }],
      },
      boxShadow: {
        'card': '0 2px 6px 0 rgba(31, 58, 95, 0.05)',
        'nav': '0 -2px 10px 0 rgba(31, 58, 95, 0.08)',
        'elevated': '0 4px 16px 0 rgba(31, 58, 95, 0.12)',
      },
      borderRadius: {
        'card': '12px',
        'input': '10px',
        'button': '10px',
        'pill': '9999px',
      }
    },
  },
  plugins: [],
};
export default config;
```

---

### 3.3 RTL & Typography Setup (`apps/web/app/layout.tsx`)

Per **NFR-1.2**, Arabic is the primary system language with strict Right-to-Left (RTL) alignment.
1. The root `<html>` element must declare `dir="rtl"` and `lang="ar"`.
2. The Cairo font must be loaded via `next/font/google` with Arabic subset and exposed as a CSS variable `--font-cairo`.

```tsx
import type { Metadata, Viewport } from 'next';
import { Cairo } from 'next/font/google';
import './globals.css';

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-cairo',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'نظام إدارة الخدمة الكنسية | Church Service Management',
  description: 'نظام متابعة الخدام والمخدومين وافتقاد الكنيسة القبطية الأرثوذكسية',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body className="bg-bg-app text-text-primary font-cairo min-h-screen antialiased selection:bg-brand-primary-soft selection:text-brand-primary">
        {children}
      </body>
    </html>
  );
}
```

---

### 3.4 Core Shared Component Specifications (1:1 with Figma)

All components must be accessible, mobile-first, and fully styled using token classes:

1. **`Button` Component (`apps/web/components/ui/Button.tsx`)**
   - **Variants:**
     - `primary`: Background `brand-primary`, text `text-inverse`, active `brand-primary-dark`.
     - `secondary`: Background `brand-primary-soft`, text `brand-primary`.
     - `accent`: Background `brand-accent`, text `text-inverse`.
     - `outline`: Border `border-default`, text `text-primary`, background transparent.
     - `danger`: Background `status-danger`, text `text-inverse`.
   - **Sizes:** `sm` (height 36px), `md` (height 44px - touch target default), `lg` (height 50px).
   - **Properties:** `isLoading` (shows spinner without layout shift), `iconLeading`, `iconTrailing`, `disabled`.

2. **`Badge` Component (`apps/web/components/ui/Badge.tsx`)**
   - **Variants:**
     - `success`: Background `status-success-soft`, text `status-success`.
     - `danger`: Background `status-danger-soft`, text `status-danger`.
     - `warning`: Background `status-warning-soft`, text `status-warning`.
     - `info`: Background `status-info-soft`, text `status-info`.
     - `neutral`: Background `bg-muted`, text `text-secondary`.
     - `primary`: Background `brand-primary-soft`, text `brand-primary`.
   - Rounded pill border radius (`rounded-pill`), horizontal padding `px-2.5`, vertical `py-0.5`, text `font-caption`.

3. **`Input` Component (`apps/web/components/ui/Input.tsx`)**
   - Full touch target height: `h-[46px]`.
   - Normal border: `border-border-default`, Focus border: `ring-2 ring-brand-primary border-brand-primary`.
   - Error state: `border-status-danger text-status-danger ring-status-danger`.
   - Right-side icon slot for Arabic RTL typing, clear error message rendering beneath input.

4. **`Chip` Filter Component (`apps/web/components/ui/Chip.tsx`)**
   - Used for Stage filtering (مرحلة) and Session selection (قداس / خدمة).
   - `selected=true`: Background `brand-primary`, text `text-inverse`.
   - `selected=false`: Background `bg-surface`, border `border-border-default`, text `text-secondary`.

5. **`AttendanceToggle` Component (`apps/web/components/ui/AttendanceToggle.tsx`)**
   - 3-way or 4-way segment toggle for fast mobile entry:
     - `PRESENT` (حاضر): Green highlight (`bg-status-success text-white`).
     - `ABSENT` (غائب): Red highlight (`bg-status-danger text-white`).
     - `EXCUSED` (معتذر): Yellow highlight (`bg-status-warning text-white`).
     - `UNSET` (غير محدد): Neutral border.

6. **`StatCard` Component (`apps/web/components/ui/StatCard.tsx`)**
   - Card layout with metric value, Arabic label, icon, and trend badge.
   - Surface background `bg-surface`, rounded corners `rounded-card`, shadow `shadow-card`.

7. **`MemberRow` Component (`apps/web/components/ui/MemberRow.tsx`)**
   - List item for served members or servants.
   - Shows avatar/initials, full Arabic name, subtitle (e.g. stage/assigned servant), status badge, and chevron icon pointing left (in RTL).

8. **`MobileShell`, `AppBar` & `TabBar` (`apps/web/components/layout/`)**
   - Fixed top `AppBar` with title, back button (auto-flipped in RTL), and action icons.
   - Fixed bottom `TabBar` with 5 navigation items:
     1. الرئيسية (Home / Dashboard)
     2. المخدومين (Members)
     3. الحضور (Attendance)
     4. الخطة (Year Plan)
     5. حسابي (Profile)
   - Max width container: `max-w-md mx-auto` to center on tablet/desktop displays while locking 390px mobile viewport fidelity.

---

### 3.5 Express API Foundation & Healthcheck (`apps/api`)

The backend is initialized as a clean, modular Express service in TypeScript:
- **Middleware stack:**
  - `helmet`: Security HTTP headers.
  - `cors`: Configured for `localhost:3000` (Next.js frontend).
  - `express.json()`: Limit 2MB.
  - Request logging middleware (Morgan or custom JSON logger).
- **Healthcheck Route:**
  - `GET /health` → Returns `{ status: 'ok', timestamp: ISO, database: 'connected' }`.
  - Performs `prisma.$queryRaw` to guarantee database connectivity.

---

### 3.6 Docker Compose & Database Scaffold

`docker-compose.yml` for local development:
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    container_name: shenoda_db_dev
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgrespassword
      POSTGRES_DB: shenoda_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

Prisma initialization (`prisma/schema.prisma`):
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// Baseline system check model
model SystemHealth {
  id        String   @id @default(uuid())
  version   String
  createdAt DateTime @default(now())
}
```

---

## 4. Step-by-Step Task Breakdown

| Task ID | Component / Area | Description | Deliverable / Path |
|---|---|---|---|
| **TASK-00-1** | Monorepo Setup | Initialize `pnpm-workspace.yaml`, root `package.json`, TypeScript base config. | Root configuration files |
| **TASK-00-2** | Docker & DB | Create `docker-compose.yml`, launch local Postgres, configure `.env`. | `docker-compose.yml`, `prisma/schema.prisma` |
| **TASK-00-3** | Shared Package | Create `packages/shared` with common TypeScript response interfaces and constants. | `packages/shared/src/index.ts` |
| **TASK-00-4** | Express Backend | Bootstrap Express app with TypeScript, Helmet, CORS, and `/health` route verifying DB connection. | `apps/api/src/server.ts` |
| **TASK-00-5** | Next.js Frontend | Create `apps/web` with App Router, configure Cairo font, RTL directives, and meta tags. | `apps/web/app/layout.tsx` |
| **TASK-00-6** | Tailwind Tokens | Implement exact Figma design tokens in `apps/web/tailwind.config.ts` and `globals.css`. | `apps/web/tailwind.config.ts` |
| **TASK-00-7** | UI Component Library | Implement 8 foundational UI components (`Button`, `Badge`, `Input`, `Chip`, `StatCard`, `AttendanceToggle`, `MemberRow`, `AppBar`, `TabBar`). | `apps/web/components/ui/*` |
| **TASK-00-8** | Mobile Shell & Demo | Create `MobileShell.tsx` and design system smoke-test page showcasing all components. | `apps/web/app/page.tsx` |
| **TASK-00-9** | CI Pipeline | Add GitHub Actions workflow for linting, typechecking, and build validation across all workspaces. | `.github/workflows/ci.yml` |

---

## 5. Testing & Quality Assurance Plan

1. **Visual & Design System Tests:**
   - Verify all 8 components render on screen in `http://localhost:3000`.
   - Measure touch targets: Buttons and Inputs must be `>= 44px` tall.
   - Verify layout direction: Elements must align right-to-left (`dir="rtl"`) without horizontal scrollbars at 375px, 390px, and 414px widths.
2. **API & Database Connectivity:**
   - Execute `curl http://localhost:5000/health` → Expect `200 OK` with database status `connected`.
3. **Automated CI Validation:**
   - `pnpm lint` passes with 0 errors across `apps/web`, `apps/api`, and `packages/shared`.
   - `pnpm typecheck` (tsc) passes with 0 errors.

---

## 6. Definition of Done (DoD) Checklist

- [ ] Monorepo builds cleanly with a single command (`pnpm run build` or `npm run build`).
- [ ] Local PostgreSQL runs in Docker and Prisma connects successfully.
- [ ] Express backend responds to `GET /health` with `status: ok`.
- [ ] Next.js app boots and displays the Figma Design Token Showcase page in Arabic RTL.
- [ ] Cairo font renders cleanly across all text levels without fallback font flashing.
- [ ] All 8 shared UI components match Figma hex values, padding, and corner radiuses.
- [ ] Mobile responsive wrapper preserves 390px layout centering on wide viewports.
- [ ] CI pipeline passes on GitHub Actions.

---

## 7. Next Phase Handoff & Prerequisites

**Handoff to Phase 1 (Data Model, Roles & Permission Engine):**
- Verified PostgreSQL database connection ready for relational schema migrations.
- Prisma ORM CLI ready to accept domain entities (`User`, `Role`, `Stage`, `Sector`, `PermissionMatrix`).
- Shared package ready to export domain enums and permission rules.
- Design tokens and UI components ready to be used by authentication and member views.
