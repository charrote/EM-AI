import { Router, Request, Response } from 'express';

const router = Router();

// Demo mode: simple auth stub — just return a fake token
router.post('/login', (_req: Request, res: Response) => {
  const { username } = _req.body || {};
  res.json({
    token: 'demo-token-' + Date.now(),
    user: {
      id: 'demo-user',
      username: username || 'demo',
      role: 'operator', // operator / repair / supervisor / executive
      name: '演示用户',
    },
  });
});

router.get('/me', (_req: Request, res: Response) => {
  res.json({
    id: 'demo-user',
    username: 'demo',
    role: 'operator',
    name: '演示用户',
  });
});

export default router;
