import ExcelJS from 'exceljs';
import { assertNoSpiritualDataInPayload } from '../analytics/securityAssert';

export interface ExcelMemberAttendanceExportOptions {
  stageName: string;
  members: Array<{
    id: string;
    fullName: string;
    educationalGrade?: string | null;
  }>;
  sessionDates: string[]; // ['2026-09-04', '2026-09-11', ...]
  attendanceRecords: Array<{
    memberId: string;
    sessionDate: string;
    status: string; // 'PRESENT', 'ABSENT', 'EXCUSED'
  }>;
  generatedBy: string;
}

export interface ExcelRosterExportOptions {
  stageName: string;
  members: Array<{
    id: string;
    fullName: string;
    dateOfBirth?: Date | null;
    educationalGrade?: string | null;
    fatherName?: string | null;
    motherName?: string | null;
    address?: string | null;
    phoneNumber?: string | null;
    financialStatus?: string | null;
  }>;
  includeSensitive?: boolean;
  generatedBy: string;
}

export class ExcelGeneratorService {
  /**
   * Generates a multi-week attendance matrix in Excel (.xlsx) with Arabic RTL orientation (FR-14.1).
   */
  static async generateStageAttendanceExcel(
    options: ExcelMemberAttendanceExportOptions
  ): Promise<Buffer> {
    // Assert no spiritual data in input
    assertNoSpiritualDataInPayload(options);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'نظام إدارة الخدمة الكنسية - كنيسة القديس أنبا شنودة';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('سجل الحضور والغياب', {
      views: [{ rightToLeft: true, rtl: true } as any], // Native RTL orientation
    });
    worksheet.views = [{ rightToLeft: true, rtl: true } as any];

    // 1. Header Information Block
    worksheet.mergeCells('A1:E1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `كشف الحضور والغياب الأسبوعي — ${options.stageName}`;
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF1F3A5F' } };
    titleCell.alignment = { horizontal: 'right', vertical: 'middle' };

    worksheet.getCell('A2').value = `تاريخ التصدير: ${new Date().toLocaleDateString('ar-EG')} | تم التصدير بواسطة: ${options.generatedBy}`;
    worksheet.getCell('A2').font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF5F6A7A' } };

    worksheet.addRow([]); // Blank row

    // 2. Table Column Headers
    const headerRowValues = ['م', 'اسم المخدوم', 'الصف الدراسي'];
    options.sessionDates.forEach((d) => headerRowValues.push(d));
    headerRowValues.push('نسبة الحضور %');

    const headerRow = worksheet.addRow(headerRowValues);
    headerRow.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F3A5F' }, // Deep Coptic Blue
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // 3. Populate Rows
    const attendanceLookup = new Map<string, string>();
    options.attendanceRecords.forEach((r) => {
      const dKey = new Date(r.sessionDate).toISOString().split('T')[0];
      attendanceLookup.set(`${r.memberId}_${dKey}`, r.status);
    });

    options.members.forEach((m, idx) => {
      let presentCount = 0;
      const rowValues: any[] = [idx + 1, m.fullName, m.educationalGrade || '—'];

      options.sessionDates.forEach((d) => {
        const status = attendanceLookup.get(`${m.id}_${d}`);
        if (status === 'PRESENT') {
          rowValues.push('حاضر');
          presentCount++;
        } else if (status === 'EXCUSED') {
          rowValues.push('معتذر');
        } else {
          rowValues.push('غائب');
        }
      });

      const rate =
        options.sessionDates.length > 0
          ? Math.round((presentCount / options.sessionDates.length) * 100)
          : 0;
      rowValues.push(`${rate}%`);

      const row = worksheet.addRow(rowValues);
      row.alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(2).alignment = { horizontal: 'right' }; // Align name to right

      // Color attendance cells
      options.sessionDates.forEach((_d, colIdx) => {
        const cell = row.getCell(4 + colIdx);
        if (cell.value === 'حاضر') {
          cell.font = { color: { argb: 'FF2F855A' }, bold: true };
        } else if (cell.value === 'غائب') {
          cell.font = { color: { argb: 'FFC0392B' } };
        }
      });
    });

    // Auto-fit column widths
    worksheet.columns.forEach((column) => {
      let maxLength = 10;
      column.eachCell?.({ includeEmpty: false }, (cell) => {
        const valStr = cell.value ? cell.value.toString() : '';
        if (valStr.length > maxLength) {
          maxLength = Math.min(valStr.length + 3, 30);
        }
      });
      column.width = maxLength;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Generates complete stage members roster with optional sensitive fields (FR-14.1 & FR-14.2).
   */
  static async generateStageRosterExcel(options: ExcelRosterExportOptions): Promise<Buffer> {
    assertNoSpiritualDataInPayload(options);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'نظام إدارة الخدمة الكنسية - كنيسة القديس أنبا شنودة';

    const worksheet = workbook.addWorksheet('سجل المخدومين', {
      views: [{ rightToLeft: true, rtl: true } as any],
    });
    worksheet.views = [{ rightToLeft: true, rtl: true } as any];

    // Title
    worksheet.mergeCells('A1:F1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `سجل مخدومي — ${options.stageName}`;
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF1F3A5F' } };
    titleCell.alignment = { horizontal: 'right', vertical: 'middle' };

    worksheet.addRow([]);

    const headers = ['م', 'الاسم بالكامل', 'الصف الدراسي', 'اسم الأب', 'اسم الأم', 'العنوان'];
    if (options.includeSensitive) {
      headers.push('رقم الهاتف', 'الحالة المادية');
    }

    const headerRow = worksheet.addRow(headers);
    headerRow.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F3A5F' },
      };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' } };
    });

    options.members.forEach((m, idx) => {
      const rowValues: any[] = [
        idx + 1,
        m.fullName,
        m.educationalGrade || '—',
        m.fatherName || '—',
        m.motherName || '—',
        m.address || '—',
      ];

      if (options.includeSensitive) {
        rowValues.push(m.phoneNumber || '—', m.financialStatus || '—');
      }

      worksheet.addRow(rowValues);
    });

    worksheet.columns.forEach((column) => {
      column.width = 16;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
