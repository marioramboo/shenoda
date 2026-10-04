import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { SpiritualLifeController } from '../controllers/spiritualLife.controller';

export const spiritualLifeRouter = Router();

spiritualLifeRouter.use(requireAuth);

spiritualLifeRouter.post('/', SpiritualLifeController.create);
spiritualLifeRouter.get('/', SpiritualLifeController.getMyEntries);
spiritualLifeRouter.get('/me', SpiritualLifeController.getMyEntries);
spiritualLifeRouter.get('/checklist', SpiritualLifeController.getChecklist);
spiritualLifeRouter.put('/checklist', SpiritualLifeController.setChecklistItem);
spiritualLifeRouter.delete('/:id', SpiritualLifeController.delete);
