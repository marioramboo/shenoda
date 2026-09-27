import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { createApp } from '../src/app';
import { UserContext } from '@shenoda/shared';
import { Server } from 'http';
import { Request, Response, NextFunction } from 'express';

describe('Phase 1 - API Scope Isolation & Permission Middleware Integration', () => {
  let server: Server;
  let baseUrl: string;

  // Active simulated test user that can be switched per test
  let currentTestUser: UserContext | null = null;
  let currentStageToSectorMap: Record<string, string> = {
    'stage-prep-boys': 'sector-youth',
    'stage-prep-girls': 'sector-youth',
    'stage-primary-12': 'sector-children',
  };

  before(async () => {
    // Inject middleware before routes that sets req.user from currentTestUser
    const testAuthMiddleware = (req: Request, _res: Response, next: NextFunction) => {
      if (currentTestUser) {
        req.user = currentTestUser;
        req.stageToSectorMap = currentStageToSectorMap;
      }
      next();
    };

    const app = createApp(testAuthMiddleware);

    // Start on ephemeral port
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

  test('1. Unauthenticated request returns 401 AUTH_REQUIRED', async () => {
    currentTestUser = null;

    const res = await fetch(`${baseUrl}/api/stages/stage-prep-boys/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error.code, 'AUTH_REQUIRED');
  });

  test('2. Level 1 Servant cannot manage members full CRUD -> 403 ACCESS_DENIED_SCOPE', async () => {
    // Servant (Level 1)
    currentTestUser = {
      userId: 'user-servant-1',
      organizationId: 'org-1',
      roleLevel: 1,
      roleCode: 'SERVANT',
      stageIds: ['stage-prep-boys'],
      sectorIds: ['sector-youth'],
    };

    const res = await fetch(`${baseUrl}/api/stages/stage-prep-boys/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error.code, 'ACCESS_DENIED_SCOPE');
    assert.strictEqual(body.error.details.requiredMinLevel, 2);
    assert.strictEqual(body.error.details.userLevel, 1);
  });

  test('3. Level 2 Assistant Secretary CAN manage members in assigned stage -> 200 OK', async () => {
    // Assistant Secretary (Level 2) in prep boys
    currentTestUser = {
      userId: 'user-assistant-2',
      organizationId: 'org-1',
      roleLevel: 2,
      roleCode: 'ASSISTANT_SECRETARY',
      stageIds: ['stage-prep-boys'],
      sectorIds: ['sector-youth'],
    };

    const res = await fetch(`${baseUrl}/api/stages/stage-prep-boys/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.message.includes('stage-prep-boys'));
  });

  test('4. Level 2 Assistant Secretary CANNOT manage members in another stage (Scope Mismatch) -> 403', async () => {
    // Attempting to access prep girls
    currentTestUser = {
      userId: 'user-assistant-2',
      organizationId: 'org-1',
      roleLevel: 2,
      roleCode: 'ASSISTANT_SECRETARY',
      stageIds: ['stage-prep-boys'], // Not in prep girls!
      sectorIds: ['sector-youth'],
    };

    const res = await fetch(`${baseUrl}/api/stages/stage-prep-girls/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.error.code, 'ACCESS_DENIED_SCOPE');
  });

  test('5. Level 3 Stage Secretary can update Year Plan in assigned stage -> 200 OK', async () => {
    currentTestUser = {
      userId: 'user-stagesec-3',
      organizationId: 'org-1',
      roleLevel: 3,
      roleCode: 'STAGE_SECRETARY',
      stageIds: ['stage-prep-boys'],
      sectorIds: ['sector-youth'],
    };

    const res = await fetch(`${baseUrl}/api/stages/stage-prep-boys/year-plan`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
  });

  test('6. Level 3 Stage Secretary CANNOT edit secretary data -> 403 ACCESS_DENIED_SCOPE', async () => {
    currentTestUser = {
      userId: 'user-stagesec-3',
      organizationId: 'org-1',
      roleLevel: 3,
      roleCode: 'STAGE_SECRETARY',
      stageIds: ['stage-prep-boys'],
      sectorIds: ['sector-youth'],
    };

    const res = await fetch(`${baseUrl}/api/sectors/sector-youth/secretaries`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
    });

    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.error.code, 'ACCESS_DENIED_SCOPE');
    assert.strictEqual(body.error.details.requiredMinLevel, 4);
  });

  test('7. Level 4 Sector Secretary can edit secretary data in assigned sector -> 200 OK', async () => {
    currentTestUser = {
      userId: 'user-sectorsec-4',
      organizationId: 'org-1',
      roleLevel: 4,
      roleCode: 'SECTOR_SECRETARY',
      stageIds: ['stage-prep-boys', 'stage-prep-girls'],
      sectorIds: ['sector-youth'],
    };

    const res = await fetch(`${baseUrl}/api/sectors/sector-youth/secretaries`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
  });

  test('8. Level 4 Sector Secretary CANNOT edit secretary data in an unassigned sector -> 403', async () => {
    currentTestUser = {
      userId: 'user-sectorsec-4',
      organizationId: 'org-1',
      roleLevel: 4,
      roleCode: 'SECTOR_SECRETARY',
      stageIds: ['stage-prep-boys', 'stage-prep-girls'],
      sectorIds: ['sector-youth'], // NOT sector-children
    };

    const res = await fetch(`${baseUrl}/api/sectors/sector-children/secretaries`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
    });

    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.error.code, 'ACCESS_DENIED_SCOPE');
  });

  test('9. Level 5 General Secretary can perform TRANSFER_SUSPEND_SERVANT -> 200 OK', async () => {
    currentTestUser = {
      userId: 'user-generalsec-5',
      organizationId: 'org-1',
      roleLevel: 5,
      roleCode: 'GENERAL_SECRETARY',
      stageIds: ['stage-prep-boys', 'stage-prep-girls', 'stage-primary-12'],
      sectorIds: ['sector-youth', 'sector-children'],
    };

    const res = await fetch(`${baseUrl}/api/servants/servant-123/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
  });

  test('10. Level 4 Sector Secretary CANNOT perform TRANSFER_SUSPEND_SERVANT -> 403', async () => {
    currentTestUser = {
      userId: 'user-sectorsec-4',
      organizationId: 'org-1',
      roleLevel: 4,
      roleCode: 'SECTOR_SECRETARY',
      stageIds: ['stage-prep-boys'],
      sectorIds: ['sector-youth'],
    };

    const res = await fetch(`${baseUrl}/api/servants/servant-123/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.error.code, 'ACCESS_DENIED_SCOPE');
    assert.strictEqual(body.error.details.requiredMinLevel, 5);
  });

  test('11. Assumptions A1 & A3: Self-evaluation is strictly rejected -> 403', async () => {
    currentTestUser = {
      userId: 'user-target-1',
      organizationId: 'org-1',
      roleLevel: 3,
      roleCode: 'STAGE_SECRETARY',
      stageIds: ['stage-prep-boys'],
      sectorIds: ['sector-youth'],
    };

    const res = await fetch(`${baseUrl}/api/users/user-target-1/evaluation`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-evaluator-id': 'user-target-1', // Attempt self-evaluation
      },
    });

    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.error.code, 'FORBIDDEN_EVALUATOR');
    assert.ok(body.error.message.includes('Self-evaluation is strictly prohibited'));
  });
});
