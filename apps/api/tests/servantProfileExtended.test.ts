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

describe('Extended Servant Profile Fields & Marital Status Authorization Test Suite', () => {
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
      { id: 'role-stage-sec', code: 'STAGE_SECRETARY', name: 'امين الخدمة', level: 3 },
      { id: 'role-sector-sec', code: 'SECTOR_SECRETARY', name: 'امين قطاع', level: 4 },
      { id: 'role-gen-sec', code: 'GENERAL_SECRETARY', name: 'امين عام', level: 5 }
    );

    // Seed stages & sectors
    mockDb._data.sectors.push({
      id: 'sec-prep',
      organizationId: 'org-1',
      name: 'قطاع إعدادي',
      code: 'PREP_SECTOR',
    });

    mockDb._data.stages.push({
      id: 'stg-prep-boys',
      sectorId: 'sec-prep',
      name: 'مرحلة إعدادي بنين',
      code: 'PREP_BOYS',
    });

    // Seed Servant (Level 1)
    mockDb._data.users.push({
      id: 'user-servant-1',
      organizationId: 'org-1',
      roleId: 'role-servant',
      fullName: 'مينا كمال غالي',
      phoneNumber: '01222222222',
      email: 'mina@church.org',
      passwordHash: defaultPasswordHash,
      status: UserStatus.ACTIVE,
      maritalStatus: 'أعزب',
      spouseName: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Seed Stage Secretary (Level 3)
    mockDb._data.users.push({
      id: 'user-sec-1',
      organizationId: 'org-1',
      roleId: 'role-stage-sec',
      fullName: 'الشماس يوحنا فوزي',
      phoneNumber: '01000000003',
      email: 'yohanna@church.org',
      passwordHash: defaultPasswordHash,
      status: UserStatus.ACTIVE,
      maritalStatus: 'أعزب',
      spouseName: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Scope assignments
    mockDb._data.scopeAssignments.push(
      { id: 'scope-1', userId: 'user-servant-1', stageId: 'stg-prep-boys', sectorId: null },
      { id: 'scope-2', userId: 'user-sec-1', stageId: 'stg-prep-boys', sectorId: 'sec-prep' }
    );
  });

  const getAuthToken = (userId: string, roleCode: string, roleLevel: number, stageIds: string[] = ['stg-prep-boys'], sectorIds: string[] = ['sec-prep']) => {
    return TokenService.generateAccessToken({
      userId,
      roleCode,
      roleLevel,
      stageIds,
      sectorIds,
    });
  };

  test('1. Servant (Level 1) attempting to edit maritalStatus in self-profile is rejected with 403', async () => {
    const token = getAuthToken('user-servant-1', 'SERVANT', 1);

    const res = await fetch(`${baseUrl}/api/v1/auth/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        maritalStatus: 'متزوج',
        spouseName: 'سارة',
      }),
    });

    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error?.code, 'FORBIDDEN_MARITAL_STATUS_UPDATE');
    assert.match(body.error?.message, /أمين الخدمة/);
  });

  test('2. Stage Secretary (Level 3) CAN update their own maritalStatus in self-profile', async () => {
    const token = getAuthToken('user-sec-1', 'STAGE_SECRETARY', 3);

    const res = await fetch(`${baseUrl}/api/v1/auth/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        maritalStatus: 'متزوج',
        spouseName: 'مريم نجيب',
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.user?.maritalStatus, 'متزوج');
    assert.strictEqual(body.user?.spouseName, 'مريم نجيب');
  });

  test('3. Servant can update extended fields (whatsappPhone, social, talents, siblings, activities, deacon, picture)', async () => {
    const token = getAuthToken('user-servant-1', 'SERVANT', 1);

    const res = await fetch(`${baseUrl}/api/v1/auth/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        whatsappPhone: '01099999999',
        facebookUrl: 'https://facebook.com/mina.ghali',
        instagramUrl: 'https://instagram.com/mina.ghali',
        talents: ['ألحان وترتيل', 'تكنولوجيا وبرمجة وميديا'],
        activities: ['كورال', 'كشافة'],
        siblingsInfo: [
          { name: 'فادي كمال', age: 24 },
          { name: 'مارينا كمال', age: 20 },
        ],
        isDeacon: true,
        deaconName: 'الشماس إستفانوس',
        deaconRank: 'أغنسطس (قارئ)',
        profilePicture: 'https://cdn.church.org/avatars/mina.jpg',
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.user?.whatsappPhone, '01099999999');
    assert.strictEqual(body.user?.facebookUrl, 'https://facebook.com/mina.ghali');
    assert.strictEqual(body.user?.instagramUrl, 'https://instagram.com/mina.ghali');
    assert.deepStrictEqual(body.user?.talents, ['ألحان وترتيل', 'تكنولوجيا وبرمجة وميديا']);
    assert.deepStrictEqual(body.user?.activities, ['كورال', 'كشافة']);
    assert.strictEqual(body.user?.isDeacon, true);
    assert.strictEqual(body.user?.deaconName, 'الشماس إستفانوس');
    assert.strictEqual(body.user?.deaconRank, 'أغنسطس (قارئ)');
    assert.strictEqual(body.user?.profilePicture, 'https://cdn.church.org/avatars/mina.jpg');
    assert.strictEqual(body.user?.siblingsInfo?.length, 2);
  });

  test('4. GET /api/v1/auth/me returns default whatsappPhone as phoneNumber if not explicitly set', async () => {
    const token = getAuthToken('user-sec-1', 'STAGE_SECRETARY', 3);

    const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    // Defaults to signed in phone number
    assert.strictEqual(body.user?.whatsappPhone, '01000000003');
  });

  test('5. Stage Secretary (Level 3) can update servant maritalStatus and extended fields via accounts endpoint', async () => {
    const secToken = getAuthToken('user-sec-1', 'STAGE_SECRETARY', 3);

    const res = await fetch(`${baseUrl}/api/v1/accounts/user-servant-1`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secToken}`,
      },
      body: JSON.stringify({
        maritalStatus: 'متزوج',
        spouseName: 'إيرين سامي',
        whatsappPhone: '01123456789',
        isDeacon: true,
        deaconName: 'دياكون أنطونيوس',
        deaconRank: 'إيبودياكون (مساعد شماس)',
        talents: ['شعر وكتابة', 'كرة قدم ورياضة'],
        activities: ['مسرح', 'كورة'],
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.user?.maritalStatus, 'متزوج');
    assert.strictEqual(body.user?.spouseName, 'إيرين سامي');
    assert.strictEqual(body.user?.whatsappPhone, '01123456789');
    assert.strictEqual(body.user?.isDeacon, true);
    assert.strictEqual(body.user?.deaconName, 'دياكون أنطونيوس');
    assert.deepStrictEqual(body.user?.talents, ['شعر وكتابة', 'كرة قدم ورياضة']);
    assert.deepStrictEqual(body.user?.activities, ['مسرح', 'كورة']);
  });

  test('6. Servant attendance list returns enriched extended fields for stage servants', async () => {
    // Populate extended fields on servant in mockDb
    const servant = mockDb._data.users.find((u) => u.id === 'user-servant-1');
    if (servant) {
      servant.maritalStatus = 'متزوج';
      servant.spouseName = 'إيرين سامي';
      servant.whatsappPhone = '01123456789';
      servant.isDeacon = true;
      servant.deaconName = 'دياكون أنطونيوس';
      servant.deaconRank = 'إيبودياكون (مساعد شماس)';
      servant.talents = ['شعر وكتابة', 'كرة قدم ورياضة'];
      servant.activities = ['مسرح', 'كورة'];
      servant.profilePicture = 'https://cdn.church.org/avatars/mina.jpg';
    }

    const secToken = getAuthToken('user-sec-1', 'STAGE_SECRETARY', 3);

    const res = await fetch(`${baseUrl}/api/v1/attendance/servants/list?stageId=stg-prep-boys`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${secToken}`,
      },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    const servantItem = body.data.find((s: any) => s.id === 'user-servant-1');
    assert.ok(servantItem);
    assert.strictEqual(servantItem.maritalStatus, 'متزوج');
    assert.strictEqual(servantItem.spouseName, 'إيرين سامي');
    assert.strictEqual(servantItem.whatsappPhone, '01123456789');
    assert.strictEqual(servantItem.isDeacon, true);
    assert.strictEqual(servantItem.deaconName, 'دياكون أنطونيوس');
    assert.strictEqual(servantItem.deaconRank, 'إيبودياكون (مساعد شماس)');
    assert.deepStrictEqual(servantItem.talents, ['شعر وكتابة', 'كرة قدم ورياضة']);
    assert.deepStrictEqual(servantItem.activities, ['مسرح', 'كورة']);
    assert.strictEqual(servantItem.profilePicture, 'https://cdn.church.org/avatars/mina.jpg');
  });
});
