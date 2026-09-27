import { Router } from 'express';
import { MemberController } from '../controllers/member.controller';
import { authenticateJwt, requireAuth } from '../middleware/auth';

export const memberRouter = Router();

// Protect all member endpoints with authentication
memberRouter.use(authenticateJwt);
memberRouter.use(requireAuth);

// 1. List members (scoped by user's permitted stages)
memberRouter.get('/', MemberController.listMembers);

// 2. Member detail (logs sensitive PII access)
memberRouter.get('/:id', MemberController.getMemberById);

// 3. Create member (FR-3.2: Level 2+ Assistant Secretary and above)
memberRouter.post('/', MemberController.createMember);

// 4. Update member (FR-3.1, FR-3.2, Assumption A2: field-level restriction for assigned servant)
memberRouter.patch('/:id', MemberController.updateMember);

// 5. Assign servant to member (Level 2+)
memberRouter.post('/:id/assign-servant', MemberController.assignServant);

// 6. Bulk import members (FR-3.3: Level 2+)
memberRouter.post('/bulk-import', MemberController.bulkImport);
