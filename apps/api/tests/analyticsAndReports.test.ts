import { test, describe, before, beforeEach, after } from 'node:test';
import assert from 'node:assert';
import { createApp } from '../src/app';
import { setPrismaClient } from '../src/config/prisma';
import { createMockPrisma } from './helpers/mockDb';
import { TokenService } from '../src/services/token.service';
import { assertNoSpiritualDataInPayload } from '../src/services/analytics/securityAssert';
import { SensitiveField, AccessType } from '@prisma/client';
import { Server } from 'http';

describe('Phase 8 — Analytics, Reports & Export Comprehensive Test Suite', () => {
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

    // Assistant Secretary (Prep Boys)
    await mockDb.user.create({
      data: {
        id: 'user-assistant',
        organizationId: 'org-1',
        roleId: 'role-assistant',
        fullName: 'مساعد أ (مارك)',
        phoneNumber: '01000000002',
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
        phoneNumber: '01000000003',
        passwordHash: 'dummy',
      },
    });

    // Sector Secretary (Youth Sector)
    await mockDb.user.create({
      data: {
        id: 'user-sectorsec',
        organizationId: 'org-1',
        roleId: 'role-sectorsec',
        fullName: 'أمين قطاع (نادر)',
        phoneNumber: '01000000004',
        passwordHash: 'dummy',
      },
    });

    // General Secretary
    await mockDb.user.create({
      data: {
        id: 'user-generalsec',
        organizationId: 'org-1',
        roleId: 'role-generalsec',
        fullName: 'أمين عام (مجدي)',
        phoneNumber: '01000000005',
        passwordHash: 'dummy',
      },
    });

    // Scope assignments
    await mockDb.scopeAssignment.create({
      data: { userId: 'user-servant-a', stageId: 'stage-prep-boys' },
    });
    await mockDb.scopeAssignment.create({
      data: { userId: 'user-assistant', stageId: 'stage-prep-boys' },
    });
    await mockDb.scopeAssignment.create({
      data: { userId: 'user-stagesec', stageId: 'stage-prep-boys' },
    });
    await mockDb.scopeAssignment.create({
      data: { userId: 'user-sectorsec', sectorId: 'sector-youth' },
    });

    // Seed Members in stage-prep-boys
    for (let i = 1; i <= 5; i++) {
      await mockDb.servedMember.create({
        data: {
          id: `member-${i}`,
          stageId: 'stage-prep-boys',
          fullName: `مخدوم تجريبي ${i}`,
          dateOfBirth: new Date('2011-05-10'),
          address: `شارع ${i}، شبرا`,
          phoneNumber: `0120000000${i}`,
          financialStatus: 'متوسط',
          behaviorInService: 'ممتاز',
          peerIntegration: 'متعاون',
        },
      });
    }

    // Seed Member in stage-primary-12
    await mockDb.servedMember.create({
      data: {
        id: 'member-child-1',
        stageId: 'stage-primary-12',
        fullName: 'طفل تجريبي 1',
        dateOfBirth: new Date('2017-02-15'),
        address: 'شارع السلام',
        phoneNumber: '01299999999',
      },
    });

    // Seed Member Attendance
    await mockDb.memberAttendance.create({
      data: {
        memberId: 'member-1',
        stageId: 'stage-prep-boys',
        sessionType: 'MASS',
        sessionDate: new Date('2026-09-18'),
        status: 'PRESENT',
        recordedById: 'user-stagesec',
      },
    });
    await mockDb.memberAttendance.create({
      data: {
        memberId: 'member-1',
        stageId: 'stage-prep-boys',
        sessionType: 'SERVICE_ATTENDANCE',
        sessionDate: new Date('2026-09-18'),
        status: 'PRESENT',
        recordedById: 'user-stagesec',
      },
    });
    await mockDb.memberAttendance.create({
      data: {
        memberId: 'member-2',
        stageId: 'stage-prep-boys',
        sessionType: 'MASS',
        sessionDate: new Date('2026-09-18'),
        status: 'ABSENT',
        recordedById: 'user-stagesec',
      },
    });

    // Seed Absence Alerts
    await mockDb.absenceAlert.create({
      data: {
        targetType: 'MEMBER',
        memberId: 'member-2',
        stageId: 'stage-prep-boys',
        consecutiveCount: 3,
        alertStatus: 'ACTIVE',
      },
    });

    // Seed Lesson Preparations
    await mockDb.lessonPreparation.create({
      data: {
        authorUserId: 'user-servant-a',
        stageId: 'stage-prep-boys',
        lessonDate: new Date('2026-09-18'),
        title: 'درس التوبة والنقاء',
        content: 'محتوى الدرس الإعدادي',
        status: 'APPROVED',
      },
    });
  });

  // =========================================================================
  // SECTION 1: The Spiritual Data Blacklist Firewall (NFR-3.4)
  // =========================================================================
  describe('1. The Spiritual Data Blacklist Firewall (NFR-3.4)', () => {
    test('1.1 Security Assert throws ERR_SPIRITUAL_DATA_FIREWALL on spiritual keywords', () => {
      const forbiddenPayloads = [
        { title: 'Report', spiritualLifeEntries: [{ id: '1' }] },
        { title: 'Report', sacrament: 'CONFESSION' },
        { title: 'Report', communionCount: 5 },
        { title: 'Report', note: 'confession note' },
      ];

      for (const payload of forbiddenPayloads) {
        assert.throws(
          () => assertNoSpiritualDataInPayload(payload),
          (err: any) => {
            return (
              err.code === 'ERR_SPIRITUAL_DATA_FIREWALL' &&
              (err.status === 500 || err.statusCode === 500)
            );
          },
          `Expected payload with spiritual data to be rejected by firewall`
        );
      }
    });

    test('1.2 Security Assert allows pure administrative and attendance payloads', () => {
      const cleanPayload = {
        stageId: 'stage-prep-boys',
        stageName: 'إعدادي بنين',
        activeMembersCount: 45,
        attendanceRate: 85,
        preparationComplianceRate: 92,
        outstandingAlertsCount: 3,
        trends: [{ date: '2026-09-18', massPresent: 40, sundaySchoolPresent: 38 }],
      };

      assert.doesNotThrow(() => assertNoSpiritualDataInPayload(cleanPayload));
    });

    test('1.3 GET /api/v1/analytics/dashboard response payload contains NO spiritual keys', async () => {
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
      assert.strictEqual(data.success, true);

      // Verify NFR-3.4 firewall verification succeeded
      assert.doesNotThrow(() => assertNoSpiritualDataInPayload(data.data));

      const rawJson = JSON.stringify(data.data).toLowerCase();
      assert.strictEqual(rawJson.includes('spirituallife'), false);
      assert.strictEqual(rawJson.includes('confession'), false);
      assert.strictEqual(rawJson.includes('communion'), false);
    });
  });

  // =========================================================================
  // SECTION 2: Tier-Scoped Analytics Dashboards (FR-13.1)
  // =========================================================================
  describe('2. Tier-Scoped Analytics Dashboards (FR-13.1)', () => {
    test('2.1 Stage Secretary sees own stage analytics metrics and absence funnel', async () => {
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
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.targetStageId, 'stage-prep-boys');
      assert.strictEqual(body.data.metrics.activeMembersCount, 5);
      assert.ok(typeof body.data.metrics.averageAttendanceRate === 'number');
      assert.ok(typeof body.data.metrics.prepComplianceRate === 'number');
      assert.strictEqual(body.data.metrics.outstandingAbsenceAlerts, 1);
      assert.ok(body.data.absenceFunnel);
      assert.ok(Array.isArray(body.data.attendanceTrends));
    });

    test('2.2 Stage Secretary querying outside their scope is rejected (403 ERR_SCOPE_MISMATCH)', async () => {
      const token = makeToken({
        userId: 'user-stagesec',
        roleLevel: 3,
        roleCode: 'STAGE_SECRETARY',
        stageIds: ['stage-prep-boys'],
        sectorIds: [],
      });

      // Attempt to access stage-primary-12
      const res = await fetch(`${baseUrl}/api/v1/analytics/dashboard?stageId=stage-primary-12`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      assert.strictEqual(res.status, 403);
      const body = await res.json();
      assert.strictEqual(body.error.code, 'ERR_SCOPE_MISMATCH');
    });

    test('2.3 Sector Secretary receives comparative matrix of stages in their sector', async () => {
      const token = makeToken({
        userId: 'user-sectorsec',
        roleLevel: 4,
        roleCode: 'SECTOR_SECRETARY',
        stageIds: [],
        sectorIds: ['sector-youth'],
      });

      const res = await fetch(`${baseUrl}/api/v1/analytics/dashboard?stageId=stage-prep-boys`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.ok(body.data.stageComparisons);
      assert.ok(Array.isArray(body.data.stageComparisons));
      // Should include prep-boys and prep-girls
      assert.ok(body.data.stageComparisons.some((s: any) => s.stageId === 'stage-prep-boys'));
    });

    test('2.4 General Secretary (Level 5) can query any stage', async () => {
      const token = makeToken({
        userId: 'user-generalsec',
        roleLevel: 5,
        roleCode: 'GENERAL_SECRETARY',
        stageIds: [],
        sectorIds: [],
      });

      const res = await fetch(`${baseUrl}/api/v1/analytics/dashboard?stageId=stage-primary-12`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.targetStageId, 'stage-primary-12');
      assert.strictEqual(body.data.metrics.activeMembersCount, 1);
    });
  });

  // =========================================================================
  // SECTION 3: Formal PDF & Excel Reports & Audit Logging (FR-14.1, FR-14.2)
  // =========================================================================
  describe('3. Formal PDF & Excel Reports & Audit Logging (FR-14.1, FR-14.2)', () => {
    test('3.1 Export Member Dossier PDF returns valid binary and logs sensitive access audit', async () => {
      const token = makeToken({
        userId: 'user-stagesec',
        roleLevel: 3,
        roleCode: 'STAGE_SECRETARY',
        stageIds: ['stage-prep-boys'],
        sectorIds: [],
      });

      const res = await fetch(`${baseUrl}/api/v1/reports/pdf/member-dossier/member-1`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers.get('content-type'), 'application/pdf');
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      assert.ok(buffer.length > 50, 'PDF buffer should not be empty');
      // PDF files start with %PDF
      assert.strictEqual(buffer.toString('utf-8', 0, 4), '%PDF');

      // Verify sensitive access log was recorded (FR-14.2 & NFR-3.3)
      const logs = mockDb._data.sensitiveAccessLogs.filter(
        (l) => l.memberId === 'member-1' && l.accessType === AccessType.EXPORT
      );
      assert.ok(logs.length >= 1, 'Should have logged sensitive export access');
      assert.ok(logs.some((l) => l.field === SensitiveField.FINANCIAL_STATUS));
    });

    test('3.2 Export Stage Summary PDF returns valid PDF binary', async () => {
      const token = makeToken({
        userId: 'user-stagesec',
        roleLevel: 3,
        roleCode: 'STAGE_SECRETARY',
        stageIds: ['stage-prep-boys'],
        sectorIds: [],
      });

      const res = await fetch(`${baseUrl}/api/v1/reports/pdf/stage-summary`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stageId: 'stage-prep-boys' }),
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers.get('content-type'), 'application/pdf');
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      assert.ok(buffer.length > 50);
      assert.strictEqual(buffer.toString('utf-8', 0, 4), '%PDF');
    });

    test('3.3 Export Stage Attendance Excel returns valid xlsx binary and logs export audit', async () => {
      const token = makeToken({
        userId: 'user-stagesec',
        roleLevel: 3,
        roleCode: 'STAGE_SECRETARY',
        stageIds: ['stage-prep-boys'],
        sectorIds: [],
      });

      const res = await fetch(`${baseUrl}/api/v1/reports/excel/stage-attendance`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stageId: 'stage-prep-boys' }),
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(
        res.headers.get('content-type'),
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      assert.ok(buffer.length > 100);
      // Excel (ZIP) files start with PK (0x50, 0x4B)
      assert.strictEqual(buffer[0], 0x50);
      assert.strictEqual(buffer[1], 0x4b);

      // Verify audit log
      const exportLogs = mockDb._data.sensitiveAccessLogs.filter(
        (l) => l.accessType === AccessType.EXPORT && l.userId === 'user-stagesec'
      );
      assert.ok(exportLogs.length >= 1, 'Should have logged export access');
    });

    test('3.4 Export Stage Roster Excel logs multiple sensitive fields when includeSensitive is requested', async () => {
      const token = makeToken({
        userId: 'user-assistant',
        roleLevel: 2,
        roleCode: 'ASSISTANT_SECRETARY',
        stageIds: ['stage-prep-boys'],
        sectorIds: [],
      });

      const initialCount = mockDb._data.sensitiveAccessLogs.length;

      const res = await fetch(`${baseUrl}/api/v1/reports/excel/stage-roster`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stageId: 'stage-prep-boys',
          includeSensitive: true,
        }),
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(
        res.headers.get('content-type'),
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );

      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      assert.ok(buffer.length > 100);
      assert.strictEqual(buffer[0], 0x50);
      assert.strictEqual(buffer[1], 0x4b);

      // Verify sensitive access logged for financial status and phone number
      const newLogs = mockDb._data.sensitiveAccessLogs.slice(initialCount);
      assert.ok(newLogs.some((l) => l.field === SensitiveField.FINANCIAL_STATUS));
      assert.ok(newLogs.some((l) => l.field === SensitiveField.PHONE_NUMBER));
    });
  });
});
