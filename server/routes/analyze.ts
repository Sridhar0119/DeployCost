import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/requireAuth';
import { uploadLimiter } from '../middleware/uploadRateLimiter';
import { analyzeProjectFile } from '../services/projectAnalyzer';
import { createAlert } from '../db/alertsRepo';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // Max 25MB
});

router.post('/', requireAuth, uploadLimiter, upload.single('file'), async (req: any, res) => {
  const orgId = req.user.org_id;

  if (!req.file) {
    return res.status(400).json({ error: 'No file was uploaded.' });
  }

  const filename = req.file.originalname;
  const buffer = req.file.buffer;

  try {
    const analysis = analyzeProjectFile(filename, buffer);
    res.json(analysis);
  } catch (err: any) {
    console.error('[Analyzer] Analysis failed:', err);
    
    // Create automatic failure alert log
    createAlert(
      orgId,
      'upload_failed',
      `Analysis failed for file "${filename}". Error: ${err.message || 'Unknown error'}.`,
      JSON.stringify({ filename, error: err.message || 'Unknown error' })
    );

    res.status(500).json({
      error: `Failed to analyze file: ${err.message || 'Internal error'}`,
    });
  }
});

export default router;
