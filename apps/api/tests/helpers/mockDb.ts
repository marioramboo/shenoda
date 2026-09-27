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

      findMany: async (_args?: any) => {
        return users.map((u) => attachRelationsToUser(u));
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
      findMany: async () => stages,
    },

    sector: {
      findUnique: async (args: any) => {
        const where = args?.where || {};
        return sectors.find((s) => s.id === where.id || s.code === where.code) || null;
      },
      findMany: async () => sectors,
    },

    scopeAssignment: {
      create: async (args: any) => {
        const assignment = {
          id: nextId('scope'),
          userId: args.data.userId,
          stageId: args.data.stageId || null,
          sectorId: args.data.sectorId || null,
        };
        scopeAssignments.push(assignment);
        return assignment;
      },
      deleteMany: async (args: any) => {
        const where = args?.where || {};
        let count = 0;
        for (let i = scopeAssignments.length - 1; i >= 0; i--) {
          if (where.userId && scopeAssignments[i].userId === where.userId) {
            scopeAssignments.splice(i, 1);
            count++;
          }
        }
        return { count };
      },
      findMany: async (args: any) => {
        const where = args?.where || {};
        return scopeAssignments.filter((s) => !where.userId || s.userId === where.userId);
      },
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

      findMany: async (args?: any) => {
        const where = args?.where || {};
        return memberServantAssignments.filter((a) => {
          if (where.memberId && a.memberId !== where.memberId) return false;
          if (where.servantUserId && a.servantUserId !== where.servantUserId) return false;
          return true;
        });
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

    $transaction: async (callbackOrArray: any) => {
      if (typeof callbackOrArray === 'function') {
        return callbackOrArray(mockDb);
      }
      return Promise.all(callbackOrArray);
    },
  };

  return mockDb;
}
