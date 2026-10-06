import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { HashService } from './hash.service';

export interface AccessTokenPayload {
  userId: string;
  roleLevel: number;
  roleCode: string;
  orgId: string;
  stageIds: string[];
  sectorIds: string[];
}

export const REFRESH_COOKIE_NAME = 'refreshToken';

export const getRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: true,
  sameSite: 'none' as const,
  maxAge: env.REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000,
  path: '/',
});

export class TokenService {
  /**
   * Generates a short-lived signed JWT access token (15 mins).
   */
  public static generateAccessToken(payload: AccessTokenPayload): string {
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.ACCESS_TOKEN_EXPIRES_IN as unknown as jwt.SignOptions['expiresIn'],
    });
  }

  /**
   * Verifies and decodes a signed JWT access token.
   * Returns decoded payload or null if invalid/expired.
   */
  public static verifyAccessToken(token: string): AccessTokenPayload | null {
    try {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
      return decoded;
    } catch {
      return null;
    }
  }

  /**
   * Generates a cryptographically secure opaque refresh token,
   * stores its SHA-256 hash in the database, and returns the raw token.
   */
  public static async createRefreshToken(
    userId: string,
    metadata?: { userAgent?: string; ipAddress?: string }
  ): Promise<{ token: string; expiresAt: Date }> {
    const rawToken = HashService.generateRandomToken(40);
    const tokenHash = HashService.hashToken(rawToken);
    const expiresAt = new Date(
      Date.now() + env.REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000
    );

    await prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
        userAgent: metadata?.userAgent || null,
        ipAddress: metadata?.ipAddress || null,
      },
    });

    return { token: rawToken, expiresAt };
  }

  /**
   * Rotates a refresh token: verifies raw token hash against DB,
   * marks old token as revoked, and creates a fresh token (rotation prevention).
   */
  public static async verifyAndRotateRefreshToken(
    rawToken: string,
    metadata?: { userAgent?: string; ipAddress?: string }
  ): Promise<{ userId: string; newRefreshToken: string; expiresAt: Date } | null> {
    if (!rawToken) return null;

    const tokenHash = HashService.hashToken(rawToken);
    const record = await prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!record || record.isRevoked || record.expiresAt < new Date()) {
      return null;
    }

    // Revoke old token
    await prisma.refreshToken.update({
      where: { id: record.id },
      data: { isRevoked: true },
    });

    // Create rotated replacement token
    const { token: newRefreshToken, expiresAt } = await this.createRefreshToken(
      record.userId,
      metadata
    );

    return {
      userId: record.userId,
      newRefreshToken,
      expiresAt,
    };
  }

  /**
   * Revokes a single refresh token record (e.g. during logout).
   */
  public static async revokeRefreshToken(rawToken: string): Promise<boolean> {
    if (!rawToken) return false;
    const tokenHash = HashService.hashToken(rawToken);

    try {
      await prisma.refreshToken.update({
        where: { tokenHash },
        data: { isRevoked: true },
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Revokes all active refresh tokens for a user (e.g. upon account suspension or password reset).
   */
  public static async revokeAllUserRefreshTokens(userId: string): Promise<number> {
    const result = await prisma.refreshToken.updateMany({
      where: {
        userId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
      },
    });

    return result.count;
  }
}
