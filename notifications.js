const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../models/db');

// Get all notifications
router.get('/', (req, res) => {
  const db = getDb();
  const notifications = db.prepare('SELECT * FROM notifications ORDER BY timestamp DESC').all();
  const unreadCount = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE read = 0').get().count;
  res.json({ notifications, unreadCount });
});

// Mark one as read
router.patch('/:id/read', (req, res) => {
  const db = getDb();
  const result = db.prepare('UPDATE notifications SET read = 1 WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Notification not found' });
  res.json({ success: true });
});

// Mark all as read
router.patch('/mark-all-read', (req, res) => {
  const db = getDb();
  db.prepare('UPDATE notifications SET read = 1').run();
  res.json({ success: true });
});

// Delete a notification
router.delete('/:id', (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM notifications WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Notification not found' });
  res.json({ success: true });
});

// Clear all notifications
router.delete('/', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM notifications').run();
  res.json({ success: true });
});

// Create a manual notification (for testing)
router.post('/', (req, res) => {
  const db = getDb();
  const { message, type = 'info' } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  const id = uuidv4();
  const timestamp = new Date().toISOString();
  db.prepare('INSERT INTO notifications (id, message, type, timestamp, read) VALUES (?, ?, ?, ?, 0)')
    .run(id, message, type, timestamp);

  res.json({ id, message, type, timestamp, read: false });
});

module.exports = router;
