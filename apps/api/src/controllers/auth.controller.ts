import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { HashService } from '../services/hash.service';
import {
  TokenService,
  REFRESH_COOKIE_NAME,
  getRefreshCookieOptions,
} from '../services/token.service';
import {
  checkLoginRateLimit,
  recordFailedLoginAttempt,
  clearLoginRateLimit,
} from '../middleware/rateLimiter';
import { getPhoneVariants } from '@shenoda/shared';

// Regex for Egyptian mobile phone (allowing optional +2 prefix)
const EGYPTIAN_PHONE_REGEX = /^(?:\+20|0)?1[0125][0-9]{8}$/;

// Zod login schema
const loginSchema = z.object({
  identifier: z
    .string()
    .min(1, 'رقم الهاتف أو البريد الإلكتروني مطلوب')
    .refine(
      (val) => {
        const clean = val.trim();
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean);
        const isPhone = EGYPTIAN_PHONE_REGEX.test(clean);
        return isEmail || isPhone;
      },
      { message: 'يرجى إدخال رقم هاتف مصري صحيح (مثال: 01xxxxxxxxx) أو بريد إلكتروني صالح' }
    ),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
});

// Zod forgot password schema
const forgotPasswordSchema = z.object({
  identifier: z.string().min(1, 'رقم الهاتف أو البريد الإلكتروني مطلوب'),
});

// Zod reset password schema
const resetPasswordSchema = z.object({
  identifier: z.string().min(1, 'رقم الهاتف أو البريد الإلكتروني مطلوب'),
  otpCode: z.string().length(6, 'كود التحقق يجب أن يتكون من 6 أرقام'),
  newPassword: z.string().min(8, 'كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف'),
});

// Zod self-profile update schema (FR-2.1)
const updateProfileSchema = z.object({
  fullName: z.string().min(3, 'الاسم بالكامل يجب ألا يقل عن 3 أحرف').optional(),
  phoneNumber: z
    .string()
    .min(10, 'رقم الهاتف مطلوب')
    .regex(EGYPTIAN_PHONE_REGEX, 'يرجى إدخال رقم هاتف مصري صحيح (مثال: 01xxxxxxxxx)')
    .optional(),
  email: z.string().email('بريد إلكتروني غير صالح').optional().nullable(),
  fatherConfessor: z.string().optional().nullable(),
  dateOfBirth: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: 'تاريخ الميلاد غير صالح',
    }),
  address: z.string().optional().nullable(),
  maritalStatus: z.string().optional().nullable(),
  spouseName: z.string().optional().nullable(),
  educationOrCareer: z.string().optional().nullable(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, 'كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف').optional(),
});


/**
 * Finds user by phone or email
 */
async function findUserByIdentifier(identifier: string) {
  const clean = identifier.trim();
  const isEmail = clean.includes('@');

  if (isEmail) {
    return prisma.user.findFirst({
      where: { email: clean.toLowerCase() },
      include: {
        role: true,
        scopeAssignments: {
          include: {
            stage: true,
            sector: true,
          },
        },
      },
    });
  }

  const phoneVariants = getPhoneVariants(clean);
  return prisma.user.findFirst({
    where: {
      phoneNumber: { in: phoneVariants },
    },
    include: {
      role: true,
      scopeAssignments: {
        include: {
          stage: true,
          sector: true,
        },
      },
    },
  });
}

export class AuthController {
  /**
   * POST /api/v1/auth/login
   */
  public static async login(req: Request, res: Response) {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parseResult.error.errors[0]?.message || 'بيانات الدخول غير صحيحة',
          details: parseResult.error.format(),
        },
        timestamp: new Date().toISOString(),
      });
    }

    const { identifier, password } = parseResult.data;

    // 1. Check rate limit
    const rateLimit = checkLoginRateLimit(identifier);
    if (!rateLimit.allowed) {
      res.setHeader('Retry-After', rateLimit.retryAfterSeconds?.toString() || '900');
      return res.status(429).json({
        success: false,
        error: {
          code: 'ERR_RATE_LIMITED',
          message: 'تم حظر محاولات الدخول مؤقتاً لتكرار المحاولات الخاطئة. الرجاء المحاولة بعد 15 دقيقة.',
          details: { retryAfterSeconds: rateLimit.retryAfterSeconds },
        },
        timestamp: new Date().toISOString(),
      });
    }

    // 2. Fetch user
    const user = await findUserByIdentifier(identifier);
    if (!user) {
      const attempt = recordFailedLoginAttempt(identifier);
      if (attempt.isLocked) {
        return res.status(429).json({
          success: false,
          error: {
            code: 'ERR_RATE_LIMITED',
            message: 'تم حظر محاولات الدخول مؤقتاً لتكرار المحاولات الخاطئة. الرجاء المحاولة بعد 15 دقيقة.',
          },
          timestamp: new Date().toISOString(),
        });
      }
      return res.status(401).json({
        success: false,
        error: {
          code: 'ERR_INVALID_CREDENTIALS',
          message: 'رقم الهاتف أو البريد الإلكتروني أو كلمة المرور غير صحيحة',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // 3. Check suspension status
    if (user.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ERR_ACCOUNT_SUSPENDED',
          message: 'هذا الحساب موقوف حالياً. يرجى التواصل مع الأمانة العامة للكنيسة.',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // 4. Verify password
    const isPasswordValid = await HashService.verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      const attempt = recordFailedLoginAttempt(identifier);
      if (attempt.isLocked) {
        return res.status(429).json({
          success: false,
          error: {
            code: 'ERR_RATE_LIMITED',
            message: 'تم حظر محاولات الدخول مؤقتاً لتكرار المحاولات الخاطئة. الرجاء المحاولة بعد 15 دقيقة.',
          },
          timestamp: new Date().toISOString(),
        });
      }
      return res.status(401).json({
        success: false,
        error: {
          code: 'ERR_INVALID_CREDENTIALS',
          message: 'رقم الهاتف أو البريد الإلكتروني أو كلمة المرور غير صحيحة',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // 5. Success -> clear failed attempts
    clearLoginRateLimit(identifier);

    // 6. Collect user scopes
    const stageIds = user.scopeAssignments
      .filter((a) => a.stageId)
      .map((a) => a.stageId as string);
    const sectorIds = user.scopeAssignments
      .filter((a) => a.sectorId)
      .map((a) => a.sectorId as string);

    // 7. Issue Access Token & Refresh Token
    const accessToken = TokenService.generateAccessToken({
      userId: user.id,
      roleLevel: user.role.level,
      roleCode: user.role.code,
      orgId: user.organizationId,
      stageIds,
      sectorIds,
    });

    const { token: refreshToken } = await TokenService.createRefreshToken(user.id, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });

    // 8. Set HttpOnly Cookie
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());

    // 9. Format response
    const stages = user.scopeAssignments
      .filter((a) => a.stage)
      .map((a) => ({ id: a.stage!.id, name: a.stage!.name, code: a.stage!.code }));
    const sectors = user.scopeAssignments
      .filter((a) => a.sector)
      .map((a) => ({ id: a.sector!.id, name: a.sector!.name, code: a.sector!.code }));

    return res.status(200).json({
      success: true,
      accessToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        email: user.email,
        status: user.status,
        fatherConfessor: user.fatherConfessor,
        dateOfBirth: user.dateOfBirth,
        address: user.address,
        maritalStatus: user.maritalStatus,
        spouseName: user.spouseName,
        educationOrCareer: user.educationOrCareer,
        role: {
          id: user.role.id,
          code: user.role.code,
          name: user.role.name,
          level: user.role.level,
        },
        scopes: {
          stages,
          sectors,
        },
      },
    });
  }

  /**
   * POST /api/v1/auth/refresh
   */
  public static async refresh(req: Request, res: Response) {
    try {
      const rawToken = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;

      if (!rawToken) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'ERR_NO_REFRESH_TOKEN',
            message: 'جلسة الدخول منتهية، يرجى إعادة تسجيل الدخول',
          },
          timestamp: new Date().toISOString(),
        });
      }

      const rotationResult = await TokenService.verifyAndRotateRefreshToken(rawToken, {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      });

      if (!rotationResult) {
        res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
        return res.status(401).json({
          success: false,
          error: {
            code: 'ERR_INVALID_REFRESH_TOKEN',
            message: 'رمز الجلسة غير صالح أو منتهي الصلاحية',
          },
          timestamp: new Date().toISOString(),
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: rotationResult.userId },
        include: {
          role: true,
          scopeAssignments: {
            include: { stage: true, sector: true },
          },
        },
      });

      if (!user || user.status === 'SUSPENDED') {
        res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
        return res.status(403).json({
          success: false,
          error: {
            code: 'ERR_ACCOUNT_SUSPENDED',
            message: 'هذا الحساب موقوف حالياً',
          },
          timestamp: new Date().toISOString(),
        });
      }

      const stageIds = user.scopeAssignments
        .filter((a) => a.stageId)
        .map((a) => a.stageId as string);
      const sectorIds = user.scopeAssignments
        .filter((a) => a.sectorId)
        .map((a) => a.sectorId as string);

      const accessToken = TokenService.generateAccessToken({
        userId: user.id,
        roleLevel: user.role.level,
        roleCode: user.role.code,
        orgId: user.organizationId,
        stageIds,
        sectorIds,
      });

      res.cookie(
        REFRESH_COOKIE_NAME,
        rotationResult.newRefreshToken,
        getRefreshCookieOptions()
      );

      return res.status(200).json({
        success: true,
        accessToken,
        user: {
          id: user.id,
          fullName: user.fullName,
          phoneNumber: user.phoneNumber,
          email: user.email,
          status: user.status,
          fatherConfessor: user.fatherConfessor,
          dateOfBirth: user.dateOfBirth,
          address: user.address,
          maritalStatus: user.maritalStatus,
          spouseName: user.spouseName,
          educationOrCareer: user.educationOrCareer,
          role: {
            id: user.role.id,
            code: user.role.code,
            name: user.role.name,
            level: user.role.level,
          },
          scopes: {
            stages: user.scopeAssignments
              .filter((a) => a.stage)
              .map((a) => ({ id: a.stage!.id, name: a.stage!.name, code: a.stage!.code })),
            sectors: user.scopeAssignments
              .filter((a) => a.sector)
              .map((a) => ({ id: a.sector!.id, name: a.sector!.name, code: a.sector!.code })),
          },
        },
      });
    } catch (err: any) {
      console.error('AuthController.refresh unexpected error:', err);
      return res.status(500).json({
        success: false,
        error: {
          code: 'ERR_INTERNAL_SERVER_ERROR',
          message: 'حدث خطأ غير متوقع أثناء معالجة الجلسة',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * POST /api/v1/auth/logout
   */
  public static async logout(req: Request, res: Response) {
    const rawToken = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;

    if (rawToken) {
      await TokenService.revokeRefreshToken(rawToken);
    }

    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });

    return res.status(200).json({
      success: true,
      message: 'تم تسجيل الخروج بنجاح',
    });
  }

  /**
   * POST /api/v1/auth/forgot-password (FR-1.3)
   */
  public static async forgotPassword(req: Request, res: Response) {
    const parseResult = forgotPasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'يرجى إدخال رقم الهاتف أو البريد الإلكتروني',
        },
      });
    }

    const { identifier } = parseResult.data;
    const user = await findUserByIdentifier(identifier);

    // Prevent user enumeration: always return success
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'إذا كان الحساب مسجلاً، فسيتم إرسال كود التحقق في رسالة نصية قصيرة.',
      });
    }

    const otpCode = HashService.generateOtp();
    const tokenHash = HashService.hashToken(otpCode);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate previous reset tokens for this user
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, isUsed: false },
      data: { isUsed: true },
    });

    // Create fresh OTP token
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        otpCode,
        tokenHash,
        expiresAt,
      },
    });

    // In dev / test, we can include the otpCode in response for testing convenience
    const isDev = process.env.NODE_ENV !== 'production';

    return res.status(200).json({
      success: true,
      message: 'تم إنشاء كود التحقق بنجاح وإرساله لهاتفك.',
      ...(isDev ? { devOtpCode: otpCode } : {}),
    });
  }

  /**
   * POST /api/v1/auth/reset-password (FR-1.3)
   */
  public static async resetPassword(req: Request, res: Response) {
    const parseResult = resetPasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parseResult.error.errors[0]?.message || 'بيانات إعادة التعيين غير صحيحة',
        },
      });
    }

    const { identifier, otpCode, newPassword } = parseResult.data;
    const user = await findUserByIdentifier(identifier);

    if (!user) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ERR_INVALID_OR_EXPIRED_OTP',
          message: 'كود التحقق غير صالح أو انتهت صلاحيته',
        },
      });
    }

    const tokenHash = HashService.hashToken(otpCode);
    const resetRecord = await prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        tokenHash,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!resetRecord) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ERR_INVALID_OR_EXPIRED_OTP',
          message: 'كود التحقق غير صالح أو انتهت صلاحيته',
        },
      });
    }

    // Mark OTP token as used
    await prisma.passwordResetToken.update({
      where: { id: resetRecord.id },
      data: { isUsed: true },
    });

    // Update password hash with bcrypt/argon2
    const passwordHash = await HashService.hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Revoke all existing sessions for security
    await TokenService.revokeAllUserRefreshTokens(user.id);

    return res.status(200).json({
      success: true,
      message: 'تم تغيير كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.',
    });
  }

  /**
   * GET /api/v1/auth/me
   */
  public static async me(req: Request, res: Response) {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication required',
        },
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        role: true,
        scopeAssignments: {
          include: { stage: true, sector: true },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'المستخدم غير موجود',
        },
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        email: user.email,
        status: user.status,
        fatherConfessor: user.fatherConfessor,
        dateOfBirth: user.dateOfBirth,
        address: user.address,
        maritalStatus: user.maritalStatus,
        spouseName: user.spouseName,
        educationOrCareer: user.educationOrCareer,
        role: {
          id: user.role.id,
          code: user.role.code,
          name: user.role.name,
          level: user.role.level,
        },
        scopes: {
          stages: user.scopeAssignments
            .filter((a) => a.stage)
            .map((a) => ({ id: a.stage!.id, name: a.stage!.name, code: a.stage!.code })),
          sectors: user.scopeAssignments
            .filter((a) => a.sector)
            .map((a) => ({ id: a.sector!.id, name: a.sector!.name, code: a.sector!.code })),
        },
      },
    });
  }

  /**
   * PATCH /api/v1/auth/profile or PATCH /api/v1/auth/me (FR-2.1)
   * Self-service profile editing for authenticated servants and secretaries.
   */
  public static async updateProfile(req: Request, res: Response) {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
      });
    }

    const parseResult = updateProfileSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parseResult.error.errors[0]?.message || 'بيانات التعديل غير صحيحة',
          details: parseResult.error.format(),
        },
      });
    }

    const {
      fullName,
      phoneNumber,
      email,
      fatherConfessor,
      dateOfBirth,
      address,
      maritalStatus,
      spouseName,
      educationOrCareer,
      currentPassword,
      newPassword,
    } = parseResult.data;

    // Fetch user
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        role: true,
        scopeAssignments: {
          include: { stage: true, sector: true },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'المستخدم غير موجود' },
      });
    }

    // Phone uniqueness check
    if (phoneNumber && phoneNumber !== user.phoneNumber) {
      const existingPhone = await prisma.user.findFirst({
        where: {
          phoneNumber,
          id: { not: user.id },
        },
      });
      if (existingPhone) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'ERR_PHONE_EXISTS',
            message: 'رقم الهاتف مسجل لحساب آخر بالفعل في النظام',
          },
        });
      }
    }

    // Email uniqueness check
    if (email && email.toLowerCase() !== user.email?.toLowerCase()) {
      const existingEmail = await prisma.user.findFirst({
        where: {
          email: email.toLowerCase(),
          id: { not: user.id },
        },
      });
      if (existingEmail) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'ERR_EMAIL_EXISTS',
            message: 'البريد الإلكتروني مسجل لحساب آخر بالفعل في النظام',
          },
        });
      }
    }

    // Password change check
    let newPasswordHash: string | undefined = undefined;
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'CURRENT_PASSWORD_REQUIRED',
            message: 'يرجى إدخال كلمة المرور الحالية لتتمكن من تعيين كلمة مرور جديدة',
          },
        });
      }

      const isValid = await HashService.verifyPassword(currentPassword, user.passwordHash);
      if (!isValid) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_CURRENT_PASSWORD',
            message: 'كلمة المرور الحالية غير صحيحة',
          },
        });
      }

      newPasswordHash = await HashService.hashPassword(newPassword);
    }

    // Update user record
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        fullName: fullName !== undefined ? fullName : undefined,
        phoneNumber: phoneNumber !== undefined ? phoneNumber : undefined,
        email: email !== undefined ? (email ? email.toLowerCase() : null) : undefined,
        fatherConfessor: fatherConfessor !== undefined ? fatherConfessor : undefined,
        dateOfBirth:
          dateOfBirth !== undefined ? (dateOfBirth ? new Date(dateOfBirth) : null) : undefined,
        address: address !== undefined ? address : undefined,
        maritalStatus: maritalStatus !== undefined ? maritalStatus : undefined,
        spouseName: spouseName !== undefined ? spouseName : undefined,
        educationOrCareer: educationOrCareer !== undefined ? educationOrCareer : undefined,
        passwordHash: newPasswordHash || undefined,
      },
      include: {
        role: true,
        scopeAssignments: {
          include: { stage: true, sector: true },
        },
      },
    });

    const stages = updatedUser.scopeAssignments
      .filter((a) => a.stage)
      .map((a) => ({ id: a.stage!.id, name: a.stage!.name, code: a.stage!.code }));
    const sectors = updatedUser.scopeAssignments
      .filter((a) => a.sector)
      .map((a) => ({ id: a.sector!.id, name: a.sector!.name, code: a.sector!.code }));

    return res.status(200).json({
      success: true,
      message: 'تم تحديث بيانات الحساب الشخصي بنجاح',
      user: {
        id: updatedUser.id,
        fullName: updatedUser.fullName,
        phoneNumber: updatedUser.phoneNumber,
        email: updatedUser.email,
        status: updatedUser.status,
        fatherConfessor: updatedUser.fatherConfessor,
        dateOfBirth: updatedUser.dateOfBirth,
        address: updatedUser.address,
        maritalStatus: updatedUser.maritalStatus,
        spouseName: updatedUser.spouseName,
        educationOrCareer: updatedUser.educationOrCareer,
        role: {
          id: updatedUser.role.id,
          code: updatedUser.role.code,
          name: updatedUser.role.name,
          level: updatedUser.role.level,
        },
        scopes: {
          stages,
          sectors,
        },
      },
    });
  }
}
