import { test, describe, before, beforeEach, after } from 'node:test';
import assert from 'node:assert';
import { createApp } from '../src/app';
import { setPrismaClient } from '../src/config/prisma';
import { createMockPrisma } from './helpers/mockDb';
import { TokenService } from '../src/services/token.service';
import { Server } from 'http';

describe('Phase 5 — Servant Self-Service: تحضير & Spiritual Life Comprehensive Test Suite', () => {
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
    mockDb._data.sectors.push({
      id: 'sector-youth',
      organizationId: 'org-1',
      name: 'قطاع الشباب',
      code: 'SECTOR_YOUTH',
    });

    mockDb._data.stages.push(
      {
        id: 'stage-prep-boys',
        sectorId: 'sector-youth',
        name: 'إعدادي بنين',
        code: 'PREP_BOYS',
      },
      {
        id: 'stage-prep-girls',
        sectorId: 'sector-youth',
        name: 'إعدادي بنات',
        code: 'PREP_GIRLS',
      }
    );

    // Seed Users
    // 1. Servant A (Prep Boys)
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

    // 2. Servant B (Prep Boys - peer)
    await mockDb.user.create({
      data: {
        id: 'user-servant-b',
        organizationId: 'org-1',
        roleId: 'role-servant',
        fullName: 'خادم مينا',
        phoneNumber: '01022222222',
        passwordHash: 'dummy',
        status: 'ACTIVE',
      },
    });
    mockDb._data.scopeAssignments.push({
      id: 'sa-servant-b',
      userId: 'user-servant-b',
      stageId: 'stage-prep-boys',
      sectorId: null,
    });

    // 3. Stage Secretary (Prep Boys)
    await mockDb.user.create({
      data: {
        id: 'user-stagesec-boys',
        organizationId: 'org-1',
        roleId: 'role-stagesec',
        fullName: 'أمين خدمة بنين',
        phoneNumber: '01033333333',
        passwordHash: 'dummy',
        status: 'ACTIVE',
      },
    });
    mockDb._data.scopeAssignments.push({
      id: 'sa-stagesec-boys',
      userId: 'user-stagesec-boys',
      stageId: 'stage-prep-boys',
      sectorId: null,
    });

    // 4. Stage Secretary (Prep Girls - other stage)
    await mockDb.user.create({
      data: {
        id: 'user-stagesec-girls',
        organizationId: 'org-1',
        roleId: 'role-stagesec',
        fullName: 'أمينة خدمة بنات',
        phoneNumber: '01044444444',
        passwordHash: 'dummy',
        status: 'ACTIVE',
      },
    });
    mockDb._data.scopeAssignments.push({
      id: 'sa-stagesec-girls',
      userId: 'user-stagesec-girls',
      stageId: 'stage-prep-girls',
      sectorId: null,
    });

    // 5. General Secretary (Level 5)
    await mockDb.user.create({
      data: {
        id: 'user-generalsec',
        organizationId: 'org-1',
        roleId: 'role-generalsec',
        fullName: 'أمين عام الخدمة',
        phoneNumber: '01055555555',
        passwordHash: 'dummy',
        status: 'ACTIVE',
      },
    });
    mockDb._data.scopeAssignments.push({
      id: 'sa-generalsec',
      userId: 'user-generalsec',
      stageId: null,
      sectorId: null,
    });

    // 6. Sector Secretary (Level 4 - Youth Sector)
    await mockDb.user.create({
      data: {
        id: 'user-sectorsec-youth',
        organizationId: 'org-1',
        roleId: 'role-sectorsec',
        fullName: 'أمين قطاع الشباب',
        phoneNumber: '01066666666',
        passwordHash: 'dummy',
        status: 'ACTIVE',
      },
    });
    mockDb._data.scopeAssignments.push({
      id: 'sa-sectorsec-youth',
      userId: 'user-sectorsec-youth',
      stageId: null,
      sectorId: 'sector-youth',
    });

    // Seed Member for Servant A
    await mockDb.servedMember.create({
      data: {
        id: 'member-101',
        stageId: 'stage-prep-boys',
        fullName: 'كيرلس عماد',
        dateOfBirth: new Date('2012-01-01'),
        address: 'القاهرة',
        phoneNumber: '01099999999',
      },
    });
    await mockDb.memberServantAssignment.create({
      data: {
        memberId: 'member-101',
        servantUserId: 'user-servant-a',
        assignedById: 'user-stagesec-boys',
      },
    });
  });

  // ------------------------------------------------------------------------
  // 1. LESSON PREPARATION SCOPE & REVIEW TESTS (FR-5.1 & FR-5.2)
  // ------------------------------------------------------------------------
  describe('1. Lesson Preparation Scoping & Review (FR-5.1 & FR-5.2)', () => {
    test('1.1 Servant A submits a lesson preparation -> 201 Created', async () => {
      const token = makeToken({
        userId: 'user-servant-a',
        roleLevel: 1,
        roleCode: 'SERVANT',
        stageIds: ['stage-prep-boys'],
        sectorIds: [],
      });

      const res = await fetch(`${baseUrl}/api/v1/preparations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          stageId: 'stage-prep-boys',
          lessonDate: '2026-10-09',
          title: 'دعوة إبراهيم وطاعته',
          scriptureRef: 'تكوين 12: 1-9',
          mainObjective: 'أن يتعلم المخدوم أهمية الثقة في مواعيد الله',
          content: 'مقدمة الدرس: مناقشة مفهوم الإيمان...',
          attachments: [
            {
              url: '/uploads/preparations/activity.pdf',
              fileName: 'نشاط_الدرس.pdf',
              fileType: 'application/pdf',
              sizeBytes: 102400,
            },
          ],
        }),
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.title, 'دعوة إبراهيم وطاعته');
      assert.strictEqual(data.data.authorUserId, 'user-servant-a');
    });

    test('1.2 Fellow Servant B queries preps -> Cannot see Servant A preparation', async () => {
      // Create prep by Servant A
      await mockDb.lessonPreparation.create({
        data: {
          authorUserId: 'user-servant-a',
          stageId: 'stage-prep-boys',
          lessonDate: new Date('2026-10-09'),
          title: 'درس خاص بالخادم أ',
          content: 'المحتوى...',
        },
      });

      // Servant B queries
      const tokenB = makeToken({
        userId: 'user-servant-b',
        roleLevel: 1,
        roleCode: 'SERVANT',
        stageIds: ['stage-prep-boys'],
        sectorIds: [],
      });

      const res = await fetch(`${baseUrl}/api/v1/preparations`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.data.length, 0); // Servant B sees 0 preps (only his own)
    });

    test('1.3 Stage Secretary of Prep Boys can review Servant A preparation -> 200 OK', async () => {
      const prep = await mockDb.lessonPreparation.create({
        data: {
          authorUserId: 'user-servant-a',
          stageId: 'stage-prep-boys',
          lessonDate: new Date('2026-10-09'),
          title: 'درس إبراهيم',
          content: 'محتوى الدرس...',
        },
      });

      const supervisorToken = makeToken({
        userId: 'user-stagesec-boys',
        roleLevel: 3,
        roleCode: 'STAGE_SECRETARY',
        stageIds: ['stage-prep-boys'],
        sectorIds: [],
      });

      // Review and add feedback
      const patchRes = await fetch(`${baseUrl}/api/v1/preparations/${prep.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supervisorToken}`,
        },
        body: JSON.stringify({
          reviewerNotes: 'تحضير ممتاز ومرتب، يرجى التركيز على التطبيق العملي',
          status: 'REVIEWED',
        }),
      });

      assert.strictEqual(patchRes.status, 200);
      const patchData = await patchRes.json();
      assert.strictEqual(patchData.data.status, 'REVIEWED');
      assert.strictEqual(
        patchData.data.reviewerNotes,
        'تحضير ممتاز ومرتب، يرجى التركيز على التطبيق العملي'
      );
      assert.strictEqual(patchData.data.reviewedById, 'user-stagesec-boys');
    });

    test('1.4 Stage Secretary of Prep Girls CANNOT access Prep Boys preparation -> 403 Forbidden', async () => {
      const prep = await mockDb.lessonPreparation.create({
        data: {
          authorUserId: 'user-servant-a',
          stageId: 'stage-prep-boys',
          lessonDate: new Date('2026-10-09'),
          title: 'درس بنين',
          content: 'محتوى...',
        },
      });

      const otherStageToken = makeToken({
        userId: 'user-stagesec-girls',
        roleLevel: 3,
        roleCode: 'STAGE_SECRETARY',
        stageIds: ['stage-prep-girls'],
        sectorIds: [],
      });

      const res = await fetch(`${baseUrl}/api/v1/preparations/${prep.id}`, {
        headers: { Authorization: `Bearer ${otherStageToken}` },
      });

      assert.strictEqual(res.status, 403);
    });

    test('1.5 Stage Secretary can reject preparation with feedback returning status to DRAFT -> 200 OK', async () => {
      const prep = await mockDb.lessonPreparation.create({
        data: {
          authorUserId: 'user-servant-a',
          stageId: 'stage-prep-boys',
          lessonDate: new Date('2026-10-16'),
          title: 'درس يوسف الصديق',
          content: 'مسودة تحتاج تفاصيل إضافية...',
          status: 'SUBMITTED',
        },
      });

      const supervisorToken = makeToken({
        userId: 'user-stagesec-boys',
        roleLevel: 3,
        roleCode: 'STAGE_SECRETARY',
        stageIds: ['stage-prep-boys'],
        sectorIds: [],
      });

      const patchRes = await fetch(`${baseUrl}/api/v1/preparations/${prep.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supervisorToken}`,
        },
        body: JSON.stringify({
          reviewerNotes: 'يرجى مراجعة وتعديل الشواهد الكتابية وإعادة تقديم الدرس',
          status: 'DRAFT',
        }),
      });

      assert.strictEqual(patchRes.status, 200);
      const patchData = await patchRes.json();
      assert.strictEqual(patchData.data.status, 'DRAFT');
      assert.strictEqual(
        patchData.data.reviewerNotes,
        'يرجى مراجعة وتعديل الشواهد الكتابية وإعادة تقديم الدرس'
      );
      assert.strictEqual(patchData.data.reviewedById, 'user-stagesec-boys');
    });

    test('1.6 Stage Secretary CANNOT approve/review their own preparation -> 403 ERR_CANNOT_SELF_REVIEW', async () => {
      const prep = await mockDb.lessonPreparation.create({
        data: {
          authorUserId: 'user-stagesec-boys',
          stageId: 'stage-prep-boys',
          lessonDate: new Date('2026-10-23'),
          title: 'درس أمين الخدمة',
          content: 'محتوى درس ألقاه أمين الخدمة بنفسه...',
          status: 'SUBMITTED',
        },
      });

      const stageSecToken = makeToken({
        userId: 'user-stagesec-boys',
        roleLevel: 3,
        roleCode: 'STAGE_SECRETARY',
        stageIds: ['stage-prep-boys'],
        sectorIds: [],
      });

      const patchRes = await fetch(`${baseUrl}/api/v1/preparations/${prep.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${stageSecToken}`,
        },
        body: JSON.stringify({
          status: 'REVIEWED',
          reviewerNotes: 'محاولة اعتماد ذاتي',
        }),
      });

      assert.strictEqual(patchRes.status, 403);
      const data = await patchRes.json();
      assert.strictEqual(data.error.code, 'ERR_CANNOT_SELF_REVIEW');
    });

    test('1.7 Sector Secretary CAN approve Stage Secretary preparation -> 200 OK with reviewer metadata', async () => {
      const prep = await mockDb.lessonPreparation.create({
        data: {
          authorUserId: 'user-stagesec-boys',
          stageId: 'stage-prep-boys',
          lessonDate: new Date('2026-10-30'),
          title: 'درس متقدم لأمين الخدمة',
          content: 'تحضير أمين الخدمة المكتمل...',
          status: 'SUBMITTED',
        },
      });

      const sectorSecToken = makeToken({
        userId: 'user-sectorsec-youth',
        roleLevel: 4,
        roleCode: 'SECTOR_SECRETARY',
        stageIds: [],
        sectorIds: ['sector-youth'],
      });

      const patchRes = await fetch(`${baseUrl}/api/v1/preparations/${prep.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sectorSecToken}`,
        },
        body: JSON.stringify({
          status: 'REVIEWED',
          reviewerNotes: 'معتمد ومقبول من أمانة القطاع',
        }),
      });

      assert.strictEqual(patchRes.status, 200);
      const data = await patchRes.json();
      assert.strictEqual(data.data.status, 'REVIEWED');
      assert.strictEqual(data.data.reviewedById, 'user-sectorsec-youth');
      assert.strictEqual(data.data.reviewedByName, 'أمين قطاع الشباب');
      assert.strictEqual(data.data.reviewedByRole, 'امين قطاع');
      assert.strictEqual(data.data.reviewedByLevel, 4);
    });

    test('1.8 Stage Secretary CANNOT override Sector Secretary approval/rejection -> 403 ERR_SUPERVISOR_OVERRIDE_PROHIBITED', async () => {
      // First, Sector Secretary approves a servant preparation
      const prep = await mockDb.lessonPreparation.create({
        data: {
          authorUserId: 'user-servant-a',
          stageId: 'stage-prep-boys',
          lessonDate: new Date('2026-11-06'),
          title: 'درس الخادم المعتمد قطاعياً',
          content: 'محتوى الدرس...',
          status: 'SUBMITTED',
        },
      });

      const sectorSecToken = makeToken({
        userId: 'user-sectorsec-youth',
        roleLevel: 4,
        roleCode: 'SECTOR_SECRETARY',
        stageIds: [],
        sectorIds: ['sector-youth'],
      });

      await fetch(`${baseUrl}/api/v1/preparations/${prep.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sectorSecToken}`,
        },
        body: JSON.stringify({
          status: 'REVIEWED',
          reviewerNotes: 'معتمد من أمين القطاع مباشرة',
        }),
      });

      // Now Stage Secretary tries to override it to DRAFT
      const stageSecToken = makeToken({
        userId: 'user-stagesec-boys',
        roleLevel: 3,
        roleCode: 'STAGE_SECRETARY',
        stageIds: ['stage-prep-boys'],
        sectorIds: [],
      });

      const overrideRes = await fetch(`${baseUrl}/api/v1/preparations/${prep.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${stageSecToken}`,
        },
        body: JSON.stringify({
          status: 'DRAFT',
          reviewerNotes: 'محاولة تعديل قرار أمين القطاع',
        }),
      });

      assert.strictEqual(overrideRes.status, 403);
      const data = await overrideRes.json();
      assert.strictEqual(data.error.code, 'ERR_SUPERVISOR_OVERRIDE_PROHIBITED');
    });

    test('1.9 Sector Secretary CANNOT review preparation in an unassigned sector -> 403 FORBIDDEN_SECTOR_SCOPE', async () => {
      const prep = await mockDb.lessonPreparation.create({
        data: {
          authorUserId: 'user-servant-a',
          stageId: 'stage-prep-boys',
          lessonDate: new Date('2026-11-13'),
          title: 'درس في قطاع الشباب',
          content: 'محتوى...',
          status: 'SUBMITTED',
        },
      });

      // A sector secretary assigned to a DIFFERENT sector (e.g. sector-children)
      const foreignSectorSecToken = makeToken({
        userId: 'user-sectorsec-foreign',
        roleLevel: 4,
        roleCode: 'SECTOR_SECRETARY',
        stageIds: [],
        sectorIds: ['sector-children'],
      });

      const patchRes = await fetch(`${baseUrl}/api/v1/preparations/${prep.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${foreignSectorSecToken}`,
        },
        body: JSON.stringify({
          status: 'REVIEWED',
        }),
      });

      assert.strictEqual(patchRes.status, 403);
      const data = await patchRes.json();
      assert.strictEqual(data.error.code, 'FORBIDDEN_SECTOR_SCOPE');
    });
  });

  // ------------------------------------------------------------------------
  // 2. THE ABSOLUTE PRIVACY FIREWALL TESTS (FR-6.2 & NFR-3.4)
  // ------------------------------------------------------------------------
  describe('2. The Absolute Privacy Firewall (NFR-3.4 & FR-6.2)', () => {
    test('2.1 Servant A logs a personal sacrament entry -> 201 Created', async () => {
      const token = makeToken({
        userId: 'user-servant-a',
        roleLevel: 1,
        roleCode: 'SERVANT',
        stageIds: ['stage-prep-boys'],
        sectorIds: [],
      });

      const res = await fetch(`${baseUrl}/api/v1/spiritual-life`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sacrament: 'COMMUNION',
          entryDate: '2026-09-27',
          fatherName: 'أبونا مرقس',
          notes: 'قداس الأحد بكنيسة مارجرجس',
        }),
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.userId, 'user-servant-a');
      assert.strictEqual(data.data.sacrament, 'COMMUNION');
    });

    test('2.2 General Secretary (Level 5) attempts to query Servant A spiritual records -> 403 ERR_SPIRITUAL_DATA_FIREWALL', async () => {
      // Seed private entry for Servant A
      await mockDb.spiritualLifeEntry.create({
        data: {
          userId: 'user-servant-a',
          sacrament: 'CONFESSION',
          entryDate: new Date('2026-09-20'),
          notes: 'اعتراف سري وشخصي',
        },
      });

      // Authenticate as General Secretary (Level 5 - highest in system)
      const generalSecToken = makeToken({
        userId: 'user-generalsec',
        roleLevel: 5,
        roleCode: 'GENERAL_SECRETARY',
        stageIds: [],
        sectorIds: [],
      });

      // Attempt to inspect Servant A's spiritual data
      const res = await fetch(`${baseUrl}/api/v1/spiritual-life?userId=user-servant-a`, {
        headers: { Authorization: `Bearer ${generalSecToken}` },
      });

      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.error.code, 'ERR_SPIRITUAL_DATA_FIREWALL');
    });

    test('2.3 Servant A queries own spiritual journal via /me -> 200 OK with own entries', async () => {
      await mockDb.spiritualLifeEntry.create({
        data: {
          userId: 'user-servant-a',
          sacrament: 'COMMUNION',
          entryDate: new Date('2026-09-27'),
          notes: 'قداس خاص',
        },
      });

      const token = makeToken({
        userId: 'user-servant-a',
        roleLevel: 1,
        roleCode: 'SERVANT',
        stageIds: ['stage-prep-boys'],
        sectorIds: [],
      });

      const res = await fetch(`${baseUrl}/api/v1/spiritual-life/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.length, 1);
      assert.strictEqual(data.data[0].userId, 'user-servant-a');
    });
  });

  // ------------------------------------------------------------------------
  // 3. PERSONAL SERVANT DASHBOARD SUMMARY (FR-13.2)
  // ------------------------------------------------------------------------
  describe('3. Personal Servant Dashboard (FR-13.2)', () => {
    test('3.1 GET /api/v1/dashboard/servant-summary aggregates personal metrics and urgent alerts', async () => {
      // Seed upcoming prep
      await mockDb.lessonPreparation.create({
        data: {
          authorUserId: 'user-servant-a',
          stageId: 'stage-prep-boys',
          lessonDate: new Date('2026-10-15'),
          title: 'الدرس القادم',
          content: 'محتوى...',
        },
      });

      // Seed active alert for member-101 (assigned to servant A)
      await mockDb.absenceAlert.create({
        data: {
          targetType: 'MEMBER',
          memberId: 'member-101',
          stageId: 'stage-prep-boys',
          consecutiveCount: 2,
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

      const res = await fetch(`${baseUrl}/api/v1/dashboard/servant-summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.metrics.assignedMembersCount, 1);
      assert.strictEqual(data.data.metrics.preparationsCount, 1);
      assert.strictEqual(data.data.urgentAbsenceAlerts.length, 1);
      assert.strictEqual(data.data.urgentAbsenceAlerts[0].memberId, 'member-101');
    });
  });

  // ------------------------------------------------------------------------
  // 4. LESSON INSPECTION & STRUCTURED PREPARATION WORKFLOW
  // ------------------------------------------------------------------------
  describe('4. Lesson Inspection & Structured Preparation Workflow', () => {
    test('4.1 Servant submits structured preparation linked to lesson event and Stage Secretary inspects who prepared', async () => {
      // 1. Create a lesson event in the plan
      const lessonEvent = await mockDb.calendarEvent.create({
        data: {
          stageId: 'stage-prep-boys',
          title: 'درس مثل الابن الضال',
          description: JSON.stringify({
            overview: 'درس روحي عن الرجوع والتوبة',
            bibleVerse: 'لوقا 15: 11-32',
            references: 'تفسير أبونا تادرس يعقوب، بستان الرهبان',
          }),
          category: 'SPIRITUAL_LESSON',
          startDate: '2026-10-16T18:00:00.000Z',
          endDate: '2026-10-16T20:00:00.000Z',
          createdById: 'user-stagesec-boys',
        },
      });

      const servantToken = makeToken({
        userId: 'user-servant-a',
        roleLevel: 1,
        roleCode: 'SERVANT',
        stageIds: ['stage-prep-boys'],
        sectorIds: [],
      });

      // 2. Servant submits preparation linked to lesson event
      const submitRes = await fetch(`${baseUrl}/api/v1/preparations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${servantToken}`,
        },
        body: JSON.stringify({
          eventId: lessonEvent.id,
          mainObjective: 'إدراك محبة الآب غير المشروطة وقبول الخطاة التائبين',
          visualAid: 'لوحة مجسمة ومقطع فيديو رمزي عن الرجوع',
          content: 'المقدمة: الحديث عن معنى الاشتياق للأب.\nالدرس: تفاصيل مثل الابن الضال وخنازير الكورة البعيدة.\nالتدريب الروحي: قراءة مزمور التوبة وصلاة خاصة.',
          extraReferences: 'عظة البابا شنودة الثالث عن التوبة والرجوع',
          servantReflection: 'تأمل خاص في مشاعر الأب وهو ينتظر ابنه من بعيد',
        }),
      });

      assert.strictEqual(submitRes.status, 201);
      const submitData = await submitRes.json();
      assert.strictEqual(submitData.success, true);
      assert.strictEqual(submitData.data.visualAid, 'لوحة مجسمة ومقطع فيديو رمزي عن الرجوع');
      assert.ok(submitData.data.submittedAt, 'Should automatically record submission date');

      // 3. Stage Secretary inspects the lesson to see who prepared and who did not
      const stageSecToken = makeToken({
        userId: 'user-stagesec-boys',
        roleLevel: 3,
        roleCode: 'STAGE_SECRETARY',
        stageIds: ['stage-prep-boys'],
        sectorIds: ['sector-youth'],
      });

      const inspectRes = await fetch(`${baseUrl}/api/v1/preparations/lesson-inspection/${lessonEvent.id}`, {
        headers: { Authorization: `Bearer ${stageSecToken}` },
      });

      assert.strictEqual(inspectRes.status, 200);
      const inspectData = await inspectRes.json();
      assert.strictEqual(inspectData.success, true);
      assert.strictEqual(inspectData.data.lesson.title, 'درس مثل الابن الضال');
      assert.strictEqual(inspectData.data.lesson.bibleVerse, 'لوقا 15: 11-32');
      assert.strictEqual(inspectData.data.summary.preparedCount, 1);
      assert.strictEqual(inspectData.data.preparedServants[0].servant.fullName, 'خادم بيتر');
      assert.strictEqual(inspectData.data.preparedServants[0].preparation.mainObjective, 'إدراك محبة الآب غير المشروطة وقبول الخطاة التائبين');
    });
  });
});
