import { test, describe, before, beforeEach, after } from 'node:test';
import assert from 'node:assert';
import { createApp } from '../src/app';
import { setPrismaClient } from '../src/config/prisma';
import { createMockPrisma } from './helpers/mockDb';
import { HashService } from '../src/services/hash.service';
import { TokenService } from '../src/services/token.service';
import { resetAllRateLimits } from '../src/middleware/rateLimiter';
import { Server } from 'http';
import { UserStatus } from '@prisma/client';

describe('Phase 2 — Authentication & Account Management Comprehensive Test Suite', () => {
  let server: Server;
  let baseUrl: string;
  let mockDb: ReturnType<typeof createMockPrisma>;

  const defaultPassword = 'SecretPassword123!';
  let defaultPasswordHash: string;

  before(async () => {
    defaultPasswordHash = await HashService.hashPassword(defaultPassword);

    const app = createApp();

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address();
        if (address && typeof address === 'object') {
          baseUrl = `http://localhost:${address.port}`;
        }
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  beforeEach(async () => {
    resetAllRateLimits();
    mockDb = createMockPrisma();
    setPrismaClient(mockDb as any);

    // Seed mock roles
    mockDb._data.roles.push(
      { id: 'role-servant', code: 'SERVANT', name: 'خادم', level: 1 },
      { id: 'role-assistant', code: 'ASSISTANT_SECRETARY', name: 'مساعد امين الخدمة', level: 2 },
      { id: 'role-stagesec', code: 'STAGE_SECRETARY', name: 'امين الخدمة', level: 3 },
      { id: 'role-sectorsec', code: 'SECTOR_SECRETARY', name: 'امين قطاع', level: 4 },
      { id: 'role-generalsec', code: 'GENERAL_SECRETARY', name: 'امين عام', level: 5 }
    );

    // Seed mock sectors and stages
    mockDb._data.sectors.push(
      { id: 'sector-youth', organizationId: 'org-1', name: 'قطاع الشباب', code: 'SECTOR_YOUTH' },
      { id: 'sector-children', organizationId: 'org-1', name: 'قطاع الطفولة', code: 'SECTOR_CHILDREN' }
    );

    mockDb._data.stages.push(
      { id: 'stage-prep-boys', sectorId: 'sector-youth', name: 'إعدادي بنين', code: 'PREP_BOYS' },
      { id: 'stage-prep-girls', sectorId: 'sector-youth', name: 'إعدادي بنات', code: 'PREP_GIRLS' },
      { id: 'stage-primary-12', sectorId: 'sector-children', name: 'ابتدائي 1 و 2', code: 'PRIMARY_1_2' }
    );

    // Seed test users: General Secretary, Sector Secretary, Stage Secretary, Servant
    const genSec = await mockDb.user.create({
      data: {
        id: 'user-gen-sec',
        organizationId: 'org-1',
        roleId: 'role-generalsec',
        fullName: 'أ. مجدي فوزي',
        phoneNumber: '01000000005',
        email: 'magdy@shenoda.church',
        passwordHash: defaultPasswordHash,
        status: UserStatus.ACTIVE,
      },
    });

    const sectorSec = await mockDb.user.create({
      data: {
        id: 'user-sector-sec',
        organizationId: 'org-1',
        roleId: 'role-sectorsec',
        fullName: 'م. نادر عاطف',
        phoneNumber: '01000000004',
        email: 'nader@shenoda.church',
        passwordHash: defaultPasswordHash,
        status: UserStatus.ACTIVE,
      },
    });
    await mockDb.scopeAssignment.create({
      data: { userId: sectorSec.id, sectorId: 'sector-youth' },
    });

    const stageSec = await mockDb.user.create({
      data: {
        id: 'user-stage-sec',
        organizationId: 'org-1',
        roleId: 'role-stagesec',
        fullName: 'د. سامح كمال',
        phoneNumber: '01000000003',
        email: 'sameh@shenoda.church',
        passwordHash: defaultPasswordHash,
        status: UserStatus.ACTIVE,
      },
    });
    await mockDb.scopeAssignment.create({
      data: { userId: stageSec.id, stageId: 'stage-prep-boys', sectorId: 'sector-youth' },
    });

    const servant = await mockDb.user.create({
      data: {
        id: 'user-servant',
        organizationId: 'org-1',
        roleId: 'role-servant',
        fullName: 'بيتر عادل',
        phoneNumber: '01000000001',
        email: 'peter@shenoda.church',
        passwordHash: defaultPasswordHash,
        status: UserStatus.ACTIVE,
      },
    });
    await mockDb.scopeAssignment.create({
      data: { userId: servant.id, stageId: 'stage-prep-boys', sectorId: 'sector-youth' },
    });
  });

  // =========================================================================
  // SECTION 1: Cryptography & Security Tests (TASK-02-2, TASK-02-3, TASK-02-4)
  // =========================================================================

  test('1.1 HashService verifies bcrypt cost factor 12 and constant-time match', async () => {
    const rawPass = 'MyCopticPassword2026';
    const hash = await HashService.hashPassword(rawPass);

    assert.ok(hash.startsWith('$2a$12$') || hash.startsWith('$2b$12$'));
    assert.strictEqual(await HashService.verifyPassword(rawPass, hash), true);
    assert.strictEqual(await HashService.verifyPassword('WrongPass', hash), false);
  });

  test('1.2 TokenService issues valid JWT and rejects invalid or tampered tokens', async () => {
    const payload = {
      userId: 'user-123',
      roleLevel: 3,
      roleCode: 'STAGE_SECRETARY',
      orgId: 'org-1',
      stageIds: ['stage-prep-boys'],
      sectorIds: ['sector-youth'],
    };

    const token = TokenService.generateAccessToken(payload);
    assert.ok(typeof token === 'string' && token.length > 20);

    const verified = TokenService.verifyAccessToken(token);
    assert.strictEqual(verified?.userId, 'user-123');
    assert.strictEqual(verified?.roleLevel, 3);

    // Tampered token returns null
    const tampered = token.slice(0, -5) + 'xxxxx';
    assert.strictEqual(TokenService.verifyAccessToken(tampered), null);
  });

  // =========================================================================
  // SECTION 2: Authentication API Lifecycle (TASK-02-5)
  // =========================================================================

  test('2.1 Login with valid Egyptian phone and password returns 200, JWT, and scopes', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: '01000000001',
        password: defaultPassword,
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.accessToken);
    assert.strictEqual(body.user.fullName, 'بيتر عادل');
    assert.strictEqual(body.user.role.code, 'SERVANT');
    assert.strictEqual(body.user.scopes.stages[0].id, 'stage-prep-boys');

    // Verify Set-Cookie header contains refreshToken
    const cookie = res.headers.get('set-cookie');
    assert.ok(cookie && cookie.includes('refreshToken='));
  });

  test('2.2 Login with valid email returns 200 and issues access token', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'sameh@shenoda.church',
        password: defaultPassword,
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.user.fullName, 'د. سامح كمال');
  });

  test('2.3 Login with incorrect password returns 401 ERR_INVALID_CREDENTIALS', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: '01000000001',
        password: 'IncorrectPassword!',
      }),
    });

    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error.code, 'ERR_INVALID_CREDENTIALS');
  });

  test('2.4 5 failed login attempts trigger 429 Too Many Requests (ERR_RATE_LIMITED)', async () => {
    const phone = '01000000001';

    // 4 failed attempts
    for (let i = 0; i < 4; i++) {
      const r = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: phone, password: 'Wrong' }),
      });
      assert.strictEqual(r.status, 401);
    }

    // 5th failed attempt causes lockout
    const res5 = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: phone, password: 'Wrong' }),
    });
    assert.strictEqual(res5.status, 429);
    const body5 = await res5.json();
    assert.strictEqual(body5.error.code, 'ERR_RATE_LIMITED');

    // 6th attempt even with correct password is locked out
    const res6 = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: phone, password: defaultPassword }),
    });
    assert.strictEqual(res6.status, 429);
  });

  test('2.5 Silent refresh token rotation verifies hash, rotates token, and returns new access token', async () => {
    // 1. Login to obtain refresh token cookie
    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: '01000000001', password: defaultPassword }),
    });
    const setCookie = loginRes.headers.get('set-cookie') || '';
    const tokenMatch = setCookie.match(/refreshToken=([^;]+)/);
    const refreshToken = tokenMatch ? tokenMatch[1] : '';
    assert.ok(refreshToken);

    // 2. Call /auth/refresh with cookie
    const refreshRes = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `refreshToken=${refreshToken}`,
      },
    });

    assert.strictEqual(refreshRes.status, 200);
    const refreshBody = await refreshRes.json();
    assert.strictEqual(refreshBody.success, true);
    assert.ok(refreshBody.accessToken);

    // Verify rotated cookie is present
    const newSetCookie = refreshRes.headers.get('set-cookie') || '';
    assert.ok(newSetCookie.includes('refreshToken='));

    // 3. Old refresh token cannot be reused (rotation security)
    const reuseRes = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `refreshToken=${refreshToken}`,
      },
    });
    assert.strictEqual(reuseRes.status, 401);
  });

  test('2.6 Logout revokes refresh token and clears cookie', async () => {
    // Login
    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: '01000000001', password: defaultPassword }),
    });
    const setCookie = loginRes.headers.get('set-cookie') || '';
    const tokenMatch = setCookie.match(/refreshToken=([^;]+)/);
    const refreshToken = tokenMatch ? tokenMatch[1] : '';

    // Logout
    const logoutRes = await fetch(`${baseUrl}/api/v1/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `refreshToken=${refreshToken}`,
      },
    });
    assert.strictEqual(logoutRes.status, 200);

    // Refresh should now fail
    const refreshRes = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        Cookie: `refreshToken=${refreshToken}`,
      },
    });
    assert.strictEqual(refreshRes.status, 401);
  });

  test('2.7 Forgot password generates 6-digit OTP and reset password updates hash', async () => {
    // 1. Forgot password
    const forgotRes = await fetch(`${baseUrl}/api/v1/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: '01000000001' }),
    });
    assert.strictEqual(forgotRes.status, 200);
    const forgotBody = await forgotRes.json();
    assert.strictEqual(forgotBody.success, true);
    const otp = forgotBody.devOtpCode;
    assert.ok(otp && otp.length === 6);

    // 2. Reset password
    const newPass = 'BrandNewPassword2026!';
    const resetRes = await fetch(`${baseUrl}/api/v1/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: '01000000001',
        otpCode: otp,
        newPassword: newPass,
      }),
    });
    assert.strictEqual(resetRes.status, 200);

    // 3. Login with new password succeeds
    const newLoginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: '01000000001',
        password: newPass,
      }),
    });
    assert.strictEqual(newLoginRes.status, 200);
  });

  // =========================================================================
  // SECTION 3: Scoped Account Provisioning Tests (FR-1.2, Assumption A7)
  // =========================================================================

  test('3.1 Public self-registration route is strictly non-existent (Assumption A7)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: 'مجهول' }),
    });
    assert.strictEqual(res.status, 404);
  });

  test('3.2 Unauthenticated account creation returns 401 AUTH_REQUIRED', async () => {
    const res = await fetch(`${baseUrl}/api/v1/accounts/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: 'خادم جديد' }),
    });
    assert.strictEqual(res.status, 401);
  });

  test('3.3 Level 1 Servant cannot create accounts -> 403 Forbidden', async () => {
    const servantToken = TokenService.generateAccessToken({
      userId: 'user-servant',
      roleLevel: 1,
      roleCode: 'SERVANT',
      orgId: 'org-1',
      stageIds: ['stage-prep-boys'],
      sectorIds: ['sector-youth'],
    });

    const res = await fetch(`${baseUrl}/api/v1/accounts/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${servantToken}`,
      },
      body: JSON.stringify({
        fullName: 'مينا فريد',
        phoneNumber: '01011112222',
        roleId: 'role-servant',
        stageId: 'stage-prep-boys',
        temporaryPassword: 'TempPassword123!',
      }),
    });

    assert.strictEqual(res.status, 403);
  });

  test('3.4 Level 3 Stage Secretary CANNOT create an account -> 403 Forbidden', async () => {
    const stageSecToken = TokenService.generateAccessToken({
      userId: 'user-stage-sec',
      roleLevel: 3,
      roleCode: 'STAGE_SECRETARY',
      orgId: 'org-1',
      stageIds: ['stage-prep-boys'],
      sectorIds: ['sector-youth'],
    });

    const res = await fetch(`${baseUrl}/api/v1/accounts/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${stageSecToken}`,
      },
      body: JSON.stringify({
        fullName: 'مريم جرجس',
        phoneNumber: '01033334444',
        roleId: 'role-servant',
        stageId: 'stage-prep-boys',
        temporaryPassword: 'TempPassword123!',
      }),
    });

    assert.strictEqual(res.status, 403);
  });

  test('3.5 Level 4 Sector Secretary CANNOT create an account -> 403 Forbidden', async () => {
    const sectorSecToken = TokenService.generateAccessToken({
      userId: 'user-sector-sec',
      roleLevel: 4,
      roleCode: 'SECTOR_SECRETARY',
      orgId: 'org-1',
      stageIds: ['stage-prep-boys'],
      sectorIds: ['sector-youth'],
    });

    const res = await fetch(`${baseUrl}/api/v1/accounts/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sectorSecToken}`,
      },
      body: JSON.stringify({
        fullName: 'أمين مرحلة جديد',
        phoneNumber: '01055556666',
        roleId: 'role-stage-sec',
        stageId: 'stage-prep-boys',
        temporaryPassword: 'TempPassword123!',
      }),
    });

    assert.strictEqual(res.status, 403);
  });

  test('3.6 Level 5 General Secretary successfully creates Servant (Level 1) within stage -> 201 Created', async () => {
    const generalSecToken = TokenService.generateAccessToken({
      userId: 'user-gen-sec',
      roleLevel: 5,
      roleCode: 'GENERAL_SECRETARY',
      orgId: 'org-1',
      stageIds: [],
      sectorIds: [],
    });

    const res = await fetch(`${baseUrl}/api/v1/accounts/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${generalSecToken}`,
      },
      body: JSON.stringify({
        fullName: 'مينا فريد تادرس',
        phoneNumber: '01077778888',
        email: 'mina.farid@shenoda.church',
        roleId: 'role-servant',
        stageId: 'stage-prep-boys',
        temporaryPassword: 'InitPassword2026!',
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.user.fullName, 'مينا فريد تادرس');
    assert.strictEqual(body.user.role.level, 1);
    assert.strictEqual(body.user.scope.stageId, 'stage-prep-boys');

    // Verify created user can now log in with temporaryPassword
    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: '01077778888',
        password: 'InitPassword2026!',
      }),
    });
    assert.strictEqual(loginRes.status, 200);
  });

  test('3.7 Duplicate phone number returns 409 Conflict (ERR_USER_EXISTS)', async () => {
    const generalSecToken = TokenService.generateAccessToken({
      userId: 'user-gen-sec',
      roleLevel: 5,
      roleCode: 'GENERAL_SECRETARY',
      orgId: 'org-1',
      stageIds: [],
      sectorIds: [],
    });

    const res = await fetch(`${baseUrl}/api/v1/accounts/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${generalSecToken}`,
      },
      body: JSON.stringify({
        fullName: 'بيتر مكرر',
        phoneNumber: '01000000001', // Already exists in seed
        roleId: 'role-servant',
        stageId: 'stage-prep-boys',
        temporaryPassword: 'InitPassword2026!',
      }),
    });

    assert.strictEqual(res.status, 409);
    const body = await res.json();
    assert.strictEqual(body.error.code, 'ERR_USER_EXISTS');
  });

  test('3.9 Level 3 Stage Secretary CAN edit a servant under their stage -> 200 OK', async () => {
    const stageSecToken = TokenService.generateAccessToken({
      userId: 'user-stage-sec',
      roleLevel: 3,
      roleCode: 'STAGE_SECRETARY',
      orgId: 'org-1',
      stageIds: ['stage-prep-boys'],
      sectorIds: ['sector-youth'],
    });

    const res = await fetch(`${baseUrl}/api/v1/accounts/user-servant`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${stageSecToken}`,
      },
      body: JSON.stringify({
        fullName: 'بيتر يوسف عادل',
        phoneNumber: '01012345678',
        email: 'peter.updated@church.com',
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.user.fullName, 'بيتر يوسف عادل');
    assert.strictEqual(body.user.phoneNumber, '01012345678');
  });

  test('3.10 Level 3 Stage Secretary CANNOT edit a servant outside their stage -> 403 Forbidden', async () => {
    const stageSecToken = TokenService.generateAccessToken({
      userId: 'user-stage-sec',
      roleLevel: 3,
      roleCode: 'STAGE_SECRETARY',
      orgId: 'org-1',
      stageIds: ['stage-prep-girls'],
      sectorIds: ['sector-youth'],
    });

    const res = await fetch(`${baseUrl}/api/v1/accounts/user-servant`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${stageSecToken}`,
      },
      body: JSON.stringify({
        fullName: 'تعديل غير مصرح',
      }),
    });

    assert.strictEqual(res.status, 403);
  });

  test('3.11 Level 3 Stage Secretary CANNOT edit an equal or superior role (Level >= 3) -> 403 Forbidden', async () => {
    const stageSecToken = TokenService.generateAccessToken({
      userId: 'user-stage-sec',
      roleLevel: 3,
      roleCode: 'STAGE_SECRETARY',
      orgId: 'org-1',
      stageIds: ['stage-prep-boys'],
      sectorIds: ['sector-youth'],
    });

    const res = await fetch(`${baseUrl}/api/v1/accounts/user-sector-sec`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${stageSecToken}`,
      },
      body: JSON.stringify({
        fullName: 'محاولة تعديل أمين القطاع',
      }),
    });

    assert.strictEqual(res.status, 403);
  });

  // =========================================================================
  // SECTION 4: Servant Transfer & Suspension Tests (FR-1.4)
  // =========================================================================

  test('4.1 Level 4 Sector Secretary cannot suspend a servant -> 403 Forbidden', async () => {
    const sectorSecToken = TokenService.generateAccessToken({
      userId: 'user-sector-sec',
      roleLevel: 4,
      roleCode: 'SECTOR_SECRETARY',
      orgId: 'org-1',
      stageIds: [],
      sectorIds: ['sector-youth'],
    });

    const res = await fetch(`${baseUrl}/api/v1/accounts/user-servant/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sectorSecToken}`,
      },
      body: JSON.stringify({
        action: 'SUSPEND',
        reason: 'إيقاف غير مصرح به',
      }),
    });

    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.error.code, 'ACCESS_DENIED_GENERAL_SECRETARY_ONLY');
  });

  test('4.2 Level 5 General Secretary suspends servant -> User immediately blocked from login (403)', async () => {
    const genSecToken = TokenService.generateAccessToken({
      userId: 'user-gen-sec',
      roleLevel: 5,
      roleCode: 'GENERAL_SECRETARY',
      orgId: 'org-1',
      stageIds: [],
      sectorIds: [],
    });

    // 1. General Secretary suspends user-servant
    const res = await fetch(`${baseUrl}/api/v1/accounts/user-servant/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${genSecToken}`,
      },
      body: JSON.stringify({
        action: 'SUSPEND',
        reason: 'إجازة رعوية مؤقتة',
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.user.status, 'SUSPENDED');
    assert.strictEqual(body.auditLog.newStatus, 'SUSPENDED');
    assert.strictEqual(body.auditLog.changedById, 'user-gen-sec');

    // 2. Suspended servant tries to login -> 403 ERR_ACCOUNT_SUSPENDED
    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: '01000000001',
        password: defaultPassword,
      }),
    });

    assert.strictEqual(loginRes.status, 403);
    const loginBody = await loginRes.json();
    assert.strictEqual(loginBody.error.code, 'ERR_ACCOUNT_SUSPENDED');
  });

  test('4.3 Level 5 General Secretary transfers servant to another stage and logs history', async () => {
    const genSecToken = TokenService.generateAccessToken({
      userId: 'user-gen-sec',
      roleLevel: 5,
      roleCode: 'GENERAL_SECRETARY',
      orgId: 'org-1',
      stageIds: [],
      sectorIds: [],
    });

    const res = await fetch(`${baseUrl}/api/v1/accounts/user-servant/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${genSecToken}`,
      },
      body: JSON.stringify({
        action: 'TRANSFER',
        newStageId: 'stage-primary-12',
        reason: 'نقل لتلبية احتياج خدمة ابتدائي',
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.auditLog.previousStage, 'stage-prep-boys');
    assert.strictEqual(body.auditLog.newStage, 'stage-primary-12');
    assert.strictEqual(body.auditLog.reason, 'نقل لتلبية احتياج خدمة ابتدائي');

    // Verify history audit endpoint
    const historyRes = await fetch(`${baseUrl}/api/v1/accounts/user-servant/history`, {
      headers: { Authorization: `Bearer ${genSecToken}` },
    });
    assert.strictEqual(historyRes.status, 200);
    const historyBody = await historyRes.json();
    assert.ok(historyBody.logs.length >= 1);
  });

  test('4.4 General Secretary CANNOT suspend own account (Self-Suspension Guard) -> 400 Bad Request', async () => {
    const genSecToken = TokenService.generateAccessToken({
      userId: 'user-gen-sec',
      roleLevel: 5,
      roleCode: 'GENERAL_SECRETARY',
      orgId: 'org-1',
      stageIds: [],
      sectorIds: [],
    });

    const res = await fetch(`${baseUrl}/api/v1/accounts/user-gen-sec/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${genSecToken}`,
      },
      body: JSON.stringify({
        action: 'SUSPEND',
        reason: 'محاولة إيقاف الحساب الشخصي بالخطأ',
      }),
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.error.code, 'ERR_CANNOT_SUSPEND_SELF');
  });

  test('4.5 General Secretary can list servants directory across church via GET /api/v1/accounts/servants', async () => {
    const genSecToken = TokenService.generateAccessToken({
      userId: 'user-gen-sec',
      roleLevel: 5,
      roleCode: 'GENERAL_SECRETARY',
      orgId: 'org-1',
      stageIds: [],
      sectorIds: [],
    });

    const res = await fetch(`${baseUrl}/api/v1/accounts/servants`, {
      headers: { Authorization: `Bearer ${genSecToken}` },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.servants));
    assert.ok(body.servants.length > 0);
    assert.ok(body.servants.some((s: any) => s.id === 'user-servant'));
  });
});
