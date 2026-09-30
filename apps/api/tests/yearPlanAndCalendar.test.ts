import { test, describe, before, beforeEach, after } from 'node:test';
import assert from 'node:assert';
import { createApp } from '../src/app';
import { setPrismaClient } from '../src/config/prisma';
import { createMockPrisma } from './helpers/mockDb';
import { TokenService } from '../src/services/token.service';
import { Server } from 'http';

describe('Phase 6 — Year Plan (تدبير السنة) & Calendar Module Comprehensive Test Suite', () => {
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
      id: 'sa-1',
      userId: 'user-servant-a',
      stageId: 'stage-prep-boys',
      sectorId: 'sector-youth',
    });

    // 2. Servant B (Prep Boys)
    await mockDb.user.create({
      data: {
        id: 'user-servant-b',
        organizationId: 'org-1',
        roleId: 'role-servant',
        fullName: 'خادم مايكل',
        phoneNumber: '01022222222',
        passwordHash: 'dummy',
        status: 'ACTIVE',
      },
    });
    mockDb._data.scopeAssignments.push({
      id: 'sa-2',
      userId: 'user-servant-b',
      stageId: 'stage-prep-boys',
      sectorId: 'sector-youth',
    });

    // 3. Servant C (Prep Girls)
    await mockDb.user.create({
      data: {
        id: 'user-servant-c',
        organizationId: 'org-1',
        roleId: 'role-servant',
        fullName: 'خادمة مريم',
        phoneNumber: '01033333333',
        passwordHash: 'dummy',
        status: 'ACTIVE',
      },
    });
    mockDb._data.scopeAssignments.push({
      id: 'sa-3',
      userId: 'user-servant-c',
      stageId: 'stage-prep-girls',
      sectorId: 'sector-youth',
    });

    // 4. Stage Secretary of Prep Boys
    await mockDb.user.create({
      data: {
        id: 'user-stagesec-boys',
        organizationId: 'org-1',
        roleId: 'role-stagesec',
        fullName: 'أمين خدمة بنين',
        phoneNumber: '01044444444',
        passwordHash: 'dummy',
        status: 'ACTIVE',
      },
    });
    mockDb._data.scopeAssignments.push({
      id: 'sa-4',
      userId: 'user-stagesec-boys',
      stageId: 'stage-prep-boys',
      sectorId: 'sector-youth',
    });
  });

  // ------------------------------------------------------------------------
  // 1. YEAR PLAN AUTHORING HIERARCHY TESTS (FR-7.1)
  // ------------------------------------------------------------------------
  describe('1. Year Plan Authoring Hierarchy (FR-7.1)', () => {
    test('1.1 Level 1 Servant attempts to create YearPlan -> 403 Forbidden', async () => {
      const token = makeToken({
        userId: 'user-servant-a',
        roleLevel: 1,
        roleCode: 'SERVANT',
        stageIds: ['stage-prep-boys'],
        sectorIds: ['sector-youth'],
      });

      const res = await fetch(`${baseUrl}/api/v1/year-plans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: 'خطة إعدادي بنين',
          academicYear: '2026-2027',
          scopeType: 'STAGE',
          stageId: 'stage-prep-boys',
        }),
      });

      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.error.code, 'ERR_UNAUTHORIZED_PLAN_CREATION');
    });

    test('1.2 Stage Secretary of Prep Boys attempts to author for Prep Girls -> 403 Scope Mismatch', async () => {
      const token = makeToken({
        userId: 'user-stagesec-boys',
        roleLevel: 3,
        roleCode: 'STAGE_SECRETARY',
        stageIds: ['stage-prep-boys'],
        sectorIds: ['sector-youth'],
      });

      const res = await fetch(`${baseUrl}/api/v1/year-plans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: 'خطة إعدادي بنات',
          academicYear: '2026-2027',
          scopeType: 'STAGE',
          stageId: 'stage-prep-girls',
        }),
      });

      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.error.code, 'ERR_SCOPE_MISMATCH');
    });

    test('1.3 Stage Secretary of Prep Boys authors plan for Prep Boys -> 201 Created', async () => {
      const token = makeToken({
        userId: 'user-stagesec-boys',
        roleLevel: 3,
        roleCode: 'STAGE_SECRETARY',
        stageIds: ['stage-prep-boys'],
        sectorIds: ['sector-youth'],
      });

      const res = await fetch(`${baseUrl}/api/v1/year-plans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: 'تدبير خدمة إعدادي بنين 2026 / 2027',
          academicYear: '2026-2027',
          scopeType: 'STAGE',
          stageId: 'stage-prep-boys',
          isPublished: true,
        }),
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.stageId, 'stage-prep-boys');
      assert.strictEqual(data.data.title, 'تدبير خدمة إعدادي بنين 2026 / 2027');
    });

    test('1.4 Stage Secretary adds a curriculum event to the plan -> 201 Created', async () => {
      const plan = await mockDb.yearPlan.create({
        data: {
          organizationId: 'org-1',
          title: 'خطة إعدادي بنين',
          academicYear: '2026-2027',
          scopeType: 'STAGE',
          stageId: 'stage-prep-boys',
          publishedById: 'user-stagesec-boys',
          isPublished: true,
        },
      });

      const token = makeToken({
        userId: 'user-stagesec-boys',
        roleLevel: 3,
        roleCode: 'STAGE_SECRETARY',
        stageIds: ['stage-prep-boys'],
        sectorIds: ['sector-youth'],
      });

      const res = await fetch(`${baseUrl}/api/v1/year-plans/${plan.id}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: 'درس مثل الابن الضال',
          description: 'موضوع روحي حول التوبة والرجوع',
          category: 'SPIRITUAL_LESSON',
          startDate: '2026-10-09T18:00:00.000Z',
          endDate: '2026-10-09T20:00:00.000Z',
          location: 'قاعة القديس أثناسيوس',
          maxVolunteers: 2,
        }),
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.title, 'درس مثل الابن الضال');
      assert.strictEqual(data.data.maxVolunteers, 2);
    });

    test('1.5 Stage Secretary (امين الخدمة) CANNOT add meeting to اجتماع الخدام -> 403 Forbidden', async () => {
      const plan = await mockDb.yearPlan.create({
        data: {
          organizationId: 'org-1',
          title: 'خطة إعدادي بنين',
          academicYear: '2026-2027',
          scopeType: 'STAGE',
          stageId: 'stage-prep-boys',
          publishedById: 'user-stagesec-boys',
          isPublished: true,
        },
      });

      const stageSecToken = makeToken({
        userId: 'user-stagesec-boys',
        roleLevel: 3,
        roleCode: 'STAGE_SECRETARY',
        stageIds: ['stage-prep-boys'],
        sectorIds: ['sector-youth'],
      });

      const res = await fetch(`${baseUrl}/api/v1/year-plans/${plan.id}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${stageSecToken}`,
        },
        body: JSON.stringify({
          title: 'اجتماع الخدام الأسبوعي',
          category: 'SERVICE_MEETING',
          startDate: '2026-10-10T19:00:00.000Z',
        }),
      });

      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.error.code, 'FORBIDDEN_GENERAL_SECRETARY_ONLY');
    });

    test('1.6 General Secretary (امين العام) CAN add meeting to اجتماع الخدام -> 201 Created', async () => {
      const plan = await mockDb.yearPlan.create({
        data: {
          organizationId: 'org-1',
          title: 'خطة الخدمة العامة',
          academicYear: '2026-2027',
          scopeType: 'STAGE',
          stageId: 'stage-prep-boys',
          publishedById: 'user-stagesec-boys',
          isPublished: true,
        },
      });

      const genSecToken = makeToken({
        userId: 'user-generalsec',
        roleLevel: 5,
        roleCode: 'GENERAL_SECRETARY',
        stageIds: [],
        sectorIds: [],
      });

      const res = await fetch(`${baseUrl}/api/v1/year-plans/${plan.id}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${genSecToken}`,
        },
        body: JSON.stringify({
          title: 'اجتماع الخدام الشهري العام',
          category: 'SERVICE_MEETING',
          startDate: '2026-10-12T19:00:00.000Z',
          location: 'القاعة الكبرى',
        }),
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.title, 'اجتماع الخدام الشهري العام');

      const createdEventId = data.data.id;

      // 1.7 Stage Secretary CANNOT edit the meeting -> 403
      const stageSecToken = makeToken({
        userId: 'user-stagesec-boys',
        roleLevel: 3,
        roleCode: 'STAGE_SECRETARY',
        stageIds: ['stage-prep-boys'],
        sectorIds: ['sector-youth'],
      });

      const editRes = await fetch(`${baseUrl}/api/v1/year-plans/${plan.id}/events/${createdEventId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${stageSecToken}`,
        },
        body: JSON.stringify({
          title: 'محاولة تعديل اجتماع الخدام من أمين الخدمة',
        }),
      });
      assert.strictEqual(editRes.status, 403);
      const editData = await editRes.json();
      assert.strictEqual(editData.error.code, 'FORBIDDEN_GENERAL_SECRETARY_ONLY');

      // 1.8 General Secretary CAN edit the meeting -> 200 OK
      const genEditRes = await fetch(`${baseUrl}/api/v1/year-plans/${plan.id}/events/${createdEventId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${genSecToken}`,
        },
        body: JSON.stringify({
          title: 'اجتماع الخدام الشهري المحدث',
        }),
      });
      assert.strictEqual(genEditRes.status, 200);
      const genEditData = await genEditRes.json();
      assert.strictEqual(genEditData.data.title, 'اجتماع الخدام الشهري المحدث');

      // 1.9 Stage Secretary CANNOT delete the meeting -> 403
      const delRes = await fetch(`${baseUrl}/api/v1/year-plans/${plan.id}/events/${createdEventId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${stageSecToken}`,
        },
      });
      assert.strictEqual(delRes.status, 403);

      // 1.10 General Secretary CAN delete the meeting -> 200 OK
      const genDelRes = await fetch(`${baseUrl}/api/v1/year-plans/${plan.id}/events/${createdEventId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${genSecToken}`,
        },
      });
      assert.strictEqual(genDelRes.status, 200);
    });
  });

  // ------------------------------------------------------------------------
  // 2. VOLUNTEER OPT-IN & CAPACITY ENGINE TESTS (FR-7.2)
  // ------------------------------------------------------------------------
  describe('2. Volunteer Opt-In & Capacity Engine (FR-7.2)', () => {
    test('2.1 Servant A opts in to volunteer for event -> 201 Created', async () => {
      const event = await mockDb.calendarEvent.create({
        data: {
          stageId: 'stage-prep-boys',
          title: 'مؤتمر العقيدة',
          category: 'CONFERENCE_RETREAT',
          startDate: new Date('2026-11-15T09:00:00.000Z'),
          endDate: new Date('2026-11-17T18:00:00.000Z'),
          maxVolunteers: 1, // Max 1 volunteer
          createdById: 'user-stagesec-boys',
        },
      });

      const tokenA = makeToken({
        userId: 'user-servant-a',
        roleLevel: 1,
        roleCode: 'SERVANT',
        stageIds: ['stage-prep-boys'],
        sectorIds: [],
      });

      const res = await fetch(`${baseUrl}/api/v1/events/${event.id}/volunteer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          roleInEvent: 'مسؤول تنظيم ومجموعات العمل',
        }),
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.userId, 'user-servant-a');
    });

    test('2.2 When capacity is reached, Servant B attempting opt-in receives 409 Conflict', async () => {
      const event = await mockDb.calendarEvent.create({
        data: {
          stageId: 'stage-prep-boys',
          title: 'مؤتمر محجوز',
          category: 'CONFERENCE_RETREAT',
          startDate: new Date('2026-11-15T09:00:00.000Z'),
          endDate: new Date('2026-11-17T18:00:00.000Z'),
          maxVolunteers: 1,
          createdById: 'user-stagesec-boys',
        },
      });

      // Servant A occupies the only slot
      await mockDb.eventVolunteer.create({
        data: {
          eventId: event.id,
          userId: 'user-servant-a',
          roleInEvent: 'المنظم',
        },
      });

      // Servant B attempts to volunteer
      const tokenB = makeToken({
        userId: 'user-servant-b',
        roleLevel: 1,
        roleCode: 'SERVANT',
        stageIds: ['stage-prep-boys'],
        sectorIds: [],
      });

      const res = await fetch(`${baseUrl}/api/v1/events/${event.id}/volunteer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenB}`,
        },
        body: JSON.stringify({
          roleInEvent: 'مساعد',
        }),
      });

      assert.strictEqual(res.status, 409);
      const data = await res.json();
      assert.strictEqual(data.error.code, 'ERR_VOLUNTEER_CAPACITY_REACHED');
    });

    test('2.3 Servant A withdraws volunteer registration -> 200 OK', async () => {
      const event = await mockDb.calendarEvent.create({
        data: {
          stageId: 'stage-prep-boys',
          title: 'رحلة وادي النطرون',
          category: 'TRIP_OR_OUTING',
          startDate: new Date('2026-11-20T07:00:00.000Z'),
          endDate: new Date('2026-11-20T21:00:00.000Z'),
          maxVolunteers: 3,
          createdById: 'user-stagesec-boys',
        },
      });

      await mockDb.eventVolunteer.create({
        data: {
          eventId: event.id,
          userId: 'user-servant-a',
        },
      });

      const tokenA = makeToken({
        userId: 'user-servant-a',
        roleLevel: 1,
        roleCode: 'SERVANT',
        stageIds: ['stage-prep-boys'],
        sectorIds: [],
      });

      const res = await fetch(`${baseUrl}/api/v1/events/${event.id}/volunteer`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${tokenA}`,
        },
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
    });
  });

  // ------------------------------------------------------------------------
  // 3. SERVANT PLAN UPDATES STAGE ISOLATION TESTS (FR-7.4)
  // ------------------------------------------------------------------------
  describe('3. Servant Plan Updates Stage Isolation (FR-7.4)', () => {
    test('3.1 Servant A posts an informal update to YearPlan without mutating official plan', async () => {
      const plan = await mockDb.yearPlan.create({
        data: {
          organizationId: 'org-1',
          title: 'الخطة السنوية الأصلية',
          academicYear: '2026-2027',
          scopeType: 'STAGE',
          stageId: 'stage-prep-boys',
          publishedById: 'user-stagesec-boys',
          isPublished: true,
        },
      });

      const tokenA = makeToken({
        userId: 'user-servant-a',
        roleLevel: 1,
        roleCode: 'SERVANT',
        stageIds: ['stage-prep-boys'],
        sectorIds: [],
      });

      const res = await fetch(`${baseUrl}/api/v1/year-plans/${plan.id}/servant-posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          title: 'توزيع هدايا العيد',
          content: 'يرجى من جميع خدام أولى إعدادي التواجد قبل القداس بربع ساعة',
          stageId: 'stage-prep-boys',
        }),
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.title, 'توزيع هدايا العيد');

      // Verify the official plan fields were NOT modified
      const officialPlan = await mockDb.yearPlan.findUnique({ where: { id: plan.id } });
      assert.strictEqual(officialPlan?.title, 'الخطة السنوية الأصلية');
    });

    test('3.2 Fellow Servant B in same stage sees Servant A post; Servant C in Prep Girls sees empty array', async () => {
      const plan = await mockDb.yearPlan.create({
        data: {
          organizationId: 'org-1',
          title: 'الخطة السنوية المشتركة',
          academicYear: '2026-2027',
          scopeType: 'STAGE',
          stageId: 'stage-prep-boys',
          publishedById: 'user-stagesec-boys',
          isPublished: true,
        },
      });

      // Post by Servant A (Prep Boys)
      await mockDb.yearPlanServantPost.create({
        data: {
          yearPlanId: plan.id,
          stageId: 'stage-prep-boys',
          authorId: 'user-servant-a',
          title: 'تنويه لخدام بنين',
          content: 'ملاحظة خاصة بإعدادي بنين',
        },
      });

      // 1. Servant B (Prep Boys) queries posts
      const tokenB = makeToken({
        userId: 'user-servant-b',
        roleLevel: 1,
        roleCode: 'SERVANT',
        stageIds: ['stage-prep-boys'],
        sectorIds: [],
      });

      const resB = await fetch(`${baseUrl}/api/v1/year-plans/${plan.id}/servant-posts`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      assert.strictEqual(resB.status, 200);
      const dataB = await resB.json();
      assert.strictEqual(dataB.data.length, 1);
      assert.strictEqual(dataB.data[0].title, 'تنويه لخدام بنين');

      // 2. Servant C (Prep Girls) queries posts -> Returns empty array (Stage Isolation)
      const tokenC = makeToken({
        userId: 'user-servant-c',
        roleLevel: 1,
        roleCode: 'SERVANT',
        stageIds: ['stage-prep-girls'],
        sectorIds: [],
      });

      const resC = await fetch(`${baseUrl}/api/v1/year-plans/${plan.id}/servant-posts`, {
        headers: { Authorization: `Bearer ${tokenC}` },
      });
      assert.strictEqual(resC.status, 200);
      const dataC = await resC.json();
      assert.strictEqual(dataC.data.length, 0); // Strict isolation: cannot see Prep Boys posts!
    });
  });

  // ------------------------------------------------------------------------
  // 4. DIRECT ATTENDANCE BRIDGE TO جدول المتابعة (FR-12.2)
  // ------------------------------------------------------------------------
  describe('4. Direct Attendance Bridge to جدول المتابعة (FR-12.2)', () => {
    test('4.1 Secretary confirms event attendance -> Automatically creates ServantAttendance record', async () => {
      // Create a SERVICE_MEETING event
      const eventDate = new Date('2026-10-16T19:00:00.000Z');
      const event = await mockDb.calendarEvent.create({
        data: {
          stageId: 'stage-prep-boys',
          title: 'اجتماع الخدمة الأسبوعي',
          category: 'SERVICE_MEETING',
          startDate: eventDate,
          endDate: new Date('2026-10-16T21:00:00.000Z'),
          createdById: 'user-stagesec-boys',
        },
      });

      const secretaryToken = makeToken({
        userId: 'user-stagesec-boys',
        roleLevel: 3,
        roleCode: 'STAGE_SECRETARY',
        stageIds: ['stage-prep-boys'],
        sectorIds: [],
      });

      // Confirm attendance for Servant A
      const res = await fetch(`${baseUrl}/api/v1/events/${event.id}/confirm-attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${secretaryToken}`,
        },
        body: JSON.stringify({
          servantUserId: 'user-servant-a',
        }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);

      // Verify record bridged directly into ServantAttendance table
      const expectedDate = new Date(eventDate);
      expectedDate.setHours(0, 0, 0, 0);

      const attendances = await mockDb.servantAttendance.findMany({
        where: {
          servantUserId: 'user-servant-a',
          sessionType: 'SERVICE_MEETING',
        },
      });

      assert.strictEqual(attendances.length, 1);
      assert.strictEqual(attendances[0].status, 'PRESENT');
      assert.strictEqual(attendances[0].recordedById, 'user-stagesec-boys');
    });
  });
});
