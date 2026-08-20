import { Router, Request, Response } from 'express';
import fs from 'fs';
import prisma from '../lib/prisma';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { uploadToCloudinary, deleteFromCloudinary } from '../lib/cloudinary';
import { sanitizeText } from '../lib/sanitize';
import { z } from 'zod';
import { Category } from '@prisma/client';

export const reportRouter = Router();

const validCategories = Object.values(Category);

const createReportSchema = z.object({
  title: z.string().min(1).max(80),
  description: z.string().min(1).max(5000),
  category: z.enum(validCategories as [string, ...string[]]),
  city: z.string().min(1, 'City is required').max(100),
  area: z.string().min(1, 'Area is required').max(100),
  reportDate: z.string().refine((d) => {
    const date = new Date(d);
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    return date <= now && date >= thirtyDaysAgo;
  }, 'Date must be within the last 30 days'),
  authorName: z.string().max(100).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});

// ─── GET /api/reports ───
reportRouter.get('/', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 12));
    const skip = (page - 1) * limit;

    const category = req.query.category as string;
    const city = req.query.city as string;
    const search = req.query.search as string;
    const sort = (req.query.sort as string) || 'newest';

    // Build where clause
    const where: any = {};
    if (category && validCategories.includes(category as Category)) {
      where.category = category;
    }
    if (city) {
      where.city = { contains: sanitizeText(city), mode: 'insensitive' };
    }
    if (search) {
      const sanitized = sanitizeText(search);
      where.OR = [
        { title: { contains: sanitized, mode: 'insensitive' } },
        { description: { contains: sanitized, mode: 'insensitive' } },
        { city: { contains: sanitized, mode: 'insensitive' } },
        { area: { contains: sanitized, mode: 'insensitive' } },
      ];
    }

    // Build order
    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'oldest') orderBy = { createdAt: 'asc' };
    if (sort === 'most_liked') orderBy = { likes: { _count: 'desc' } };
    if (sort === 'most_confirmed') orderBy = { confirms: { _count: 'desc' } };

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, avatar: true } },
          _count: { select: { likes: true, confirms: true } },
          ...(req.user ? {
            likes: { where: { userId: req.user.userId }, select: { id: true } },
          } : {}),
        },
      }),
      prisma.report.count({ where }),
    ]);

    const mapped = reports.map((r: any) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      imageUrl: r.imageUrl,
      category: r.category,
      city: r.city,
      area: r.area,
      reportDate: r.reportDate,
      authorName: r.authorName,
      createdAt: r.createdAt,
      user: r.user,
      lat: r.lat,
      lng: r.lng,
      likeCount: r._count.likes,
      confirmCount: r._count.confirms,
      isLiked: req.user ? r.likes?.length > 0 : false,
    }));

    res.json({
      reports: mapped,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('Get reports error:', err);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// ─── GET /api/reports/stats ───
reportRouter.get('/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const totalReports = await prisma.report.count();
    const totalConfirms = await prisma.confirm.count();
    const totalLikes = await prisma.like.count();

    // Find distinct cities that have reports
    const citiesResult = await prisma.report.findMany({
      select: { city: true },
      distinct: ['city'],
    });
    const totalCities = citiesResult.length;

    res.json({
      totalReports,
      totalConfirms,
      totalLikes,
      totalCities,
    });
  } catch (err) {
    console.error('Get stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ─── GET /api/reports/cities ───
reportRouter.get('/cities', async (_req: Request, res: Response): Promise<void> => {
  try {
    const cities = await prisma.report.findMany({
      select: { city: true },
      distinct: ['city'],
    });
    res.json({ cities: cities.map((c) => c.city) });
  } catch (err) {
    console.error('Fetch report cities error:', err);
    res.status(500).json({ error: 'Failed to fetch report cities' });
  }
});

// ─── GET /api/reports/:id ───
reportRouter.get('/:id', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const report = await prisma.report.findUnique({
      where: { id: req.params.id as string },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        _count: { select: { likes: true, confirms: true } },
        ...(req.user ? {
          likes: { where: { userId: req.user.userId }, select: { id: true } },
          confirms: { where: { userId: req.user.userId }, select: { id: true } },
        } : {}),
      },
    });

    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    res.json({
      ...report,
      likeCount: (report as any)._count.likes,
      confirmCount: (report as any)._count.confirms,
      isLiked: req.user ? (report as any).likes?.length > 0 : false,
      isConfirmed: req.user ? (report as any).confirms?.length > 0 : false,
    });
  } catch (err) {
    console.error('Get report error:', err);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// ─── POST /api/reports ───
reportRouter.post('/', requireAuth, upload.single('image'), async (req: Request, res: Response): Promise<void> => {
  let uploadedFilePath: string | null = null;
  let publicId = '';

  try {
    if (!req.file) {
      res.status(400).json({ error: 'Image is required' });
      return;
    }
    uploadedFilePath = req.file.path;

    const parsed = createReportSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const { title, description, category, city, area, reportDate, authorName, lat, lng } = parsed.data;

    // Upload to Cloudinary
    let url = '';
    try {
      const uploadResult = await uploadToCloudinary(req.file.path);
      url = uploadResult.url;
      publicId = uploadResult.publicId;
    } catch (uploadErr: any) {
      console.warn('Cloudinary upload failed, falling back to local storage:', uploadErr.message);
      url = `http://localhost:${process.env.PORT || 5000}/uploads/${req.file.filename}`;
      publicId = ''; // local file
    }

    // Create report
    const report = await prisma.report.create({
      data: {
        title: sanitizeText(title),
        description: sanitizeText(description),
        imageUrl: url,
        cloudinaryId: publicId,
        category: category as Category,
        city: sanitizeText(city),
        area: sanitizeText(area),
        reportDate: new Date(reportDate),
        authorName: authorName ? sanitizeText(authorName) : (null as any),
        lat: lat ?? null,
        lng: lng ?? null,
        userId: req.user!.userId,
      },
    });

    // Award +10 coins for uploading
    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { coins: { increment: 10 } },
    });

    res.status(201).json({ report, coinsEarned: 10 });
  } catch (err) {
    console.error('Create report error:', err);
    res.status(500).json({ error: 'Failed to create report' });
  } finally {
    // Clean up local temp file only if Cloudinary succeeded
    if (uploadedFilePath && publicId !== '') {
      fs.unlink(uploadedFilePath, () => { });
    }
  }
});

// ─── POST /api/reports/:id/like ───
reportRouter.post('/:id/like', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const reportId = req.params.id as string;
    const userId = req.user!.userId;

    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    // Check existing like
    const existingLike = await prisma.like.findUnique({
      where: { userId_reportId: { userId, reportId } },
    });

    if (existingLike) {
      res.status(409).json({ error: 'You already liked this report' });
      return;
    }

    // Create like entry in DB
    await prisma.like.create({ data: { userId, reportId } });

    const count = await prisma.like.count({ where: { reportId } });
    res.json({ liked: true, likeCount: count });
  } catch (err) {
    console.error('Like error:', err);
    res.status(500).json({ error: 'Failed to like report' });
  }
});

// ─── DELETE /api/reports/:id/like ───
reportRouter.delete('/:id/like', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const reportId = req.params.id as string;
    const userId = req.user!.userId;

    await prisma.like.delete({
      where: { userId_reportId: { userId, reportId } },
    });

    const count = await prisma.like.count({ where: { reportId } });
    res.json({ liked: false, likeCount: count });
  } catch {
    res.status(404).json({ error: 'Like not found' });
  }
});

// ─── POST /api/reports/:id/confirm ───
reportRouter.post('/:id/confirm', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const reportId = req.params.id as string;
    const userId = req.user?.userId || null;
    const sessionId = req.body.sessionId as string | undefined;

    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    // Check duplicates
    if (userId) {
      const existing = await prisma.confirm.findUnique({
        where: { userId_reportId: { userId, reportId } },
      });
      if (existing) {
        res.status(409).json({ error: 'You already confirmed this report' });
        return;
      }
    } else if (sessionId) {
      const existing = await prisma.confirm.findFirst({
        where: { sessionId, reportId },
      });
      if (existing) {
        res.status(409).json({ error: 'You already confirmed this report' });
        return;
      }
    }

    await prisma.confirm.create({
      data: { userId, sessionId: userId ? null : sessionId, reportId },
    });

    const count = await prisma.confirm.count({ where: { reportId } });
    res.json({ confirmed: true, confirmCount: count });
  } catch (err) {
    console.error('Confirm error:', err);
    res.status(500).json({ error: 'Failed to confirm report' });
  }
});
