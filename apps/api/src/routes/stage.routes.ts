import { Router } from 'express';
import { StageController } from '../controllers/stage.controller';
import { authenticateJwt, requireAuth } from '../middleware/auth';

export const stageRouter = Router();

// Protect with JWT authentication
stageRouter.use(authenticateJwt);
stageRouter.use(requireAuth);

// 1. List stages reachable by current user
stageRouter.get('/', StageController.listStages);
