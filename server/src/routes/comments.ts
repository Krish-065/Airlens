import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get comments for a report
router.get('/report/:reportId', async (req, res) => {
  try {
    const reportId = req.params.reportId as string;
    // Extract userId manually from token if available, but do not require it
    let userId: string | null = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET as string) as any;
        userId = decoded.userId;
      } catch (e) {
        // invalid token, ignore
      }
    }

    const comments = await prisma.comment.findMany({
      where: { reportId },
      include: {
        user: {
          select: { id: true, name: true, avatar: true }
        },
        likes: true,
        replies: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true }
            },
            likes: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate like scores and format
    const formattedComments = comments.map(comment => {
      const likesCount = comment.likes.filter(l => !l.isDislike).length;
      const dislikesCount = comment.likes.filter(l => l.isDislike).length;
      const score = likesCount - dislikesCount;
      const userLike = userId ? comment.likes.find(l => l.userId === userId) : null;

      const formattedReplies = comment.replies.map(reply => {
        const rLikes = reply.likes.filter(l => !l.isDislike).length;
        const rDislikes = reply.likes.filter(l => l.isDislike).length;
        const rScore = rLikes - rDislikes;
        const rUserLike = userId ? reply.likes.find(l => l.userId === userId) : null;
        
        return {
          ...reply,
          score: rScore,
          likesCount: rLikes,
          dislikesCount: rDislikes,
          userInteraction: rUserLike ? (rUserLike.isDislike ? 'dislike' : 'like') : null
        };
      }).sort((a, b) => b.score - a.score);

      return {
        ...comment,
        score,
        likesCount,
        dislikesCount,
        userInteraction: userLike ? (userLike.isDislike ? 'dislike' : 'like') : null,
        replies: formattedReplies
      };
    }).sort((a, b) => b.score - a.score); // Top comment (most liked) on top

    res.json(formattedComments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Add a comment
router.post('/report/:reportId', requireAuth, async (req, res) => {
  try {
    const reportId = req.params.reportId as string;
    const { content } = req.body;
    const userId = (req as any).user.userId;

    if (!content) {
      res.status(400).json({ error: 'Content is required' });
      return;
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        reportId,
        userId
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        likes: true,
        replies: true
      }
    });

    res.status(201).json({
      ...comment,
      score: 0,
      likesCount: 0,
      dislikesCount: 0,
      userInteraction: null,
      replies: []
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Reply to a comment
router.post('/:commentId/reply', requireAuth, async (req, res) => {
  try {
    const commentId = req.params.commentId as string;
    const { content } = req.body;
    const userId = (req as any).user.userId;

    if (!content) {
      res.status(400).json({ error: 'Content is required' });
      return;
    }

    const reply = await prisma.reply.create({
      data: {
        content,
        commentId,
        userId
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        likes: true
      }
    });

    res.status(201).json({
      ...reply,
      score: 0,
      likesCount: 0,
      dislikesCount: 0,
      userInteraction: null
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add reply' });
  }
});

// Toggle Like/Dislike on a comment
router.post('/:commentId/interact', requireAuth, async (req, res) => {
  try {
    const commentId = req.params.commentId as string;
    const { action } = req.body; // 'like', 'dislike', or 'none'
    const userId = (req as any).user.userId;

    const existing = await prisma.commentLike.findUnique({
      where: { commentId_userId: { commentId, userId } }
    });

    if (action === 'none') {
      if (existing) {
        await prisma.commentLike.delete({ where: { id: existing.id } });
      }
    } else {
      const isDislike = action === 'dislike';
      if (existing) {
        await prisma.commentLike.update({
          where: { id: existing.id },
          data: { isDislike }
        });
      } else {
        await prisma.commentLike.create({
          data: { commentId, userId, isDislike }
        });
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Interaction failed' });
  }
});

// Toggle Like/Dislike on a reply
router.post('/reply/:replyId/interact', requireAuth, async (req, res) => {
  try {
    const replyId = req.params.replyId as string;
    const { action } = req.body; // 'like', 'dislike', or 'none'
    const userId = (req as any).user.userId;

    const existing = await prisma.replyLike.findUnique({
      where: { replyId_userId: { replyId, userId } }
    });

    if (action === 'none') {
      if (existing) {
        await prisma.replyLike.delete({ where: { id: existing.id } });
      }
    } else {
      const isDislike = action === 'dislike';
      if (existing) {
        await prisma.replyLike.update({
          where: { id: existing.id },
          data: { isDislike }
        });
      } else {
        await prisma.replyLike.create({
          data: { replyId, userId, isDislike }
        });
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Interaction failed' });
  }
});

export const commentsRouter = router;
