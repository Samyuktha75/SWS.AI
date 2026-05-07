const request = require('supertest');
const path = require('path');
const fs = require('fs');

// Use a test DB
process.env.NODE_ENV = 'test';

const { app, server } = require('../server');

// Create a small fake PDF buffer for testing
function fakePdf(name = 'test.pdf') {
  // Minimal valid-looking PDF content
  const content = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF');
  return { buffer: content, name };
}

afterAll((done) => {
  server.close(done);
  // Clean up test DB
  const dbPath = path.join(__dirname, '..', 'docuvault.db');
  if (fs.existsSync(dbPath)) {
    try { fs.unlinkSync(dbPath); } catch (e) {}
  }
});

describe('Health Check', () => {
  test('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('Upload API', () => {
  test('GET /api/upload returns empty array initially', async () => {
    const res = await request(app).get('/api/upload');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('POST /api/upload with no files returns 400', async () => {
    const res = await request(app).post('/api/upload');
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('POST /api/upload rejects non-PDF files', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('files', Buffer.from('hello world'), { filename: 'test.txt', contentType: 'text/plain' });
    expect(res.status).toBe(400);
  });

  test('POST /api/upload accepts PDF file', async () => {
    const pdf = fakePdf();
    const res = await request(app)
      .post('/api/upload')
      .attach('files', pdf.buffer, { filename: pdf.name, contentType: 'application/pdf' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.files).toHaveLength(1);
    expect(res.body.bulk).toBe(false);
  });

  test('POST /api/upload with 4 files sets bulk=true', async () => {
    const pdf = fakePdf();
    const req = request(app).post('/api/upload');
    for (let i = 0; i < 4; i++) {
      req.attach('files', pdf.buffer, { filename: `file${i}.pdf`, contentType: 'application/pdf' });
    }
    const res = await req;
    expect(res.status).toBe(200);
    expect(res.body.bulk).toBe(true);
    expect(res.body.batchId).toBeDefined();
  });

  test('GET /api/upload/:id/download returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/upload/nonexistent-id/download');
    expect(res.status).toBe(404);
  });
});

describe('Notifications API', () => {
  test('GET /api/notifications returns notifications array', async () => {
    const res = await request(app).get('/api/notifications');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.notifications)).toBe(true);
    expect(typeof res.body.unreadCount).toBe('number');
  });

  test('POST /api/notifications creates notification', async () => {
    const res = await request(app)
      .post('/api/notifications')
      .send({ message: 'Test notification', type: 'info' });
    expect(res.status).toBe(200);
    expect(res.body.id).toBeDefined();
    expect(res.body.message).toBe('Test notification');
  });

  test('POST /api/notifications without message returns 400', async () => {
    const res = await request(app)
      .post('/api/notifications')
      .send({ type: 'info' });
    expect(res.status).toBe(400);
  });

  test('PATCH /api/notifications/mark-all-read marks all read', async () => {
    const res = await request(app).patch('/api/notifications/mark-all-read');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const check = await request(app).get('/api/notifications');
    expect(check.body.unreadCount).toBe(0);
  });

  test('PATCH /api/notifications/:id/read marks one read', async () => {
    // Create a notification first
    const create = await request(app)
      .post('/api/notifications')
      .send({ message: 'Mark me', type: 'info' });
    const id = create.body.id;

    const res = await request(app).patch(`/api/notifications/${id}/read`);
    expect(res.status).toBe(200);
  });

  test('DELETE /api/notifications/:id deletes notification', async () => {
    const create = await request(app)
      .post('/api/notifications')
      .send({ message: 'Delete me', type: 'info' });
    const id = create.body.id;

    const res = await request(app).delete(`/api/notifications/${id}`);
    expect(res.status).toBe(200);
  });

  test('PATCH /api/notifications/unknown-id/read returns 404', async () => {
    const res = await request(app).patch('/api/notifications/bad-id/read');
    expect(res.status).toBe(404);
  });
});
