import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

export class PollController {
  /**
   * POST /api/v1/polls (FR-9.1)
   * Creates an interactive poll with multiple options (requires roleLevel >= 3).
   */
  static async createPoll(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      if (user.roleLevel < 3) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'إنشاء استطلاعات الرأي مقتصر على أمناء الخدمة والمشرفين (Level 3+)',
          },
          timestamp: new Date().toISOString(),
        });
      }

      const {
        question,
        options,
        allowMultiple = false,
        closesAt,
        stageId = user.stageIds[0] || null,
        sectorId = user.sectorIds[0] || null,
      } = req.body;

      if (!question || !Array.isArray(options) || options.length < 2 || !closesAt) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'ERR_VALIDATION',
            message: 'Question, at least 2 options, and closesAt date are required',
          },
          timestamp: new Date().toISOString(),
        });
      }

      const poll = await prisma.poll.create({
        data: {
          createdById: user.userId,
          question,
          allowMultiple: Boolean(allowMultiple),
          closesAt: new Date(closesAt),
          stageId,
          sectorId,
          options: {
            create: options.map((optText: string, idx: number) => ({
              text: optText,
              order: idx,
            })),
          },
        },
        include: {
          options: { orderBy: { order: 'asc' } },
          createdBy: { select: { id: true, fullName: true } },
          stage: { select: { id: true, name: true } },
        },
      });

      return res.status(201).json({
        success: true,
        data: poll,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error creating poll:', err);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: err.message },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * GET /api/v1/polls
   * Lists polls available for caller.
   */
  static async listPolls(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const whereClause: any = {};
      if (user.roleLevel < 5) {
        const orConditions: any[] = [
          { stageId: null, sectorId: null }, // Church-wide
        ];
        if (user.stageIds.length > 0) {
          orConditions.push({ stageId: { in: user.stageIds } });
        }
        if (user.sectorIds.length > 0) {
          orConditions.push({ sectorId: { in: user.sectorIds } });
        }
        whereClause.OR = orConditions;
      }

      const polls = await prisma.poll.findMany({
        where: whereClause,
        include: {
          options: {
            orderBy: { order: 'asc' },
            include: {
              _count: { select: { votes: true } },
            },
          },
          votes: {
            where: { userId: user.userId },
            select: { optionId: true },
          },
          createdBy: { select: { id: true, fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      const formatted = polls.map((p) => {
        const totalVotes = p.options.reduce((sum, opt) => sum + (opt._count?.votes || 0), 0);
        return {
          id: p.id,
          question: p.question,
          allowMultiple: p.allowMultiple,
          closesAt: p.closesAt,
          isClosed: p.isClosed || new Date() > new Date(p.closesAt),
          createdAt: p.createdAt,
          createdBy: p.createdBy,
          userVotedOptionIds: p.votes.map((v) => v.optionId),
          totalVotes,
          options: p.options.map((opt) => ({
            id: opt.id,
            text: opt.text,
            order: opt.order,
            voteCount: opt._count?.votes || 0,
            percentage: totalVotes > 0 ? Math.round(((opt._count?.votes || 0) / totalVotes) * 100) : 0,
          })),
        };
      });

      return res.status(200).json({
        success: true,
        data: formatted,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error listing polls:', err);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: err.message },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * POST /api/v1/polls/:id/vote (FR-9.1)
   * Submits voter choice with duplicate voting prevention.
   */
  static async vote(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { id: pollId } = req.params;
      const { optionId, optionIds } = req.body;

      const poll = await prisma.poll.findUnique({
        where: { id: pollId },
        include: { options: true },
      });

      if (!poll) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Poll not found' },
          timestamp: new Date().toISOString(),
        });
      }

      if (poll.isClosed || new Date() > new Date(poll.closesAt)) {
        return res.status(400).json({
          success: false,
          error: { code: 'ERR_POLL_CLOSED', message: 'عذراً، هذا الاستطلاع مغلق حالياً' },
          timestamp: new Date().toISOString(),
        });
      }

      const selectedOptions: string[] = [];
      if (optionId) selectedOptions.push(optionId);
      if (Array.isArray(optionIds)) selectedOptions.push(...optionIds);

      if (selectedOptions.length === 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'ERR_VALIDATION', message: 'optionId is required' },
          timestamp: new Date().toISOString(),
        });
      }

      // Check existing votes
      const existingVotes = await prisma.pollVote.findMany({
        where: { pollId, userId: user.userId },
      });

      if (!poll.allowMultiple && existingVotes.length > 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'ERR_ALREADY_VOTED',
            message: 'لقد قمت بالتصويت بالفعل في هذا الاستطلاع',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Record votes
      for (const optId of selectedOptions) {
        // Validate option belongs to poll
        if (!poll.options.some((o) => o.id === optId)) {
          continue;
        }

        await prisma.pollVote.create({
          data: {
            pollId,
            optionId: optId,
            userId: user.userId,
          },
        });
      }

      return res.status(200).json({
        success: true,
        message: 'تم تسجيل تصويتك بنجاح',
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error voting on poll:', err);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: err.message },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * GET /api/v1/polls/:id/results (FR-9.2)
   * Real-time vote tallies and percentage breakdown.
   */
  static async getResults(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { id: pollId } = req.params;

      const poll = await prisma.poll.findUnique({
        where: { id: pollId },
        include: {
          options: {
            orderBy: { order: 'asc' },
            include: {
              _count: { select: { votes: true } },
            },
          },
          _count: { select: { votes: true } },
        },
      });

      if (!poll) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Poll not found' },
          timestamp: new Date().toISOString(),
        });
      }

      const totalVotes = poll.options.reduce((sum, opt) => sum + (opt._count?.votes || 0), 0);

      const tallies = poll.options.map((opt) => {
        const count = opt._count?.votes || 0;
        const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
        return {
          id: opt.id,
          text: opt.text,
          order: opt.order,
          voteCount: count,
          percentage,
        };
      });

      return res.status(200).json({
        success: true,
        data: {
          pollId: poll.id,
          question: poll.question,
          totalVotes,
          isClosed: poll.isClosed || new Date() > new Date(poll.closesAt),
          options: tallies,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error fetching poll results:', err);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: err.message },
        timestamp: new Date().toISOString(),
      });
    }
  }
}
