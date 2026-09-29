import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { PreparationController } from '../controllers/preparation.controller';

export const preparationRouter = Router();

preparationRouter.use(requireAuth);

preparationRouter.post('/', PreparationController.create);
preparationRouter.get('/', PreparationController.list);
preparationRouter.get('/lesson-inspection/:eventId', PreparationController.getLessonInspection);
preparationRouter.get('/:id', PreparationController.getById);
preparationRouter.patch('/:id', PreparationController.update);
preparationRouter.delete('/:id', PreparationController.delete);
