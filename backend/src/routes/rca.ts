import { Router, Request, Response } from 'express';
import { prisma } from '../db';

const router = Router();

// GET /api/rca — RCA 分析列表
router.get('/', async (req: Request, res: Response) => {
  try {
    const deviceId = req.query.deviceId as string | undefined;
    const where: any = {};
    if (deviceId) where.deviceId = deviceId;

    const analyses = await prisma.rcaAnalysis.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: analyses, total: analyses.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch RCA analyses' });
  }
});

// GET /api/rca/:id — 单个 RCA 详情
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const analysis = await prisma.rcaAnalysis.findUnique({
      where: { id: req.params.id as string },
    });
    if (!analysis) return res.status(404).json({ error: 'RCA analysis not found' });
    res.json({ data: analysis });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch RCA analysis' });
  }
});

// POST /api/rca — 创建 RCA 分析
router.post('/', async (req: Request, res: Response) => {
  try {
    const { workOrderId, deviceId, title, problemDesc, whyChain, fishboneData } = req.body;
    const analysis = await prisma.rcaAnalysis.create({
      data: {
        workOrderId, deviceId, title, problemDesc,
        whyChain: whyChain || [],
        fishboneData: fishboneData || {},
        status: 'draft',
      },
    });
    res.status(201).json({ data: analysis });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create RCA analysis' });
  }
});

// PUT /api/rca/:id — 更新 RCA（追加 Why 链或完成）
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { whyChain, fishboneData, rootCause, improvement, status } = req.body;
    const updateData: any = {};
    if (whyChain) updateData.whyChain = whyChain;
    if (fishboneData) updateData.fishboneData = fishboneData;
    if (rootCause) updateData.rootCause = rootCause;
    if (improvement) updateData.improvement = improvement;
    if (status) updateData.status = status;

    const analysis = await prisma.rcaAnalysis.update({
      where: { id: req.params.id as string },
      data: updateData,
    });
    res.json({ data: analysis });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update RCA analysis' });
  }
});

// DELETE /api/rca/:id — 删除 RCA 分析
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.rcaAnalysis.delete({ where: { id: req.params.id as string } });
    res.json({ data: { success: true } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete RCA analysis' });
  }
});

export default router;
