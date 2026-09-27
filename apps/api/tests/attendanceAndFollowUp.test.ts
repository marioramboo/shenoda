import { test, describe, before, beforeEach, after } from 'node:test';
import assert from 'node:assert';
import { createApp } from '../src/app';
import { setPrismaClient } from '../src/config/prisma';
import { createMockPrisma } from './helpers/mockDb';
import { TokenService } from '../src/services/token.service';
import {
  ServantSessionType,
  MemberSessionType,
  getAllowedSessionsForRole,
} from '@shenoda/shared';
import { Server } from 'http';

describe('Phase 4 — Attendance & Follow-up (جدول المتابعة) Comprehensive Test Suite', () => {
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

    // Seed sector and stage
    mockDb._data.sectors.push({
      id: 'sector-youth',
      organizationId: 'org-1',
      name: 'قطاع الشباب',
      code: 'SECTOR_YOUTH',
    });

    mockDb._data.stages.push({
      id: 'stage-prep-boys',
      sectorId: 'sector-youth',
      name: 'إعدادي بنين',
      code: 'PREP_BOYS',
    });

    // Seed Users
    // 1. Servant A
    await mockDb.user.create({
      data: {
        id: 'user-servant-a',
        organizationId: 'org-1',
        roleId: 'role-servant',
        fullName: 'خادم بيتر',
        phoneNumber: '01011111111',
        passwordHash: 'dummy',
        status: 'ACTIVE',
      },
    });
    mockDb._data.scopeAssignments.push({
      id: 'sa-servant-a',
      userId: 'user-servant-a',
      stageId: 'stage-prep-boys',
      sectorId: null,
    });

    // 2. Assistant Secretary
    await mockDb.user.create({
      data: {
        id: 'user-assistant-a',
        organizationId: 'org-1',
        roleId: 'role-assistant',
        fullName: 'مساعد كيرلس',
        phoneNumber: '01022222222',
        passwordHash: 'dummy',
        status: 'ACTIVE',
      },
    });
    mockDb._data.scopeAssignments.push({
      id: 'sa-assistant-a',
      userId: 'user-assistant-a',
      stageId: 'stage-prep-boys',
      sectorId: null,
    });

    // 3. Stage Secretary
    await mockDb.user.create({
      data: {
        id: 'user-stagesec-a',
        organizationId: 'org-1',
        roleId: 'role-stagesec',
        fullName: 'أمين خدمة مينا',
        phoneNumber: '01033333333',
        passwordHash: 'dummy',
        status: 'ACTIVE',
      },
    });
    mockDb._data.scopeAssignments.push({
      id: 'sa-stagesec-a',
      userId: 'user-stagesec-a',
      stageId: 'stage-prep-boys',
      sectorId: null,
    });

    // 4. Sector Secretary
    await mockDb.user.create({
      data: {
        id: 'user-sectorsec-a',
        organizationId: 'org-1',
        roleId: 'role-sectorsec',
        fullName: 'أمين قطاع يوسف',
        phoneNumber: '01044444444',
        passwordHash: 'dummy',
        status: 'ACTIVE',
      },
    });
    mockDb._data.scopeAssignments.push({
      id: 'sa-sectorsec-a',
      userId: 'user-sectorsec-a',
      stageId: null,
      sectorId: 'sector-youth',
    });

    // Seed Served Members
    await mockDb.servedMember.create({
      data: {
        id: 'member-1',
        stageId: 'stage-prep-boys',
        fullName: 'مارك أشرف صبحي',
        dateOfBirth: new Date('2012-05-10'),
        address: 'شبرا، القاهرة',
        phoneNumber: '01055555555',
        educationalGrade: 'الصف الأول الإعدادي',
      },
    });

    await mockDb.servedMember.create({
      data: {
        id: 'member-2',
        stageId: 'stage-prep-boys',
        fullName: 'ديفيد عادل فوزي',
        dateOfBirth: new Date('2012-08-20'),
        address: 'شبرا، القاهرة',
        phoneNumber: '01066666666',
        educationalGrade: 'الصف الأول الإعدادي',
      },
    });

    // Assign member-1 to servant-a
    await mockDb.memberServantAssignment.create({
      data: {
        memberId: 'member-1',
        servantUserId: 'user-servant-a',
        assignedById: 'user-stagesec-a',
      },
    });
  });

  // ------------------------------------------------------------------------
  // 1. SELF-ATTENDANCE PREVENTION TESTS (§3.1.2 & FR-4.1)
  // ------------------------------------------------------------------------
  describe('1. Self-Attendance Prevention Tests (§3.1.2 & FR-4.1)', () => {
    test('1.1 Servant A attempts to log attendance for himself -> 403 Forbidden (ERR_CANNOT_SELF_RECORD_ATTENDANCE)', async () => {
      const servantToken = makeToken({
        userId: 'user-servant-a',
        roleLevel: 1,
        roleCode: 'SERVANT',
        stageIds: ['stage-prep-boys'],
        sectorIds: [],
      });

      const res = await fetch(`${baseUrl}/api/v1/attendance/servants/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${servantToken}`,
        },
        body: JSON.stringify({
          sessionType: ServantSessionType.MASS,
          sessionDate: '2026-10-02',
          stageId: 'stage-prep-boys',
          records: [{ servantUserId: 'user-servant-a', status: 'PRESENT' }],
        }),
      });

      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.error.code, 'ERR_CANNOT_SELF_RECORD_ATTENDANCE');
    });

    test('1.2 Stage Secretary can log attendance for Servant A -> 200 OK', async () => {
      const stageSecToken = makeToken({
        userId: 'user-stagesec-a',
        roleLevel: 3,
        roleCode: 'STAGE_SECRETARY',
        stageIds: ['stage-prep-boys'],
        sectorIds: [],
      });

      const res = await fetch(`${baseUrl}/api/v1/attendance/servants/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${stageSecToken}`,
        },
        body: JSON.stringify({
          sessionType: ServantSessionType.MASS,
          sessionDate: '2026-10-02',
          stageId: 'stage-prep-boys',
          records: [{ servantUserId: 'user-servant-a', status: 'PRESENT' }],
        }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.recordedCount, 1);
    });

    test('1.3 Stage Secretary CANNOT log attendance for himself -> 403 ERR_CANNOT_SELF_RECORD_ATTENDANCE', async () => {
      const stageSecToken = makeToken({
        userId: 'user-stagesec-a',
        roleLevel: 3,
        roleCode: 'STAGE_SECRETARY',
        stageIds: ['stage-prep-boys'],
        sectorIds: [],
      });

      const res = await fetch(`${baseUrl}/api/v1/attendance/servants/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${stageSecToken}`,
        },
        body: JSON.stringify({
          sessionType: ServantSessionType.SECRETARIES_MEETING,
          sessionDate: '2026-10-02',
          stageId: 'stage-prep-boys',
          records: [{ servantUserId: 'user-stagesec-a', status: 'PRESENT' }],
        }),
      });

      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.error.code, 'ERR_CANNOT_SELF_RECORD_ATTENDANCE');
    });
  });

  // ------------------------------------------------------------------------
  // 2. ASSUMPTION A4 ENFORCEMENT TESTS
  // ------------------------------------------------------------------------
  describe('2. Assumption A4 Compliance Tests', () => {
    test('2.1 Assistant Secretary role includes ACTIVITIES but omits SECRETARIES_MEETING', () => {
      const assistantSessions = getAllowedSessionsForRole(2);
      assert.strictEqual(assistantSessions.includes(ServantSessionType.ACTIVITIES), true);
      assert.strictEqual(assistantSessions.includes(ServantSessionType.SECRETARIES_MEETING), false);
    });

    test('2.2 Stage Secretary role includes SECRETARIES_MEETING', () => {
      const stageSecSessions = getAllowedSessionsForRole(3);
      assert.strictEqual(stageSecSessions.includes(ServantSessionType.SECRETARIES_MEETING), true);
      assert.strictEqual(stageSecSessions.includes(ServantSessionType.STAGE_SECRETARIES_MEET), false);
    });

    test('2.3 Attempting to submit SECRETARIES_MEETING for Assistant Secretary returns 400 ERR_SESSION_TYPE_NOT_ALLOWED_FOR_ROLE', async () => {
      const stageSecToken = makeToken({
        userId: 'user-stagesec-a',
        roleLevel: 3,
        roleCode: 'STAGE_SECRETARY',
        stageIds: ['stage-prep-boys'],
        sectorIds: [],
      });

      const res = await fetch(`${baseUrl}/api/v1/attendance/servants/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${stageSecToken}`,
        },
        body: JSON.stringify({
          sessionType: ServantSessionType.SECRETARIES_MEETING,
          sessionDate: '2026-10-02',
          stageId: 'stage-prep-boys',
          records: [{ servantUserId: 'user-assistant-a', status: 'PRESENT' }],
        }),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.error.code, 'ERR_SESSION_TYPE_NOT_ALLOWED_FOR_ROLE');
    });
  });

  // ------------------------------------------------------------------------
  // 3. MEMBER BATCH ATTENDANCE & IDEMPOTENCY (FR-4.1, NFR-4.2)
  // ------------------------------------------------------------------------
  describe('3. Member Attendance Batch & Idempotency', () => {
    test('3.1 Stage Secretary successfully submits batch member attendance -> 200 OK', async () => {
      const token = makeToken({
        userId: 'user-stagesec-a',
        roleLevel: 3,
        roleCode: 'STAGE_SECRETARY',
        stageIds: ['stage-prep-boys'],
        sectorIds: [],
      });

      const res = await fetch(`${baseUrl}/api/v1/attendance/members/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          stageId: 'stage-prep-boys',
          sessionType: MemberSessionType.SERVICE_ATTENDANCE,
          sessionDate: '2026-10-02',
          records: [
            { memberId: 'member-1', status: 'PRESENT' },
            { memberId: 'member-2', status: 'ABSENT', notes: 'سفر عائلي' },
          ],
        }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.recordedCount, 2);
    });

    test('3.2 Idempotency header prevents duplicate processing on retry (NFR-4.2)', async () => {
      const token = makeToken({
        userId: 'user-stagesec-a',
        roleLevel: 3,
        roleCode: 'STAGE_SECRETARY',
        stageIds: ['stage-prep-boys'],
        sectorIds: [],
      });

      const idempotencyKey = 'unique-batch-key-12345';

      // First submit
      const res1 = await fetch(`${baseUrl}/api/v1/attendance/members/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          stageId: 'stage-prep-boys',
          sessionType: MemberSessionType.SERVICE_ATTENDANCE,
          sessionDate: '2026-10-09',
          records: [{ memberId: 'member-1', status: 'PRESENT' }],
        }),
      });
      assert.strictEqual(res1.status, 200);

      // Retry submission with same idempotency key
      const res2 = await fetch(`${baseUrl}/api/v1/attendance/members/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          stageId: 'stage-prep-boys',
          sessionType: MemberSessionType.SERVICE_ATTENDANCE,
          sessionDate: '2026-10-09',
          records: [{ memberId: 'member-1', status: 'PRESENT' }],
        }),
      });

      assert.strictEqual(res2.status, 200);
      const data2 = await res2.json();
      assert.strictEqual(data2.idempotentReplay, true);
    });

    test('3.3 Servant CANNOT submit attendance for unassigned member -> 403 FORBIDDEN_SCOPE', async () => {
      const servantToken = makeToken({
        userId: 'user-servant-a',
        roleLevel: 1,
        roleCode: 'SERVANT',
        stageIds: ['stage-prep-boys'],
        sectorIds: [],
      });

      // member-2 is not assigned to servant-a
      const res = await fetch(`${baseUrl}/api/v1/attendance/members/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${servantToken}`,
        },
        body: JSON.stringify({
          stageId: 'stage-prep-boys',
          sessionType: MemberSessionType.SERVICE_ATTENDANCE,
          sessionDate: '2026-10-02',
          records: [{ memberId: 'member-2', status: 'PRESENT' }],
        }),
      });

      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.error.code, 'FORBIDDEN_SCOPE');
    });
  });

  // ------------------------------------------------------------------------
  // 4. CONSECUTIVE ABSENCE ALERT THRESHOLD & AUTO-RESOLUTION (FR-4.3 & FR-11.1)
  // ------------------------------------------------------------------------
  describe('4. Consecutive Absence Alert Pipeline (FR-4.3 & FR-11.1)', () => {
    test('4.1 Member missing 2 consecutive sessions generates active AbsenceAlert assigned to servant', async () => {
      const token = makeToken({
        userId: 'user-stagesec-a',
        roleLevel: 3,
        roleCode: 'STAGE_SECRETARY',
        stageIds: ['stage-prep-boys'],
        sectorIds: [],
      });

      // Week 1: Absent
      await fetch(`${baseUrl}/api/v1/attendance/members/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          stageId: 'stage-prep-boys',
          sessionType: MemberSessionType.SERVICE_ATTENDANCE,
          sessionDate: '2026-09-18',
          records: [{ memberId: 'member-1', status: 'ABSENT' }],
        }),
      });

      // Week 2: Absent -> Threshold 2 reached!
      const res2 = await fetch(`${baseUrl}/api/v1/attendance/members/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          stageId: 'stage-prep-boys',
          sessionType: MemberSessionType.SERVICE_ATTENDANCE,
          sessionDate: '2026-09-25',
          records: [{ memberId: 'member-1', status: 'ABSENT' }],
        }),
      });

      assert.strictEqual(res2.status, 200);

      // Verify active alert exists in DB
      const alerts = mockDb._data.absenceAlerts.filter(
        (a) => a.memberId === 'member-1' && a.alertStatus === 'ACTIVE'
      );
      assert.strictEqual(alerts.length, 1);
      assert.strictEqual(alerts[0].consecutiveCount, 2);
      assert.strictEqual(alerts[0].assignedFollowUpId, 'user-servant-a'); // Assigned to member's servant!
    });

    test('4.2 Future attendance (PRESENT) automatically resolves the active alert', async () => {
      // Seed existing active alert for member-1
      await mockDb.absenceAlert.create({
        data: {
          targetType: 'MEMBER',
          memberId: 'member-1',
          stageId: 'stage-prep-boys',
          consecutiveCount: 2,
          alertStatus: 'ACTIVE',
          assignedFollowUpId: 'user-servant-a',
        },
      });

      const token = makeToken({
        userId: 'user-stagesec-a',
        roleLevel: 3,
        roleCode: 'STAGE_SECRETARY',
        stageIds: ['stage-prep-boys'],
        sectorIds: [],
      });

      // Week 3: Member attends (PRESENT)
      const res = await fetch(`${baseUrl}/api/v1/attendance/members/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          stageId: 'stage-prep-boys',
          sessionType: MemberSessionType.SERVICE_ATTENDANCE,
          sessionDate: '2026-10-02',
          records: [{ memberId: 'member-1', status: 'PRESENT' }],
        }),
      });

      assert.strictEqual(res.status, 200);

      const alert = mockDb._data.absenceAlerts.find((a) => a.memberId === 'member-1');
      assert.strictEqual(alert?.alertStatus, 'RESOLVED');
      assert.notStrictEqual(alert?.resolvedAt, null);
    });
  });

  // ------------------------------------------------------------------------
  // 5. ROLLING ATTENDANCE AGGREGATION & ALERTS API
  // ------------------------------------------------------------------------
  describe('5. Analytics and Alerts API (FR-4.2 & FR-4.3)', () => {
    test('5.1 GET /api/v1/attendance/members/:id/stats returns 4, 8, 12 week rolling summaries', async () => {
      const token = makeToken({
        userId: 'user-stagesec-a',
        roleLevel: 3,
        roleCode: 'STAGE_SECRETARY',
        stageIds: ['stage-prep-boys'],
        sectorIds: [],
      });

      const res = await fetch(`${baseUrl}/api/v1/attendance/members/member-1/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.data.week4);
      assert.ok(data.data.week8);
      assert.ok(data.data.week12);
    });

    test('5.2 Manual Alert Resolution via PATCH /api/v1/attendance/alerts/:id/resolve', async () => {
      // Create manual alert
      const alert = await mockDb.absenceAlert.create({
        data: {
          targetType: 'MEMBER',
          memberId: 'member-2',
          stageId: 'stage-prep-boys',
          consecutiveCount: 3,
          alertStatus: 'ACTIVE',
          assignedFollowUpId: 'user-servant-a',
        },
      });

      const token = makeToken({
        userId: 'user-servant-a',
        roleLevel: 1,
        roleCode: 'SERVANT',
        stageIds: ['stage-prep-boys'],
        sectorIds: [],
      });

      const res = await fetch(`${baseUrl}/api/v1/attendance/alerts/${alert.id}/resolve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          resolutionNotes: 'تم الافتقاد المنزلي وسيحضر الأسبوع القادم',
        }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.data.alertStatus, 'RESOLVED');
      assert.strictEqual(data.data.resolutionNotes, 'تم الافتقاد المنزلي وسيحضر الأسبوع القادم');
    });

    test('5.3 Servant can view their own follow-up history via GET /api/v1/attendance/servants/history', async () => {
      const servantToken = makeToken({
        userId: 'user-servant-a',
        roleLevel: 1,
        roleCode: 'SERVANT',
        stageIds: ['stage-prep-boys'],
        sectorIds: [],
      });

      const res = await fetch(`${baseUrl}/api/v1/attendance/servants/history`, {
        headers: { Authorization: `Bearer ${servantToken}` },
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.servantUserId, 'user-servant-a');
      assert.ok(Array.isArray(data.data.records));
      assert.ok(data.data.stats);
    });
  });
});
