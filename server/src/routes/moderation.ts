import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Submit a content report
router.post('/', requireAuth, async (req, res) => {
  try {
    const { targetType, targetId, reason, details } = req.body;
    const reporterId = (req as any).user.userId;

    if (!targetType || !targetId || !reason) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const report = await prisma.contentReport.create({
      data: {
        targetType,
        targetId,
        reason,
        details,
        reporterId
      }
    });

    res.status(201).json(report);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

export const moderationRouter = router;
