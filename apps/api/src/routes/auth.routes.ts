import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import {
  loginBruteForceLimiter,
  globalAuthRateLimiter,
} from '../middleware/rateLimiter';
import { authenticateJwt, requireAuth } from '../middleware/auth';

export const authRouter = Router();

// Apply global IP rate limiting across auth endpoints
authRouter.use(globalAuthRateLimiter);

// Auth lifecycle routes
authRouter.post('/login', loginBruteForceLimiter, AuthController.login);
authRouter.post('/refresh', AuthController.refresh);
authRouter.post('/logout', AuthController.logout);
authRouter.post('/forgot-password', AuthController.forgotPassword);
authRouter.post('/reset-password', AuthController.resetPassword);

// Profile context
authRouter.get('/me', authenticateJwt, requireAuth, AuthController.me);
