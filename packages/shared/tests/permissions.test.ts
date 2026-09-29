import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  hasPermission,
  PermissionAction,
  PERMISSION_MATRIX,
  UserContext,
  TargetScope,
} from '../src';

describe('Phase 1 - Cumulative Permission Engine & Scope Isolation', () => {
  const orgId = 'org-shenoda-main';

  // Sample stage IDs
  const stagePrepBoys = 'stage-prep-boys';
  const stagePrepGirls = 'stage-prep-girls';
  const stagePrimary12 = 'stage-primary-12';

  // Sample sector IDs
  const sectorYouth = 'sector-youth';
  const sectorChildren = 'sector-children';

  // Stage to sector mapping
  const stageToSectorMap: Record<string, string> = {
    [stagePrepBoys]: sectorYouth,
    [stagePrepGirls]: sectorYouth,
    [stagePrimary12]: sectorChildren,
  };

  // 1. Level 1: Servant (خادم)
  const servantUser: UserContext = {
    userId: 'user-servant-1',
    organizationId: orgId,
    roleLevel: 1,
    roleCode: 'SERVANT',
    stageIds: [stagePrepBoys],
    sectorIds: [sectorYouth],
    assignedMemberIds: ['member-101', 'member-102'],
  };

  // 2. Level 2: Assistant Stage Secretary (مساعد امين الخدمة)
  const assistantSecretaryUser: UserContext = {
    userId: 'user-assistant-2',
    organizationId: orgId,
    roleLevel: 2,
    roleCode: 'ASSISTANT_SECRETARY',
    stageIds: [stagePrepBoys],
    sectorIds: [sectorYouth],
  };

  // 3. Level 3: Stage Secretary (امين الخدمة)
  const stageSecretaryUser: UserContext = {
    userId: 'user-stagesec-3',
    organizationId: orgId,
    roleLevel: 3,
    roleCode: 'STAGE_SECRETARY',
    stageIds: [stagePrepBoys],
    sectorIds: [sectorYouth],
  };

  // 4. Level 4: Sector Secretary (امين قطاع)
  const sectorSecretaryUser: UserContext = {
    userId: 'user-sectorsec-4',
    organizationId: orgId,
    roleLevel: 4,
    roleCode: 'SECTOR_SECRETARY',
    stageIds: [stagePrepBoys, stagePrepGirls],
    sectorIds: [sectorYouth], // Only Youth sector, NOT Children sector
  };

  // 5. Level 5: General Secretary (امين عام)
  const generalSecretaryUser: UserContext = {
    userId: 'user-generalsec-5',
    organizationId: orgId,
    roleLevel: 5,
    roleCode: 'GENERAL_SECRETARY',
    stageIds: [stagePrepBoys, stagePrepGirls, stagePrimary12],
    sectorIds: [sectorYouth, sectorChildren],
  };

  describe('1. Level 1 (خادم) Permission Checks', () => {
    test('Servant can view and edit own profile', () => {
      const allowed = hasPermission(
        servantUser,
        PermissionAction.EDIT_OWN_PROFILE,
        { targetUserId: servantUser.userId, orgId }
      );
      assert.strictEqual(allowed, true);
    });

    test('Servant CANNOT edit another servant profile (SELF scope violation)', () => {
      const allowed = hasPermission(
        servantUser,
        PermissionAction.EDIT_OWN_PROFILE,
        { targetUserId: 'other-user', orgId }
      );
      assert.strictEqual(allowed, false);
    });

    test('Servant CANNOT manage members full CRUD (requires Level 2+)', () => {
      const allowed = hasPermission(
        servantUser,
        PermissionAction.MANAGE_MEMBER_FULL,
        { stageId: stagePrepBoys, orgId }
      );
      assert.strictEqual(allowed, false);
    });

    test('Servant can evaluate assigned members', () => {
      const allowed = hasPermission(
        servantUser,
        PermissionAction.EDIT_ASSIGNED_MEMBER_EVAL,
        { memberId: 'member-101', orgId }
      );
      assert.strictEqual(allowed, true);
    });

    test('Servant CANNOT evaluate unassigned member', () => {
      const allowed = hasPermission(
        servantUser,
        PermissionAction.EDIT_ASSIGNED_MEMBER_EVAL,
        { memberId: 'unassigned-member-999', orgId }
      );
      assert.strictEqual(allowed, false);
    });

    test('Servant with undefined assignedMemberIds CANNOT evaluate a specific member', () => {
      const userWithoutAssigned: UserContext = {
        ...servantUser,
        assignedMemberIds: undefined,
      };
      const allowed = hasPermission(
        userWithoutAssigned,
        PermissionAction.EDIT_ASSIGNED_MEMBER_EVAL,
        { memberId: 'member-101', orgId }
      );
      assert.strictEqual(allowed, false);
    });

    test('Servant can view year plan in assigned stage', () => {
      const allowed = hasPermission(
        servantUser,
        PermissionAction.VIEW_YEAR_PLAN,
        { stageId: stagePrepBoys, orgId }
      );
      assert.strictEqual(allowed, true);
    });

    test('Servant CANNOT view year plan in another stage (scope isolation)', () => {
      const allowed = hasPermission(
        servantUser,
        PermissionAction.VIEW_YEAR_PLAN,
        { stageId: stagePrepGirls, orgId }
      );
      assert.strictEqual(allowed, false);
    });
  });

  describe('2. Level 2 (مساعد) Permission Checks', () => {
    test('Assistant Secretary CAN manage members in own stage', () => {
      const allowed = hasPermission(
        assistantSecretaryUser,
        PermissionAction.MANAGE_MEMBER_FULL,
        { stageId: stagePrepBoys, orgId }
      );
      assert.strictEqual(allowed, true);
    });

    test('Assistant Secretary CANNOT manage members in another stage (Scope isolation)', () => {
      const allowed = hasPermission(
        assistantSecretaryUser,
        PermissionAction.MANAGE_MEMBER_FULL,
        { stageId: stagePrepGirls, orgId }
      );
      assert.strictEqual(allowed, false);
    });

    test('Assistant Secretary CANNOT manage year plan full (requires Level 3)', () => {
      const allowed = hasPermission(
        assistantSecretaryUser,
        PermissionAction.MANAGE_YEAR_PLAN_FULL,
        { stageId: stagePrepBoys, orgId }
      );
      assert.strictEqual(allowed, false);
    });
  });

  describe('3. Level 3 (امين الخدمة) Cumulative Inheritance', () => {
    test('Stage Secretary inherits Level 1 and Level 2 permissions', () => {
      // Inherits Level 1
      assert.strictEqual(
        hasPermission(stageSecretaryUser, PermissionAction.VIEW_YEAR_PLAN, { stageId: stagePrepBoys }),
        true
      );
      // Inherits Level 2
      assert.strictEqual(
        hasPermission(stageSecretaryUser, PermissionAction.MANAGE_MEMBER_FULL, { stageId: stagePrepBoys }),
        true
      );
      // Own Level 3 capabilities
      assert.strictEqual(
        hasPermission(stageSecretaryUser, PermissionAction.MANAGE_YEAR_PLAN_FULL, { stageId: stagePrepBoys }),
        true
      );
      assert.strictEqual(
        hasPermission(stageSecretaryUser, PermissionAction.EDIT_SERVANT_PROFILE_EVAL, { stageId: stagePrepBoys }),
        true
      );
      assert.strictEqual(
        hasPermission(stageSecretaryUser, PermissionAction.CREATE_ANNOUNCEMENT, { stageId: stagePrepBoys }),
        true
      );
    });

    test('Stage Secretary CANNOT edit secretary data (requires Level 4 - امين قطاع)', () => {
      const allowed = hasPermission(
        stageSecretaryUser,
        PermissionAction.EDIT_SECRETARY_DATA,
        { sectorId: sectorYouth }
      );
      assert.strictEqual(allowed, false);
    });
  });

  describe('4. Level 4 (امين قطاع) Scope & Boundary Checks', () => {
    test('Sector Secretary can access all stages in youth sector', () => {
      // Access Prep Boys in Youth
      assert.strictEqual(
        hasPermission(sectorSecretaryUser, PermissionAction.EDIT_SECRETARY_DATA, { stageId: stagePrepBoys }, stageToSectorMap),
        true
      );
      // Access Prep Girls in Youth
      assert.strictEqual(
        hasPermission(sectorSecretaryUser, PermissionAction.EDIT_SECRETARY_DATA, { stageId: stagePrepGirls }, stageToSectorMap),
        true
      );
    });

    test('Sector Secretary CANNOT access stages outside their sector (Children sector isolation)', () => {
      const allowed = hasPermission(
        sectorSecretaryUser,
        PermissionAction.EDIT_SECRETARY_DATA,
        { stageId: stagePrimary12, sectorId: sectorChildren },
        stageToSectorMap
      );
      assert.strictEqual(allowed, false);
    });

    test('Sector Secretary CANNOT transfer or suspend servants (Level 5 General Secretary only)', () => {
      const allowed = hasPermission(
        sectorSecretaryUser,
        PermissionAction.TRANSFER_SUSPEND_SERVANT,
        { orgId }
      );
      assert.strictEqual(allowed, false);
    });
  });

  describe('5. Level 5 (امين عام) Organization-Wide Authority', () => {
    test('General Secretary has access to all actions across all stages and sectors', () => {
      // Transfer/suspend servant
      assert.strictEqual(
        hasPermission(generalSecretaryUser, PermissionAction.TRANSFER_SUSPEND_SERVANT, { orgId }),
        true
      );
      // Organization analytics
      assert.strictEqual(
        hasPermission(generalSecretaryUser, PermissionAction.VIEW_ANALYTICS_ORG, { orgId }),
        true
      );
      // Cross-sector access: Primary (Children) & Prep (Youth)
      assert.strictEqual(
        hasPermission(generalSecretaryUser, PermissionAction.MANAGE_MEMBER_FULL, { stageId: stagePrimary12, orgId }),
        true
      );
      assert.strictEqual(
        hasPermission(generalSecretaryUser, PermissionAction.MANAGE_MEMBER_FULL, { stageId: stagePrepBoys, orgId }),
        true
      );
    });

    test('General Secretary is restricted to own organization (Multi-church boundary check)', () => {
      const allowed = hasPermission(
        generalSecretaryUser,
        PermissionAction.VIEW_ANALYTICS_ORG,
        { orgId: 'other-church-org' }
      );
      assert.strictEqual(allowed, false);
    });
  });

  describe('6. Permission Matrix Completeness', () => {
    test('All 26 Permission Actions have valid minLevel and defaultScope defined', () => {
      const actions = Object.values(PermissionAction);
      assert.strictEqual(actions.length, 26);

      for (const action of actions) {
        const rule = PERMISSION_MATRIX[action];
        assert.ok(rule, `Rule missing for action ${action}`);
        assert.ok(rule.minLevel >= 1 && rule.minLevel <= 5, `Invalid minLevel for action ${action}`);
        assert.ok(rule.defaultScope, `Missing defaultScope for action ${action}`);
        assert.ok(rule.description.length > 0, `Missing description for action ${action}`);
      }
    });
  });
});
