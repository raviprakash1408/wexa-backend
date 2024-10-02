import express, { RequestHandler } from 'express';
import { upload, uploadFile } from '../utils/fileUpload';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/upload', authenticateToken as RequestHandler, upload.single('file'), (async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const fileUrl = await uploadFile(req.file);
    res.status(200).json({ url: fileUrl });
  } catch (error) {
    res.status(500).json({ error: 'File upload failed' });
  }
}) as RequestHandler);

export default router;
