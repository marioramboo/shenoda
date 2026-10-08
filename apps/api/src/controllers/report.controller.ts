import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { resolveMemberAccess } from '../services/memberAccess.service';
import { MemberAccessLevel } from '@shenoda/shared';
import { SensitiveLoggerService, SensitiveField, AccessType } from '../services/sensitiveLogger.service';
import { PdfGeneratorService } from '../services/reports/pdfGenerator.service';
import { ExcelGeneratorService } from '../services/reports/excelGenerator.service';
import { DashboardAnalyticsService } from '../services/analytics/dashboardAnalytics.service';

export class ReportController {
  /**
   * POST /api/v1/reports/pdf/member-dossier/:memberId (FR-14.1, FR-14.2)
   * Exports comprehensive individual pastoral dossier PDF with sensitive access audit logging.
   */
  static async exportMemberDossierPdf(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { memberId } = req.params;

      const member = await prisma.servedMember.findUnique({
        where: { id: memberId },
        include: { stage: { select: { id: true, name: true, sectorId: true } } },
      });

      if (!member) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Member not found' },
          timestamp: new Date().toISOString(),
        });
      }

      // Validate access scoping
      const accessLevel = await resolveMemberAccess(user, {
        id: member.id,
        stageId: member.stageId,
      });

      if (accessLevel === MemberAccessLevel.NONE) {
        return res.status(403).json({
          success: false,
          error: { code: 'ERR_ACCESS_DENIED', message: 'لا تملك صلاحية الوصول إلى ملف هذا المخدوم' },
          timestamp: new Date().toISOString(),
        });
      }

      // Fetch attendance history for member
      const attendances = await prisma.memberAttendance.findMany({
        where: { memberId: member.id },
      });
      const presentCount = attendances.filter((a) => a.status === 'PRESENT').length;
      const rate = attendances.length > 0 ? Math.round((presentCount / attendances.length) * 100) : 0;

      // Fetch supervisory notes if caller is Level 3+
      let supervisoryNotes: any[] = [];
      if (user.roleLevel >= 3) {
        const notes = await prisma.supervisoryNote.findMany({
          where: { targetUserId: member.id },
          include: { authorUser: { select: { fullName: true } } },
        });
        supervisoryNotes = notes.map((n: any) => ({
          authorName: n.authorUser?.fullName || 'مشرف',
          content: n.content,
          createdAt: n.createdAt,
        }));
      }

      // Audit log sensitive export access (FR-14.2 & NFR-3.3)
      if (user.roleLevel >= 2) {
        await SensitiveLoggerService.logMultipleFields({
          userId: user.userId,
          memberId: member.id,
          fields: [SensitiveField.FINANCIAL_STATUS, SensitiveField.PHONE_NUMBER],
          accessType: AccessType.EXPORT,
          req,
        });
      }

      const pdfBuffer = await PdfGeneratorService.generateMemberDossierPdf({
        member: {
          id: member.id,
          fullName: member.fullName,
          dateOfBirth: member.dateOfBirth,
          address: member.address,
          phoneNumber: member.phoneNumber,
          fatherName: member.fatherName,
          motherName: member.motherName,
          fatherConfessor: member.fatherConfessor,
          fatherConfessorChurch: member.fatherConfessorChurch,
          educationalGrade: member.educationalGrade,
          financialStatus: member.financialStatus,
          behaviorInService: member.behaviorInService,
          peerIntegration: member.peerIntegration,
          stageName: member.stage?.name,
        },
        attendanceSummary: {
          totalSessions: attendances.length,
          presentCount,
          ratePercentage: rate,
        },
        supervisoryNotes,
        includeSensitive: user.roleLevel >= 2,
        generatedBy: user.userId,
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="member_dossier_${encodeURIComponent(member.fullName)}.pdf"`
      );
      return res.status(200).send(pdfBuffer);
    } catch (err: any) {
      if (err.code === 'ERR_SPIRITUAL_DATA_FIREWALL') {
        return res.status(500).json({
          success: false,
          error: { code: err.code, message: err.message },
          timestamp: new Date().toISOString(),
        });
      }

      console.error('Error generating member dossier PDF:', err);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: err.message },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * POST /api/v1/reports/pdf/stage-summary (FR-14.1)
   * Generates official executive PDF briefing for parish priest / council.
   */
  static async exportStageSummaryPdf(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { stageId = user.stageIds[0] } = req.body;

      // Verify scope
      if (user.roleLevel <= 3 && !user.stageIds.includes(stageId)) {
        return res.status(403).json({
          success: false,
          error: { code: 'ERR_SCOPE_MISMATCH', message: 'لا يمكنك تصدير تقرير لمرحلة خارج نطاقك' },
          timestamp: new Date().toISOString(),
        });
      }

      const stage = await prisma.stage.findUnique({
        where: { id: stageId },
        select: { id: true, name: true },
      });

      if (!stage) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Stage not found' },
          timestamp: new Date().toISOString(),
        });
      }

      const analytics = await DashboardAnalyticsService.getScopedAnalytics(user, {
        stageId,
      });

      const pdfBuffer = await PdfGeneratorService.generateStageSummaryPdf({
        stageName: stage.name,
        metrics: analytics.metrics,
        absenceFunnel: analytics.absenceFunnel,
        generatedBy: user.userId,
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="stage_summary_${encodeURIComponent(stage.name)}.pdf"`
      );
      return res.status(200).send(pdfBuffer);
    } catch (err: any) {
      console.error('Error generating stage summary PDF:', err);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: err.message },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * POST /api/v1/reports/excel/stage-attendance (FR-14.1, FR-14.2)
   * Exports multi-week attendance matrix in native RTL Excel (.xlsx).
   */
  static async exportStageAttendanceExcel(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { stageId = user.stageIds[0], startDate, endDate } = req.body;

      if (user.roleLevel <= 3 && !user.stageIds.includes(stageId)) {
        return res.status(403).json({
          success: false,
          error: { code: 'ERR_SCOPE_MISMATCH', message: 'لا يمكنك تصدير بيانات مرحلة خارج نطاقك' },
          timestamp: new Date().toISOString(),
        });
      }

      const stage = await prisma.stage.findUnique({
        where: { id: stageId },
        select: { id: true, name: true },
      });

      if (!stage) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Stage not found' },
          timestamp: new Date().toISOString(),
        });
      }

      // Fetch members
      const members = await prisma.servedMember.findMany({
        where: { stageId },
        select: { id: true, fullName: true, educationalGrade: true },
        orderBy: { fullName: 'asc' },
      });

      // Fetch attendance records
      const attendanceWhere: any = { stageId };
      if (startDate || endDate) {
        attendanceWhere.sessionDate = {};
        if (startDate) attendanceWhere.sessionDate.gte = new Date(startDate);
        if (endDate) attendanceWhere.sessionDate.lte = new Date(endDate);
      }

      const records = await prisma.memberAttendance.findMany({
        where: attendanceWhere,
        select: { memberId: true, sessionDate: true, status: true },
      });

      // Extract unique sorted session dates
      const dateSet = new Set<string>();
      records.forEach((r) => {
        const dStr = new Date(r.sessionDate).toISOString().split('T')[0];
        dateSet.add(dStr);
      });
      const sessionDates = Array.from(dateSet).sort();

      // Log export audit (FR-14.2 & NFR-3.3)
      await SensitiveLoggerService.logAccess({
        userId: user.userId,
        field: SensitiveField.PHONE_NUMBER,
        accessType: AccessType.EXPORT,
        req,
      });

      const excelBuffer = await ExcelGeneratorService.generateStageAttendanceExcel({
        stageName: stage.name,
        members,
        sessionDates,
        attendanceRecords: records.map((r) => ({
          memberId: r.memberId,
          sessionDate: new Date(r.sessionDate).toISOString().split('T')[0],
          status: r.status,
        })),
        generatedBy: user.userId,
      });

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="attendance_${encodeURIComponent(stage.name)}.xlsx"`
      );
      return res.status(200).send(excelBuffer);
    } catch (err: any) {
      console.error('Error generating stage attendance Excel:', err);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: err.message },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * POST /api/v1/reports/excel/stage-roster (FR-14.1)
   * Exports full members roster with guardian contacts and optional sensitive fields.
   */
  static async exportStageRosterExcel(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { stageId = user.stageIds[0], includeSensitive = false } = req.body;

      if (user.roleLevel <= 3 && !user.stageIds.includes(stageId)) {
        return res.status(403).json({
          success: false,
          error: { code: 'ERR_SCOPE_MISMATCH', message: 'لا يمكنك تصدير بيانات مرحلة خارج نطاقك' },
          timestamp: new Date().toISOString(),
        });
      }

      const stage = await prisma.stage.findUnique({
        where: { id: stageId },
        select: { id: true, name: true },
      });

      if (!stage) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Stage not found' },
          timestamp: new Date().toISOString(),
        });
      }

      const members = await prisma.servedMember.findMany({
        where: { stageId },
        orderBy: { fullName: 'asc' },
      });

      const canViewSensitive = user.roleLevel >= 2;
      const shouldIncludeSensitive = includeSensitive && canViewSensitive;

      if (shouldIncludeSensitive) {
        await SensitiveLoggerService.logMultipleFields({
          userId: user.userId,
          fields: [SensitiveField.FINANCIAL_STATUS, SensitiveField.PHONE_NUMBER],
          accessType: AccessType.EXPORT,
          req,
        });
      }

      const excelBuffer = await ExcelGeneratorService.generateStageRosterExcel({
        stageName: stage.name,
        members: members.map((m) => ({
          id: m.id,
          fullName: m.fullName,
          dateOfBirth: m.dateOfBirth,
          educationalGrade: m.educationalGrade,
          fatherName: m.fatherName,
          motherName: m.motherName,
          address: m.address,
          phoneNumber: shouldIncludeSensitive ? m.phoneNumber : null,
          financialStatus: shouldIncludeSensitive ? m.financialStatus : null,
        })),
        includeSensitive: shouldIncludeSensitive,
        generatedBy: user.userId,
      });

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="roster_${encodeURIComponent(stage.name)}.xlsx"`
      );
      return res.status(200).send(excelBuffer);
    } catch (err: any) {
      console.error('Error generating stage roster Excel:', err);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: err.message },
        timestamp: new Date().toISOString(),
      });
    }
  }
}
