import { UserStatus, SensitiveField, AccessType } from '@prisma/client';

export interface MockUser {
  id: string;
  organizationId: string;
  roleId: string;
  fullName: string;
  phoneNumber: string;
  email: string | null;
  passwordHash: string;
  status: UserStatus;
  role?: any;
  scopeAssignments?: any[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MockRole {
  id: string;
  code: string;
  name: string;
  level: number;
}

export interface MockStage {
  id: string;
  sectorId: string;
  name: string;
  code: string;
}

export interface MockSector {
  id: string;
  organizationId: string;
  name: string;
  code: string;
}

export interface MockRefreshToken {
  id: string;
  userId: string;
  tokenHash: string;
  userAgent: string | null;
  ipAddress: string | null;
  isRevoked: boolean;
  expiresAt: Date;
  createdAt: Date;
}

export interface MockPasswordResetToken {
  id: string;
  userId: string;
  tokenHash: string;
  otpCode: string;
  expiresAt: Date;
  isUsed: boolean;
  createdAt: Date;
}

export interface MockAccountStatusLog {
  id: string;
  targetUserId: string;
  changedById: string;
  previousStatus: UserStatus;
  newStatus: UserStatus;
  previousStage: string | null;
  newStage: string | null;
  reason: string | null;
  createdAt: Date;
  changedBy?: any;
}

export interface MockServedMember {
  id: string;
  stageId: string;
  fullName: string;
  dateOfBirth: Date;
  address: string;
  phoneNumber: string | null;
  fatherConfessor: string | null;
  fatherName: string | null;
  fatherAge: number | null;
  motherName: string | null;
  motherAge: number | null;
  schoolOrUniversity: string | null;
  educationalGrade: string | null;
  siblingsInfo: any;
  financialStatus: string | null;
  behaviorInService: string | null;
  peerIntegration: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockMemberServantAssignment {
  id: string;
  memberId: string;
  servantUserId: string;
  assignedAt: Date;
  assignedById: string;
}

export interface MockSensitiveAccessLog {
  id: string;
  userId: string;
  memberId: string | null;
  targetUserId: string | null;
  field: SensitiveField;
  accessType: AccessType;
  ipAddress: string | null;
  createdAt: Date;
}

export interface MockMemberAuditLog {
  id: string;
  memberId: string;
  changedById: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: Date;
}

export interface MockSupervisoryNote {
  id: string;
  targetUserId: string;
  authorUserId: string;
  stageId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockMemberAttendance {
  id: string;
  memberId: string;
  stageId: string;
  sessionType: any;
  sessionDate: Date;
  status: any;
  notes: string | null;
  recordedById: string;
  idempotencyKey: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockServantAttendance {
  id: string;
  servantUserId: string;
  stageId: string | null;
  sessionType: any;
  sessionDate: Date;
  status: any;
  notes: string | null;
  recordedById: string;
  idempotencyKey: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockAbsenceAlert {
  id: string;
  targetType: any;
  memberId: string | null;
  servantUserId: string | null;
  stageId: string;
  consecutiveCount: number;
  lastAttendedDate: Date | null;
  alertStatus: any;
  assignedFollowUpId: string | null;
  resolutionNotes: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockLessonPreparation {
  id: string;
  authorUserId: string;
  stageId: string;
  lessonDate: Date;
  title: string;
  scriptureRef: string | null;
  mainObjective: string | null;
  content: string;
  attachments: any;
  status: any;
  reviewerNotes: string | null;
  reviewedById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockSpiritualLifeEntry {
  id: string;
  userId: string;
  sacrament: any;
  entryDate: Date;
  notes: string | null;
  fatherName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockYearPlan {
  id: string;
  organizationId: string;
  title: string;
  academicYear: string;
  scopeType: any;
  sectorId: string | null;
  stageId: string | null;
  publishedById: string;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockCalendarEvent {
  id: string;
  yearPlanId: string | null;
  stageId: string | null;
  sectorId: string | null;
  title: string;
  description: string | null;
  category: any;
  startDate: Date;
  endDate: Date;
  location: string | null;
  maxVolunteers: number | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockEventVolunteer {
  id: string;
  eventId: string;
  userId: string;
  roleInEvent: string | null;
  createdAt: Date;
}

export interface MockYearPlanServantPost {
  id: string;
  yearPlanId: string;
  stageId: string;
  authorId: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockEventAttendanceConfirmation {
  id: string;
  eventId: string;
  userId: string;
  confirmedById: string;
  confirmedAt: Date;
}

// Phase 7 interfaces
export interface MockAnnouncement {
  id: string;
  authorUserId: string;
  title: string;
  content: string;
  targetScopeType: any;
  targetStageId: string | null;
  targetSectorId: string | null;
  isPinned: boolean;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockAnnouncementRecipient {
  id: string;
  announcementId: string;
  userId: string;
  isRead: boolean;
  readAt: Date | null;
}

export interface MockPoll {
  id: string;
  createdById: string;
  stageId: string | null;
  sectorId: string | null;
  question: string;
  allowMultiple: boolean;
  closesAt: Date;
  isClosed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockPollOption {
  id: string;
  pollId: string;
  text: string;
  order: number;
}

export interface MockPollVote {
  id: string;
  pollId: string;
  optionId: string;
  userId: string;
  createdAt: Date;
}

export interface MockNotificationLog {
  id: string;
  userId: string;
  type: any;
  channel: any;
  title: string;
  body: string;
  dataPayload: any;
  isDelivered: boolean;
  sentAt: Date;
}

export interface MockUserNotificationPreference {
  id: string;
  userId: string;
  enablePush: boolean;
  enableSms: boolean;
  enableEmail: boolean;
  pushSubscription: any;
}

export function createMockPrisma() {
  const users: MockUser[] = [];
  const roles: MockRole[] = [];
  const stages: MockStage[] = [];
  const sectors: MockSector[] = [];
  const scopeAssignments: any[] = [];
  const refreshTokens: MockRefreshToken[] = [];
  const passwordResetTokens: MockPasswordResetToken[] = [];
  const accountStatusLogs: MockAccountStatusLog[] = [];

  // Phase 3 collections
  const servedMembers: MockServedMember[] = [];
  const memberServantAssignments: MockMemberServantAssignment[] = [];
  const sensitiveAccessLogs: MockSensitiveAccessLog[] = [];
  const memberAuditLogs: MockMemberAuditLog[] = [];
  const supervisoryNotes: MockSupervisoryNote[] = [];

  // Phase 4 collections
  const memberAttendances: MockMemberAttendance[] = [];
  const servantAttendances: MockServantAttendance[] = [];
  const absenceAlerts: MockAbsenceAlert[] = [];

  // Phase 5 collections
  const lessonPreparations: MockLessonPreparation[] = [];
  const spiritualLifeEntries: MockSpiritualLifeEntry[] = [];

  // Phase 6 collections
  const yearPlans: MockYearPlan[] = [];
  const calendarEvents: MockCalendarEvent[] = [];
  const eventVolunteers: MockEventVolunteer[] = [];
  const yearPlanServantPosts: MockYearPlanServantPost[] = [];
  const eventAttendanceConfirmations: MockEventAttendanceConfirmation[] = [];

  // Phase 7 collections
  const announcements: MockAnnouncement[] = [];
  const announcementRecipients: MockAnnouncementRecipient[] = [];
  const polls: MockPoll[] = [];
  const pollOptions: MockPollOption[] = [];
  const pollVotes: MockPollVote[] = [];
  const notificationLogs: MockNotificationLog[] = [];
  const userNotificationPreferences: MockUserNotificationPreference[] = [];

  let idCounter = 1;
  const nextId = (prefix: string) => `${prefix}-${idCounter++}`;

  const attachRelationsToUser = (u: MockUser) => {
    const role = roles.find((r) => r.id === u.roleId);
    const userScopes = scopeAssignments
      .filter((s) => s.userId === u.id)
      .map((s) => {
        const stage = s.stageId ? stages.find((st) => st.id === s.stageId) : null;
        const sector = s.sectorId ? sectors.find((sec) => sec.id === s.sectorId) : null;
        return { ...s, stage, sector };
      });
    return {
      ...u,
      role: role || { id: u.roleId, code: 'UNKNOWN', name: 'غير معروف', level: 1 },
      scopeAssignments: userScopes,
    };
  };

  const attachRelationsToMember = (m: MockServedMember) => {
    const stage = stages.find((s) => s.id === m.stageId) || null;
    const assignments = memberServantAssignments
      .filter((a) => a.memberId === m.id)
      .map((a) => {
        const servant = users.find((u) => u.id === a.servantUserId);
        return {
          ...a,
          servant: servant ? { id: servant.id, fullName: servant.fullName, phoneNumber: servant.phoneNumber } : null,
        };
      });

    return {
      ...m,
      stage,
      servantAssignments: assignments,
    };
  };

  const mockDb = {
    _data: {
      users,
      roles,
      stages,
      sectors,
      scopeAssignments,
      refreshTokens,
      passwordResetTokens,
      accountStatusLogs,
      servedMembers,
      memberServantAssignments,
      sensitiveAccessLogs,
      memberAuditLogs,
      supervisoryNotes,
      memberAttendances,
      servantAttendances,
      absenceAlerts,
      lessonPreparations,
      spiritualLifeEntries,
      yearPlans,
      calendarEvents,
      eventVolunteers,
      yearPlanServantPosts,
      eventAttendanceConfirmations,
      announcements,
      announcementRecipients,
      polls,
      pollOptions,
      pollVotes,
      notificationLogs,
      userNotificationPreferences,
    },

    user: {
      findFirst: async (args: any) => {
        const where = args?.where || {};
        let found = users.find((u) => {
          if (where.email && u.email?.toLowerCase() === where.email.toLowerCase()) return true;
          if (where.phoneNumber) {
            if (typeof where.phoneNumber === 'string' && u.phoneNumber === where.phoneNumber) return true;
            if (where.phoneNumber.in && Array.isArray(where.phoneNumber.in)) {
              return where.phoneNumber.in.includes(u.phoneNumber);
            }
          }
          if (where.OR && Array.isArray(where.OR)) {
            return where.OR.some((condition: any) => {
              if (condition.phoneNumber && u.phoneNumber === condition.phoneNumber) return true;
              if (condition.email && u.email?.toLowerCase() === condition.email.toLowerCase()) return true;
              return false;
            });
          }
          return false;
        });

        if (!found) return null;
        return args?.include ? attachRelationsToUser(found) : { ...found };
      },

      findUnique: async (args: any) => {
        const where = args?.where || {};
        const found = users.find((u) => u.id === where.id || u.phoneNumber === where.phoneNumber);
        if (!found) return null;
        return args?.include ? attachRelationsToUser(found) : { ...found };
      },

      findMany: async (args?: any) => {
        const where = args?.where || {};
        let result = users;
        if (where.id?.in) {
          result = result.filter((u) => where.id.in.includes(u.id));
        }
        return result.map((u) => attachRelationsToUser(u));
      },

      create: async (args: any) => {
        const data = args.data;
        const newUser: MockUser = {
          id: data.id || nextId('user'),
          organizationId: data.organizationId || 'org-1',
          roleId: data.roleId,
          fullName: data.fullName,
          phoneNumber: data.phoneNumber,
          email: data.email || null,
          passwordHash: data.passwordHash,
          status: data.status || UserStatus.ACTIVE,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        users.push(newUser);
        return attachRelationsToUser(newUser);
      },

      update: async (args: any) => {
        const { where, data } = args;
        const index = users.findIndex((u) => u.id === where.id);
        if (index === -1) throw new Error('User not found');
        users[index] = {
          ...users[index],
          ...data,
          updatedAt: new Date(),
        };
        return attachRelationsToUser(users[index]);
      },
    },

    role: {
      findUnique: async (args: any) => {
        const where = args?.where || {};
        return roles.find((r) => r.id === where.id || r.code === where.code) || null;
      },
      findFirst: async (args: any) => {
        const where = args?.where || {};
        return roles.find((r) => r.code === where.code || r.level === where.level) || null;
      },
      findMany: async () => roles,
    },

    stage: {
      findUnique: async (args: any) => {
        const where = args?.where || {};
        return stages.find((s) => s.id === where.id || s.code === where.code) || null;
      },
      findMany: async (args?: any) => {
        const where = args?.where || {};
        return stages.filter((s) => {
          if (where.sectorId && s.sectorId !== where.sectorId) return false;
          if (where.id) {
            if (typeof where.id === 'string' && s.id !== where.id) return false;
            if (where.id.in && Array.isArray(where.id.in) && !where.id.in.includes(s.id)) return false;
          }
          return true;
        });
      },
    },

    sector: {
      findUnique: async (args: any) => {
        const where = args?.where || {};
        return sectors.find((s) => s.id === where.id || s.code === where.code) || null;
      },
      findMany: async () => sectors,
    },

    refreshToken: {
      create: async (args: any) => {
        const data = args.data;
        const record: MockRefreshToken = {
          id: nextId('rt'),
          userId: data.userId,
          tokenHash: data.tokenHash,
          userAgent: data.userAgent || null,
          ipAddress: data.ipAddress || null,
          isRevoked: data.isRevoked || false,
          expiresAt: data.expiresAt,
          createdAt: new Date(),
        };
        refreshTokens.push(record);
        return record;
      },
      findUnique: async (args: any) => {
        const where = args?.where || {};
        return refreshTokens.find((r) => r.tokenHash === where.tokenHash) || null;
      },
      update: async (args: any) => {
        const { where, data } = args;
        const record = refreshTokens.find(
          (r) => (where.id && r.id === where.id) || (where.tokenHash && r.tokenHash === where.tokenHash)
        );
        if (!record) throw new Error('RefreshToken not found');
        Object.assign(record, data);
        return record;
      },
      updateMany: async (args: any) => {
        const { where, data } = args;
        let count = 0;
        for (const r of refreshTokens) {
          if (where.userId && r.userId === where.userId) {
            if (where.isRevoked !== undefined && r.isRevoked !== where.isRevoked) continue;
            Object.assign(r, data);
            count++;
          }
        }
        return { count };
      },
    },

    passwordResetToken: {
      create: async (args: any) => {
        const data = args.data;
        const record: MockPasswordResetToken = {
          id: nextId('prt'),
          userId: data.userId,
          tokenHash: data.tokenHash,
          otpCode: data.otpCode,
          expiresAt: data.expiresAt,
          isUsed: data.isUsed || false,
          createdAt: new Date(),
        };
        passwordResetTokens.push(record);
        return record;
      },
      findFirst: async (args: any) => {
        const where = args?.where || {};
        return (
          passwordResetTokens.find((p) => {
            if (where.userId && p.userId !== where.userId) return false;
            if (where.tokenHash && p.tokenHash !== where.tokenHash) return false;
            if (where.isUsed !== undefined && p.isUsed !== where.isUsed) return false;
            if (where.expiresAt?.gt && p.expiresAt <= where.expiresAt.gt) return false;
            return true;
          }) || null
        );
      },
      update: async (args: any) => {
        const { where, data } = args;
        const record = passwordResetTokens.find((p) => p.id === where.id);
        if (!record) throw new Error('PasswordResetToken not found');
        Object.assign(record, data);
        return record;
      },
      updateMany: async (args: any) => {
        const { where, data } = args;
        let count = 0;
        for (const p of passwordResetTokens) {
          if (where.userId && p.userId === where.userId) {
            if (where.isUsed !== undefined && p.isUsed !== where.isUsed) continue;
            Object.assign(p, data);
            count++;
          }
        }
        return { count };
      },
    },

    accountStatusLog: {
      create: async (args: any) => {
        const data = args.data;
        const record: MockAccountStatusLog = {
          id: nextId('asl'),
          targetUserId: data.targetUserId,
          changedById: data.changedById,
          previousStatus: data.previousStatus,
          newStatus: data.newStatus,
          previousStage: data.previousStage || null,
          newStage: data.newStage || null,
          reason: data.reason || null,
          createdAt: new Date(),
        };
        accountStatusLogs.push(record);
        return record;
      },
      findMany: async (args: any) => {
        const where = args?.where || {};
        return accountStatusLogs
          .filter((l) => !where.targetUserId || l.targetUserId === where.targetUserId)
          .map((l) => {
            const changedBy = users.find((u) => u.id === l.changedById);
            return { ...l, changedBy };
          });
      },
    },

    // -------------------------------------------------------------
    // PHASE 3 MODELS
    // -------------------------------------------------------------

    servedMember: {
      create: async (args: any) => {
        const data = args.data;
        const newMember: MockServedMember = {
          id: data.id || nextId('member'),
          stageId: data.stageId,
          fullName: data.fullName,
          dateOfBirth: data.dateOfBirth instanceof Date ? data.dateOfBirth : new Date(data.dateOfBirth),
          address: data.address,
          phoneNumber: data.phoneNumber || null,
          fatherConfessor: data.fatherConfessor || null,
          fatherName: data.fatherName || null,
          fatherAge: data.fatherAge || null,
          motherName: data.motherName || null,
          motherAge: data.motherAge || null,
          schoolOrUniversity: data.schoolOrUniversity || null,
          educationalGrade: data.educationalGrade || null,
          siblingsInfo: data.siblingsInfo || null,
          financialStatus: data.financialStatus || null,
          behaviorInService: data.behaviorInService || null,
          peerIntegration: data.peerIntegration || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        servedMembers.push(newMember);
        return attachRelationsToMember(newMember);
      },

      findUnique: async (args: any) => {
        const where = args?.where || {};
        const found = servedMembers.find((m) => m.id === where.id);
        if (!found) return null;
        return args?.include ? attachRelationsToMember(found) : { ...found };
      },

      findFirst: async (args: any) => {
        const where = args?.where || {};
        const found = servedMembers.find((m) => {
          if (where.id && m.id !== where.id) return false;
          if (where.stageId && m.stageId !== where.stageId) return false;
          return true;
        });
        if (!found) return null;
        return args?.include ? attachRelationsToMember(found) : { ...found };
      },

      findMany: async (args?: any) => {
        const where = args?.where || {};
        let result = servedMembers.filter((m) => {
          if (where.stageId) {
            if (typeof where.stageId === 'string' && m.stageId !== where.stageId) return false;
            if (where.stageId.in && Array.isArray(where.stageId.in) && !where.stageId.in.includes(m.stageId)) {
              return false;
            }
          }

          if (where.servantAssignments?.some?.servantUserId) {
            const hasAssignedServant = memberServantAssignments.some(
              (a) => a.memberId === m.id && a.servantUserId === where.servantAssignments.some.servantUserId
            );
            if (!hasAssignedServant) return false;
          }

          if (where.OR && Array.isArray(where.OR)) {
            const matchesOr = where.OR.some((cond: any) => {
              if (cond.fullName?.contains) {
                return m.fullName.toLowerCase().includes(cond.fullName.contains.toLowerCase());
              }
              if (cond.phoneNumber?.contains) {
                return m.phoneNumber?.includes(cond.phoneNumber.contains);
              }
              return false;
            });
            if (!matchesOr) return false;
          }

          return true;
        });

        if (args?.skip) {
          result = result.slice(args.skip);
        }
        if (args?.take) {
          result = result.slice(0, args.take);
        }

        return result.map((m) => attachRelationsToMember(m));
      },

      count: async (args?: any) => {
        const where = args?.where || {};
        return servedMembers.filter((m) => {
          if (where.stageId) {
            if (typeof where.stageId === 'string' && m.stageId !== where.stageId) return false;
            if (where.stageId.in && Array.isArray(where.stageId.in) && !where.stageId.in.includes(m.stageId)) {
              return false;
            }
          }
          return true;
        }).length;
      },

      update: async (args: any) => {
        const { where, data } = args;
        const index = servedMembers.findIndex((m) => m.id === where.id);
        if (index === -1) throw new Error('ServedMember not found');
        servedMembers[index] = {
          ...servedMembers[index],
          ...data,
          updatedAt: new Date(),
        };
        return attachRelationsToMember(servedMembers[index]);
      },

      delete: async (args: any) => {
        const { where } = args;
        const index = servedMembers.findIndex((m) => m.id === where.id);
        if (index === -1) throw new Error('ServedMember not found');
        const deleted = servedMembers.splice(index, 1)[0];
        return deleted;
      },
    },

    memberServantAssignment: {
      create: async (args: any) => {
        const data = args.data;
        const assignment: MockMemberServantAssignment = {
          id: nextId('msa'),
          memberId: data.memberId,
          servantUserId: data.servantUserId,
          assignedById: data.assignedById,
          assignedAt: new Date(),
        };
        memberServantAssignments.push(assignment);
        return assignment;
      },

      upsert: async (args: any) => {
        const { where, update, create } = args;
        const index = memberServantAssignments.findIndex(
          (a) =>
            a.memberId === where.memberId_servantUserId?.memberId &&
            a.servantUserId === where.memberId_servantUserId?.servantUserId
        );

        if (index >= 0) {
          Object.assign(memberServantAssignments[index], update);
          return memberServantAssignments[index];
        }

        const newRec: MockMemberServantAssignment = {
          id: nextId('msa'),
          memberId: create.memberId,
          servantUserId: create.servantUserId,
          assignedById: create.assignedById,
          assignedAt: new Date(),
        };
        memberServantAssignments.push(newRec);
        return newRec;
      },

      findUnique: async (args: any) => {
        const where = args?.where || {};
        if (where.memberId_servantUserId) {
          const { memberId, servantUserId } = where.memberId_servantUserId;
          return (
            memberServantAssignments.find(
              (a) => a.memberId === memberId && a.servantUserId === servantUserId
            ) || null
          );
        }
        return memberServantAssignments.find((a) => a.id === where.id) || null;
      },

      findFirst: async (args?: any) => {
        const where = args?.where || {};
        return (
          memberServantAssignments.find((a) => {
            if (where.memberId && a.memberId !== where.memberId) return false;
            if (where.servantUserId && a.servantUserId !== where.servantUserId) return false;
            return true;
          }) || null
        );
      },

      findMany: async (args?: any) => {
        const where = args?.where || {};
        const list = memberServantAssignments.filter((a) => {
          if (where.memberId && a.memberId !== where.memberId) return false;
          if (where.servantUserId && a.servantUserId !== where.servantUserId) return false;
          return true;
        });

        if (args?.include?.member) {
          return list.map((a) => {
            const mem = servedMembers.find((m) => m.id === a.memberId);
            return {
              ...a,
              member: mem
                ? {
                    id: mem.id,
                    fullName: mem.fullName,
                    phoneNumber: mem.phoneNumber,
                    educationalGrade: mem.educationalGrade,
                  }
                : null,
            };
          });
        }
        return list;
      },

      deleteMany: async (args: any) => {
        const where = args?.where || {};
        let count = 0;
        for (let i = memberServantAssignments.length - 1; i >= 0; i--) {
          const a = memberServantAssignments[i];
          if (
            (!where.memberId || a.memberId === where.memberId) &&
            (!where.servantUserId || a.servantUserId === where.servantUserId)
          ) {
            memberServantAssignments.splice(i, 1);
            count++;
          }
        }
        return { count };
      },
    },

    scopeAssignment: {
      create: async (args: any) => {
        const sa = { id: args.data.id || nextId('sa'), ...args.data };
        scopeAssignments.push(sa);
        return sa;
      },
      findFirst: async (args?: any) => {
        const where = args?.where || {};
        return (
          scopeAssignments.find((sa) => {
            if (where.stageId && sa.stageId !== where.stageId) return false;
            if (where.sectorId && sa.sectorId !== where.sectorId) return false;
            if (where.userId && sa.userId !== where.userId) return false;
            if (where.user?.role?.level) {
              const u = users.find((usr) => usr.id === sa.userId);
              const r = u ? roles.find((rol) => rol.id === u.roleId) : null;
              if (where.user.role.level.in && Array.isArray(where.user.role.level.in)) {
                if (!r || !where.user.role.level.in.includes(r.level)) return false;
              } else if (r?.level !== where.user.role.level) {
                return false;
              }
            }
            return true;
          }) || null
        );
      },
      findMany: async (args?: any) => {
        const where = args?.where || {};
        const filtered = scopeAssignments.filter((sa) => {
          if (where.stageId && sa.stageId !== where.stageId) return false;
          if (where.sectorId && sa.sectorId !== where.sectorId) return false;
          if (where.userId && sa.userId !== where.userId) return false;
          return true;
        });

        if (args?.include?.user) {
          return filtered.map((s) => {
            const u = users.find((usr) => usr.id === s.userId);
            const userWithRelations = u ? attachRelationsToUser(u) : null;
            return {
              ...s,
              user: userWithRelations,
            };
          });
        }

        return filtered;
      },
      deleteMany: async (args: any) => {
        const where = args?.where || {};
        let count = 0;
        for (let i = scopeAssignments.length - 1; i >= 0; i--) {
          const sa = scopeAssignments[i];
          if (!where.userId || sa.userId === where.userId) {
            scopeAssignments.splice(i, 1);
            count++;
          }
        }
        return { count };
      },
    },

    sensitiveAccessLog: {
      create: async (args: any) => {
        const data = args.data;
        const log: MockSensitiveAccessLog = {
          id: nextId('sal'),
          userId: data.userId,
          memberId: data.memberId || null,
          targetUserId: data.targetUserId || null,
          field: data.field,
          accessType: data.accessType,
          ipAddress: data.ipAddress || null,
          createdAt: new Date(),
        };
        sensitiveAccessLogs.push(log);
        return log;
      },

      findMany: async (args?: any) => {
        const where = args?.where || {};
        return sensitiveAccessLogs.filter((l) => {
          if (where.userId && l.userId !== where.userId) return false;
          if (where.memberId && l.memberId !== where.memberId) return false;
          if (where.field && l.field !== where.field) return false;
          return true;
        });
      },
    },

    memberAuditLog: {
      create: async (args: any) => {
        const data = args.data;
        const log: MockMemberAuditLog = {
          id: nextId('mal'),
          memberId: data.memberId,
          changedById: data.changedById,
          fieldName: data.fieldName,
          oldValue: data.oldValue || null,
          newValue: data.newValue || null,
          createdAt: new Date(),
        };
        memberAuditLogs.push(log);
        return log;
      },

      findMany: async (args?: any) => {
        const where = args?.where || {};
        return memberAuditLogs.filter((l) => {
          if (where.memberId && l.memberId !== where.memberId) return false;
          return true;
        });
      },
    },

    supervisoryNote: {
      create: async (args: any) => {
        const data = args.data;
        const note: MockSupervisoryNote = {
          id: nextId('note'),
          targetUserId: data.targetUserId,
          authorUserId: data.authorUserId,
          stageId: data.stageId,
          content: data.content,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        supervisoryNotes.push(note);
        const author = users.find((u) => u.id === data.authorUserId);
        const role = author ? roles.find((r) => r.id === author.roleId) : null;
        return {
          ...note,
          authorUser: author ? { id: author.id, fullName: author.fullName, role } : null,
        };
      },

      findMany: async (args?: any) => {
        const where = args?.where || {};
        return supervisoryNotes
          .filter((n) => {
            if (where.targetUserId && n.targetUserId !== where.targetUserId) return false;
            return true;
          })
          .map((n) => {
            const author = users.find((u) => u.id === n.authorUserId);
            const role = author ? roles.find((r) => r.id === author.roleId) : null;
            return {
              ...n,
              authorUser: author ? { id: author.id, fullName: author.fullName, role } : null,
            };
          });
      },
    },

    memberAttendance: {
      findMany: async (args?: any) => {
        const where = args?.where || {};
        let list = memberAttendances.filter((ma) => {
          if (where.memberId && ma.memberId !== where.memberId) return false;
          if (where.stageId && ma.stageId !== where.stageId) return false;
          if (where.sessionType) {
            if (where.sessionType.in && Array.isArray(where.sessionType.in)) {
              if (!where.sessionType.in.includes(ma.sessionType)) return false;
            } else if (ma.sessionType !== where.sessionType) {
              return false;
            }
          }
          if (where.sessionDate) {
            const d = new Date(ma.sessionDate).getTime();
            if (where.sessionDate instanceof Date) {
              if (d !== new Date(where.sessionDate).getTime()) return false;
            } else {
              if (where.sessionDate.gte && d < new Date(where.sessionDate.gte).getTime()) return false;
              if (where.sessionDate.lte && d > new Date(where.sessionDate.lte).getTime()) return false;
            }
          }
          return true;
        });

        if (args?.orderBy) {
          list.sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime());
        }

        if (args?.take && list.length > args.take) {
          list = list.slice(0, args.take);
        }

        if (args?.include?.member) {
          return list.map((ma) => {
            const mem = servedMembers.find((m) => m.id === ma.memberId);
            return {
              ...ma,
              member: mem
                ? {
                    id: mem.id,
                    fullName: mem.fullName,
                    educationalGrade: mem.educationalGrade,
                    phoneNumber: mem.phoneNumber,
                  }
                : null,
            };
          });
        }

        return list;
      },

      findFirst: async (args?: any) => {
        const where = args?.where || {};
        return (
          memberAttendances.find((ma) => {
            if (where.memberId && ma.memberId !== where.memberId) return false;
            if (where.sessionType && ma.sessionType !== where.sessionType) return false;
            return true;
          }) || null
        );
      },

      upsert: async (args: any) => {
        const { where, update, create } = args;
        const target = where.memberId_sessionType_sessionDate;
        const existing = memberAttendances.find(
          (ma) =>
            ma.memberId === target.memberId &&
            ma.sessionType === target.sessionType &&
            new Date(ma.sessionDate).getTime() === new Date(target.sessionDate).getTime()
        );

        if (existing) {
          existing.status = update.status;
          if (update.notes !== undefined) existing.notes = update.notes;
          if (update.recordedById) existing.recordedById = update.recordedById;
          if (update.idempotencyKey) existing.idempotencyKey = update.idempotencyKey;
          existing.updatedAt = new Date();
          return existing;
        }

        const newRecord: MockMemberAttendance = {
          id: nextId('matt'),
          memberId: create.memberId,
          stageId: create.stageId,
          sessionType: create.sessionType,
          sessionDate: new Date(create.sessionDate),
          status: create.status,
          notes: create.notes || null,
          recordedById: create.recordedById,
          idempotencyKey: create.idempotencyKey || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        memberAttendances.push(newRecord);
        return newRecord;
      },

      create: async (args: any) => {
        const data = args.data;
        const newRecord: MockMemberAttendance = {
          id: nextId('matt'),
          memberId: data.memberId,
          stageId: data.stageId,
          sessionType: data.sessionType,
          sessionDate: new Date(data.sessionDate),
          status: data.status,
          notes: data.notes || null,
          recordedById: data.recordedById,
          idempotencyKey: data.idempotencyKey || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        memberAttendances.push(newRecord);
        return newRecord;
      },
    },

    servantAttendance: {
      findMany: async (args?: any) => {
        const where = args?.where || {};
        let list = servantAttendances.filter((sa) => {
          if (where.servantUserId && sa.servantUserId !== where.servantUserId) return false;
          if (where.stageId && sa.stageId !== where.stageId) return false;
          if (where.sessionType && sa.sessionType !== where.sessionType) return false;
          if (where.sessionDate) {
            const d = new Date(sa.sessionDate).getTime();
            if (where.sessionDate.gte && d < new Date(where.sessionDate.gte).getTime()) return false;
            if (where.sessionDate.lte && d > new Date(where.sessionDate.lte).getTime()) return false;
          }
          return true;
        });

        if (args?.orderBy) {
          list.sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime());
        }

        if (args?.include?.recordedBy) {
          return list.map((sa) => {
            const rec = users.find((u) => u.id === sa.recordedById);
            const role = rec ? roles.find((r) => r.id === rec.roleId) : null;
            return {
              ...sa,
              recordedBy: rec ? { id: rec.id, fullName: rec.fullName, role: { name: role?.name } } : null,
            };
          });
        }

        return list;
      },

      upsert: async (args: any) => {
        const { where, update, create } = args;
        const target = where.servantUserId_sessionType_sessionDate;
        const existing = servantAttendances.find(
          (sa) =>
            sa.servantUserId === target.servantUserId &&
            sa.sessionType === target.sessionType &&
            new Date(sa.sessionDate).getTime() === new Date(target.sessionDate).getTime()
        );

        if (existing) {
          existing.status = update.status;
          if (update.notes !== undefined) existing.notes = update.notes;
          if (update.recordedById) existing.recordedById = update.recordedById;
          existing.updatedAt = new Date();
          return existing;
        }

        const newRecord: MockServantAttendance = {
          id: nextId('satt'),
          servantUserId: create.servantUserId,
          stageId: create.stageId || null,
          sessionType: create.sessionType,
          sessionDate: new Date(create.sessionDate),
          status: create.status,
          notes: create.notes || null,
          recordedById: create.recordedById,
          idempotencyKey: create.idempotencyKey || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        servantAttendances.push(newRecord);
        return newRecord;
      },
    },

    absenceAlert: {
      findMany: async (args?: any) => {
        const where = args?.where || {};
        let list = absenceAlerts.filter((a) => {
          if (where.alertStatus && a.alertStatus !== where.alertStatus) return false;
          if (where.targetType && a.targetType !== where.targetType) return false;
          if (where.stageId) {
            if (typeof where.stageId === 'string' && a.stageId !== where.stageId) return false;
            if (where.stageId.in && !where.stageId.in.includes(a.stageId)) return false;
          }
          if (where.OR && Array.isArray(where.OR)) {
            const matchesOr = where.OR.some((orClause: any) => {
              if (orClause.assignedFollowUpId && a.assignedFollowUpId === orClause.assignedFollowUpId) return true;
              if (orClause.memberId) {
                if (orClause.memberId.in && Array.isArray(orClause.memberId.in) && orClause.memberId.in.includes(a.memberId)) return true;
                if (a.memberId === orClause.memberId) return true;
              }
              if (orClause.member?.servantAssignments?.some) {
                const servantUserId = orClause.member.servantAssignments.some.servantUserId;
                const isAssigned = memberServantAssignments.some(
                  (msa) => msa.memberId === a.memberId && msa.servantUserId === servantUserId
                );
                if (isAssigned) return true;
              }
              return false;
            });
            if (!matchesOr) return false;
          }
          return true;
        });

        if (args?.include) {
          return list.map((a) => {
            const mem = a.memberId ? servedMembers.find((m) => m.id === a.memberId) : null;
            const servant = a.servantUserId ? users.find((u) => u.id === a.servantUserId) : null;
            const followUp = a.assignedFollowUpId ? users.find((u) => u.id === a.assignedFollowUpId) : null;
            const stage = stages.find((s) => s.id === a.stageId);
            return {
              ...a,
              member: mem
                ? {
                    id: mem.id,
                    fullName: mem.fullName,
                    phoneNumber: mem.phoneNumber,
                    educationalGrade: mem.educationalGrade,
                  }
                : null,
              servantUser: servant ? { id: servant.id, fullName: servant.fullName, phoneNumber: servant.phoneNumber } : null,
              assignedFollowUp: followUp ? { id: followUp.id, fullName: followUp.fullName } : null,
              stage: stage ? { id: stage.id, name: stage.name } : null,
            };
          });
        }

        return list;
      },

      count: async (args?: any) => {
        const where = args?.where || {};
        return absenceAlerts.filter((a) => {
          if (where.targetType && a.targetType !== where.targetType) return false;
          if (where.alertStatus && a.alertStatus !== where.alertStatus) return false;
          if (where.stageId) {
            if (typeof where.stageId === 'string' && a.stageId !== where.stageId) return false;
            if (where.stageId.in && !where.stageId.in.includes(a.stageId)) return false;
          }
          return true;
        }).length;
      },

      findFirst: async (args?: any) => {
        const where = args?.where || {};
        return (
          absenceAlerts.find((a) => {
            if (where.memberId && a.memberId !== where.memberId) return false;
            if (where.servantUserId && a.servantUserId !== where.servantUserId) return false;
            if (where.alertStatus && a.alertStatus !== where.alertStatus) return false;
            return true;
          }) || null
        );
      },

      findUnique: async (args: any) => {
        const where = args?.where || {};
        return absenceAlerts.find((a) => a.id === where.id) || null;
      },

      create: async (args: any) => {
        const data = args.data;
        const alert: MockAbsenceAlert = {
          id: nextId('alert'),
          targetType: data.targetType,
          memberId: data.memberId || null,
          servantUserId: data.servantUserId || null,
          stageId: data.stageId,
          consecutiveCount: data.consecutiveCount,
          lastAttendedDate: data.lastAttendedDate ? new Date(data.lastAttendedDate) : null,
          alertStatus: data.alertStatus || 'ACTIVE',
          assignedFollowUpId: data.assignedFollowUpId || null,
          resolutionNotes: null,
          resolvedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        absenceAlerts.push(alert);
        return alert;
      },

      update: async (args: any) => {
        const { where, data } = args;
        const alert = absenceAlerts.find((a) => a.id === where.id);
        if (!alert) throw new Error('Alert not found');
        if (data.consecutiveCount !== undefined) alert.consecutiveCount = data.consecutiveCount;
        if (data.lastAttendedDate !== undefined) alert.lastAttendedDate = data.lastAttendedDate;
        if (data.alertStatus !== undefined) alert.alertStatus = data.alertStatus;
        if (data.resolvedAt !== undefined) alert.resolvedAt = data.resolvedAt;
        if (data.resolutionNotes !== undefined) alert.resolutionNotes = data.resolutionNotes;
        alert.updatedAt = new Date();

        if (args?.include?.member) {
          const mem = alert.memberId ? servedMembers.find((m) => m.id === alert.memberId) : null;
          return { ...alert, member: mem };
        }
        return alert;
      },
    },

    lessonPreparation: {
      create: async (args: any) => {
        const d = args.data;
        const newPrep: MockLessonPreparation = {
          id: nextId('prep'),
          authorUserId: d.authorUserId,
          stageId: d.stageId,
          lessonDate: new Date(d.lessonDate),
          title: d.title,
          scriptureRef: d.scriptureRef || null,
          mainObjective: d.mainObjective || null,
          content: d.content,
          attachments: d.attachments || null,
          status: d.status || 'SUBMITTED',
          reviewerNotes: null,
          reviewedById: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        lessonPreparations.push(newPrep);
        const stage = stages.find((s) => s.id === newPrep.stageId);
        const author = users.find((u) => u.id === newPrep.authorUserId);
        return {
          ...newPrep,
          stage: stage ? { id: stage.id, name: stage.name } : null,
          author: author ? { id: author.id, fullName: author.fullName } : null,
        };
      },

      count: async (args?: any) => {
        const where = args?.where || {};
        return lessonPreparations.filter((p) => {
          if (where.authorUserId && p.authorUserId !== where.authorUserId) return false;
          return true;
        }).length;
      },

      findMany: async (args?: any) => {
        const where = args?.where || {};
        let list = lessonPreparations.filter((p) => {
          if (where.authorUserId && p.authorUserId !== where.authorUserId) return false;
          if (where.stageId) {
            if (typeof where.stageId === 'string' && p.stageId !== where.stageId) return false;
            if (where.stageId.in && !where.stageId.in.includes(p.stageId)) return false;
          }
          if (where.status && p.status !== where.status) return false;
          if (where.lessonDate) {
            const d = new Date(p.lessonDate).getTime();
            if (where.lessonDate.gte && d < new Date(where.lessonDate.gte).getTime()) return false;
            if (where.lessonDate.lte && d > new Date(where.lessonDate.lte).getTime()) return false;
          }
          return true;
        });

        if (args?.orderBy?.lessonDate === 'asc') {
          list.sort((a, b) => new Date(a.lessonDate).getTime() - new Date(b.lessonDate).getTime());
        } else {
          list.sort((a, b) => new Date(b.lessonDate).getTime() - new Date(a.lessonDate).getTime());
        }

        if (args?.take && list.length > args.take) {
          list = list.slice(0, args.take);
        }

        if (args?.include) {
          return list.map((p) => {
            const stage = stages.find((s) => s.id === p.stageId);
            const author = users.find((u) => u.id === p.authorUserId);
            const rev = p.reviewedById ? users.find((u) => u.id === p.reviewedById) : null;
            const revRole = rev ? roles.find((r) => r.id === rev.roleId) : null;
            const authorRole = author ? roles.find((r) => r.id === author.roleId) : null;
            return {
              ...p,
              stage: stage ? { id: stage.id, name: stage.name, sectorId: stage.sectorId } : null,
              author: author
                ? {
                    id: author.id,
                    fullName: author.fullName,
                    role: authorRole ? { id: authorRole.id, name: authorRole.name, level: authorRole.level, code: authorRole.code } : null,
                  }
                : null,
              reviewedBy: rev
                ? {
                    id: rev.id,
                    fullName: rev.fullName,
                    role: revRole ? { id: revRole.id, name: revRole.name, level: revRole.level, code: revRole.code } : null,
                  }
                : null,
            };
          });
        }

        return list;
      },

      findUnique: async (args: any) => {
        const where = args?.where || {};
        const p = lessonPreparations.find((item) => item.id === where.id);
        if (!p) return null;
        const stage = stages.find((s) => s.id === p.stageId);
        const author = users.find((u) => u.id === p.authorUserId);
        const rev = p.reviewedById ? users.find((u) => u.id === p.reviewedById) : null;
        const revRole = rev ? roles.find((r) => r.id === rev.roleId) : null;
        const authorRole = author ? roles.find((r) => r.id === author.roleId) : null;
        return {
          ...p,
          stage: stage ? { id: stage.id, name: stage.name, sectorId: stage.sectorId } : null,
          author: author
            ? {
                id: author.id,
                fullName: author.fullName,
                role: authorRole ? { id: authorRole.id, name: authorRole.name, level: authorRole.level, code: authorRole.code } : null,
              }
            : null,
          reviewedBy: rev
            ? {
                id: rev.id,
                fullName: rev.fullName,
                role: revRole ? { id: revRole.id, name: revRole.name, level: revRole.level, code: revRole.code } : null,
              }
            : null,
        };
      },

      findFirst: async (args: any) => {
        const where = args?.where || {};
        return (
          lessonPreparations.find((p) => {
            if (where.servantId && p.authorUserId !== where.servantId) return false;
            if (where.authorUserId && p.authorUserId !== where.authorUserId) return false;
            if (where.status?.in && !where.status.in.includes(p.status)) return false;
            return true;
          }) || null
        );
      },

      update: async (args: any) => {
        const { where, data } = args;
        const p = lessonPreparations.find((item) => item.id === where.id);
        if (!p) throw new Error('Lesson preparation not found');
        if (data.title !== undefined) p.title = data.title;
        if (data.scriptureRef !== undefined) p.scriptureRef = data.scriptureRef;
        if (data.mainObjective !== undefined) p.mainObjective = data.mainObjective;
        if (data.content !== undefined) p.content = data.content;
        if (data.attachments !== undefined) p.attachments = data.attachments;
        if (data.status !== undefined) p.status = data.status;
        if (data.reviewerNotes !== undefined) p.reviewerNotes = data.reviewerNotes;
        if (data.reviewedById !== undefined) p.reviewedById = data.reviewedById;
        p.updatedAt = new Date();

        const stage = stages.find((s) => s.id === p.stageId);
        const author = users.find((u) => u.id === p.authorUserId);
        const rev = p.reviewedById ? users.find((u) => u.id === p.reviewedById) : null;
        const revRole = rev ? roles.find((r) => r.id === rev.roleId) : null;
        const authorRole = author ? roles.find((r) => r.id === author.roleId) : null;
        return {
          ...p,
          stage: stage ? { id: stage.id, name: stage.name, sectorId: stage.sectorId } : null,
          author: author
            ? {
                id: author.id,
                fullName: author.fullName,
                role: authorRole ? { id: authorRole.id, name: authorRole.name, level: authorRole.level, code: authorRole.code } : null,
              }
            : null,
          reviewedBy: rev
            ? {
                id: rev.id,
                fullName: rev.fullName,
                role: revRole ? { id: revRole.id, name: revRole.name, level: revRole.level, code: revRole.code } : null,
              }
            : null,
        };
      },

      delete: async (args: any) => {
        const { where } = args;
        const index = lessonPreparations.findIndex((item) => item.id === where.id);
        if (index === -1) throw new Error('Lesson preparation not found');
        return lessonPreparations.splice(index, 1)[0];
      },
    },

    spiritualLifeEntry: {
      create: async (args: any) => {
        const d = args.data;
        const entry: MockSpiritualLifeEntry = {
          id: nextId('spentry'),
          userId: d.userId,
          sacrament: d.sacrament,
          entryDate: new Date(d.entryDate),
          notes: d.notes || null,
          fatherName: d.fatherName || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        spiritualLifeEntries.push(entry);
        return entry;
      },

      findMany: async (args?: any) => {
        const where = args?.where || {};
        let list = spiritualLifeEntries.filter((e) => {
          if (where.userId && e.userId !== where.userId) return false;
          if (where.sacrament && e.sacrament !== where.sacrament) return false;
          if (where.entryDate) {
            const d = new Date(e.entryDate).getTime();
            if (where.entryDate.gte && d < new Date(where.entryDate.gte).getTime()) return false;
            if (where.entryDate.lte && d > new Date(where.entryDate.lte).getTime()) return false;
          }
          return true;
        });

        list.sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());
        return list;
      },

      findFirst: async (args?: any) => {
        const where = args?.where || {};
        let list = spiritualLifeEntries.filter((e) => {
          if (where.userId && e.userId !== where.userId) return false;
          if (where.sacrament && e.sacrament !== where.sacrament) return false;
          return true;
        });
        list.sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());
        return list[0] || null;
      },

      findUnique: async (args: any) => {
        const where = args?.where || {};
        return spiritualLifeEntries.find((e) => e.id === where.id) || null;
      },

      delete: async (args: any) => {
        const { where } = args;
        const index = spiritualLifeEntries.findIndex((e) => e.id === where.id);
        if (index === -1) throw new Error('Spiritual entry not found');
        return spiritualLifeEntries.splice(index, 1)[0];
      },
    },

    yearPlan: {
      create: async (args: any) => {
        const d = args.data;
        const plan: MockYearPlan = {
          id: nextId('yp'),
          organizationId: d.organizationId,
          title: d.title,
          academicYear: d.academicYear,
          scopeType: d.scopeType,
          sectorId: d.sectorId || null,
          stageId: d.stageId || null,
          publishedById: d.publishedById,
          isPublished: d.isPublished ?? false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        yearPlans.push(plan);
        const stage = stages.find((s) => s.id === plan.stageId);
        const sector = sectors.find((s) => s.id === plan.sectorId);
        const pub = users.find((u) => u.id === plan.publishedById);
        return {
          ...plan,
          stage: stage ? { id: stage.id, name: stage.name } : null,
          sector: sector ? { id: sector.id, name: sector.name } : null,
          publishedBy: pub ? { id: pub.id, fullName: pub.fullName } : null,
        };
      },

      findMany: async (args?: any) => {
        const where = args?.where || {};
        let list = yearPlans.filter((p) => {
          if (where.academicYear && p.academicYear !== where.academicYear) return false;
          if (where.stageId && p.stageId !== where.stageId) return false;
          if (where.sectorId && p.sectorId !== where.sectorId) return false;
          if (where.isPublished !== undefined && p.isPublished !== where.isPublished) return false;
          if (where.OR && Array.isArray(where.OR)) {
            const matchesOr = where.OR.some((orClause: any) => {
              if (orClause.scopeType && p.scopeType === orClause.scopeType) {
                if (orClause.isPublished !== undefined && p.isPublished !== orClause.isPublished) return false;
                if (orClause.sectorId?.in && !orClause.sectorId.in.includes(p.sectorId)) return false;
                if (orClause.stageId?.in && !orClause.stageId.in.includes(p.stageId)) return false;
                if (orClause.OR && Array.isArray(orClause.OR)) {
                  return orClause.OR.some((sub: any) => {
                    if (sub.isPublished !== undefined && p.isPublished === sub.isPublished) return true;
                    if (sub.publishedById && p.publishedById === sub.publishedById) return true;
                    return false;
                  });
                }
                return true;
              }
              return false;
            });
            if (!matchesOr) return false;
          }
          return true;
        });

        if (args?.include) {
          return list.map((p) => {
            const stage = stages.find((s) => s.id === p.stageId);
            const sector = sectors.find((s) => s.id === p.sectorId);
            const pub = users.find((u) => u.id === p.publishedById);
            const evCount = calendarEvents.filter((e) => e.yearPlanId === p.id).length;
            const postCount = yearPlanServantPosts.filter((sp) => sp.yearPlanId === p.id).length;
            return {
              ...p,
              stage: stage ? { id: stage.id, name: stage.name } : null,
              sector: sector ? { id: sector.id, name: sector.name } : null,
              publishedBy: pub ? { id: pub.id, fullName: pub.fullName } : null,
              _count: { events: evCount, servantPosts: postCount },
            };
          });
        }
        return list;
      },

      findUnique: async (args: any) => {
        const where = args?.where || {};
        const p = yearPlans.find((item) => item.id === where.id);
        if (!p) return null;
        const stage = stages.find((s) => s.id === p.stageId);
        const sector = sectors.find((s) => s.id === p.sectorId);
        const pub = users.find((u) => u.id === p.publishedById);
        const evs = calendarEvents
          .filter((e) => e.yearPlanId === p.id)
          .map((e) => {
            const vols = eventVolunteers
              .filter((v) => v.eventId === e.id)
              .map((v) => {
                const u = users.find((usr) => usr.id === v.userId);
                return {
                  ...v,
                  user: u ? { id: u.id, fullName: u.fullName, phoneNumber: u.phoneNumber } : null,
                };
              });
            return { ...e, volunteers: vols };
          });

        return {
          ...p,
          stage: stage ? { id: stage.id, name: stage.name } : null,
          sector: sector ? { id: sector.id, name: sector.name } : null,
          publishedBy: pub ? { id: pub.id, fullName: pub.fullName } : null,
          events: evs,
        };
      },

      update: async (args: any) => {
        const { where, data } = args;
        const p = yearPlans.find((item) => item.id === where.id);
        if (!p) throw new Error('YearPlan not found');
        Object.assign(p, data, { updatedAt: new Date() });
        return p;
      },
    },

    calendarEvent: {
      create: async (args: any) => {
        const d = args.data;
        const ev: MockCalendarEvent = {
          id: nextId('event'),
          yearPlanId: d.yearPlanId || null,
          stageId: d.stageId || null,
          sectorId: d.sectorId || null,
          title: d.title,
          description: d.description || null,
          category: d.category,
          startDate: new Date(d.startDate),
          endDate: new Date(d.endDate),
          location: d.location || null,
          maxVolunteers: d.maxVolunteers || null,
          createdById: d.createdById,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        calendarEvents.push(ev);
        const stage = stages.find((s) => s.id === ev.stageId);
        return {
          ...ev,
          stage: stage ? { id: stage.id, name: stage.name } : null,
        };
      },

      findMany: async (args?: any) => {
        const where = args?.where || {};
        let list = calendarEvents.filter((e) => {
          if (where.yearPlanId && e.yearPlanId !== where.yearPlanId) return false;
          if (where.category && e.category !== where.category) return false;
          if (where.stageId && e.stageId !== where.stageId) return false;
          if (where.startDate) {
            const st = new Date(e.startDate).getTime();
            if (where.startDate.gte && st < new Date(where.startDate.gte).getTime()) return false;
            if (where.startDate.lte && st > new Date(where.startDate.lte).getTime()) return false;
          }
          if (where.OR && Array.isArray(where.OR)) {
            const matchesOr = where.OR.some((orClause: any) => {
              if (orClause.stageId === null && orClause.sectorId === null && e.stageId === null && e.sectorId === null) {
                return true;
              }
              if (orClause.stageId?.in && e.stageId && orClause.stageId.in.includes(e.stageId)) {
                return true;
              }
              if (orClause.sectorId?.in && e.sectorId && orClause.sectorId.in.includes(e.sectorId)) {
                return true;
              }
              if (orClause.volunteers?.some) {
                const isVol = eventVolunteers.some(
                  (v) => v.eventId === e.id && v.userId === orClause.volunteers.some.userId
                );
                if (isVol) return true;
              }
              return false;
            });
            if (!matchesOr) return false;
          }
          return true;
        });

        list.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

        if (args?.include) {
          return list.map((e) => {
            const stage = stages.find((s) => s.id === e.stageId);
            const sector = sectors.find((s) => s.id === e.sectorId);
            const vols = eventVolunteers
              .filter((v) => v.eventId === e.id)
              .map((v) => {
                const u = users.find((usr) => usr.id === v.userId);
                return {
                  ...v,
                  user: u ? { id: u.id, fullName: u.fullName, phoneNumber: u.phoneNumber } : null,
                };
              });
            const atts = eventAttendanceConfirmations
              .filter((a) => a.eventId === e.id)
              .map((a) => ({ id: a.id, userId: a.userId, confirmedAt: a.confirmedAt }));
            return {
              ...e,
              stage: stage ? { id: stage.id, name: stage.name } : null,
              sector: sector ? { id: sector.id, name: sector.name } : null,
              volunteers: vols,
              eventAttendances: atts,
            };
          });
        }
        return list;
      },

      findUnique: async (args: any) => {
        const where = args?.where || {};
        const e = calendarEvents.find((item) => item.id === where.id);
        if (!e) return null;
        const stage = stages.find((s) => s.id === e.stageId);
        const sector = sectors.find((s) => s.id === e.sectorId);
        const creator = users.find((u) => u.id === e.createdById);
        const vols = eventVolunteers
          .filter((v) => v.eventId === e.id)
          .map((v) => {
            const u = users.find((usr) => usr.id === v.userId);
            return {
              ...v,
              user: u ? { id: u.id, fullName: u.fullName, phoneNumber: u.phoneNumber } : null,
            };
          });
        const atts = eventAttendanceConfirmations
          .filter((a) => a.eventId === e.id)
          .map((a) => {
            const u = users.find((usr) => usr.id === a.userId);
            const conf = users.find((usr) => usr.id === a.confirmedById);
            return {
              ...a,
              user: u ? { id: u.id, fullName: u.fullName } : null,
              confirmedBy: conf ? { id: conf.id, fullName: conf.fullName } : null,
            };
          });

        return {
          ...e,
          stage: stage ? { id: stage.id, name: stage.name } : null,
          sector: sector ? { id: sector.id, name: sector.name } : null,
          createdBy: creator ? { id: creator.id, fullName: creator.fullName } : null,
          volunteers: vols,
          eventAttendances: atts,
        };
      },

      update: async (args: any) => {
        const { where, data } = args;
        const e = calendarEvents.find((item) => item.id === where.id);
        if (!e) throw new Error('CalendarEvent not found');
        Object.assign(e, data, { updatedAt: new Date() });
        return e;
      },

      delete: async (args: any) => {
        const { where } = args;
        const index = calendarEvents.findIndex((item) => item.id === where.id);
        if (index === -1) throw new Error('CalendarEvent not found');
        return calendarEvents.splice(index, 1)[0];
      },
    },

    eventVolunteer: {
      create: async (args: any) => {
        const d = args.data;
        const vol: MockEventVolunteer = {
          id: nextId('vol'),
          eventId: d.eventId,
          userId: d.userId,
          roleInEvent: d.roleInEvent || null,
          createdAt: new Date(),
        };
        eventVolunteers.push(vol);
        const u = users.find((usr) => usr.id === vol.userId);
        return {
          ...vol,
          user: u ? { id: u.id, fullName: u.fullName, phoneNumber: u.phoneNumber } : null,
        };
      },

      findUnique: async (args: any) => {
        const where = args?.where || {};
        if (where.eventId_userId) {
          return (
            eventVolunteers.find(
              (v) =>
                v.eventId === where.eventId_userId.eventId &&
                v.userId === where.eventId_userId.userId
            ) || null
          );
        }
        return eventVolunteers.find((v) => v.id === where.id) || null;
      },

      findMany: async (args?: any) => {
        const where = args?.where || {};
        return eventVolunteers.filter((v) => {
          if (where.eventId && v.eventId !== where.eventId) return false;
          if (where.userId && v.userId !== where.userId) return false;
          return true;
        });
      },

      count: async (args?: any) => {
        const where = args?.where || {};
        return eventVolunteers.filter((v) => {
          if (where.eventId && v.eventId !== where.eventId) return false;
          return true;
        }).length;
      },

      delete: async (args: any) => {
        const where = args?.where || {};
        let index = -1;
        if (where.eventId_userId) {
          index = eventVolunteers.findIndex(
            (v) =>
              v.eventId === where.eventId_userId.eventId &&
              v.userId === where.eventId_userId.userId
          );
        } else if (where.id) {
          index = eventVolunteers.findIndex((v) => v.id === where.id);
        }
        if (index === -1) throw new Error('Volunteer record not found');
        return eventVolunteers.splice(index, 1)[0];
      },
    },

    yearPlanServantPost: {
      create: async (args: any) => {
        const d = args.data;
        const post: MockYearPlanServantPost = {
          id: nextId('sp'),
          yearPlanId: d.yearPlanId,
          stageId: d.stageId,
          authorId: d.authorId,
          title: d.title,
          content: d.content,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        yearPlanServantPosts.push(post);
        const author = users.find((u) => u.id === post.authorId);
        const stage = stages.find((s) => s.id === post.stageId);
        return {
          ...post,
          author: author ? { id: author.id, fullName: author.fullName } : null,
          stage: stage ? { id: stage.id, name: stage.name } : null,
        };
      },

      findMany: async (args?: any) => {
        const where = args?.where || {};
        let list = yearPlanServantPosts.filter((sp) => {
          if (where.yearPlanId && sp.yearPlanId !== where.yearPlanId) return false;
          if (where.stageId) {
            if (typeof where.stageId === 'string' && sp.stageId !== where.stageId) return false;
            if (where.stageId.in && !where.stageId.in.includes(sp.stageId)) return false;
          }
          return true;
        });

        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        if (args?.include) {
          return list.map((sp) => {
            const author = users.find((u) => u.id === sp.authorId);
            const stage = stages.find((s) => s.id === sp.stageId);
            return {
              ...sp,
              author: author ? { id: author.id, fullName: author.fullName } : null,
              stage: stage ? { id: stage.id, name: stage.name } : null,
            };
          });
        }
        return list;
      },

      findUnique: async (args: any) => {
        const where = args?.where || {};
        return yearPlanServantPosts.find((sp) => sp.id === where.id) || null;
      },
    },

    eventAttendanceConfirmation: {
      upsert: async (args: any) => {
        const { where, update, create } = args;
        const target = where.eventId_userId;
        let existing = eventAttendanceConfirmations.find(
          (a) => a.eventId === target.eventId && a.userId === target.userId
        );

        if (existing) {
          existing.confirmedById = update.confirmedById;
          existing.confirmedAt = new Date();
          return existing;
        }

        const newRec: MockEventAttendanceConfirmation = {
          id: nextId('eatt'),
          eventId: create.eventId,
          userId: create.userId,
          confirmedById: create.confirmedById,
          confirmedAt: new Date(),
        };
        eventAttendanceConfirmations.push(newRec);
        return newRec;
      },

      findMany: async (args?: any) => {
        const where = args?.where || {};
        return eventAttendanceConfirmations.filter((a) => {
          if (where.eventId && a.eventId !== where.eventId) return false;
          if (where.userId && a.userId !== where.userId) return false;
          return true;
        });
      },
    },

    announcement: {
      create: async (args: any) => {
        const data = args.data;
        const newAnn: MockAnnouncement = {
          id: nextId('ann'),
          authorUserId: data.authorUserId,
          title: data.title,
          content: data.content,
          targetScopeType: data.targetScopeType,
          targetStageId: data.targetStageId || null,
          targetSectorId: data.targetSectorId || null,
          isPinned: data.isPinned ?? false,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        announcements.push(newAnn);

        if (data.recipients?.create) {
          for (const r of data.recipients.create) {
            announcementRecipients.push({
              id: nextId('ann-rec'),
              announcementId: newAnn.id,
              userId: r.userId,
              isRead: r.isRead ?? false,
              readAt: r.readAt ?? null,
            });
          }
        }

        const author = users.find((u) => u.id === newAnn.authorUserId);
        const stage = stages.find((s) => s.id === newAnn.targetStageId);
        const sector = sectors.find((sec) => sec.id === newAnn.targetSectorId);

        return {
          ...newAnn,
          author: author
            ? {
                id: author.id,
                fullName: author.fullName,
                role: roles.find((r) => r.id === author.roleId)
                  ? { name: roles.find((r) => r.id === author.roleId)!.name, level: roles.find((r) => r.id === author.roleId)!.level }
                  : { name: 'خادم', level: 1 },
              }
            : null,
          targetStage: stage ? { id: stage.id, name: stage.name } : null,
          targetSector: sector ? { id: sector.id, name: sector.name } : null,
          recipients: announcementRecipients.filter((r) => r.announcementId === newAnn.id),
        };
      },

      findMany: async (args?: any) => {
        const where = args?.where || {};
        let list = announcements.filter((a) => {
          if (where.OR) {
            return where.OR.some((cond: any) => {
              if (cond.authorUserId && a.authorUserId === cond.authorUserId) return true;
              if (cond.recipients?.some?.userId) {
                return announcementRecipients.some(
                  (r) => r.announcementId === a.id && r.userId === cond.recipients.some.userId
                );
              }
              if (cond.targetScopeType && a.targetScopeType === cond.targetScopeType) return true;
              if (cond.targetStageId?.in && a.targetStageId && cond.targetStageId.in.includes(a.targetStageId)) return true;
              if (cond.targetSectorId?.in && a.targetSectorId && cond.targetSectorId.in.includes(a.targetSectorId)) return true;
              return false;
            });
          }
          if (where.targetStageId && a.targetStageId !== where.targetStageId) return false;
          return true;
        });

        // Sort by isPinned: desc, createdAt: desc
        list.sort((a, b) => {
          if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        return list.map((a) => {
          const author = users.find((u) => u.id === a.authorUserId);
          const stage = stages.find((s) => s.id === a.targetStageId);
          const sector = sectors.find((sec) => sec.id === a.targetSectorId);
          let recipientsForUser = announcementRecipients.filter((r) => r.announcementId === a.id);
          if (args?.include?.recipients?.where?.userId) {
            recipientsForUser = recipientsForUser.filter((r) => r.userId === args.include.recipients.where.userId);
          }

          return {
            ...a,
            author: author
              ? {
                  id: author.id,
                  fullName: author.fullName,
                  role: roles.find((r) => r.id === author.roleId)
                    ? { name: roles.find((r) => r.id === author.roleId)!.name, level: roles.find((r) => r.id === author.roleId)!.level }
                    : { name: 'خادم', level: 1 },
                }
              : null,
            targetStage: stage ? { id: stage.id, name: stage.name } : null,
            targetSector: sector ? { id: sector.id, name: sector.name } : null,
            recipients: recipientsForUser,
          };
        });
      },

      findUnique: async (args: any) => {
        const where = args?.where || {};
        const a = announcements.find((ann) => ann.id === where.id);
        if (!a) return null;
        const author = users.find((u) => u.id === a.authorUserId);
        const stage = stages.find((s) => s.id === a.targetStageId);
        return {
          ...a,
          author: author ? { id: author.id, fullName: author.fullName, role: roles.find((r) => r.id === author.roleId) } : null,
          targetStage: stage ? { id: stage.id, name: stage.name } : null,
        };
      },
    },

    announcementRecipient: {
      createMany: async (args: any) => {
        const items = args.data || [];
        for (const item of items) {
          const exists = announcementRecipients.some(
            (r) => r.announcementId === item.announcementId && r.userId === item.userId
          );
          if (!exists) {
            announcementRecipients.push({
              id: nextId('ann-rec'),
              announcementId: item.announcementId,
              userId: item.userId,
              isRead: item.isRead ?? false,
              readAt: item.readAt ?? null,
            });
          }
        }
        return { count: items.length };
      },

      findUnique: async (args: any) => {
        const where = args?.where || {};
        if (where.announcementId_userId) {
          return (
            announcementRecipients.find(
              (r) =>
                r.announcementId === where.announcementId_userId.announcementId &&
                r.userId === where.announcementId_userId.userId
            ) || null
          );
        }
        return announcementRecipients.find((r) => r.id === where.id) || null;
      },

      update: async (args: any) => {
        const { where, data } = args;
        const index = announcementRecipients.findIndex((r) => r.id === where.id);
        if (index === -1) throw new Error('AnnouncementRecipient not found');
        announcementRecipients[index] = {
          ...announcementRecipients[index],
          ...data,
        };
        return announcementRecipients[index];
      },

      upsert: async (args: any) => {
        const { where, update, create } = args;
        const key = where.announcementId_userId;
        let existing = key
          ? announcementRecipients.find(
              (r) => r.announcementId === key.announcementId && r.userId === key.userId
            )
          : null;
        if (existing) {
          Object.assign(existing, update);
          return existing;
        }
        const newRec = {
          id: nextId('ann-rec'),
          announcementId: create.announcementId,
          userId: create.userId,
          isRead: create.isRead ?? false,
          readAt: create.readAt ?? null,
        };
        announcementRecipients.push(newRec);
        return newRec;
      },

      findMany: async (args?: any) => {
        const where = args?.where || {};
        return announcementRecipients.filter((r) => {
          if (where.announcementId && r.announcementId !== where.announcementId) return false;
          if (where.userId && r.userId !== where.userId) return false;
          if (typeof where.isRead === 'boolean' && r.isRead !== where.isRead) return false;
          return true;
        });
      },
    },

    poll: {
      create: async (args: any) => {
        const data = args.data;
        const newPoll: MockPoll = {
          id: nextId('poll'),
          createdById: data.createdById,
          stageId: data.stageId || null,
          sectorId: data.sectorId || null,
          question: data.question,
          allowMultiple: data.allowMultiple ?? false,
          closesAt: new Date(data.closesAt),
          isClosed: data.isClosed ?? false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        polls.push(newPoll);

        if (data.options?.create) {
          data.options.create.forEach((opt: any, idx: number) => {
            pollOptions.push({
              id: nextId('popt'),
              pollId: newPoll.id,
              text: opt.text,
              order: opt.order ?? idx,
            });
          });
        }

        const createdBy = users.find((u) => u.id === newPoll.createdById);
        const stage = stages.find((s) => s.id === newPoll.stageId);
        const opts = pollOptions.filter((o) => o.pollId === newPoll.id).sort((a, b) => a.order - b.order);

        return {
          ...newPoll,
          createdBy: createdBy ? { id: createdBy.id, fullName: createdBy.fullName } : null,
          stage: stage ? { id: stage.id, name: stage.name } : null,
          options: opts.map((opt) => ({
            ...opt,
            _count: { votes: pollVotes.filter((v) => v.optionId === opt.id).length },
          })),
        };
      },

      findMany: async (args?: any) => {
        const where = args?.where || {};
        let list = polls.filter((p) => {
          if (where.OR) {
            return where.OR.some((cond: any) => {
              if (cond.stageId === null && cond.sectorId === null && !p.stageId && !p.sectorId) return true;
              if (cond.stageId?.in && p.stageId && cond.stageId.in.includes(p.stageId)) return true;
              if (cond.sectorId?.in && p.sectorId && cond.sectorId.in.includes(p.sectorId)) return true;
              return false;
            });
          }
          if (where.stageId && p.stageId !== where.stageId) return false;
          return true;
        });

        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return list.map((p) => {
          const createdBy = users.find((u) => u.id === p.createdById);
          const stage = stages.find((s) => s.id === p.stageId);
          const opts = pollOptions.filter((o) => o.pollId === p.id).sort((a, b) => a.order - b.order);
          let userVotes = pollVotes.filter((v) => v.pollId === p.id);
          if (args?.include?.votes?.where?.userId) {
            userVotes = userVotes.filter((v) => v.userId === args.include.votes.where.userId);
          }

          return {
            ...p,
            createdBy: createdBy ? { id: createdBy.id, fullName: createdBy.fullName } : null,
            stage: stage ? { id: stage.id, name: stage.name } : null,
            options: opts.map((opt) => ({
              ...opt,
              _count: { votes: pollVotes.filter((v) => v.optionId === opt.id).length },
            })),
            votes: userVotes,
          };
        });
      },

      findUnique: async (args: any) => {
        const where = args?.where || {};
        const p = polls.find((pol) => pol.id === where.id);
        if (!p) return null;
        const createdBy = users.find((u) => u.id === p.createdById);
        const stage = stages.find((s) => s.id === p.stageId);
        const opts = pollOptions.filter((o) => o.pollId === p.id).sort((a, b) => a.order - b.order);

        return {
          ...p,
          createdBy: createdBy ? { id: createdBy.id, fullName: createdBy.fullName } : null,
          stage: stage ? { id: stage.id, name: stage.name } : null,
          options: opts.map((opt) => ({
            ...opt,
            _count: { votes: pollVotes.filter((v) => v.optionId === opt.id).length },
          })),
          votes: pollVotes.filter((v) => v.pollId === p.id),
          _count: { votes: pollVotes.filter((v) => v.pollId === p.id).length },
        };
      },

      update: async (args: any) => {
        const { where, data } = args;
        const index = polls.findIndex((p) => p.id === where.id);
        if (index === -1) throw new Error('Poll not found');
        polls[index] = { ...polls[index], ...data, updatedAt: new Date() };
        return polls[index];
      },
    },

    pollOption: {
      findUnique: async (args: any) => {
        const where = args?.where || {};
        return pollOptions.find((o) => o.id === where.id) || null;
      },
      findMany: async (args?: any) => {
        const where = args?.where || {};
        return pollOptions.filter((o) => !where.pollId || o.pollId === where.pollId);
      },
    },

    pollVote: {
      create: async (args: any) => {
        const data = args.data;
        const newVote: MockPollVote = {
          id: nextId('vote'),
          pollId: data.pollId,
          optionId: data.optionId,
          userId: data.userId,
          createdAt: new Date(),
        };
        pollVotes.push(newVote);
        return newVote;
      },

      findMany: async (args?: any) => {
        const where = args?.where || {};
        return pollVotes.filter((v) => {
          if (where.pollId && v.pollId !== where.pollId) return false;
          if (where.userId && v.userId !== where.userId) return false;
          if (where.optionId && v.optionId !== where.optionId) return false;
          return true;
        });
      },

      findUnique: async (args: any) => {
        const where = args?.where || {};
        if (where.pollId_userId_optionId) {
          const t = where.pollId_userId_optionId;
          return (
            pollVotes.find(
              (v) => v.pollId === t.pollId && v.userId === t.userId && v.optionId === t.optionId
            ) || null
          );
        }
        return pollVotes.find((v) => v.id === where.id) || null;
      },
    },

    notificationLog: {
      create: async (args: any) => {
        const data = args.data;
        const newLog: MockNotificationLog = {
          id: nextId('nlog'),
          userId: data.userId,
          type: data.type,
          channel: data.channel,
          title: data.title,
          body: data.body,
          dataPayload: data.dataPayload || null,
          isDelivered: data.isDelivered ?? true,
          sentAt: data.sentAt ? new Date(data.sentAt) : new Date(),
        };
        notificationLogs.push(newLog);
        return newLog;
      },

      findMany: async (args?: any) => {
        const where = args?.where || {};
        let list = notificationLogs.filter((l) => {
          if (where.userId && l.userId !== where.userId) return false;
          if (where.channel && l.channel !== where.channel) return false;
          if (where.type && l.type !== where.type) return false;
          return true;
        });
        list.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
        if (args?.take) {
          list = list.slice(0, args.take);
        }
        return list;
      },
    },

    userNotificationPreference: {
      findUnique: async (args: any) => {
        const where = args?.where || {};
        return userNotificationPreferences.find((p) => p.userId === where.userId) || null;
      },

      upsert: async (args: any) => {
        const { where, update, create } = args;
        let existing = userNotificationPreferences.find((p) => p.userId === where.userId);
        if (existing) {
          if (typeof update.enablePush === 'boolean') existing.enablePush = update.enablePush;
          if (typeof update.enableSms === 'boolean') existing.enableSms = update.enableSms;
          if (typeof update.enableEmail === 'boolean') existing.enableEmail = update.enableEmail;
          if (update.pushSubscription !== undefined) existing.pushSubscription = update.pushSubscription;
          return existing;
        }

        const newPref: MockUserNotificationPreference = {
          id: nextId('pref'),
          userId: create.userId,
          enablePush: create.enablePush ?? true,
          enableSms: create.enableSms ?? true,
          enableEmail: create.enableEmail ?? false,
          pushSubscription: create.pushSubscription ?? null,
        };
        userNotificationPreferences.push(newPref);
        return newPref;
      },
    },

    $transaction: async (callbackOrArray: any) => {
      if (typeof callbackOrArray === 'function') {
        return callbackOrArray(mockDb);
      }
      return Promise.all(callbackOrArray);
    },
  };

  return mockDb;
}
