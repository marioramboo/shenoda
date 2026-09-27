import { test, describe, before, beforeEach, after } from 'node:test';
import assert from 'node:assert';
import { createApp } from '../src/app';
import { setPrismaClient } from '../src/config/prisma';
import { createMockPrisma } from './helpers/mockDb';
import { TokenService } from '../src/services/token.service';
import { SensitiveField, AccessType } from '@prisma/client';
import { Server } from 'http';

describe('Phase 3 — Servant & Member Records Comprehensive Test Suite', () => {
  let server: Server;
  let baseUrl: string;
  let mockDb: ReturnType<typeof createMockPrisma>;

  // Token helper
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

    // Servant B (Prep Boys)
    await mockDb.user.create({
      data: {
        id: 'user-servant-b',
        organizationId: 'org-1',
        roleId: 'role-servant',
        fullName: 'خادم ب (مينا)',
        phoneNumber: '01000000002',
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
        phoneNumber: '01000000003',
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
        phoneNumber: '01000000004',
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
        phoneNumber: '01000000005',
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
        phoneNumber: '01000000006',
        passwordHash: 'dummy',
      },
    });

    // Seed served members
    // Member X in prep-boys assigned to servant A
    const memberX = await mockDb.servedMember.create({
      data: {
        id: 'member-x',
        stageId: 'stage-prep-boys',
        fullName: 'كيرلس عماد شوقي',
        dateOfBirth: new Date('2011-04-15'),
        address: '15 شارع مصر القديمة',
        phoneNumber: '01222223333',
        fatherName: 'عماد شوقي',
        motherName: 'مريم بولس',
        financialStatus: 'متوسط',
        behaviorInService: 'منتظم وهادئ',
        peerIntegration: 'جيد ومحبوب',
      },
    });

    // Member Y in prep-boys assigned to servant B
    const memberY = await mockDb.servedMember.create({
      data: {
        id: 'member-y',
        stageId: 'stage-prep-boys',
        fullName: 'يوسف رفيق عزيز',
        dateOfBirth: new Date('2011-09-20'),
        address: '20 شارع الملك الصالح',
        phoneNumber: '01244445555',
        financialStatus: 'ميسور',
        behaviorInService: 'نشط جداً',
        peerIntegration: 'قيادي ومبادر',
      },
    });

    // Member Z in prep-girls
    await mockDb.servedMember.create({
      data: {
        id: 'member-z',
        stageId: 'stage-prep-girls',
        fullName: 'ساندي وجيه غالي',
        dateOfBirth: new Date('2011-02-10'),
        address: '5 شارع الروضة',
        phoneNumber: '01266667777',
      },
    });

    // Assign Member X to Servant A
    await mockDb.memberServantAssignment.create({
      data: {
        memberId: memberX.id,
        servantUserId: 'user-servant-a',
        assignedById: 'user-assistant',
      },
    });

    // Assign Member Y to Servant B
    await mockDb.memberServantAssignment.create({
      data: {
        memberId: memberY.id,
        servantUserId: 'user-servant-b',
        assignedById: 'user-assistant',
      },
    });
  });

  // =========================================================================
  // SECTION 1: Assumption A2 — Servant Field-Level Permissions
  // =========================================================================

  test('1.1 Servant A CAN update financialStatus on assigned Member X -> 200 OK', async () => {
    const servantAToken = makeToken({
      userId: 'user-servant-a',
      roleLevel: 1,
      roleCode: 'SERVANT',
      stageIds: ['stage-prep-boys'],
      sectorIds: ['sector-youth'],
    });

    const res = await fetch(`${baseUrl}/api/v1/members/member-x`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${servantAToken}`,
      },
      body: JSON.stringify({
        financialStatus: 'يحتاج مساعدة مدرسية',
        behaviorInService: 'ملتزم بحضور القداس والدرس',
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.member.financialStatus, 'يحتاج مساعدة مدرسية');

    // Verify audit log entry created
    const auditLogs = mockDb._data.memberAuditLogs.filter((l) => l.memberId === 'member-x');
    assert.ok(auditLogs.some((l) => l.fieldName === 'financialStatus'));
  });

  test('1.2 Servant A attempts to update restricted field (fullName/address) -> 403 ERR_FIELD_UPDATE_RESTRICTED (Assumption A2)', async () => {
    const servantAToken = makeToken({
      userId: 'user-servant-a',
      roleLevel: 1,
      roleCode: 'SERVANT',
      stageIds: ['stage-prep-boys'],
      sectorIds: ['sector-youth'],
    });

    const res = await fetch(`${baseUrl}/api/v1/members/member-x`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${servantAToken}`,
      },
      body: JSON.stringify({
        fullName: 'اسم محرف غير مصرح به',
        address: 'عنوان جديد',
      }),
    });

    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error.code, 'ERR_FIELD_UPDATE_RESTRICTED');
    assert.ok(body.error.details.unauthorizedFields.includes('fullName'));
  });

  test('1.3 Servant A CANNOT update evaluative fields on unassigned Member Y -> 403 Forbidden', async () => {
    const servantAToken = makeToken({
      userId: 'user-servant-a',
      roleLevel: 1,
      roleCode: 'SERVANT',
      stageIds: ['stage-prep-boys'],
      sectorIds: ['sector-youth'],
    });

    const res = await fetch(`${baseUrl}/api/v1/members/member-y`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${servantAToken}`,
      },
      body: JSON.stringify({
        financialStatus: 'متوسط',
      }),
    });

    assert.strictEqual(res.status, 403);
  });

  // =========================================================================
  // SECTION 2: Assistant Secretary Scope & Member CRUD (FR-3.2)
  // =========================================================================

  test('2.1 Assistant Secretary CAN update full member profile within assigned stage -> 200 OK', async () => {
    const assistantToken = makeToken({
      userId: 'user-assistant',
      roleLevel: 2,
      roleCode: 'ASSISTANT_SECRETARY',
      stageIds: ['stage-prep-boys'],
      sectorIds: ['sector-youth'],
    });

    const res = await fetch(`${baseUrl}/api/v1/members/member-x`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${assistantToken}`,
      },
      body: JSON.stringify({
        fullName: 'كيرلس عماد شوقي جرجس',
        address: '22 شارع المحطة، مصر القديمة',
        schoolOrUniversity: 'مدرسة الفرير',
        educationalGrade: 'الصف الأول الإعدادي',
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.member.fullName, 'كيرلس عماد شوقي جرجس');
    assert.strictEqual(body.member.schoolOrUniversity, 'مدرسة الفرير');
  });

  test('2.2 Assistant Secretary CANNOT modify a member in another stage (Scope Mismatch) -> 403', async () => {
    const assistantToken = makeToken({
      userId: 'user-assistant',
      roleLevel: 2,
      roleCode: 'ASSISTANT_SECRETARY',
      stageIds: ['stage-prep-boys'], // Not in prep girls!
      sectorIds: ['sector-youth'],
    });

    const res = await fetch(`${baseUrl}/api/v1/members/member-z`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${assistantToken}`,
      },
      body: JSON.stringify({
        address: 'عنوان غير مصرح بتعديله',
      }),
    });

    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.error.code, 'ACCESS_DENIED_SCOPE');
  });

  test('2.3 Assistant Secretary CAN create a new member in assigned stage -> 201 Created', async () => {
    const assistantToken = makeToken({
      userId: 'user-assistant',
      roleLevel: 2,
      roleCode: 'ASSISTANT_SECRETARY',
      stageIds: ['stage-prep-boys'],
      sectorIds: ['sector-youth'],
    });

    const res = await fetch(`${baseUrl}/api/v1/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${assistantToken}`,
      },
      body: JSON.stringify({
        fullName: 'فادي ماجد سمير',
        dateOfBirth: '2011-06-12',
        address: '10 شارع كورنيش النيل',
        stageId: 'stage-prep-boys',
        phoneNumber: '01288889999',
        fatherName: 'ماجد سمير',
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.member.fullName, 'فادي ماجد سمير');
  });

  test('2.4 Level 1 Servant CANNOT create a member -> 403 Forbidden', async () => {
    const servantAToken = makeToken({
      userId: 'user-servant-a',
      roleLevel: 1,
      roleCode: 'SERVANT',
      stageIds: ['stage-prep-boys'],
      sectorIds: ['sector-youth'],
    });

    const res = await fetch(`${baseUrl}/api/v1/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${servantAToken}`,
      },
      body: JSON.stringify({
        fullName: 'مخدوم تجريبي',
        dateOfBirth: '2011-01-01',
        address: 'عنوان',
        stageId: 'stage-prep-boys',
      }),
    });

    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.error.code, 'ACCESS_DENIED_ROLE');
  });

  // =========================================================================
  // SECTION 3: Sensitive Field Access Logger (NFR-3.3)
  // =========================================================================

  test('3.1 Accessing GET /api/v1/members/:id writes sensitive_access_logs entries', async () => {
    const assistantToken = makeToken({
      userId: 'user-assistant',
      roleLevel: 2,
      roleCode: 'ASSISTANT_SECRETARY',
      stageIds: ['stage-prep-boys'],
      sectorIds: ['sector-youth'],
    });

    const res = await fetch(`${baseUrl}/api/v1/members/member-x`, {
      headers: { Authorization: `Bearer ${assistantToken}` },
    });

    assert.strictEqual(res.status, 200);

    // Verify logs
    const logs = mockDb._data.sensitiveAccessLogs.filter(
      (l) => l.memberId === 'member-x' && l.userId === 'user-assistant'
    );
    assert.ok(logs.length >= 3);
    assert.ok(logs.some((l) => l.field === SensitiveField.FINANCIAL_STATUS));
    assert.ok(logs.some((l) => l.field === SensitiveField.PHONE_NUMBER));
    assert.ok(logs.some((l) => l.field === SensitiveField.HOME_ADDRESS));
  });

  // =========================================================================
  // SECTION 4: Private Supervisory Notes (FR-8.1, FR-8.2)
  // =========================================================================

  test('4.1 Stage Secretary creates confidential supervisory note on Servant A -> 201 Created', async () => {
    const stageSecToken = makeToken({
      userId: 'user-stagesec',
      roleLevel: 3,
      roleCode: 'STAGE_SECRETARY',
      stageIds: ['stage-prep-boys'],
      sectorIds: ['sector-youth'],
    });

    const res = await fetch(`${baseUrl}/api/v1/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${stageSecToken}`,
      },
      body: JSON.stringify({
        targetUserId: 'user-servant-a',
        stageId: 'stage-prep-boys',
        content: 'ملاحظة رعوية سرية: الخادم يحتاج دعم ومساندة في افتقاد الأسر المحتاجة',
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.note.id);
  });

  test('4.2 Upward-Only Visibility: Target Servant A queries notes on himself -> Returns empty array []', async () => {
    // First, verify a note exists on user-servant-a
    await mockDb.supervisoryNote.create({
      data: {
        targetUserId: 'user-servant-a',
        authorUserId: 'user-stagesec',
        stageId: 'stage-prep-boys',
        content: 'ملاحظة سرية سابقة',
      },
    });

    const servantAToken = makeToken({
      userId: 'user-servant-a',
      roleLevel: 1,
      roleCode: 'SERVANT',
      stageIds: ['stage-prep-boys'],
      sectorIds: ['sector-youth'],
    });

    const res = await fetch(`${baseUrl}/api/v1/notes/user-servant-a`, {
      headers: { Authorization: `Bearer ${servantAToken}` },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    // Subordinate cannot see notes on himself!
    assert.deepStrictEqual(body.notes, []);
  });

  test('4.3 Fellow servant queries notes on Servant A -> 403 Forbidden', async () => {
    const servantBToken = makeToken({
      userId: 'user-servant-b',
      roleLevel: 1,
      roleCode: 'SERVANT',
      stageIds: ['stage-prep-boys'],
      sectorIds: ['sector-youth'],
    });

    const res = await fetch(`${baseUrl}/api/v1/notes/user-servant-a`, {
      headers: { Authorization: `Bearer ${servantBToken}` },
    });

    assert.strictEqual(res.status, 403);
  });

  test('4.4 Sector Secretary (Level 4) queries notes on Servant A -> Returns supervisory note', async () => {
    // Create note written by stage secretary on servant A
    await mockDb.supervisoryNote.create({
      data: {
        targetUserId: 'user-servant-a',
        authorUserId: 'user-stagesec',
        stageId: 'stage-prep-boys',
        content: 'ملاحظة سرية من أمين الخدمة للقطاع',
      },
    });

    const sectorSecToken = makeToken({
      userId: 'user-sectorsec',
      roleLevel: 4,
      roleCode: 'SECTOR_SECRETARY',
      stageIds: ['stage-prep-boys'],
      sectorIds: ['sector-youth'],
    });

    const res = await fetch(`${baseUrl}/api/v1/notes/user-servant-a`, {
      headers: { Authorization: `Bearer ${sectorSecToken}` },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(body.notes.length >= 1);
    assert.ok(body.notes[0].content.includes('ملاحظة'));
  });

  // =========================================================================
  // SECTION 5: Bulk Member Import Service (FR-3.3)
  // =========================================================================

  test('5.1 Bulk import endpoint ingests CSV roster into stage -> 200 OK', async () => {
    const assistantToken = makeToken({
      userId: 'user-assistant',
      roleLevel: 2,
      roleCode: 'ASSISTANT_SECRETARY',
      stageIds: ['stage-prep-boys'],
      sectorIds: ['sector-youth'],
    });

    const sampleCsv = `الاسم بالكامل,تاريخ الميلاد,العنوان,رقم الهاتف,اسم الأب
مينا رأفت نعيم,2011-03-10,12 شارع الجيزة,01233334444,رأفت نعيم
أندرو ماجد فهيم,2011-08-25,18 شارع الهرم,01255556666,ماجد فهيم`;

    const res = await fetch(`${baseUrl}/api/v1/members/bulk-import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${assistantToken}`,
      },
      body: JSON.stringify({
        stageId: 'stage-prep-boys',
        csvContent: sampleCsv,
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.importedCount, 2);

    // Verify records exist in mockDb
    const imported = mockDb._data.servedMembers.filter((m) => m.fullName === 'مينا رأفت نعيم');
    assert.strictEqual(imported.length, 1);
    assert.strictEqual(imported[0].fatherName, 'رأفت نعيم');
  });
});
