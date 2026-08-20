import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const requireAdminAuth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    let token = req.cookies.adminToken;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      res.status(401).json({ error: 'Admin authentication required' });
      return;
    }

    const secret = process.env.ADMIN_JWT_SECRET;
    if (!secret) {
      console.error('ADMIN_JWT_SECRET is not configured');
      res.status(500).json({ error: 'Internal server error' });
      return;
    }

    jwt.verify(token, secret);
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired admin token' });
  }
};
