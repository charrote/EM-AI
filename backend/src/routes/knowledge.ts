import { Router, Request, Response } from 'express';
import { prisma } from '../db';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, faultType, search } = req.query;
    const where: any = {};
    if (status) where.status = status;
    if (faultType) where.faultType = faultType;
    if (search) {
      where.OR = [
        { title: { contains: search as string } },
        { symptom: { contains: search as string } },
        { cause: { contains: search as string } },
      ];
    }

    const entries = await prisma.knowledgeEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: entries, total: entries.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch knowledge entries' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const entry = await prisma.knowledgeEntry.create({ data: req.body });
    res.status(201).json({ data: entry });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create knowledge entry' });
  }
});

router.put('/:id/approve', async (req: Request, res: Response) => {
  try {
    const entry = await prisma.knowledgeEntry.update({
      where: { id: req.params.id },
      data: { status: 'approved' },
    });
    res.json({ data: entry });
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve knowledge entry' });
  }
});

export default router;
