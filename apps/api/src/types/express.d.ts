import { UserContext } from '@shenoda/shared';

declare global {
  namespace Express {
    interface Request {
      user?: UserContext;
      stageToSectorMap?: Record<string, string>;
    }
  }
}
