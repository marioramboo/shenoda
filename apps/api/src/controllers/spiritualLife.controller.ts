import { Request, Response } from 'express';
import { SpiritualLifeService } from '../services/spiritualLife.service';
import { SpiritualSacrament as PrismaSpiritualSacrament } from '@prisma/client';

export class SpiritualLifeController {
  /**
   * POST /api/v1/spiritual-life (FR-6.1)
   * Log personal sacrament entry.
   */
  static async create(req: Request, res: Response) {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
        timestamp: new Date().toISOString(),
      });
    }

    const { sacrament, entryDate, notes, fatherName } = req.body;

    if (!sacrament || !entryDate) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'sacrament and entryDate are required',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const parsedDate = new Date(entryDate);

    const entry = await SpiritualLifeService.logEntry({
      userId: user.userId,
      sacrament: sacrament as PrismaSpiritualSacrament,
      entryDate: parsedDate,
      notes,
      fatherName,
    });

    return res.status(201).json({
      success: true,
      data: entry,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * GET /api/v1/spiritual-life/me or /api/v1/spiritual-life (NFR-3.4 & FR-6.2)
   * Get caller's own spiritual journal.
   * If any query parameter specifies another userId, immediately reject with 403 (ERR_SPIRITUAL_DATA_FIREWALL).
   */
  static async getMyEntries(req: Request, res: Response) {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
        timestamp: new Date().toISOString(),
      });
    }

    // Architectural Privacy Firewall Check (FR-6.2 & NFR-3.4)
    const requestedUserId = (req.query.userId as string) || user.userId;

    if (requestedUserId !== user.userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ERR_SPIRITUAL_DATA_FIREWALL',
          message:
            'Forbidden: Spiritual life records are strictly private and quarantined. Even administrative supervisors cannot view another servant spiritual data.',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const sacrament = req.query.sacrament as PrismaSpiritualSacrament | undefined;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    try {
      const entries = await SpiritualLifeService.getEntriesForUser(
        requestedUserId,
        user.userId,
        {
          sacrament,
          startDate,
          endDate,
        }
      );

      return res.status(200).json({
        success: true,
        data: entries,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      return res.status(err.status || 500).json({
        success: false,
        error: {
          code: err.code || 'SERVER_ERROR',
          message: err.message,
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * DELETE /api/v1/spiritual-life/:id
   */
  static async delete(req: Request, res: Response) {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
        timestamp: new Date().toISOString(),
      });
    }

    try {
      await SpiritualLifeService.deleteEntry(req.params.id, user.userId);
      return res.status(200).json({
        success: true,
        message: 'Spiritual entry deleted',
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      return res.status(err.status || 500).json({
        success: false,
        error: {
          code: err.code || 'SERVER_ERROR',
          message: err.message,
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
}
