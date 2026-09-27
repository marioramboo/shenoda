import path from 'path';
import fs from 'fs';
import { LessonAttachment } from '@shenoda/shared';

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
];

export class StorageService {
  private static uploadsDir = path.resolve(process.cwd(), 'uploads/preparations');

  private static ensureUploadsDir() {
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  static validateFile(sizeBytes: number, mimeType: string): { valid: boolean; error?: string } {
    if (sizeBytes > MAX_FILE_SIZE_BYTES) {
      return {
        valid: false,
        error: `حجم الملف يتجاوز الحد الأقصى المسموح به (${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB)`,
      };
    }

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return {
        valid: false,
        error: 'نوع الملف غير مدعوم. الأنواع المدعومة: PDF, PowerPoint, Word, صور (JPEG, PNG)',
      };
    }

    return { valid: true };
  }

  /**
   * Saves an uploaded buffer locally or generates a secure download URL.
   */
  static async saveFile(
    fileName: string,
    mimeType: string,
    buffer?: Buffer
  ): Promise<LessonAttachment> {
    this.ensureUploadsDir();

    const timestamp = Date.now();
    const safeFileName = fileName.replace(/[^a-zA-Z0-9._\-\u0600-\u06FF]/g, '_');
    const storedFileName = `${timestamp}_${safeFileName}`;
    const filePath = path.join(this.uploadsDir, storedFileName);

    let size = 0;
    if (buffer) {
      await fs.promises.writeFile(filePath, buffer);
      size = buffer.length;
    }

    const publicUrl = `/uploads/preparations/${storedFileName}`;

    return {
      url: publicUrl,
      fileName,
      fileType: mimeType,
      sizeBytes: size || 1024,
    };
  }
}
