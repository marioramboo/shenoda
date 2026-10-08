import { z } from 'zod';
import { prisma } from '../config/prisma';

export interface RawMemberRow {
  fullName: string;
  dateOfBirth: string;
  address: string;
  phoneNumber?: string;
  fatherConfessor?: string;
  fatherConfessorChurch?: string;
  fatherName?: string;
  fatherAge?: number | string;
  motherName?: string;
  motherAge?: number | string;
  schoolOrUniversity?: string;
  educationalGrade?: string;
  financialStatus?: string;
  behaviorInService?: string;
  peerIntegration?: string;
}

const memberRowSchema = z.object({
  fullName: z.string().min(2, 'الاسم بالكامل يجب ألا يقل عن حرفين'),
  dateOfBirth: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'تاريخ الميلاد غير صالح (يجب أن يكون بصيغة YYYY-MM-DD)',
  }),
  address: z.string().min(3, 'العنوان مطلوب'),
  phoneNumber: z.string().optional().nullable(),
  fatherConfessor: z.string().optional().nullable(),
  fatherConfessorChurch: z.string().optional().nullable(),
  fatherName: z.string().optional().nullable(),
  fatherAge: z.coerce.number().optional().nullable(),
  motherName: z.string().optional().nullable(),
  motherAge: z.coerce.number().optional().nullable(),
  schoolOrUniversity: z.string().optional().nullable(),
  educationalGrade: z.string().optional().nullable(),
  financialStatus: z.string().optional().nullable(),
  behaviorInService: z.string().optional().nullable(),
  peerIntegration: z.string().optional().nullable(),
});

export class BulkImportService {
  /**
   * Parses CSV text with Arabic or English column headers into normalized row objects.
   */
  public static parseCsv(csvContent: string): RawMemberRow[] {
    const lines = csvContent
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      throw new Error('الملف فارغ أو لا يحتوي على صفوف بيانات');
    }

    const headerLine = lines[0];
    const headers = headerLine.split(',').map((h) => h.trim().replace(/^"|"$/g, ''));

    // Map common Arabic and English headers to standard keys
    const headerMap: Record<string, keyof RawMemberRow> = {
      'الاسم بالكامل': 'fullName',
      fullName: 'fullName',
      'الاسم': 'fullName',
      name: 'fullName',
      'تاريخ الميلاد': 'dateOfBirth',
      dateOfBirth: 'dateOfBirth',
      dob: 'dateOfBirth',
      'العنوان': 'address',
      address: 'address',
      'رقم الهاتف': 'phoneNumber',
      phoneNumber: 'phoneNumber',
      phone: 'phoneNumber',
      'الموبايل': 'phoneNumber',
      'اب الاعتراف': 'fatherConfessor',
      'أب الاعتراف': 'fatherConfessor',
      fatherConfessor: 'fatherConfessor',
      'كنيسة اب الاعتراف': 'fatherConfessorChurch',
      'كنيسة أب الاعتراف': 'fatherConfessorChurch',
      fatherConfessorChurch: 'fatherConfessorChurch',
      'اسم الأب': 'fatherName',
      fatherName: 'fatherName',
      'سن الأب': 'fatherAge',
      fatherAge: 'fatherAge',
      'اسم الأم': 'motherName',
      motherName: 'motherName',
      'سن الأم': 'motherAge',
      motherAge: 'motherAge',
      'المدرسة أو الجامعة': 'schoolOrUniversity',
      schoolOrUniversity: 'schoolOrUniversity',
      school: 'schoolOrUniversity',
      'المرحلة الدراسية': 'educationalGrade',
      educationalGrade: 'educationalGrade',
      grade: 'educationalGrade',
      'الحالة المادية': 'financialStatus',
      financialStatus: 'financialStatus',
      'سلوكه في الخدمة': 'behaviorInService',
      behaviorInService: 'behaviorInService',
      'اندماجه مع زملائه': 'peerIntegration',
      peerIntegration: 'peerIntegration',
    };

    const rows: RawMemberRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Simple CSV split (handling quoted values if present)
      const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      const rowObj: any = {};

      headers.forEach((h, idx) => {
        const standardKey = headerMap[h] || headerMap[h.toLowerCase()];
        if (standardKey && values[idx] !== undefined) {
          rowObj[standardKey] = values[idx];
        }
      });

      if (rowObj.fullName) {
        rows.push(rowObj);
      }
    }

    return rows;
  }

  /**
   * Validates and imports parsed rows for a specific stage inside a database transaction.
   */
  public static async importMembersForStage(
    stageId: string,
    rows: RawMemberRow[]
  ): Promise<{
    success: boolean;
    importedCount: number;
    errors: Array<{ row: number; message: string }>;
  }> {
    const validRecords: any[] = [];
    const errors: Array<{ row: number; message: string }> = [];

    rows.forEach((row, idx) => {
      const parseResult = memberRowSchema.safeParse(row);
      if (!parseResult.success) {
        errors.push({
          row: idx + 1,
          message: parseResult.error.errors.map((e) => e.message).join(', '),
        });
      } else {
        const data = parseResult.data;
        validRecords.push({
          stageId,
          fullName: data.fullName,
          dateOfBirth: new Date(data.dateOfBirth),
          address: data.address,
          phoneNumber: data.phoneNumber || null,
          fatherConfessor: data.fatherConfessor || null,
          fatherConfessorChurch: data.fatherConfessorChurch || null,
          fatherName: data.fatherName || null,
          fatherAge: data.fatherAge || null,
          motherName: data.motherName || null,
          motherAge: data.motherAge || null,
          schoolOrUniversity: data.schoolOrUniversity || null,
          educationalGrade: data.educationalGrade || null,
          financialStatus: data.financialStatus || null,
          behaviorInService: data.behaviorInService || null,
          peerIntegration: data.peerIntegration || null,
        });
      }
    });

    if (validRecords.length === 0) {
      return { success: false, importedCount: 0, errors };
    }

    // Insert records
    await prisma.$transaction(async (tx) => {
      for (const rec of validRecords) {
        await tx.servedMember.create({ data: rec });
      }
    });

    return {
      success: true,
      importedCount: validRecords.length,
      errors,
    };
  }
}
