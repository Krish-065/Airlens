import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { requireAdminAuth } from '../middleware/adminAuth';

const adminRouter = Router();
const prisma = new PrismaClient();

// GET /api/admin/check
adminRouter.get('/check', requireAdminAuth, (_req: Request, res: Response): void => {
  res.json({ success: true });
});

// POST /api/admin/login
adminRouter.post('/login', (req: Request, res: Response): void => {
  const { password } = req.body;
  const envPassword = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_JWT_SECRET;

  if (!envPassword || !secret) {
    res.status(500).json({ error: 'Admin configuration missing' });
    return;
  }

  if (password !== envPassword) {
    res.status(401).json({ error: 'Invalid admin credentials' });
    return;
  }

  // Set cookie for 1 day
  const token = jwt.sign({ role: 'admin' }, secret, { expiresIn: '1d' });
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('adminToken', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  });

  res.json({ success: true, token });
});

// POST /api/admin/logout
adminRouter.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('adminToken');
  res.json({ success: true });
});

// GET /api/admin/users
adminRouter.get('/users', requireAdminAuth, async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        coins: true,
        createdAt: true,
        _count: {
          select: { reports: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
    
    const usersWithBadges = users.map(user => {
      let level = 'Newbie';
      if (user.coins >= 1000) level = 'Expert';
      else if (user.coins >= 500) level = 'Pro';
      else if (user.coins >= 100) level = 'Active';
      
      return {
        ...user,
        level,
        postCount: user._count.reports,
        _count: undefined // remove raw count
      };
    });

    res.json(usersWithBadges);
  } catch (err) {
    console.error('Fetch users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// DELETE /api/admin/users/:id
adminRouter.delete('/users/:id', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id as string } });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// GET /api/admin/reports
adminRouter.get('/reports', requireAdminAuth, async (_req: Request, res: Response) => {
  try {
    const reports = await prisma.report.findMany({
      include: {
        user: {
          select: { name: true, email: true },
        },
        _count: {
          select: { comments: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(reports);
  } catch (err) {
    console.error('Fetch reports error:', err);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// DELETE /api/admin/reports/:id
adminRouter.delete('/reports/:id', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    await prisma.report.delete({ where: { id: req.params.id as string } });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete report error:', err);
    res.status(500).json({ error: 'Failed to delete report' });
  }
});

// GET /api/admin/check
adminRouter.get('/check', requireAdminAuth, (_req: Request, res: Response) => {
  res.json({ success: true });
});

// GET /api/admin/moderation-reports
adminRouter.get('/moderation-reports', requireAdminAuth, async (_req: Request, res: Response) => {
  try {
    const reports = await prisma.contentReport.findMany({
      include: {
        reporter: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by targetId to find most reported content
    const grouped = reports.reduce((acc, curr) => {
      const key = `${curr.targetType}-${curr.targetId}`;
      if (!acc[key]) {
        acc[key] = {
          targetType: curr.targetType,
          targetId: curr.targetId,
          reportCount: 0,
          reports: []
        };
      }
      acc[key].reportCount++;
      acc[key].reports.push(curr);
      return acc;
    }, {} as Record<string, any>);

    const sortedGroups = Object.values(grouped).sort((a, b) => b.reportCount - a.reportCount);
    res.json(sortedGroups);
  } catch (err) {
    console.error('Fetch moderation reports error:', err);
    res.status(500).json({ error: 'Failed to fetch moderation reports' });
  }
});

// GET /api/admin/reports/:id/comments
adminRouter.get('/reports/:id/comments', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const comments = await prisma.comment.findMany({
      where: { reportId: req.params.id as string },
      include: {
        user: { select: { name: true, email: true } },
        replies: {
          include: { user: { select: { name: true, email: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(comments);
  } catch (err) {
    console.error('Fetch comments error:', err);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// DELETE /api/admin/comments/:id
adminRouter.delete('/comments/:id', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    await prisma.comment.delete({ where: { id: req.params.id as string } });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete comment error:', err);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// DELETE /api/admin/replies/:id
adminRouter.delete('/replies/:id', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    await prisma.reply.delete({ where: { id: req.params.id as string } });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete reply error:', err);
    res.status(500).json({ error: 'Failed to delete reply' });
  }
});

export { adminRouter };
