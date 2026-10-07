export enum PermissionAction {
  LOGIN = 'LOGIN',
  VIEW_OWN_PROFILE = 'VIEW_OWN_PROFILE',
  EDIT_OWN_PROFILE = 'EDIT_OWN_PROFILE',
  VIEW_OWN_FOLLOWUP = 'VIEW_OWN_FOLLOWUP',
  SUBMIT_LESSON_PREP = 'SUBMIT_LESSON_PREP',
  EDIT_OWN_SPIRITUAL_LIFE = 'EDIT_OWN_SPIRITUAL_LIFE',
  VIEW_YEAR_PLAN = 'VIEW_YEAR_PLAN',
  OPT_IN_YEAR_PLAN = 'OPT_IN_YEAR_PLAN',
  POST_STAGE_YEAR_PLAN_UPDATE = 'POST_STAGE_YEAR_PLAN_UPDATE',
  MANAGE_YEAR_PLAN_FULL = 'MANAGE_YEAR_PLAN_FULL',
  EDIT_ASSIGNED_MEMBER_EVAL = 'EDIT_ASSIGNED_MEMBER_EVAL',
  MANAGE_MEMBER_FULL = 'MANAGE_MEMBER_FULL',
  VIEW_ANNOUNCEMENT = 'VIEW_ANNOUNCEMENT',
  CREATE_ANNOUNCEMENT = 'CREATE_ANNOUNCEMENT',
  ADD_PRIVATE_NOTES = 'ADD_PRIVATE_NOTES',
  CREATE_POLL = 'CREATE_POLL',
  MANAGE_SERVANT_ACCOUNTS = 'MANAGE_SERVANT_ACCOUNTS',
  EDIT_SERVANT_PROFILE_EVAL = 'EDIT_SERVANT_PROFILE_EVAL',
  EDIT_SERVANT_FOLLOWUP = 'EDIT_SERVANT_FOLLOWUP',
  VIEW_SERVANT_LESSON_PREP = 'VIEW_SERVANT_LESSON_PREP',
  EDIT_SECRETARY_DATA = 'EDIT_SECRETARY_DATA',
  TRANSFER_SUSPEND_SERVANT = 'TRANSFER_SUSPEND_SERVANT',
  VIEW_ANALYTICS_STAGE = 'VIEW_ANALYTICS_STAGE',
  VIEW_ANALYTICS_SECTOR = 'VIEW_ANALYTICS_SECTOR',
  VIEW_ANALYTICS_ORG = 'VIEW_ANALYTICS_ORG',
  EXPORT_REPORTS = 'EXPORT_REPORTS',
}

export enum ScopeRule {
  SELF = 'SELF',
  ASSIGNED_MEMBERS = 'ASSIGNED_MEMBERS',
  STAGE = 'STAGE',
  SECTOR = 'SECTOR',
  ORGANIZATION = 'ORGANIZATION',
}

export type RoleLevel = 1 | 2 | 3 | 4 | 5;

export interface PermissionRule {
  action: PermissionAction;
  minLevel: RoleLevel;
  defaultScope: ScopeRule;
  description: string;
}

export interface UserContext {
  userId: string;
  organizationId: string;
  roleLevel: number;
  roleCode: string;
  stageIds: string[];  // Stages user has explicit or inherited access to
  sectorIds: string[]; // Sectors user has explicit or inherited access to
  assignedMemberIds?: string[]; // IDs of members directly assigned to this servant
}

export interface TargetScope {
  stageId?: string;
  sectorId?: string;
  orgId?: string;
  targetUserId?: string;
  memberId?: string;
}

export enum MemberAccessLevel {
  NONE = 'NONE',
  ASSIGNED_EVALUATIVE_ONLY = 'ASSIGNED_EVALUATIVE_ONLY', // خادم (Level 1) assigned to this member (Assumption A2)
  STAGE_FULL_ACCESS = 'STAGE_FULL_ACCESS',               // مساعد (Level 2) & امين الخدمة (Level 3) within stage
  SECTOR_FULL_ACCESS = 'SECTOR_FULL_ACCESS',             // امين قطاع (Level 4) within sector
  ORG_FULL_ACCESS = 'ORG_FULL_ACCESS',                   // امين عام (Level 5) org-wide
}

