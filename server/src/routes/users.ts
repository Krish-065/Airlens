import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

export const userRouter = Router();

// ─── GET /api/users/:id/profile ───
userRouter.get('/:id/profile', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id as string },
      select: {
        id: true,
        name: true,
        avatar: true,
        coins: true,
        createdAt: true,
        _count: {
          select: { reports: true, likes: true, confirms: true },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      user: {
        ...user,
        reportCount: (user as any)._count.reports,
        likeCount: (user as any)._count.likes,
        confirmCount: (user as any)._count.confirms,
      },
    });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ─── GET /api/users/:id/reports ───
userRouter.get('/:id/reports', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 12));
    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where: { userId: req.params.id as string },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          _count: { select: { likes: true, confirms: true } },
        },
      }),
      prisma.report.count({ where: { userId: req.params.id as string } }),
    ]);

    res.json({
      reports: reports.map((r: any) => ({
        ...r,
        likeCount: r._count.likes,
        confirmCount: r._count.confirms,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('Get user reports error:', err);
    res.status(500).json({ error: 'Failed to fetch user reports' });
  }
});

// ─── PATCH /api/users/me ───
userRouter.patch('/me', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    const updateData: any = {};
    if (typeof name === 'string') {
      updateData.name = name.trim().slice(0, 100);
    }

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: updateData,
      select: { id: true, email: true, name: true, coins: true, avatar: true },
    });

    res.json({ user });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});
