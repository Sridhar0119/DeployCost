import { Router, Request } from 'express';
import multer from 'multer';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { requireAuth } from '../middleware/requireAuth';
import { uploadLimiter } from '../middleware/uploadRateLimiter';
import { createUploadSession, getUploadSession, addChunkReceived, updateUploadSessionStatus } from '../db/uploadSessionsRepo';
import { createAlert } from '../db/alertsRepo';
import { getChunksDir, ensureChunksDirExists, deleteChunksDir, reassembleChunks } from '../services/chunkStorage';
import { analyzeProjectFile } from '../services/projectAnalyzer';

const router = Router();

// Multer Disk Storage specifically for single chunks
const diskStorage = multer.diskStorage({
  destination: (req: any, file, cb) => {
    const uploadId = req.body.uploadId;
    if (!uploadId) {
      return cb(new Error('Missing uploadId'), '');
    }
    
    // Auth and org boundary check inside destination
    const session = getUploadSession(uploadId);
    if (!session || session.status !== 'in_progress' || session.org_id !== req.user.org_id) {
      return cb(new Error('Session not found or forbidden'), '');
    }

    const dir = getChunksDir(uploadId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const chunkIndex = req.body.chunkIndex;
    if (chunkIndex === undefined) {
      return cb(new Error('Missing chunkIndex'), '');
    }
    cb(null, `chunk-${chunkIndex}`);
  },
});

const upload = multer({
  storage: diskStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // Max 50MB per chunk
});

// 1. Initialize Chunked Upload Session
router.post('/init', requireAuth, uploadLimiter, (req: any, res) => {
  const { filename, totalSize, totalChunks } = req.body;
  const orgId = req.user.org_id;
  const userId = req.user.id;

  if (!filename || totalSize === undefined || !totalChunks) {
    return res.status(400).json({ error: 'Missing filename, totalSize, or totalChunks in payload.' });
  }

  if (totalChunks <= 0) {
    return res.status(400).json({ error: 'totalChunks must be greater than zero.' });
  }

  const chunkCap = (totalSize / totalChunks);
  if (chunkCap > 50 * 1024 * 1024) {
    return res.status(400).json({ error: 'Calculated chunk size exceeds the 50MB maximum capability limit.' });
  }

  try {
    const uploadId = randomUUID();
    
    // Register session
    createUploadSession({
      id: uploadId,
      org_id: orgId,
      user_id: userId,
      filename,
      total_size: totalSize,
      total_chunks: totalChunks,
    });

    // Create chunks directory on disk
    ensureChunksDirExists(uploadId);

    res.json({
      uploadId,
      chunkSize: 5 * 1024 * 1024, // Suggested 5MB chunks
    });
  } catch (err: any) {
    console.error('[UploadInit] Failed to initialize upload:', err);
    res.status(500).json({ error: `Failed to initialize session: ${err.message}` });
  }
});

// 2. Receive Chunk
router.post('/chunk', requireAuth, uploadLimiter, (req: any, res, next) => {
  // We use standard custom callback or manual handling to ensure auth scoping
  upload.single('chunk')(req, res, (err: any) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Chunk upload failed.' });
    }

    const { uploadId, chunkIndex } = req.body;
    if (!uploadId || chunkIndex === undefined) {
      return res.status(400).json({ error: 'Missing uploadId or chunkIndex.' });
    }

    try {
      const idx = parseInt(chunkIndex, 10);
      const session = getUploadSession(uploadId);

      if (!session || session.status !== 'in_progress' || session.org_id !== req.user.org_id) {
        return res.status(404).json({ error: 'Upload session not found or has expired.' });
      }

      if (idx < 0 || idx >= session.total_chunks) {
        return res.status(400).json({ error: 'chunkIndex out of range.' });
      }

      // Record chunk in DB (idempotent overwrite is safe)
      const { chunks_received, isCompleted } = addChunkReceived(uploadId, idx);

      res.json({
        received: true,
        chunksReceived: chunks_received,
        totalChunks: session.total_chunks,
        complete: isCompleted,
      });
    } catch (dbErr: any) {
      console.error('[Chunk] Failed to register chunk:', dbErr);
      res.status(500).json({ error: dbErr.message || 'Failed to save chunk.' });
    }
  });
});

// 3. Complete and Reassemble Upload Session
router.post('/complete', requireAuth, uploadLimiter, async (req: any, res) => {
  const { uploadId } = req.body;
  const orgId = req.user.org_id;

  if (!uploadId) {
    return res.status(400).json({ error: 'uploadId is required.' });
  }

  const session = getUploadSession(uploadId);
  if (!session || session.status !== 'completed' || session.org_id !== req.user.org_id) {
    // If not completed yet or unauthorized
    return res.status(400).json({ error: 'Session is not complete, has expired, or is unauthorized.' });
  }

  const tempFilePath = path.join('./data/temp-reassembled', `${uploadId}-${session.filename}`);
  
  try {
    // Sequentially assemble the chunks
    await reassembleChunks(uploadId, session.total_chunks, tempFilePath);

    // Read file buffer and parse
    const fileBuffer = fs.readFileSync(tempFilePath);
    const analysis = analyzeProjectFile(session.filename, fileBuffer);

    // Mark session as complete in DB and cleanup
    updateUploadSessionStatus(uploadId, 'completed');
    
    // Clean up disk files immediately
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    deleteChunksDir(uploadId);

    res.json(analysis);
  } catch (err: any) {
    console.error('[CompleteUpload] Assembly or analysis failed:', err);

    // Update session status to failed
    updateUploadSessionStatus(uploadId, 'failed', err.message);

    // Log failure alert for the org
    createAlert(
      orgId,
      'upload_failed',
      `Chunked upload failed for "${session.filename}". Error: ${err.message || 'Assembly error'}.`,
      JSON.stringify({ filename: session.filename, error: err.message || 'Assembly error' })
    );

    // Cleanup resources
    if (fs.existsSync(tempFilePath)) {
      try { fs.unlinkSync(tempFilePath); } catch {}
    }
    deleteChunksDir(uploadId);

    res.status(500).json({ error: `Failed to complete and analyze file: ${err.message}` });
  }
});

// 4. Retrieve status of an active upload session
router.get('/status/:uploadId', requireAuth, (req: any, res) => {
  const uploadId = req.params.uploadId;
  const orgId = req.user.org_id;

  const session = getUploadSession(uploadId);
  if (!session || session.org_id !== orgId) {
    return res.status(404).json({ error: 'Upload session not found.' });
  }

  let receivedChunks: number[] = [];
  try {
    receivedChunks = JSON.parse(session.received_chunks_json);
  } catch {
    receivedChunks = [];
  }

  // Calculate missing chunk indices
  const missingChunks: number[] = [];
  for (let i = 0; i < session.total_chunks; i++) {
    if (!receivedChunks.includes(i)) {
      missingChunks.push(i);
    }
  }

  res.json({
    uploadId: session.id,
    status: session.status,
    chunksReceived: session.chunks_received,
    totalChunks: session.total_chunks,
    filename: session.filename,
    missingChunks,
  });
});

export default router;
