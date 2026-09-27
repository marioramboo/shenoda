import { Request } from 'express';
import { prisma } from '../config/prisma';
import { SensitiveField, AccessType } from '@prisma/client';

export { SensitiveField, AccessType };

export interface LogSensitiveAccessParams {
  userId: string;
  memberId?: string;
  targetUserId?: string;
  field: SensitiveField;
  accessType: AccessType;
  req: Request;
}

/**
 * Service for logging sensitive PII and financial data access (NFR-3.3).
 * Ensures an immutable audit trail for minor records and financial status views/edits.
 */
export class SensitiveLoggerService {
  public static async logAccess(params: LogSensitiveAccessParams): Promise<void> {
    const ipAddress =
      (params.req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      params.req.socket.remoteAddress ||
      'unknown-ip';

    try {
      await prisma.sensitiveAccessLog.create({
        data: {
          userId: params.userId,
          memberId: params.memberId || null,
          targetUserId: params.targetUserId || null,
          field: params.field,
          accessType: params.accessType,
          ipAddress,
        },
      });
    } catch (err) {
      console.error('Failed to write sensitive access log:', err);
    }
  }

  /**
   * Convenience helper to log access across multiple sensitive fields at once.
   */
  public static async logMultipleFields(params: {
    userId: string;
    memberId?: string;
    targetUserId?: string;
    fields: SensitiveField[];
    accessType: AccessType;
    req: Request;
  }): Promise<void> {
    const promises = params.fields.map((field) =>
      this.logAccess({
        userId: params.userId,
        memberId: params.memberId,
        targetUserId: params.targetUserId,
        field,
        accessType: params.accessType,
        req: params.req,
      })
    );

    await Promise.all(promises);
  }
}
