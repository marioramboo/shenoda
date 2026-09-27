import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const BCRYPT_SALT_ROUNDS = 12;

/**
 * Service for cryptographic operations, password hashing, and token generation.
 * Adheres to NFR-3.2: High-security hashing and constant-time verification.
 */
export class HashService {
  /**
   * Hashes a plaintext password using bcrypt with minimum cost factor 12.
   * Plaintext passwords must never be logged or returned.
   */
  public static async hashPassword(plaintext: string): Promise<string> {
    if (!plaintext || typeof plaintext !== 'string') {
      throw new Error('Invalid password input');
    }
    return bcrypt.hash(plaintext, BCRYPT_SALT_ROUNDS);
  }

  /**
   * Verifies a plaintext password against a stored hash using constant-time comparison.
   */
  public static async verifyPassword(plaintext: string, hash: string): Promise<boolean> {
    if (!plaintext || !hash) {
      return false;
    }
    return bcrypt.compare(plaintext, hash);
  }

  /**
   * Generates a cryptographically secure 6-digit numeric OTP code.
   */
  public static generateOtp(): string {
    return crypto.randomInt(100000, 1000000).toString();
  }

  /**
   * Generates a cryptographically secure random token (e.g. for refresh tokens).
   */
  public static generateRandomToken(bytes: number = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  }

  /**
   * Computes a SHA-256 hex digest for opaque tokens before storing in database.
   */
  public static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
