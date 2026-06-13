import { Router, Request, Response } from 'express';
import { prisma } from '../db';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
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
      where: { id: req.params.id as string },
      data: req.body,
    });
    res.json({ data: project });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update improvement project' });
  }
});

const OPPORTUNITIES = [
  { id: 'opp-1', lossType: '换型/调整', title: '注塑机 SMED 快速换型', currentValue: 45, targetValue: 20, unit: 'min', reason: '换型平均45分钟，80%为模具搬运时间' },
  { id: 'opp-2', lossType: '设备故障', title: 'CNC 主轴故障率降低', currentValue: 12, targetValue: 3, unit: '次/月', reason: '月均12起主轴故障，占设备总故障35%' },
  { id: 'opp-3', lossType: '设备故障', title: 'TPM 点检体系优化', currentValue: 18, targetValue: 10, unit: '次/月', reason: '点检项40%从未发现问题，属于无效点检' },
  { id: 'opp-4', lossType: '速度降低', title: '冷墩机模具寿命提升', currentValue: 85000, targetValue: 120000, unit: '件', reason: '模具寿命8.5万件，低于行业标杆15万件' },
  { id: 'opp-5', lossType: '短暂停机', title: '包装区自动装箱改造', currentValue: 25, targetValue: 10, unit: 'min/次', reason: '人工装箱慢，等待停机月均250分钟' },
  { id: 'opp-6', lossType: '废品/返工', title: '注塑成型参数优化降废品', currentValue: 5.2, targetValue: 2.0, unit: '%', reason: '废品率5.2%，高于行业平均的3%' },
  { id: 'opp-7', lossType: '启动损失', title: '早班开机预热流程标准化', currentValue: 35, targetValue: 15, unit: 'min', reason: '早班开机预热时间长短不一，平均35分钟' },
  { id: 'opp-8', lossType: '换型/调整', title: '冷墩机 LD-008 模具对中优化', currentValue: 60, targetValue: 30, unit: 'min', reason: '模具对中平均1小时，占换型时间40%' },
  { id: 'opp-9', lossType: '速度降低', title: '裁切机送料速度提升', currentValue: 120, targetValue: 150, unit: '件/min', reason: '送料机构老化导致速度从150降至120件/分钟' },
  { id: 'opp-10', lossType: '设备故障', title: '钉卷机轴承预防性更换计划', currentValue: 6, targetValue: 2, unit: '次/季', reason: '每季度平均6起轴承相关故障，占设备故障30%' },
];

router.get('/opportunities', (_req: Request, res: Response) => {
  res.json({ data: OPPORTUNITIES, total: OPPORTUNITIES.length });
});

router.get('/:id/effect', async (req: Request, res: Response) => {
  try {
    const project = await prisma.improvementProject.findUnique({
      where: { id: req.params.id as string },
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
