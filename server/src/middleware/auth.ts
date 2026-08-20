import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../lib/jwt';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/** Require authentication – rejects if no valid token */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    const token = req.cookies?.accessToken || extractBearerToken(req);
    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    req.user = verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/** Optional auth – populates req.user if valid token exists, but doesn't reject */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  try {
    const token = req.cookies?.accessToken || extractBearerToken(req);
    if (token) {
      req.user = verifyAccessToken(token);
    }
  } catch {
    // Token invalid/expired – continue as guest
  }
  next();
}

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
}
