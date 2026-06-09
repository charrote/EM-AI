import { Router, Request, Response } from 'express';
import { prisma } from '../db';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const where: any = {};
    if (status) where.status = status;

    const projects = await prisma.improvementProject.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: projects, total: projects.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch improvement projects' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const project = await prisma.improvementProject.create({ data: req.body });
    res.status(201).json({ data: project });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create improvement project' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const project = await prisma.improvementProject.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ data: project });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update improvement project' });
  }
});

router.get('/:id/effect', async (req: Request, res: Response) => {
  try {
    const project = await prisma.improvementProject.findUnique({
      where: { id: req.params.id },
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // Mock effect data for demo
    const effectData = {
      before: { value: project.currentValue, date: '2026-05-01' },
      after: { value: project.targetValue, date: new Date().toISOString().slice(0, 10) },
      improvement: project.currentValue && project.targetValue
        ? Math.round(((project.currentValue - project.targetValue) / project.currentValue) * 100)
        : 0,
      trend: [
        { date: '2026-05-01', value: project.currentValue },
        { date: '2026-05-15', value: project.currentValue ? project.currentValue * 0.85 : 0 },
        { date: '2026-06-01', value: project.targetValue },
      ],
    };
    res.json({ data: effectData });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch effect data' });
  }
});

export default router;
