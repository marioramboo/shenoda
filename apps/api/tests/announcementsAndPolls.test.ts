import { test, describe, before, beforeEach, after } from 'node:test';
import assert from 'node:assert';
import { createApp } from '../src/app';
import { setPrismaClient } from '../src/config/prisma';
import { createMockPrisma } from './helpers/mockDb';
import { TokenService } from '../src/services/token.service';
import { NotificationQueueService } from '../src/services/notificationQueue.service';
import { NotificationType, NotificationChannel, TargetScopeLevel } from '@shenoda/shared';
import { runLessonPreparationReminderCheck } from '../src/jobs/reminderCron';
import { Server } from 'http';

describe('Phase 7 — Announcements, Polls & Notifications Comprehensive Test Suite', () => {
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

    // 3. Servant Girls (Prep Girls)
    await mockDb.user.create({
      data: {
        id: 'user-servant-girls',
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
      userId: 'user-servant-girls',
      stageId: 'stage-prep-girls',
      sectorId: 'sector-youth',
    });

    // 4. Stage Secretary of Prep Boys (Level 3)
    await mockDb.user.create({
      data: {
        id: 'user-stagesec-boys',
        organizationId: 'org-1',
        roleId: 'role-stagesec',
        fullName: 'أمين خدمة إعدادي بنين',
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

    // 5. Sector Secretary of Youth (Level 4)
    await mockDb.user.create({
      data: {
        id: 'user-sectorsec',
        organizationId: 'org-1',
        roleId: 'role-sectorsec',
        fullName: 'أمين قطاع الشباب',
        phoneNumber: '01055555555',
        passwordHash: 'dummy',
        status: 'ACTIVE',
      },
    });
    mockDb._data.scopeAssignments.push({
      id: 'sa-5',
      userId: 'user-sectorsec',
      stageId: null,
      sectorId: 'sector-youth',
    });

    // 6. General Secretary (Level 5)
    await mockDb.user.create({
      data: {
        id: 'user-generalsec',
        organizationId: 'org-1',
        roleId: 'role-generalsec',
        fullName: 'الأمين العام',
        phoneNumber: '01066666666',
        passwordHash: 'dummy',
        status: 'ACTIVE',
      },
    });
  });

  // ------------------------------------------------------------------------
  // 1. ANNOUNCEMENTS: AUTHORING TIERS & UPWARD-ADDRESSING BAN (FR-10.1, FR-10.2, Assumption A5)
  // ------------------------------------------------------------------------
  describe('1. Announcements: Authoring & Upward-Addressing Ban', () => {
    test('1.1 Level 1 Servant attempts to create announcement -> 403 ERR_UNAUTHORIZED_ANNOUNCER', async () => {
      const token = makeToken({
        userId: 'user-servant-a',
        roleLevel: 1,
        roleCode: 'SERVANT',
        stageIds: ['stage-prep-boys'],
        sectorIds: ['sector-youth'],
      });

      const res = await fetch(`${baseUrl}/api/v1/announcements`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'إعلان من خادم',
          content: 'محتوى الإعلان التجريبي',
          targetScopeType: TargetScopeLevel.STAGE_ALL,
          targetStageId: 'stage-prep-boys',
        }),
      });

      const body = await res.json();
      assert.strictEqual(res.status, 403);
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.error.code, 'ERR_UNAUTHORIZED_ANNOUNCER');
    });

    test('1.2 Stage Secretary (Level 3) targets Sector Secretary (Level 4) -> 403 ERR_UPWARD_ADDRESSING_PROHIBITED', async () => {
      const token = makeToken({
        userId: 'user-stagesec-boys',
        roleLevel: 3,
        roleCode: 'STAGE_SECRETARY',
        stageIds: ['stage-prep-boys'],
        sectorIds: ['sector-youth'],
      });

      // Violate Upward-Addressing Ban by explicitly specifying superior user IDs
      const res = await fetch(`${baseUrl}/api/v1/announcements`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'تنبيه للمشرفين',
          content: 'إعلان موجه لأمين القطاع بشكل مخالف',
          targetScopeType: TargetScopeLevel.STAGE_SUBSET,
          specificUserIds: ['user-servant-a', 'user-sectorsec'],
        }),
      });

      const body = await res.json();
      assert.strictEqual(res.status, 403);
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.error.code, 'ERR_UPWARD_ADDRESSING_PROHIBITED');
    });

    test('1.3 Stage Secretary creates stage-wide announcement for own stage -> 201 Created and recipients linked', async () => {
      const token = makeToken({
        userId: 'user-stagesec-boys',
        roleLevel: 3,
        roleCode: 'STAGE_SECRETARY',
        stageIds: ['stage-prep-boys'],
        sectorIds: ['sector-youth'],
      });

      const res = await fetch(`${baseUrl}/api/v1/announcements`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'اجتماع خدام إعدادي بنين الطارئ',
          content: 'يرجى الحضور غداً عقب صلاة العشية لمناقشة ترتيبات المهرجان.',
          targetScopeType: TargetScopeLevel.STAGE_ALL,
          targetStageId: 'stage-prep-boys',
          isPinned: true,
        }),
      });

      const body = await res.json();
      assert.strictEqual(res.status, 201);
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.title, 'اجتماع خدام إعدادي بنين الطارئ');
      assert.strictEqual(body.data.isPinned, true);
      assert.ok(body.data.recipientsCount >= 2); // Servant A, Servant B, and Stage Secretary
    });

    test('1.4 Stage isolation: Servant in Prep Boys sees announcement, Servant in Prep Girls does NOT', async () => {
      // 1. Create announcement for Prep Boys
      const stageSecToken = makeToken({
        userId: 'user-stagesec-boys',
        roleLevel: 3,
        roleCode: 'STAGE_SECRETARY',
        stageIds: ['stage-prep-boys'],
        sectorIds: ['sector-youth'],
      });

      await fetch(`${baseUrl}/api/v1/announcements`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stageSecToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'خاص بخدام بنين فقط',
          content: 'تعليمات يوم الرياضة للبنين.',
          targetScopeType: TargetScopeLevel.STAGE_ALL,
          targetStageId: 'stage-prep-boys',
        }),
      });

      // 2. Prep Boys servant queries announcements -> Sees it
      const boyToken = makeToken({
        userId: 'user-servant-a',
        roleLevel: 1,
        roleCode: 'SERVANT',
        stageIds: ['stage-prep-boys'],
        sectorIds: ['sector-youth'],
      });

      const boyRes = await fetch(`${baseUrl}/api/v1/announcements`, {
        headers: { Authorization: `Bearer ${boyToken}` },
      });
      const boyBody = await boyRes.json();
      assert.strictEqual(boyRes.status, 200);
      assert.ok(boyBody.data.some((a: any) => a.title === 'خاص بخدام بنين فقط'));

      // 3. Prep Girls servant queries announcements -> Does NOT see it
      const girlToken = makeToken({
        userId: 'user-servant-girls',
        roleLevel: 1,
        roleCode: 'SERVANT',
        stageIds: ['stage-prep-girls'],
        sectorIds: ['sector-youth'],
      });

      const girlRes = await fetch(`${baseUrl}/api/v1/announcements`, {
        headers: { Authorization: `Bearer ${girlToken}` },
      });
      const girlBody = await girlRes.json();
      assert.strictEqual(girlRes.status, 200);
      assert.strictEqual(girlBody.data.some((a: any) => a.title === 'خاص بخدام بنين فقط'), false);
    });

    test('1.5 Marking announcement as read updates recipient status (FR-10.3)', async () => {
      const stageSecToken = makeToken({
        userId: 'user-stagesec-boys',
        roleLevel: 3,
        roleCode: 'STAGE_SECRETARY',
        stageIds: ['stage-prep-boys'],
        sectorIds: ['sector-youth'],
      });

      const createRes = await fetch(`${baseUrl}/api/v1/announcements`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stageSecToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'إعلان للقراءة',
          content: 'نص الإعلان',
          targetScopeType: TargetScopeLevel.STAGE_ALL,
          targetStageId: 'stage-prep-boys',
        }),
      });
      const created = await createRes.json();
      const announcementId = created.data.id;

      const boyToken = makeToken({
        userId: 'user-servant-b',
        roleLevel: 1,
        roleCode: 'SERVANT',
        stageIds: ['stage-prep-boys'],
        sectorIds: ['sector-youth'],
      });

      // Mark as read
      const markRes = await fetch(`${baseUrl}/api/v1/announcements/${announcementId}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${boyToken}` },
      });
      const markBody = await markRes.json();
      assert.strictEqual(markRes.status, 200);
      assert.strictEqual(markBody.success, true);

      // Verify in list
      const listRes = await fetch(`${baseUrl}/api/v1/announcements`, {
        headers: { Authorization: `Bearer ${boyToken}` },
      });
      const listBody = await listRes.json();
      const found = listBody.data.find((a: any) => a.id === announcementId);
      assert.ok(found);
      assert.strictEqual(found.isRead, true);
    });

    test('1.6 Deleting an announcement: unauthorized user rejected (403), author can delete (200)', async () => {
      // 1. Create announcement
      const authorToken = makeToken({
        userId: 'user-stagesec-boys',
        roleLevel: 3,
        roleCode: 'STAGE_SECRETARY',
        stageIds: ['stage-prep-boys'],
        sectorIds: ['sector-youth'],
      });

      const createRes = await fetch(`${baseUrl}/api/v1/announcements`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authorToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'إعلان للحذف التجريبي',
          content: 'سيتم حذف هذا الإعلان.',
          targetScopeType: TargetScopeLevel.STAGE_ALL,
          targetStageId: 'stage-prep-boys',
        }),
      });
      const createBody = await createRes.json();
      assert.strictEqual(createRes.status, 201);
      const annId = createBody.data.id;

      // 2. Unauthorized servant attempts deletion -> 403
      const unauthorizedToken = makeToken({
        userId: 'user-servant-b',
        roleLevel: 1,
        roleCode: 'SERVANT',
        stageIds: ['stage-prep-boys'],
      });
      const unauthRes = await fetch(`${baseUrl}/api/v1/announcements/${annId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${unauthorizedToken}` },
      });
      assert.strictEqual(unauthRes.status, 403);

      // 3. Author deletes announcement -> 200
      const deleteRes = await fetch(`${baseUrl}/api/v1/announcements/${annId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authorToken}` },
      });
      const deleteBody = await deleteRes.json();
      assert.strictEqual(deleteRes.status, 200);
      assert.strictEqual(deleteBody.success, true);

      // 4. Verify no longer in list
      const listRes = await fetch(`${baseUrl}/api/v1/announcements`, {
        headers: { Authorization: `Bearer ${authorToken}` },
      });
      const listBody = await listRes.json();
      assert.ok(!listBody.data.some((a: any) => a.id === annId));
    });
  });

  // ------------------------------------------------------------------------
  // 2. INTERACTIVE POLLS: CREATION, VOTING & REAL-TIME TALLIES (FR-9.1, FR-9.2)
  // ------------------------------------------------------------------------
  describe('2. Interactive Polls & Real-Time Tallies', () => {
    test('2.1 Stage Secretary creates poll with options -> 201 Created', async () => {
      const token = makeToken({
        userId: 'user-stagesec-boys',
        roleLevel: 3,
        roleCode: 'STAGE_SECRETARY',
        stageIds: ['stage-prep-boys'],
        sectorIds: ['sector-youth'],
      });

      const closesAt = new Date(Date.now() + 86400000).toISOString(); // +1 day

      const res = await fetch(`${baseUrl}/api/v1/polls`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: 'ما هو الموعد الأنسب لليوم الرياضي؟',
          options: ['الجمعة القادمة بعد القداس', 'السبت صباحاً', 'الجمعة بعد أسبوعين'],
          allowMultiple: false,
          closesAt,
          stageId: 'stage-prep-boys',
        }),
      });

      const body = await res.json();
      assert.strictEqual(res.status, 201);
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.question, 'ما هو الموعد الأنسب لليوم الرياضي؟');
      assert.strictEqual(body.data.options.length, 3);
    });

    test('2.2 Servant votes on an option and duplicate vote is blocked (allowMultiple = false)', async () => {
      const stageSecToken = makeToken({
        userId: 'user-stagesec-boys',
        roleLevel: 3,
        roleCode: 'STAGE_SECRETARY',
        stageIds: ['stage-prep-boys'],
        sectorIds: ['sector-youth'],
      });

      const pollRes = await fetch(`${baseUrl}/api/v1/polls`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stageSecToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: 'استطلاع رأي في رحلة الخدمة',
          options: ['وادي النطرون', 'دير مارمينا'],
          allowMultiple: false,
          closesAt: new Date(Date.now() + 86400000).toISOString(),
          stageId: 'stage-prep-boys',
        }),
      });
      const pollData = await pollRes.json();
      const pollId = pollData.data.id;
      const option1Id = pollData.data.options[0].id;
      const option2Id = pollData.data.options[1].id;

      const servantToken = makeToken({
        userId: 'user-servant-a',
        roleLevel: 1,
        roleCode: 'SERVANT',
        stageIds: ['stage-prep-boys'],
        sectorIds: ['sector-youth'],
      });

      // 1. First vote succeeds
      const vote1Res = await fetch(`${baseUrl}/api/v1/polls/${pollId}/vote`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${servantToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ optionId: option1Id }),
      });
      const vote1Body = await vote1Res.json();
      assert.strictEqual(vote1Res.status, 200);
      assert.strictEqual(vote1Body.success, true);

      // 2. Second vote attempt is rejected with 400 ERR_ALREADY_VOTED
      const vote2Res = await fetch(`${baseUrl}/api/v1/polls/${pollId}/vote`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${servantToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ optionId: option2Id }),
      });
      const vote2Body = await vote2Res.json();
      assert.strictEqual(vote2Res.status, 400);
      assert.strictEqual(vote2Body.success, false);
      assert.strictEqual(vote2Body.error.code, 'ERR_ALREADY_VOTED');
    });

    test('2.3 Real-time tallies return accurate percentage distribution (FR-9.2)', async () => {
      const stageSecToken = makeToken({
        userId: 'user-stagesec-boys',
        roleLevel: 3,
        roleCode: 'STAGE_SECRETARY',
        stageIds: ['stage-prep-boys'],
        sectorIds: ['sector-youth'],
      });

      const pollRes = await fetch(`${baseUrl}/api/v1/polls`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stageSecToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: 'تحديد موعد درس الكنيسة',
          options: ['الخامسة مساءً', 'السادسة مساءً'],
          allowMultiple: false,
          closesAt: new Date(Date.now() + 86400000).toISOString(),
          stageId: 'stage-prep-boys',
        }),
      });
      const pollData = await pollRes.json();
      const pollId = pollData.data.id;
      const opt1 = pollData.data.options[0].id;
      const opt2 = pollData.data.options[1].id;

      // Servant A votes for opt1
      const tokenA = makeToken({
        userId: 'user-servant-a',
        roleLevel: 1,
        roleCode: 'SERVANT',
        stageIds: ['stage-prep-boys'],
        sectorIds: ['sector-youth'],
      });
      await fetch(`${baseUrl}/api/v1/polls/${pollId}/vote`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionId: opt1 }),
      });

      // Servant B votes for opt1
      const tokenB = makeToken({
        userId: 'user-servant-b',
        roleLevel: 1,
        roleCode: 'SERVANT',
        stageIds: ['stage-prep-boys'],
        sectorIds: ['sector-youth'],
      });
      await fetch(`${baseUrl}/api/v1/polls/${pollId}/vote`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenB}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionId: opt1 }),
      });

      // Stage Secretary votes for opt2
      await fetch(`${baseUrl}/api/v1/polls/${pollId}/vote`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${stageSecToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionId: opt2 }),
      });

      // Check results: total 3 votes. opt1 has 2 (67%), opt2 has 1 (33%)
      const res = await fetch(`${baseUrl}/api/v1/polls/${pollId}/results`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const body = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.totalVotes, 3);

      const tallies = body.data.options;
      const resOpt1 = tallies.find((o: any) => o.id === opt1);
      const resOpt2 = tallies.find((o: any) => o.id === opt2);

      assert.strictEqual(resOpt1.voteCount, 2);
      assert.strictEqual(resOpt1.percentage, 67);
      assert.strictEqual(resOpt2.voteCount, 1);
      assert.strictEqual(resOpt2.percentage, 33);
    });

    test('2.5 Deleting a poll: unauthorized user rejected (403), creator can delete (200)', async () => {
      // 1. Create a poll
      const creatorToken = makeToken({
        userId: 'user-stagesec-boys',
        roleLevel: 3,
        roleCode: 'STAGE_SECRETARY',
        stageIds: ['stage-prep-boys'],
        sectorIds: ['sector-youth'],
      });

      const createRes = await fetch(`${baseUrl}/api/v1/polls`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${creatorToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: 'استطلاع للحذف التجريبي؟',
          options: ['خيار 1', 'خيار 2'],
          closesAt: new Date(Date.now() + 86400000).toISOString(),
          stageId: 'stage-prep-boys',
        }),
      });
      const createBody = await createRes.json();
      assert.strictEqual(createRes.status, 201);
      const pollId = createBody.data.id;

      // 2. Unauthorized user attempts deletion -> 403
      const unauthorizedToken = makeToken({
        userId: 'user-servant-b',
        roleLevel: 1,
        roleCode: 'SERVANT',
        stageIds: ['stage-prep-boys'],
      });
      const unauthRes = await fetch(`${baseUrl}/api/v1/polls/${pollId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${unauthorizedToken}` },
      });
      assert.strictEqual(unauthRes.status, 403);

      // 3. Creator deletes poll -> 200
      const deleteRes = await fetch(`${baseUrl}/api/v1/polls/${pollId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${creatorToken}` },
      });
      const deleteBody = await deleteRes.json();
      assert.strictEqual(deleteRes.status, 200);
      assert.strictEqual(deleteBody.success, true);

      // 4. Results returns 404
      const resAfter = await fetch(`${baseUrl}/api/v1/polls/${pollId}/results`, {
        headers: { Authorization: `Bearer ${creatorToken}` },
      });
      assert.strictEqual(resAfter.status, 404);
    });
  });

  // ------------------------------------------------------------------------
  // 3. MULTI-CHANNEL NOTIFICATION PIPELINE & PREFERENCES (FR-11.1–11.4)
  // ------------------------------------------------------------------------
  describe('3. Multi-Channel Notification Pipeline & Preferences', () => {
    test('3.1 User preferences: get default and update channels (FR-11.4)', async () => {
      const token = makeToken({
        userId: 'user-servant-a',
        roleLevel: 1,
        roleCode: 'SERVANT',
        stageIds: ['stage-prep-boys'],
        sectorIds: ['sector-youth'],
      });

      // 1. Get default preferences
      const getRes = await fetch(`${baseUrl}/api/v1/notifications/preferences`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const getBody = await getRes.json();
      assert.strictEqual(getRes.status, 200);
      assert.strictEqual(getBody.success, true);
      assert.strictEqual(getBody.data.enablePush, true);
      assert.strictEqual(getBody.data.enableSms, true);
      assert.strictEqual(getBody.data.enableEmail, false);

      // 2. Update preferences (disable SMS, enable Email)
      const putRes = await fetch(`${baseUrl}/api/v1/notifications/preferences`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enablePush: true,
          enableSms: false,
          enableEmail: true,
          pushSubscription: { endpoint: 'https://example.com/push/123' },
        }),
      });
      const putBody = await putRes.json();
      assert.strictEqual(putRes.status, 200);
      assert.strictEqual(putBody.data.enableSms, false);
      assert.strictEqual(putBody.data.enableEmail, true);
      assert.ok(putBody.data.pushSubscription);
    });

    test('3.2 Absence Alert wiring dispatches notifications and logs delivery (FR-11.1)', async () => {
      const servantId = 'user-servant-a';
      const token = makeToken({
        userId: servantId,
        roleLevel: 1,
        roleCode: 'SERVANT',
        stageIds: ['stage-prep-boys'],
        sectorIds: ['sector-youth'],
      });

      // Simulate urgent absence alert notification
      const alertRes = await fetch(`${baseUrl}/api/v1/notifications/absence-alert`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          servantUserId: servantId,
          memberName: 'مينا سمير كمال',
          consecutiveCount: 3,
        }),
      });

      const alertBody = await alertRes.json();
      assert.strictEqual(alertRes.status, 201);
      assert.strictEqual(alertBody.success, true);

      // Verify delivery logs recorded in notification_logs
      const logRes = await fetch(`${baseUrl}/api/v1/notifications/logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const logBody = await logRes.json();
      assert.strictEqual(logRes.status, 200);
      assert.ok(logBody.data.length >= 1);
      const alertLog = logBody.data.find((l: any) => l.type === NotificationType.ABSENCE_ALERT);
      assert.ok(alertLog);
      assert.ok(alertLog.title.includes('تنبيه'));
      assert.ok(alertLog.body.includes('مينا سمير كمال'));
    });

    test('3.3 Weekly Preparation Reminder Cron dispatches reminders to unprepared servants (FR-11.3)', async () => {
      const friday = new Date('2026-10-02T10:00:00Z');
      const result = await runLessonPreparationReminderCheck(friday);
      assert.ok(result.remindersSentCount >= 1);
      assert.ok(result.remindersSent.includes('user-servant-a'));

      // Check log was created
      const logs = await mockDb.notificationLog.findMany({
        where: { userId: 'user-servant-a', type: NotificationType.PREP_DEADLINE },
      });
      assert.ok(logs.length >= 1);
      assert.strictEqual(logs[0].title, 'تذكير بتحضير الدرس');
    });
  });
});
