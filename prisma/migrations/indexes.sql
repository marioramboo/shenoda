-- =========================================================================
-- Phase 9 — High-Performance Indexing Sweep (NFR-2.1 & NFR-2.2)
-- Composite indexes for fast scoped queries at congregation scale
-- =========================================================================

-- 1. Fast attendance lookup by stage, date, and session type
CREATE INDEX IF NOT EXISTS idx_member_attendance_composite 
ON member_attendance ("stageId", "sessionDate", "sessionType");

-- 2. Fast member search by stage and full name (Arabic alphabetical order)
CREATE INDEX IF NOT EXISTS idx_served_members_stage_name 
ON served_members ("stageId", "fullName");

-- 3. Fast servant lookup by organization and role level
CREATE INDEX IF NOT EXISTS idx_users_org_role 
ON users ("organizationId", "roleId");

-- 4. Fast lesson preparation lookup by stage, date, and status
CREATE INDEX IF NOT EXISTS idx_lesson_preparations_stage_date_status
ON lesson_preparations ("stageId", "lessonDate", "status");

-- 5. Fast absence alerts lookup by stage and status
CREATE INDEX IF NOT EXISTS idx_absence_alerts_stage_status
ON absence_alerts ("stageId", "alertStatus");

-- 6. Fast sensitive access logs lookup by user and creation date
CREATE INDEX IF NOT EXISTS idx_sensitive_access_logs_user_date
ON sensitive_access_logs ("userId", "createdAt");

-- 7. Fast scope assignment lookup by stage and user
CREATE INDEX IF NOT EXISTS idx_scope_assignments_stage_user
ON scope_assignments ("stageId", "userId");

-- 8. Fast supervisory notes lookup by target and author
CREATE INDEX IF NOT EXISTS idx_supervisory_notes_target_author
ON supervisory_notes ("targetUserId", "authorUserId");
