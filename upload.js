const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const { getDb } = require('../models/db');
const { broadcast } = require('../middleware/websocket');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const id = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${id}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// Upload single or multiple files
router.post('/', upload.array('files', 50), (req, res) => {
  const db = getDb();
  const files = req.files;

  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const isBulk = files.length > 3;
  const batchId = uuidv4();
  const now = new Date().toISOString();

  if (isBulk) {
    // Create batch record
    db.prepare(`
      INSERT INTO upload_batches (id, total_files, completed_files, status, created_at)
      VALUES (?, ?, 0, 'processing', ?)
    `).run(batchId, files.length, now);
  }

  const inserted = [];
  let failed = 0;

  for (const file of files) {
    try {
      const fileId = path.basename(file.filename, path.extname(file.filename));
      db.prepare(`
        INSERT INTO files (id, name, original_name, size, mime_type, path, status, upload_date, batch_id)
        VALUES (?, ?, ?, ?, ?, ?, 'complete', ?, ?)
      `).run(fileId, file.filename, file.originalname, file.size, file.mimetype, file.path, now, isBulk ? batchId : null);

      inserted.push({
        id: fileId,
        name: file.filename,
        original_name: file.originalname,
        size: file.size,
        mime_type: file.mimetype,
        status: 'complete',
        upload_date: now
      });
    } catch (err) {
      failed++;
    }
  }

  if (isBulk) {
    // Update batch
    db.prepare(`
      UPDATE upload_batches SET completed_files = ?, failed_files = ?, status = 'complete' WHERE id = ?
    `).run(inserted.length, failed, batchId);

    // Create notification
    const notifId = uuidv4();
    const successCount = inserted.length;
    const message = failed > 0
      ? `${successCount} files uploaded successfully, ${failed} failed`
      : `${successCount} files uploaded successfully`;

    db.prepare(`
      INSERT INTO notifications (id, message, type, timestamp, read, meta)
      VALUES (?, ?, ?, ?, 0, ?)
    `).run(notifId, message, failed > 0 ? 'error' : 'success', now, JSON.stringify({ batchId, count: successCount }));

    // Broadcast via WebSocket
    broadcast({
      type: 'BULK_UPLOAD_COMPLETE',
      notification: {
        id: notifId,
        message,
        type: failed > 0 ? 'error' : 'success',
        timestamp: now,
        read: false
      },
      batchId,
      count: successCount,
      failed
    });
  } else {
    // For small uploads, create a simple notification too
    const notifId = uuidv4();
    const message = failed > 0
      ? `Upload completed with ${failed} error(s)`
      : `${inserted.length} file(s) uploaded successfully`;

    db.prepare(`
      INSERT INTO notifications (id, message, type, timestamp, read, meta)
      VALUES (?, ?, ?, ?, 0, ?)
    `).run(notifId, message, failed > 0 ? 'error' : 'success', now, JSON.stringify({ count: inserted.length }));

    broadcast({
      type: 'UPLOAD_COMPLETE',
      notification: {
        id: notifId,
        message,
        type: failed > 0 ? 'error' : 'success',
        timestamp: now,
        read: false
      }
    });
  }

  res.json({
    success: true,
    files: inserted,
    failed,
    bulk: isBulk,
    batchId: isBulk ? batchId : null
  });
});

// Get all uploaded files
router.get('/', (req, res) => {
  const db = getDb();
  const files = db.prepare('SELECT * FROM files ORDER BY upload_date DESC').all();
  res.json(files);
});

// Download a file
router.get('/:id/download', (req, res) => {
  const db = getDb();
  const file = db.prepare('SELECT * FROM files WHERE id = ?').get(req.params.id);
  if (!file) return res.status(404).json({ error: 'File not found' });

  if (!fs.existsSync(file.path)) {
    return res.status(404).json({ error: 'File not found on disk' });
  }

  res.download(file.path, file.original_name);
});

// Delete a file
router.delete('/:id', (req, res) => {
  const db = getDb();
  const file = db.prepare('SELECT * FROM files WHERE id = ?').get(req.params.id);
  if (!file) return res.status(404).json({ error: 'File not found' });

  try {
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    db.prepare('DELETE FROM files WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

module.exports = router;
