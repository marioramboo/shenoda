import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { PollController } from '../controllers/poll.controller';

const router = Router();

router.use(requireAuth);

// Polls (FR-9.1, FR-9.2)
router.post('/', PollController.createPoll);
router.get('/', PollController.listPolls);
router.post('/:id/vote', PollController.vote);
router.get('/:id/results', PollController.getResults);
router.delete('/:id', PollController.deletePoll);

export default router;
export { router as pollRouter };
