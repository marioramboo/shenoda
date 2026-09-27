# Phase 2 — Authentication & Account Management

**Document ID:** CSMS-PLAN-PHASE-02  
**Phase:** 2 of 9  
**Status:** Ready for Implementation  
**Estimated Effort:** 1–2 Sprints (2 weeks)  
**Target Systems:** Next.js (App Router), Express API, Prisma ORM, JWT/Sessions, Redis/In-Memory Rate Limiter  
**Source Traceability:**
- **SRS References:** §1.4 (Assumption A7 Scoped Account Creation), §5.1 (FR-1.1 Phone/Email Login, FR-1.2 Scoped Account Creation, FR-1.3 Password Reset OTP, FR-1.4 Transfer & Suspend Servants by General Secretary), §6.3 (NFR-3.2 Password Hashing & Brute-Force Rate Limiting).
- **Figma Prototype:** [Figma Design File](https://www.figma.com/design/BSSLc7uXAfjZUIg60Ghjl5) (Screen: Login / تسجيل الدخول, Viewport 390px mobile).
- **Agile Plan Reference:** Section 4 (Phase 2 — Authentication & Account Management).

---

## 1. Executive Summary & Objective

The objective of **Phase 2** is to deliver an end-to-end, secure authentication and account provisioning lifecycle for the Church Service Management System. 

In strict adherence to **Assumption A7** and **FR-1.2**, the system **never exposes public self-registration**. Instead, church servant accounts are provisioned exclusively through authorized secretaries within their administrative scope. This phase implements high-security password hashing, brute-force rate limiting, JWT token management with refresh cycles, administrative account creation, account suspension/transfer workflows (FR-1.4), and the mobile-first Figma **Login screen** in Cairo Arabic RTL.

---

## 2. Previous Phase Summary & System State Baseline

### 2.1 Accomplishments from Phase 1 (Data Model & Permissions)
- **Hierarchy Schema:** `Organization`, `Sector`, `Stage`, `Role`, `User`, `ScopeAssignment`, and `ServantEvaluation` tables migrated via Prisma.
- **Fixed Stages Taxonomy:** 9 canonical stages (Nursery through University, with Prep and Secondary split by gender) seeded in the database.
- **Cumulative Permission Engine:** Data-driven permission matrix enforcing 5 hierarchical tiers (خادم = 1 to امين عام = 5) with strict scope-matching.
- **Authorization Middleware:** `requirePermission(action)` middleware operating on Express routes.
- **Evaluator Logic:** Automatic resolution for Assumptions A1 and A3.

### 2.2 System State Entering Phase 2
- Users exist in the database from seed scripts, but there is no mechanism for logging in, generating bearer credentials, verifying passwords, or managing sessions.
- No public or private frontend screens are wired to backend routes yet.

---

## 3. Detailed Architecture & Technical Specifications for Phase 2

### 3.1 Security & Cryptography Specifications (NFR-3.2)

1. **Password Hashing:**
   - Algorithm: `Argon2id` (or `bcrypt` with minimum cost factor `12`).
   - Plaintext passwords must never be logged, cached, or returned in API responses.
2. **Session & Token Architecture:**
   - Access Token: Short-lived JWT (15 minutes lifespan) containing `{ userId, roleLevel, roleCode, orgId }`.
   - Refresh Token: Long-lived opaque string (7 days) stored in PostgreSQL with device metadata and hashed token value. Set in an `HttpOnly`, `SameSite=Lax`, `Secure` cookie.
3. **Rate Limiting & Brute-Force Protection (NFR-3.2):**
   - Maximum 5 failed login attempts per phone/email within a 15-minute window before triggering a temporary 15-minute lockout.
   - Global IP rate limiting: 100 requests per minute across auth routes.

---

### 3.2 Extended Relational Schema for Auth & Audit (`prisma/schema.prisma`)

```prisma
// -------------------------------------------------------------
// REFRESH TOKENS & AUDIT LOGS
// -------------------------------------------------------------

model RefreshToken {
  id          String   @id @default(uuid())
  userId      String
  tokenHash   String   @unique
  userAgent   String?
  ipAddress   String?
  isRevoked   Boolean  @default(false)
  expiresAt   DateTime
  createdAt   DateTime @default(now())

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("refresh_tokens")
}

model PasswordResetToken {
  id          String   @id @default(uuid())
  userId      String
  tokenHash   String   @unique
  otpCode     String   // 6-digit verification code
  expiresAt   DateTime
  isUsed      Boolean  @default(false)
  createdAt   DateTime @default(now())

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("password_reset_tokens")
}

// Audit trail for servant transfer and account suspension (FR-1.4)
model AccountStatusLog {
  id             String      @id @default(uuid())
  targetUserId   String
  changedById    String      // Must be امين عام for transfer/suspend
  previousStatus UserStatus
  newStatus      UserStatus
  previousStage  String?     // Previous مرحلة ID if transferred
  newStage       String?     // New مرحلة ID if transferred
  reason         String?
  createdAt      DateTime    @default(now())

  targetUser     User        @relation("TargetStatusLogs", fields: [targetUserId], references: [id], onDelete: Cascade)
  changedBy      User        @relation("OperatorStatusLogs", fields: [changedById], references: [id], onDelete: Cascade)

  @@index([targetUserId])
  @@map("account_status_logs")
}
```

---

### 3.3 Backend API Endpoints & Request/Response Contracts

#### 1. `POST /api/v1/auth/login` (FR-1.1, NFR-3.2)
- **Rate Limit:** 5 requests / 15 mins per identity.
- **Request Body:**
  ```json
  {
    "identifier": "01234567890", // Phone number or email
    "password": "CorrectPassword123"
  }
  ```
- **Validation:** Zod schema verifying Egyptian mobile pattern `^01[0125][0-9]{8}$` or RFC email format.
- **Response (200 OK):**
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzI1Ni...",
    "user": {
      "id": "uuid-v4",
      "fullName": "شنودة مرقس",
      "phoneNumber": "01234567890",
      "email": "shenoda@example.com",
      "role": {
        "code": "SERVANT",
        "name": "خادم",
        "level": 1
      },
      "scopes": {
        "stages": [{ "id": "stage-uuid", "name": "إعدادي بنين" }],
        "sectors": [{ "id": "sector-uuid", "name": "قطاع الشباب" }]
      }
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Validation failure.
  - `401 Unauthorized`: Invalid credentials (`ERR_INVALID_CREDENTIALS`).
  - `403 Forbidden`: Account is suspended (`ERR_ACCOUNT_SUSPENDED`).
  - `429 Too Many Requests`: Account locked out due to failed attempts (`ERR_RATE_LIMITED`).

#### 2. `POST /api/v1/auth/refresh`
- Reads `refreshToken` from HTTP-only cookie, validates hash and expiration, rotates refresh token, and issues new Access Token.

#### 3. `POST /api/v1/auth/logout`
- Revokes active refresh token record in PostgreSQL and clears cookies.

#### 4. `POST /api/v1/auth/forgot-password` & `POST /api/v1/auth/reset-password` (FR-1.3)
- Generates 6-digit cryptographically secure OTP with 10-minute expiry.
- Dispatches via SMS/Email interface (stubbed in dev; integrated in Phase 7).
- Reset endpoint verifies OTP and updates password hash with Argon2id.

#### 5. `POST /api/v1/accounts/create` (FR-1.2, Assumption A7)
- **Protected:** Requires `requirePermission(PermissionAction.MANAGE_SERVANT_ACCOUNTS)`.
- **Scoped Provisioning Rules:**
  - `امين الخدمة` (Level 3): Can create `خادم` (Level 1) and `مساعد` (Level 2) strictly within their own `stageId`.
  - `امين قطاع` (Level 4): Can create `امين الخدمة` (Level 3) within stages belonging to their `sectorId`.
  - `امين عام` (Level 5): Can create `امين قطاع` (Level 4) or any role org-wide.
- **Request Body:**
  ```json
  {
    "fullName": "مينا فريد",
    "phoneNumber": "01098765432",
    "email": "mina@example.com",
    "roleId": "role-uuid-servant",
    "stageId": "stage-uuid-prep-boys",
    "temporaryPassword": "InitPassword2026!"
  }
  ```

#### 6. `POST /api/v1/accounts/:userId/status` (FR-1.4)
- **Protected:** Restricted exclusively to `امين عام` (`roleLevel === 5`).
- Actions: `SUSPEND`, `ACTIVATE`, or `TRANSFER`.
- When transferring: Validates target `stageId` and `sectorId`, re-links `ScopeAssignment`, and writes an immutable record to `AccountStatusLog`.

---

### 3.4 Frontend UI Implementation — Figma Login Screen (`apps/web`)

The Login view is constructed strictly per the Figma design file at mobile viewport (390px) and scales gracefully to desktop with centered framing.

#### Component Breakdown (`apps/web/app/(auth)/login/page.tsx`)
1. **Header Brand Unit:**
   - Church cross / Fish emblem logo mark in `brand-accent` (`#B8892B`).
   - Title: `نظام إدارة الخدمة` (`font-display`, `text-brand-primary`).
   - Subtitle: `كنيسة القديس العظيم أنبا شنودة رئيس المتوحدين` (`font-body-small`, `text-text-secondary`).
2. **Login Form Container:**
   - Background `bg-surface`, border `border-border-default`, radius `rounded-card`, shadow `shadow-card`.
   - **Identifier Input:** Icon `PhoneIcon` / `MailIcon`, label "رقم الهاتف أو البريد الإلكتروني", placeholder "01xxxxxxxxx".
   - **Password Input:** Icon `LockIcon`, label "كلمة المرور", toggle visibility button (eye icon).
   - **Form Actions Row:**
     - Checkbox: "تذكرني على هذا الجهاز" (Remember me).
     - Link: "نسيت كلمة المرور؟" (Forgot password) pointing to `/forgot-password`.
   - **Submit Button:** `Button` variant `primary`, full width, height `46px`, label "تسجيل الدخول", with loading spinner state.
3. **No-Self-Registration Notice Card (Assumption A7):**
   - Styled as an informational card at the bottom:
   - Background `brand-primary-soft`, text `brand-primary`, icon `InfoIcon`.
   - Copy: *"تنبيه: حسابات الخدام يتم إنشاؤها وتفعيلها فقط عبر أمين الخدمة أو أمين القطاع المسئول. لا يوجد تسجيل ذاتي."*
4. **State Management & Auth Context (`apps/web/context/AuthContext.tsx`):**
   - Stores `user`, `accessToken`, and `isAuthenticated`.
   - Automatically handles silent token refreshes via Axios interceptor.
   - Redirects to `/dashboard` upon successful login.

---

## 4. Step-by-Step Task Breakdown

| Task ID | Work Area | Description | Deliverable / Path |
|---|---|---|---|
| **TASK-02-1** | Prisma Migration | Add `RefreshToken`, `PasswordResetToken`, and `AccountStatusLog` tables. Run Prisma migration. | `prisma/schema.prisma` |
| **TASK-02-2** | Hashing Service | Implement Argon2id password hashing and comparison service with constant-time verification. | `apps/api/src/services/hash.service.ts` |
| **TASK-02-3** | Token Service | Implement JWT issue, verify, and cookie refresh token lifecycle. | `apps/api/src/services/token.service.ts` |
| **TASK-02-4** | Rate Limiting | Configure memory/Redis rate limiter on `/auth/login` enforcing 5 attempts / 15 mins. | `apps/api/src/middleware/rateLimiter.ts` |
| **TASK-02-5** | Auth API Routes | Implement `/login`, `/refresh`, `/logout`, `/forgot-password`, `/reset-password` endpoints. | `apps/api/src/controllers/auth.controller.ts` |
| **TASK-02-6** | Account Admin API | Implement scoped user creation route (`POST /accounts/create`) enforcing hierarchy bounds. | `apps/api/src/controllers/account.controller.ts` |
| **TASK-02-7** | Transfer & Suspend | Implement `POST /accounts/:userId/status` for General Secretary with audit logging. | `apps/api/src/controllers/status.controller.ts` |
| **TASK-02-8** | Figma Login Page | Build the Next.js login screen matching Figma 1:1 with Cairo font, tokens, and RTL layout. | `apps/web/app/(auth)/login/page.tsx` |
| **TASK-02-9** | Client Auth State | Build React `AuthContext`, Axios interceptors for JWT injection, and route guards (`withAuth`). | `apps/web/context/AuthContext.tsx` |

---

## 5. Testing & Quality Assurance Plan

1. **Authentication Security Tests:**
   - Verify correct password returns JWT and user profile.
   - Verify incorrect password returns 401.
   - Execute 6 failed login attempts in rapid succession → Verify 6th attempt returns `429 Too Many Requests`.
   - Verify expired or tampered JWT returns 401.
2. **Scoped Account Creation Tests (FR-1.2, Assumption A7):**
   - `امين الخدمة` of `Stage A` attempts to create an account assigned to `Stage B` → Expect `403 Forbidden`.
   - `امين الخدمة` attempts to create an `امين قطاع` account → Expect `403 Forbidden` (cannot create role above self).
   - `امين قطاع` creates `امين الخدمة` in child stage → Expect `201 Created`.
3. **Servant Transfer & Suspension Tests (FR-1.4):**
   - `امين قطاع` attempts to suspend a servant → Expect `403 Forbidden` (reserved for `امين عام`).
   - `امين عام` suspends user → User immediately fails login with `403 Account Suspended`.
   - `امين عام` transfers user to another stage → `AccountStatusLog` captures previous and new stage IDs.
4. **Visual & Accessibility Testing:**
   - Login page inspected at 390px width: zero horizontal overflow, input touch targets >= 44px, full RTL alignment.

---

## 6. Definition of Done (DoD) Checklist

- [ ] Password hashes stored in DB using Argon2id (verified no plain passwords exist).
- [ ] Brute-force rate limiter verified with automated tests.
- [ ] Login screen pixel-matches Figma prototype in Arabic RTL at 390px mobile viewport.
- [ ] No public self-registration link or route exists anywhere in frontend or backend (Assumption A7).
- [ ] Scoped account creation respects hierarchical rules and rejects unauthorized scope assignment.
- [ ] General Secretary transfer and suspension features log full history in `account_status_logs`.
- [ ] Silent refresh token rotation works seamlessly on token expiry.

---

## 7. Next Phase Handoff & Prerequisites

**Handoff to Phase 3 (Servant & Member Records):**
- Authenticated user context available in all API requests (`req.user`) and frontend components (`useAuth`).
- Test accounts across all 5 roles can log in and obtain valid access tokens.
- Foundation ready to attach profile records, confidential member dossiers, and private notes.
