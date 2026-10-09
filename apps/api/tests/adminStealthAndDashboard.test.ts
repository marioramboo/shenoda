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

describe('Admin Command Center & Stealth Filtering Test Suite', () => {
  let server: Server;
  let baseUrl: string;
  let mockDb: ReturnType<typeof createMockPrisma>;

  const defaultPassword = 'SecretPassword123!';
  let defaultPasswordHash: string;

  let adminUser: any;
  let marioAdminUser: any;
  let genSecUser: any;
  let stageSecUser: any;
  let servantUser: any;

  let adminToken: string;
  let genSecToken: string;
  let stageSecToken: string;

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

    // 1. Roles
    mockDb._data.roles.push(
      { id: 'role-servant', code: 'SERVANT', name: 'خادم', level: 1 },
      { id: 'role-stagesec', code: 'STAGE_SECRETARY', name: 'امين الخدمة', level: 3 },
      { id: 'role-generalsec', code: 'GENERAL_SECRETARY', name: 'امين عام', level: 5 },
      { id: 'role-admin', code: 'ADMIN', name: 'مدير النظام', level: 6 }
    );

    // 2. Organization, sector, stage
    mockDb._data.sectors.push({
      id: 'sec-youth',
      organizationId: 'org-1',
      name: 'قطاع الشباب',
      code: 'SECTOR_YOUTH',
    });
    mockDb._data.stages.push({
      id: 'stg-prep-boys',
      sectorId: 'sec-youth',
      name: 'إعدادي بنين',
      code: 'PREP_BOYS',
    });

    // 3. Seed Accounts: George (Admin), Mario (Admin), Ramez (GenSec), StageSec, Servant
    adminUser = await mockDb.user.create({
      data: {
        id: 'user-george-admin',
        organizationId: 'org-1',
        roleId: 'role-admin',
        fullName: 'جورج',
        phoneNumber: '01000000000',
        email: 'george.admin@shenoda.church',
        passwordHash: defaultPasswordHash,
        status: UserStatus.ACTIVE,
      },
    });

    marioAdminUser = await mockDb.user.create({
      data: {
        id: 'user-mario-admin',
        organizationId: 'org-1',
        roleId: 'role-admin',
        fullName: 'ماريو',
        phoneNumber: '01100000000',
        email: 'mario.admin@shenoda.church',
        passwordHash: defaultPasswordHash,
        status: UserStatus.ACTIVE,
      },
    });

    genSecUser = await mockDb.user.create({
      data: {
        id: 'user-ramez-gensec',
        organizationId: 'org-1',
        roleId: 'role-generalsec',
        fullName: 'أ. رامز شكري',
        phoneNumber: '01012345678',
        email: 'ramez@shenoda.church',
        passwordHash: defaultPasswordHash,
        status: UserStatus.ACTIVE,
      },
    });

    stageSecUser = await mockDb.user.create({
      data: {
        id: 'user-stagesec',
        organizationId: 'org-1',
        roleId: 'role-stagesec',
        fullName: 'أ. مينا إسكندر',
        phoneNumber: '01211111111',
        email: 'mina@shenoda.church',
        passwordHash: defaultPasswordHash,
        status: UserStatus.ACTIVE,
      },
    });

    servantUser = await mockDb.user.create({
      data: {
        id: 'user-servant-1',
        organizationId: 'org-1',
        roleId: 'role-servant',
        fullName: 'أنطونيوس مجدي',
        phoneNumber: '01222222222',
        email: 'antonius@shenoda.church',
        passwordHash: defaultPasswordHash,
        status: UserStatus.ACTIVE,
      },
    });

    // Scopes
    await mockDb.scopeAssignment.create({
      data: { userId: stageSecUser.id, stageId: 'stg-prep-boys', sectorId: 'sec-youth' },
    });
    await mockDb.scopeAssignment.create({
      data: { userId: servantUser.id, stageId: 'stg-prep-boys', sectorId: 'sec-youth' },
    });
    await mockDb.scopeAssignment.create({
      data: { userId: adminUser.id, stageId: 'stg-prep-boys', sectorId: 'sec-youth' },
    });

    // Generate tokens
    adminToken = TokenService.generateAccessToken({
      userId: adminUser.id,
      roleLevel: 6,
      roleCode: 'ADMIN',
      orgId: 'org-1',
      stageIds: ['stg-prep-boys'],
      sectorIds: ['sec-youth'],
    });

    genSecToken = TokenService.generateAccessToken({
      userId: genSecUser.id,
      roleLevel: 5,
      roleCode: 'GENERAL_SECRETARY',
      orgId: 'org-1',
      stageIds: ['stg-prep-boys'],
      sectorIds: ['sec-youth'],
    });

    stageSecToken = TokenService.generateAccessToken({
      userId: stageSecUser.id,
      roleLevel: 3,
      roleCode: 'STAGE_SECRETARY',
      orgId: 'org-1',
      stageIds: ['stg-prep-boys'],
      sectorIds: ['sec-youth'],
    });
  });

  test('1. Ghost Admin Stealth: General Secretary (Level 5) cannot see Admin accounts in listServants', async () => {
    const res = await fetch(`${baseUrl}/api/v1/accounts/servants`, {
      headers: { Authorization: `Bearer ${genSecToken}` },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);

    const names = body.servants.map((s: any) => s.fullName);
    assert.strictEqual(names.includes('جورج'), false, 'George Admin must NOT appear in servants list');
    assert.strictEqual(names.includes('ماريو'), false, 'Mario Admin must NOT appear in servants list');
    assert.strictEqual(names.includes('أنطونيوس مجدي'), true);
  });

  test('2. Ghost Admin Stealth: Querying Admin account by ID returns 404 for non-admins', async () => {
    const res = await fetch(`${baseUrl}/api/v1/accounts/${adminUser.id}`, {
      headers: { Authorization: `Bearer ${genSecToken}` },
    });

    assert.strictEqual(res.status, 404);
    const body = await res.json();
    assert.strictEqual(body.error.code, 'USER_NOT_FOUND');
  });

  test('3. Ghost Admin Stealth: General Secretary querying roles does NOT see the ADMIN role', async () => {
    const res = await fetch(`${baseUrl}/api/v1/accounts/roles`, {
      headers: { Authorization: `Bearer ${genSecToken}` },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    const codes = body.roles.map((r: any) => r.code);
    assert.strictEqual(codes.includes('ADMIN'), false, 'ADMIN role must NOT be visible to General Secretary');
  });

  test('4. Ghost Admin Stealth: Stage Secretary querying servant attendance list does not see Admin accounts', async () => {
    const res = await fetch(`${baseUrl}/api/v1/attendance/servants/list?stageId=stg-prep-boys`, {
      headers: { Authorization: `Bearer ${stageSecToken}` },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    const ids = body.data.map((s: any) => s.id);
    assert.strictEqual(ids.includes(adminUser.id), false, 'Admin user must NOT appear in attendance list');
  });

  test('5. Admin Authorization: Non-admin accessing /api/v1/admin/overview receives 403 ERR_ADMIN_ONLY', async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/overview`, {
      headers: { Authorization: `Bearer ${genSecToken}` },
    });

    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.error.code, 'ERR_ADMIN_ONLY');
  });

  test('6. Admin Command Center: Admin (Level 6) gets full overview and system health', async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(typeof body.stats.totalUsers, 'number');
    assert.strictEqual(body.stats.rolesDistribution.admin, 2);
    assert.strictEqual(body.systemHealth.status, 'HEALTHY');
  });

  test('7. Admin Audit Logs: Admin can fetch activity logs', async () => {
    // Seed an audit log in mockDb
    await mockDb.memberAuditLog.create({
      data: {
        memberId: 'mem-1',
        changedById: genSecUser.id,
        fieldName: 'phoneNumber',
        oldValue: '01000000000',
        newValue: '01011111111',
      },
    });

    const res = await fetch(`${baseUrl}/api/v1/admin/audit-logs`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(Array.isArray(body.logs), true);
    assert.strictEqual(body.logs.length >= 1, true);
    assert.strictEqual(body.logs[0].logType, 'MEMBER_AUDIT');
  });

  test('8. Admin Direct Password Reset: Admin resets password without old password', async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/reset-password`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        targetUserId: servantUser.id,
        newPassword: 'BrandNewServantPassword2026!',
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);

    // Verify servant can login with new password
    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: servantUser.phoneNumber,
        password: 'BrandNewServantPassword2026!',
      }),
    });
    assert.strictEqual(loginRes.status, 200);
    const loginBody = await loginRes.json();
    assert.strictEqual(loginBody.success, true);
  });

  test('9. Admin Accounts Center: Admin can query all accounts including Admins', async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/accounts`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    const names = body.accounts.map((a: any) => a.fullName);
    assert.strictEqual(names.includes('جورج'), true);
    assert.strictEqual(names.includes('ماريو'), true);
    assert.strictEqual(names.includes('أ. رامز شكري'), true);
  });
});
