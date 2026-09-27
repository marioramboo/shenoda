import PDFDocument from 'pdfkit';
import { assertNoSpiritualDataInPayload } from '../analytics/securityAssert';

export interface MemberDossierPdfOptions {
  member: {
    id: string;
    fullName: string;
    dateOfBirth?: Date | null;
    address?: string | null;
    phoneNumber?: string | null;
    fatherName?: string | null;
    motherName?: string | null;
    fatherConfessor?: string | null;
    educationalGrade?: string | null;
    financialStatus?: string | null;
    behaviorInService?: string | null;
    peerIntegration?: string | null;
    stageName?: string;
  };
  attendanceSummary: {
    totalSessions: number;
    presentCount: number;
    ratePercentage: number;
  };
  supervisoryNotes?: Array<{
    authorName: string;
    content: string;
    createdAt: Date | string;
  }>;
  includeSensitive?: boolean;
  generatedBy: string;
}

export interface StageSummaryPdfOptions {
  stageName: string;
  metrics: {
    activeMembersCount: number;
    averageAttendanceRate: number;
    prepComplianceRate: number;
    outstandingAbsenceAlerts: number;
  };
  absenceFunnel: {
    regularCount: number;
    irregularCount: number;
    highRiskCount: number;
  };
  generatedBy: string;
}

export class PdfGeneratorService {
  /**
   * Generates a Member Pastoral Dossier PDF (FR-14.1).
   */
  static async generateMemberDossierPdf(options: MemberDossierPdfOptions): Promise<Buffer> {
    assertNoSpiritualDataInPayload(options);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        info: {
          Title: `ملف افتقاد مخدوم - ${options.member.fullName}`,
          Author: 'كنيسة القديس العظيم أنبا شنودة رئيس المتوحدين',
        },
      });

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Header Letterhead
      doc
        .fontSize(16)
        .fillColor('#1F3A5F')
        .text('كنيسة القديس العظيم أنبا شنودة رئيس المتوحدين', { align: 'center' });

      doc
        .fontSize(12)
        .fillColor('#B8892B')
        .text('خدمة التربية الكنسية — ملف الافتقاد الرعوي الشامل', { align: 'center' });

      doc.moveDown(0.5);
      doc
        .strokeColor('#E3DFD3')
        .lineWidth(1)
        .moveTo(40, doc.y)
        .lineTo(555, doc.y)
        .stroke();

      doc.moveDown(1);

      // Member Basic Info
      doc.fontSize(14).fillColor('#1B2432').text(`الاسم: ${options.member.fullName}`, { align: 'right' });
      doc.fontSize(11).fillColor('#5F6A7A');
      doc.text(`المرحلة: ${options.member.stageName || '—'}`, { align: 'right' });
      doc.text(`الصف الدراسي: ${options.member.educationalGrade || '—'}`, { align: 'right' });
      doc.text(`أب الاعتراف: ${options.member.fatherConfessor || '—'}`, { align: 'right' });
      doc.text(`العنوان: ${options.member.address || '—'}`, { align: 'right' });

      if (options.includeSensitive && options.member.phoneNumber) {
        doc.text(`رقم الهاتف: ${options.member.phoneNumber}`, { align: 'right' });
      }

      doc.moveDown(1);

      // Attendance Metrics Section
      doc.fontSize(12).fillColor('#1F3A5F').text('إحصائيات الحضور والغياب (جدول المتابعة)', { align: 'right' });
      doc.fontSize(10).fillColor('#1B2432');
      doc.text(`إجمالي الحصص المسجلة: ${options.attendanceSummary.totalSessions}`, { align: 'right' });
      doc.text(`عدد مرات الحضور: ${options.attendanceSummary.presentCount}`, { align: 'right' });
      doc.text(`نسبة الالتزام بالحضور: ${options.attendanceSummary.ratePercentage}%`, { align: 'right' });

      doc.moveDown(1);

      // Evaluation & Notes Section
      doc.fontSize(12).fillColor('#1F3A5F').text('ملاحظات السلوك والاندماج بالخدمة', { align: 'right' });
      doc.fontSize(10).fillColor('#1B2432');
      doc.text(`السلوك العام: ${options.member.behaviorInService || 'لا توجد ملاحظات خاصة'}`, { align: 'right' });
      doc.text(`الاندماج مع الأقران: ${options.member.peerIntegration || 'طبيعي'}`, { align: 'right' });

      if (options.supervisoryNotes && options.supervisoryNotes.length > 0) {
        doc.moveDown(0.5);
        doc.fontSize(11).fillColor('#B8892B').text('ملاحظات إشرافية خاصة:', { align: 'right' });
        options.supervisoryNotes.forEach((note) => {
          doc.fontSize(9).fillColor('#5F6A7A').text(`• [${note.authorName}]: ${note.content}`, { align: 'right' });
        });
      }

      // Footer
      doc.moveDown(2);
      doc
        .strokeColor('#E3DFD3')
        .lineWidth(0.5)
        .moveTo(40, doc.y)
        .lineTo(555, doc.y)
        .stroke();
      doc.moveDown(0.5);
      doc
        .fontSize(8)
        .fillColor('#9AA3AF')
        .text(
          `وثيقة سرية كنسية | تم التصدير بواسطة: ${options.generatedBy} | تاريخ: ${new Date().toLocaleDateString('ar-EG')}`,
          { align: 'center' }
        );

      doc.end();
    });
  }

  /**
   * Generates a Stage Summary Executive PDF (FR-14.1).
   */
  static async generateStageSummaryPdf(options: StageSummaryPdfOptions): Promise<Buffer> {
    assertNoSpiritualDataInPayload(options);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        info: {
          Title: `التقرير التنفيذي الشامل - ${options.stageName}`,
          Author: 'كنيسة القديس العظيم أنبا شنودة رئيس المتوحدين',
        },
      });

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Header
      doc
        .fontSize(16)
        .fillColor('#1F3A5F')
        .text('كنيسة القديس العظيم أنبا شنودة رئيس المتوحدين', { align: 'center' });
      doc
        .fontSize(12)
        .fillColor('#B8892B')
        .text(`التقرير الإحصائي والتنفيذي الدوري — مرحلة (${options.stageName})`, { align: 'center' });

      doc.moveDown(0.5);
      doc
        .strokeColor('#E3DFD3')
        .lineWidth(1)
        .moveTo(40, doc.y)
        .lineTo(555, doc.y)
        .stroke();
      doc.moveDown(1);

      // Executive Metrics Grid
      doc.fontSize(13).fillColor('#1F3A5F').text('المؤشرات الرئيسية للخدمة', { align: 'right' });
      doc.fontSize(10).fillColor('#1B2432');
      doc.text(`إجمالي المخدومين المقيدين: ${options.metrics.activeMembersCount} مخدوم`, { align: 'right' });
      doc.text(`متوسط نسبة الحضور العام: ${options.metrics.averageAttendanceRate}%`, { align: 'right' });
      doc.text(`نسبة التزام الخدام بتحضير الدروس: ${options.metrics.prepComplianceRate}%`, { align: 'right' });
      doc.text(`حالات الغياب المتكرر العالقة: ${options.metrics.outstandingAbsenceAlerts} حالة`, { align: 'right' });

      doc.moveDown(1);

      // Risk Funnel
      doc.fontSize(13).fillColor('#1F3A5F').text('تصنيف المخدومين حسب الالتزام والانتظام', { align: 'right' });
      doc.fontSize(10).fillColor('#1B2432');
      doc.text(`منتظمون (80% فأكثر): ${options.absenceFunnel.regularCount}`, { align: 'right' });
      doc.text(`حضور متقطع (50% - 79%): ${options.absenceFunnel.irregularCount}`, { align: 'right' });
      doc.text(`معرضون للانقطاع / بحاجة لافتقاد فوري: ${options.absenceFunnel.highRiskCount}`, { align: 'right' });

      // Footer
      doc.moveDown(2);
      doc
        .fontSize(8)
        .fillColor('#9AA3AF')
        .text(
          `وثيقة مجلس الخدمة | تاريخ التصدير: ${new Date().toLocaleDateString('ar-EG')} | بواسطة: ${options.generatedBy}`,
          { align: 'center' }
        );

      doc.end();
    });
  }
}
