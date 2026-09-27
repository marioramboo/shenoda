import { Router } from 'express';
import { NoteController } from '../controllers/note.controller';
import { authenticateJwt, requireAuth } from '../middleware/auth';

export const noteRouter = Router();

noteRouter.use(authenticateJwt);
noteRouter.use(requireAuth);

// Create supervisory note (FR-8.1: Level 3+ Stage Secretary and above)
noteRouter.post('/', NoteController.createNote);

// Get supervisory notes for a servant (FR-8.2: Upward-only visibility)
noteRouter.get('/:targetUserId', NoteController.getNotesForUser);
