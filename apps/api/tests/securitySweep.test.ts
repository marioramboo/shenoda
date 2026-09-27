import { test, describe, before, beforeEach, after } from 'node:test';
import assert from 'node:assert';
import { createApp } from '../src/app';
import { setPrismaClient } from '../src/config/prisma';
import { createMockPrisma } from './helpers/mockDb';
import { TokenService } from '../src/services/token.service';
import { redisClient } from '../src/config/redis';
import { Server } from 'http';

describe('Phase 9 — Automated Security, Scope & Hardening Sweep (NFR-3.1–3.4, NFR-4.2)', () => {
  let server: Server;
  let baseUrl: string;
  let mockDb: ReturnType<typeof createMockPrisma>;

  const makeToken = (payload: {
    userId: string;
    roleLevel: number;
    roleCode: string;
    stageIds: string[];
    sectorIds: string[];
  }) => {
    return TokenService.generateAccessToken({
      userId: payload.userId,
      roleLevel: payload.roleLevel,
      roleCode: payload.roleCode,
      orgId: 'org-1',
      stageIds: payload.stageIds,
      sectorIds: payload.sectorIds,
    });
  };

  before(async () => {
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
    mockDb = createMockPrisma();
    setPrismaClient(mockDb as any);
    await redisClient.flushall();

    // Seed mock roles
    mockDb._data.roles.push(
      { id: 'role-servant', code: 'SERVANT', name: 'خادم', level: 1 },
      { id: 'role-assistant', code: 'ASSISTANT_SECRETARY', name: 'مساعد امين الخدمة', level: 2 },
      { id: 'role-stagesec', code: 'STAGE_SECRETARY', name: 'امين الخدمة', level: 3 },
      { id: 'role-sectorsec', code: 'SECTOR_SECRETARY', name: 'امين قطاع', level: 4 },
      { id: 'role-generalsec', code: 'GENERAL_SECRETARY', name: 'امين عام', level: 5 }
    );

    // Seed sectors and stages
    mockDb._data.sectors.push(
      { id: 'sector-youth', organizationId: 'org-1', name: 'قطاع الشباب', code: 'SECTOR_YOUTH' },
      { id: 'sector-children', organizationId: 'org-1', name: 'قطاع الطفولة', code: 'SECTOR_CHILDREN' }
    );

    mockDb._data.stages.push(
      { id: 'stage-prep-boys', sectorId: 'sector-youth', name: 'إعدادي بنين', code: 'PREP_BOYS' },
      { id: 'stage-prep-girls', sectorId: 'sector-youth', name: 'إعدادي بنات', code: 'PREP_GIRLS' },
      { id: 'stage-primary-12', sectorId: 'sector-children', name: 'ابتدائي 1 و 2', code: 'PRIMARY_1_2' }
    );

    // Seed users
    // Servant A (Prep Boys)
    await mockDb.user.create({
      data: {
        id: 'user-servant-a',
        organizationId: 'org-1',
        roleId: 'role-servant',
        fullName: 'خادم أ (بيتر)',
        phoneNumber: '01000000001',
        passwordHash: 'dummy',
      },
    });

    // Stage Secretary (Prep Boys)
    await mockDb.user.create({
      data: {
        id: 'user-stagesec',
        organizationId: 'org-1',
        roleId: 'role-stagesec',
        fullName: 'أمين خدمة (سامح)',
        phoneNumber: '01000000002',
        passwordHash: 'dummy',
      },
    });

    // General Secretary (Level 5)
    await mockDb.user.create({
      data: {
        id: 'user-generalsec',
        organizationId: 'org-1',
        roleId: 'role-generalsec',
        fullName: 'أمين عام (مجدي)',
        phoneNumber: '01000000003',
        passwordHash: 'dummy',
      },
    });

    // Scope assignments
    await mockDb.scopeAssignment.create({
      data: { userId: 'user-servant-a', stageId: 'stage-prep-boys' },
    });
    await mockDb.scopeAssignment.create({
      data: { userId: 'user-stagesec', stageId: 'stage-prep-boys' },
    });

    // Seed Member in Prep Boys
    await mockDb.servedMember.create({
      data: {
        id: 'member-prep-1',
        stageId: 'stage-prep-boys',
        fullName: 'مخدوم إعدادي 1',
        dateOfBirth: new Date('2011-05-10'),
        address: '15 شارع شبرا',
        phoneNumber: '01211111111',
      },
    });

    // Seed Member in Primary 1-2 (Different Sector & Stage)
    await mockDb.servedMember.create({
      data: {
        id: 'member-primary-1',
        stageId: 'stage-primary-12',
        fullName: 'طفل ابتدائي 1',
        dateOfBirth: new Date('2018-02-15'),
        address: '20 شارع الترعة',
        phoneNumber: '01299999999',
      },
    });
  });

  // =========================================================================
  // 1. SCOPE ESCAPE AUDIT (NFR-3.1 & A2/A5)
  // =========================================================================
  describe('1. Scope Escape Penetration Audit', () => {
    test('1.1 Stage Secretary querying unassigned stage attendance receives 403', async () => {
      const token = makeToken({
        userId: 'user-stagesec',
        roleLevel: 3,
        roleCode: 'STAGE_SECRETARY',
        stageIds: ['stage-prep-boys'],
        sectorIds: [],
      });

      // Target unauthorized primary stage
      const res = await fetch(`${baseUrl}/api/v1/attendance/members?stageId=stage-primary-12`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      assert.strictEqual(res.status, 403);
    });

    test('1.2 Servant attempting to author YearPlan receives 403 Forbidden', async () => {
      const token = makeToken({
        userId: 'user-servant-a',
        roleLevel: 1,
        roleCode: 'SERVANT',
        stageIds: ['stage-prep-boys'],
        sectorIds: [],
      });

      const res = await fetch(`${baseUrl}/api/v1/year-plans`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stageId: 'stage-prep-boys',
          theme: 'تدبير السنة الجديدة',
          spiritualGoal: 'النمو في النعمة',
        }),
      });

      assert.strictEqual(res.status, 403);
    });

    test('1.3 Stage Secretary attempting to author announcement targeting superiors is rejected (Upward-Addressing Ban A5)', async () => {
      const token = makeToken({
        userId: 'user-stagesec',
        roleLevel: 3,
        roleCode: 'STAGE_SECRETARY',
        stageIds: ['stage-prep-boys'],
        sectorIds: [],
      });

      // Target General Secretary (Level 5) via specificUserIds
      const res = await fetch(`${baseUrl}/api/v1/announcements`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'بيان موجه للأمانة العامة',
          content: 'نص البيان',
          priority: 'NORMAL',
          specificUserIds: ['user-generalsec'],
        }),
      });

      assert.strictEqual(res.status, 403);
      const body = await res.json();
      assert.strictEqual(body.error.code, 'ERR_UPWARD_ADDRESSING_PROHIBITED');
    });
  });

  // =========================================================================
  // 2. SPIRITUAL PRIVACY FIREWALL SWEEP (NFR-3.4)
  // =========================================================================
  describe('2. Spiritual Privacy Firewall Sweep (NFR-3.4)', () => {
    test('2.1 Non-owner attempting to query another user spiritual life receives 403', async () => {
      const token = makeToken({
        userId: 'user-stagesec',
        roleLevel: 3,
        roleCode: 'STAGE_SECRETARY',
        stageIds: ['stage-prep-boys'],
        sectorIds: [],
      });

      const res = await fetch(`${baseUrl}/api/v1/spiritual-life?userId=user-servant-a`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.error.code, 'ERR_SPIRITUAL_DATA_FIREWALL');
    });

    test('2.2 Analytics endpoint payload strictly excludes all spiritual models', async () => {
      const token = makeToken({
        userId: 'user-stagesec',
        roleLevel: 3,
        roleCode: 'STAGE_SECRETARY',
        stageIds: ['stage-prep-boys'],
        sectorIds: [],
      });

      const res = await fetch(`${baseUrl}/api/v1/analytics/dashboard?stageId=stage-prep-boys`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      const stringified = JSON.stringify(data).toLowerCase();

      assert.strictEqual(stringified.includes('spirituallife'), false);
      assert.strictEqual(stringified.includes('confession'), false);
      assert.strictEqual(stringified.includes('communion'), false);
    });
  });

  // =========================================================================
  // 3. ZERO PUBLIC REGISTRATION ROUTE AUDIT (ASSUMPTION A7)
  // =========================================================================
  describe('3. Zero Public Registration Route Audit (Assumption A7)', () => {
    test('3.1 POST /api/v1/auth/register does NOT exist (404 NOT_FOUND)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: 'مجهول', phoneNumber: '01099999999' }),
      });

      assert.strictEqual(res.status, 404);
    });

    test('3.2 POST /api/register does NOT exist (404 NOT_FOUND)', async () => {
      const res = await fetch(`${baseUrl}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: 'مجهول', phoneNumber: '01099999999' }),
      });

      assert.strictEqual(res.status, 404);
    });
  });

  // =========================================================================
  // 4. RETRY-SAFE IDEMPOTENCY ENGINE (NFR-4.2)
  // =========================================================================
  describe('4. Retry-Safe Idempotency Engine (NFR-4.2)', () => {
    test('4.1 Repeated mutation with identical X-Idempotency-Key returns cached response with HIT header', async () => {
      const token = makeToken({
        userId: 'user-stagesec',
        roleLevel: 3,
        roleCode: 'STAGE_SECRETARY',
        stageIds: ['stage-prep-boys'],
        sectorIds: [],
      });

      const idempotencyKey = 'mobile-retry-uuid-998877';

      // First Request
      const res1 = await fetch(`${baseUrl}/api/v1/announcements`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          title: 'تنبيه هام لاجتماع الجمعة',
          content: 'برجاء الحضور في تمام السادسة مساء بالكاتدرائية',
          priority: 'HIGH',
          targetScopeLevel: 'STAGE',
          targetStageId: 'stage-prep-boys',
        }),
      });

      assert.strictEqual(res1.status, 201);
      const data1 = await res1.json();
      assert.strictEqual(data1.success, true);
      const createdId = data1.data.id;

      // Second Request (Identical retry from mobile device with intermittent signal)
      const res2 = await fetch(`${baseUrl}/api/v1/announcements`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          title: 'تنبيه هام لاجتماع الجمعة',
          content: 'برجاء الحضور في تمام السادسة مساء بالكاتدرائية',
          priority: 'HIGH',
          targetScopeLevel: 'STAGE',
          targetStageId: 'stage-prep-boys',
        }),
      });

      assert.strictEqual(res2.status, 201);
      assert.strictEqual(res2.headers.get('x-cache-lookup'), 'HIT');
      assert.strictEqual(res2.headers.get('x-idempotency-replay'), 'true');
      const data2 = await res2.json();
      assert.strictEqual(data2.data.id, createdId);

      // Verify no duplicate records created in mockDb
      const matchingAnnouncements = mockDb._data.announcements.filter(
        (a) => a.title === 'تنبيه هام لاجتماع الجمعة'
      );
      assert.strictEqual(matchingAnnouncements.length, 1);
    });
  });
});
