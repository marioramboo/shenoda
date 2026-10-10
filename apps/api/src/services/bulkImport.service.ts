import { z } from 'zod';
import { prisma } from '../config/prisma';
import { HashService } from './hash.service';
import { getPhoneVariants } from '@shenoda/shared';
import { UserStatus } from '@prisma/client';

const EGYPTIAN_PHONE_REGEX = /^(?:\+20|0)?1[0125][0-9]{8}$/;

export interface RawServantRow {
  fullName: string;
  phoneNumber: string;
  email?: string;
  roleCode?: string;
  temporaryPassword?: string;
  fatherConfessor?: string;
  fatherConfessorChurch?: string;
  address?: string;
  dateOfBirth?: string;
  educationOrCareer?: string;
  maritalStatus?: string;
}

const servantRowSchema = z.object({
  fullName: z.string().min(3, 'الاسم بالكامل يجب ألا يقل عن 3 أحرف'),
  phoneNumber: z
    .string()
    .min(10, 'رقم الهاتف مطلوب')
    .regex(EGYPTIAN_PHONE_REGEX, 'يرجى إدخال رقم هاتف مصري صحيح (مثال: 01xxxxxxxxx)'),
  email: z.string().email('بريد إلكتروني غير صالح').optional().nullable(),
  roleCode: z.string().optional().nullable(),
  temporaryPassword: z.string().min(6, 'كلمة المرور يجب ألا تقل عن 6 أحرف').optional().nullable(),
  fatherConfessor: z.string().optional().nullable(),
  fatherConfessorChurch: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  educationOrCareer: z.string().optional().nullable(),
  maritalStatus: z.string().optional().nullable(),
});

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

  /**
   * Parses CSV text with Arabic or English column headers into normalized servant row objects.
   */
  public static parseServantCsv(csvContent: string): RawServantRow[] {
    const lines = csvContent
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      throw new Error('الملف فارغ أو لا يحتوي على صفوف بيانات');
    }

    const headerLine = lines[0];
    const headers = headerLine.split(',').map((h) => h.trim().replace(/^"|"$/g, ''));

    const headerMap: Record<string, keyof RawServantRow> = {
      'الاسم بالكامل': 'fullName',
      fullName: 'fullName',
      'الاسم': 'fullName',
      name: 'fullName',
      'رقم الهاتف': 'phoneNumber',
      phoneNumber: 'phoneNumber',
      phone: 'phoneNumber',
      'الموبايل': 'phoneNumber',
      'الهاتف': 'phoneNumber',
      mobile: 'phoneNumber',
      'البريد الإلكتروني': 'email',
      email: 'email',
      'الإيميل': 'email',
      'الدور': 'roleCode',
      'الرتبة': 'roleCode',
      'رتبة الخادم': 'roleCode',
      role: 'roleCode',
      roleCode: 'roleCode',
      'كلمة المرور': 'temporaryPassword',
      'كلمة السر': 'temporaryPassword',
      'كلمة المرور المؤقتة': 'temporaryPassword',
      password: 'temporaryPassword',
      temporaryPassword: 'temporaryPassword',
      'اب الاعتراف': 'fatherConfessor',
      'أب الاعتراف': 'fatherConfessor',
      fatherConfessor: 'fatherConfessor',
      'كنيسة اب الاعتراف': 'fatherConfessorChurch',
      'كنيسة أب الاعتراف': 'fatherConfessorChurch',
      fatherConfessorChurch: 'fatherConfessorChurch',
      'العنوان': 'address',
      address: 'address',
      'تاريخ الميلاد': 'dateOfBirth',
      dateOfBirth: 'dateOfBirth',
      dob: 'dateOfBirth',
      'المهنة أو الدراسة': 'educationOrCareer',
      'المؤهل': 'educationOrCareer',
      'الوظيفة': 'educationOrCareer',
      educationOrCareer: 'educationOrCareer',
      'الحالة الاجتماعية': 'maritalStatus',
      maritalStatus: 'maritalStatus',
    };

    const rows: RawServantRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      const rowObj: any = {};

      headers.forEach((h, idx) => {
        const standardKey = headerMap[h] || headerMap[h.toLowerCase()];
        if (standardKey && values[idx] !== undefined) {
          rowObj[standardKey] = values[idx];
        }
      });

      if (rowObj.fullName || rowObj.phoneNumber) {
        rows.push(rowObj);
      }
    }

    return rows;
  }

  /**
   * Validates and imports parsed servant rows for a specific stage inside a database transaction.
   */
  public static async importServantsForStage(
    orgId: string,
    stageId: string,
    sectorId: string | null,
    creator: { userId: string; roleLevel: number; roleCode: string; stageIds: string[]; sectorIds: string[] },
    rows: RawServantRow[]
  ): Promise<{
    success: boolean;
    importedCount: number;
    totalCount: number;
    errors: Array<{ row: number; message: string }>;
    createdUsers: any[];
  }> {
    const validRecords: Array<{ data: z.infer<typeof servantRowSchema>; targetRole: any }> = [];
    const errors: Array<{ row: number; message: string }> = [];
    const seenPhonesInBatch = new Set<string>();

    // Load available roles
    const allRoles = await prisma.role.findMany();
    const defaultRole = allRoles.find((r) => r.code === 'SERVANT');

    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx];
      const rowNum = idx + 1;

      const parseResult = servantRowSchema.safeParse(row);
      if (!parseResult.success) {
        errors.push({
          row: rowNum,
          message: parseResult.error.errors.map((e) => e.message).join(', '),
        });
        continue;
      }

      const data = parseResult.data;

      // Uniqueness within CSV batch
      const cleanPhone = data.phoneNumber.trim();
      if (seenPhonesInBatch.has(cleanPhone)) {
        errors.push({
          row: rowNum,
          message: `رقم الهاتف ${cleanPhone} مكرر في الملف`,
        });
        continue;
      }
      seenPhonesInBatch.add(cleanPhone);

      // Check phone uniqueness against DB
      const phoneVariants = getPhoneVariants(cleanPhone);
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { phoneNumber: { in: phoneVariants } },
            ...(data.email ? [{ email: data.email.toLowerCase() }] : []),
          ],
        },
      });

      if (existingUser) {
        errors.push({
          row: rowNum,
          message: `رقم الهاتف ${cleanPhone} أو البريد مسجل مسبقاً في النظام`,
        });
        continue;
      }

      // Resolve role
      let targetRole = defaultRole;
      if (data.roleCode && data.roleCode.trim()) {
        const rc = data.roleCode.trim().toLowerCase();
        let matched = allRoles.find(
          (r) =>
            r.code.toLowerCase() === rc ||
            r.name.toLowerCase() === rc ||
            r.id === data.roleCode
        );
        if (!matched) {
          if (rc.includes('خادم') || rc.includes('servant')) {
            matched = allRoles.find((r) => r.code === 'SERVANT');
          } else if (rc.includes('مساعد') || rc.includes('assistant')) {
            matched = allRoles.find((r) => r.code === 'ASSISTANT_SECRETARY');
          } else if (rc.includes('أمين خدمة') || rc.includes('stage')) {
            matched = allRoles.find((r) => r.code === 'STAGE_SECRETARY');
          } else if (rc.includes('أمين قطاع') || rc.includes('sector')) {
            matched = allRoles.find((r) => r.code === 'SECTOR_SECRETARY');
          }
        }
        if (matched) {
          targetRole = matched;
        } else {
          errors.push({
            row: rowNum,
            message: `الدور '${data.roleCode}' غير معروف`,
          });
          continue;
        }
      }

      if (!targetRole) {
        errors.push({
          row: rowNum,
          message: 'تعذر تحديد دور الخادم',
        });
        continue;
      }

      // Role authority validation
      if (targetRole.level >= creator.roleLevel) {
        errors.push({
          row: rowNum,
          message: `لا يمكن إسناد دور برتبة مساوية أو أعلى من رتبتك (${targetRole.name})`,
        });
        continue;
      }

      if (targetRole.level >= 3 && creator.roleLevel < 5) {
        errors.push({
          row: rowNum,
          message: `تعيين أمناء الخدمة والقطاعات مقتصر حصرياً على الأمين العام`,
        });
        continue;
      }

      validRecords.push({ data, targetRole });
    }

    if (validRecords.length === 0) {
      return {
        success: false,
        importedCount: 0,
        totalCount: rows.length,
        errors,
        createdUsers: [],
      };
    }

    const createdUsers: any[] = [];

    await prisma.$transaction(async (tx) => {
      for (const item of validRecords) {
        const { data, targetRole } = item;
        const passwordHash = await HashService.hashPassword(data.temporaryPassword || 'Demo@123');

        const newUser = await tx.user.create({
          data: {
            organizationId: orgId,
            roleId: targetRole.id,
            fullName: data.fullName.trim(),
            phoneNumber: data.phoneNumber.trim(),
            email: data.email ? data.email.toLowerCase().trim() : null,
            passwordHash,
            status: UserStatus.ACTIVE,
            fatherConfessor: data.fatherConfessor || null,
            fatherConfessorChurch: data.fatherConfessorChurch || null,
            address: data.address || null,
            dateOfBirth: data.dateOfBirth || null,
            educationOrCareer: data.educationOrCareer || null,
            maritalStatus: data.maritalStatus || null,
          },
        });

        await tx.scopeAssignment.create({
          data: {
            userId: newUser.id,
            stageId,
            sectorId: sectorId || null,
          },
        });

        createdUsers.push(newUser);
      }
    });

    return {
      success: true,
      importedCount: createdUsers.length,
      totalCount: rows.length,
      errors,
      createdUsers,
    };
  }
}
