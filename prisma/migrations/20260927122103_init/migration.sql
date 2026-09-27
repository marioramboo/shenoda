-- CreateEnum
CREATE TYPE "StageGender" AS ENUM ('COED', 'MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "PermissionAction" AS ENUM ('LOGIN', 'VIEW_OWN_PROFILE', 'EDIT_OWN_PROFILE', 'VIEW_OWN_FOLLOWUP', 'SUBMIT_LESSON_PREP', 'EDIT_OWN_SPIRITUAL_LIFE', 'VIEW_YEAR_PLAN', 'OPT_IN_YEAR_PLAN', 'POST_STAGE_YEAR_PLAN_UPDATE', 'MANAGE_YEAR_PLAN_FULL', 'EDIT_ASSIGNED_MEMBER_EVAL', 'MANAGE_MEMBER_FULL', 'VIEW_ANNOUNCEMENT', 'CREATE_ANNOUNCEMENT', 'ADD_PRIVATE_NOTES', 'CREATE_POLL', 'MANAGE_SERVANT_ACCOUNTS', 'EDIT_SERVANT_PROFILE_EVAL', 'EDIT_SERVANT_FOLLOWUP', 'VIEW_SERVANT_LESSON_PREP', 'EDIT_SECRETARY_DATA', 'TRANSFER_SUSPEND_SERVANT', 'VIEW_ANALYTICS_STAGE', 'VIEW_ANALYTICS_SECTOR', 'VIEW_ANALYTICS_ORG', 'EXPORT_REPORTS');

-- CreateEnum
CREATE TYPE "ScopeRule" AS ENUM ('SELF', 'ASSIGNED_MEMBERS', 'STAGE', 'SECTOR', 'ORGANIZATION');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'TRANSFERRED');

-- CreateEnum
CREATE TYPE "SensitiveField" AS ENUM ('FINANCIAL_STATUS', 'PHONE_NUMBER', 'HOME_ADDRESS', 'GUARDIAN_INFO');

-- CreateEnum
CREATE TYPE "AccessType" AS ENUM ('VIEW', 'UPDATE', 'EXPORT');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'EXCUSED', 'LATE');

-- CreateEnum
CREATE TYPE "ServantSessionType" AS ENUM ('MASS', 'LESSON_PREPARATION', 'SERVICE_ATTENDANCE', 'PASTORAL_VISITATION', 'SERVICE_MEETING', 'PRAYER_FAMILY_MEETING', 'ACTIVITIES', 'SECRETARIES_MEETING', 'STAGE_SECRETARIES_MEET');

-- CreateEnum
CREATE TYPE "MemberSessionType" AS ENUM ('MASS', 'SERVICE_ATTENDANCE', 'PASTORAL_VISITATION', 'ACTIVITY_CLUB_TRIP_CONF');

-- CreateEnum
CREATE TYPE "AlertTargetType" AS ENUM ('MEMBER', 'SERVANT');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('ACTIVE', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "PrepStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'REVIEWED');

-- CreateEnum
CREATE TYPE "SpiritualSacrament" AS ENUM ('COMMUNION', 'CONFESSION', 'FASTING', 'PRAYER_RULE');

-- CreateTable
CREATE TABLE "SystemHealth" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemHealth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sectors" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stages" (
    "id" TEXT NOT NULL,
    "sectorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "gender" "StageGender" NOT NULL DEFAULT 'COED',
    "orderIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "description" TEXT,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permission_rules" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "action" "PermissionAction" NOT NULL,
    "scopeRule" "ScopeRule" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permission_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "fatherConfessor" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "address" TEXT,
    "maritalStatus" TEXT,
    "spouseName" TEXT,
    "educationOrCareer" TEXT,
    "childrenInfo" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scope_assignments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sectorId" TEXT,
    "stageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scope_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servant_evaluations" (
    "id" TEXT NOT NULL,
    "subjectUserId" TEXT NOT NULL,
    "evaluatorUserId" TEXT NOT NULL,
    "financialStatus" TEXT,
    "behaviorWithMembers" TEXT,
    "behaviorWithServants" TEXT,
    "cooperation" TEXT,
    "individualInitiative" TEXT,
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "servant_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "otpCode" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_status_logs" (
    "id" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,
    "previousStatus" "UserStatus" NOT NULL,
    "newStatus" "UserStatus" NOT NULL,
    "previousStage" TEXT,
    "newStage" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_status_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "served_members" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "address" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "fatherConfessor" TEXT,
    "fatherName" TEXT,
    "fatherAge" INTEGER,
    "motherName" TEXT,
    "motherAge" INTEGER,
    "schoolOrUniversity" TEXT,
    "educationalGrade" TEXT,
    "siblingsInfo" JSONB,
    "financialStatus" TEXT,
    "behaviorInService" TEXT,
    "peerIntegration" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "served_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_servant_assignments" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "servantUserId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedById" TEXT NOT NULL,

    CONSTRAINT "member_servant_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sensitive_access_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "memberId" TEXT,
    "targetUserId" TEXT,
    "field" "SensitiveField" NOT NULL,
    "accessType" "AccessType" NOT NULL,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sensitive_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_audit_logs" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supervisory_notes" (
    "id" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supervisory_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_attendance" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "sessionType" "MemberSessionType" NOT NULL,
    "sessionDate" TIMESTAMP(3) NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "notes" TEXT,
    "recordedById" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servant_attendance" (
    "id" TEXT NOT NULL,
    "servantUserId" TEXT NOT NULL,
    "stageId" TEXT,
    "sessionType" "ServantSessionType" NOT NULL,
    "sessionDate" TIMESTAMP(3) NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "notes" TEXT,
    "recordedById" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "servant_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "absence_alerts" (
    "id" TEXT NOT NULL,
    "targetType" "AlertTargetType" NOT NULL,
    "memberId" TEXT,
    "servantUserId" TEXT,
    "stageId" TEXT NOT NULL,
    "consecutiveCount" INTEGER NOT NULL,
    "lastAttendedDate" TIMESTAMP(3),
    "alertStatus" "AlertStatus" NOT NULL DEFAULT 'ACTIVE',
    "assignedFollowUpId" TEXT,
    "resolutionNotes" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "absence_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_preparations" (
    "id" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "lessonDate" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "scriptureRef" TEXT,
    "mainObjective" TEXT,
    "content" TEXT NOT NULL,
    "attachments" JSONB,
    "status" "PrepStatus" NOT NULL DEFAULT 'SUBMITTED',
    "reviewerNotes" TEXT,
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lesson_preparations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spiritual_life_entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sacrament" "SpiritualSacrament" NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "fatherName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spiritual_life_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_code_key" ON "organizations"("code");

-- CreateIndex
CREATE UNIQUE INDEX "sectors_organizationId_code_key" ON "sectors"("organizationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "stages_sectorId_code_key" ON "stages"("sectorId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "roles_level_key" ON "roles"("level");

-- CreateIndex
CREATE UNIQUE INDEX "role_permission_rules_roleId_action_key" ON "role_permission_rules"("roleId", "action");

-- CreateIndex
CREATE UNIQUE INDEX "users_phoneNumber_key" ON "users"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_organizationId_roleId_idx" ON "users"("organizationId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "scope_assignments_userId_stageId_sectorId_key" ON "scope_assignments"("userId", "stageId", "sectorId");

-- CreateIndex
CREATE UNIQUE INDEX "servant_evaluations_subjectUserId_key" ON "servant_evaluations"("subjectUserId");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");

-- CreateIndex
CREATE INDEX "account_status_logs_targetUserId_idx" ON "account_status_logs"("targetUserId");

-- CreateIndex
CREATE INDEX "served_members_stageId_idx" ON "served_members"("stageId");

-- CreateIndex
CREATE INDEX "member_servant_assignments_servantUserId_idx" ON "member_servant_assignments"("servantUserId");

-- CreateIndex
CREATE UNIQUE INDEX "member_servant_assignments_memberId_servantUserId_key" ON "member_servant_assignments"("memberId", "servantUserId");

-- CreateIndex
CREATE INDEX "sensitive_access_logs_userId_createdAt_idx" ON "sensitive_access_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "member_audit_logs_memberId_idx" ON "member_audit_logs"("memberId");

-- CreateIndex
CREATE INDEX "supervisory_notes_targetUserId_idx" ON "supervisory_notes"("targetUserId");

-- CreateIndex
CREATE INDEX "member_attendance_stageId_sessionDate_idx" ON "member_attendance"("stageId", "sessionDate");

-- CreateIndex
CREATE INDEX "member_attendance_memberId_sessionDate_idx" ON "member_attendance"("memberId", "sessionDate");

-- CreateIndex
CREATE UNIQUE INDEX "member_attendance_memberId_sessionType_sessionDate_key" ON "member_attendance"("memberId", "sessionType", "sessionDate");

-- CreateIndex
CREATE INDEX "servant_attendance_servantUserId_sessionDate_idx" ON "servant_attendance"("servantUserId", "sessionDate");

-- CreateIndex
CREATE UNIQUE INDEX "servant_attendance_servantUserId_sessionType_sessionDate_key" ON "servant_attendance"("servantUserId", "sessionType", "sessionDate");

-- CreateIndex
CREATE INDEX "absence_alerts_stageId_alertStatus_idx" ON "absence_alerts"("stageId", "alertStatus");

-- CreateIndex
CREATE INDEX "lesson_preparations_stageId_lessonDate_idx" ON "lesson_preparations"("stageId", "lessonDate");

-- CreateIndex
CREATE INDEX "lesson_preparations_authorUserId_idx" ON "lesson_preparations"("authorUserId");

-- CreateIndex
CREATE INDEX "spiritual_life_entries_userId_entryDate_idx" ON "spiritual_life_entries"("userId", "entryDate");

-- AddForeignKey
ALTER TABLE "sectors" ADD CONSTRAINT "sectors_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stages" ADD CONSTRAINT "stages_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "sectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permission_rules" ADD CONSTRAINT "role_permission_rules_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scope_assignments" ADD CONSTRAINT "scope_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scope_assignments" ADD CONSTRAINT "scope_assignments_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "sectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scope_assignments" ADD CONSTRAINT "scope_assignments_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servant_evaluations" ADD CONSTRAINT "servant_evaluations_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servant_evaluations" ADD CONSTRAINT "servant_evaluations_evaluatorUserId_fkey" FOREIGN KEY ("evaluatorUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_status_logs" ADD CONSTRAINT "account_status_logs_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_status_logs" ADD CONSTRAINT "account_status_logs_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "served_members" ADD CONSTRAINT "served_members_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_servant_assignments" ADD CONSTRAINT "member_servant_assignments_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "served_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_servant_assignments" ADD CONSTRAINT "member_servant_assignments_servantUserId_fkey" FOREIGN KEY ("servantUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_servant_assignments" ADD CONSTRAINT "member_servant_assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensitive_access_logs" ADD CONSTRAINT "sensitive_access_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensitive_access_logs" ADD CONSTRAINT "sensitive_access_logs_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "served_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_audit_logs" ADD CONSTRAINT "member_audit_logs_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "served_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_audit_logs" ADD CONSTRAINT "member_audit_logs_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervisory_notes" ADD CONSTRAINT "supervisory_notes_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervisory_notes" ADD CONSTRAINT "supervisory_notes_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervisory_notes" ADD CONSTRAINT "supervisory_notes_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_attendance" ADD CONSTRAINT "member_attendance_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "served_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_attendance" ADD CONSTRAINT "member_attendance_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_attendance" ADD CONSTRAINT "member_attendance_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servant_attendance" ADD CONSTRAINT "servant_attendance_servantUserId_fkey" FOREIGN KEY ("servantUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servant_attendance" ADD CONSTRAINT "servant_attendance_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absence_alerts" ADD CONSTRAINT "absence_alerts_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absence_alerts" ADD CONSTRAINT "absence_alerts_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "served_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absence_alerts" ADD CONSTRAINT "absence_alerts_servantUserId_fkey" FOREIGN KEY ("servantUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absence_alerts" ADD CONSTRAINT "absence_alerts_assignedFollowUpId_fkey" FOREIGN KEY ("assignedFollowUpId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_preparations" ADD CONSTRAINT "lesson_preparations_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_preparations" ADD CONSTRAINT "lesson_preparations_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_preparations" ADD CONSTRAINT "lesson_preparations_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spiritual_life_entries" ADD CONSTRAINT "spiritual_life_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
