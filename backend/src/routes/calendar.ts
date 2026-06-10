import { Router, Request, Response } from 'express';
import { prisma } from '../db';

const router = Router();

// GET /api/calendar?year=2026&month=6
router.get('/', async (req: Request, res: Response) => {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const month = parseInt(req.query.month as string) || (new Date().getMonth() + 1);

    const entries = await prisma.workCalendar.findMany({
      where: { year, month },
      orderBy: { day: 'asc' },
    });
    res.json({ data: entries });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/calendar/:id - update a work calendar entry
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { isWorkDay, shiftType, holidayName, description } = req.body;
    const entry = await prisma.workCalendar.update({
      where: { id: req.params.id as string },
      data: { isWorkDay, shiftType, holidayName, description },
    });
    res.json({ data: entry });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/calendar/init - initialize calendar for a given year/month
router.post('/init', async (req: Request, res: Response) => {
  try {
    const year = parseInt(req.body.year) || new Date().getFullYear();
    const month = parseInt(req.body.month) || (new Date().getMonth() + 1);

    // Check if already initialized
    const existing = await prisma.workCalendar.count({ where: { year, month } });
    if (existing > 0) {
      return res.json({ data: { initialized: true, count: existing, message: 'Already initialized' } });
    }

    const daysInMonth = new Date(year, month, 0).getDate();
    const entries: any[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      // Default: Mon-Fri work, Sat-Sun off
      const isWorkDay = dayOfWeek >= 1 && dayOfWeek <= 5;
      const shiftType = isWorkDay ? 'day' : null;
      entries.push({
        date,
        year,
        month,
        day,
        dayOfWeek,
        isWorkDay,
        shiftType,
      });
    }

    await prisma.workCalendar.createMany({ data: entries });
    res.status(201).json({ data: { initialized: true, count: entries.length } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
