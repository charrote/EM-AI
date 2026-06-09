import { Router, Request, Response } from 'express';
import { prisma } from '../db';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const type = req.query.type as string | undefined;
    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const toolings = await prisma.tooling.findMany({
      where,
      orderBy: { code: 'asc' },
      include: { device: true },
    });
    res.json({ data: toolings, total: toolings.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch toolings' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tooling = await prisma.tooling.findUnique({
      where: { id: req.params.id as string },
      include: { device: true },
    });
    if (!tooling) return res.status(404).json({ error: 'Tooling not found' });
    res.json({ data: tooling });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tooling' });
  }
});

export default router;
