import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const router = Router();

const UPLOAD_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = crypto.randomUUID() + ext;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|bmp|svg|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('Only image and document files are allowed (jpg/png/pdf/doc/...)'));
    }
  },
});

// POST /api/upload — upload one or multiple files
router.post('/', upload.array('files', 20), (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const urls = files.map(f => `/uploads/${f.filename}`);
  res.json({ data: urls });
});

// POST /api/upload/base64 — accept base64-encoded image (for mobile camera)
router.post('/base64', (req: Request, res: Response) => {
  const { image, filename } = req.body;
  if (!image) {
    return res.status(400).json({ error: 'No image data provided' });
  }

  const matches = image.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!matches) {
    return res.status(400).json({ error: 'Invalid base64 image data' });
  }

  const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
  const buffer = Buffer.from(matches[2], 'base64');
  const name = crypto.randomUUID() + '.' + ext;
  const filePath = path.join(UPLOAD_DIR, name);

  fs.writeFileSync(filePath, buffer);
  res.json({ data: `/uploads/${name}` });
});

export default router;
