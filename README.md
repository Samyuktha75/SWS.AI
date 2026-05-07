# DocuVault — Document Upload & Notification System

A full-stack document management application with real-time notifications, bulk upload support, and a persistent notification center.

---

## Features

- **Single & Bulk File Upload** — upload one or many PDF files via drag-and-drop or file picker
- **Per-file Progress Bars** — individual real-time progress tracking for each file
- **Smart Bulk Notifications** — uploads of 4+ files trigger background-mode with a banner + WebSocket notification on completion
- **Persistent Notification Center** — all notifications stored in SQLite, survive page refreshes
- **Real-time Updates** — WebSocket-powered instant notifications across tabs
- **Document Library** — searchable table with download and delete actions
- **Unit Tests** — backend (Jest/Supertest) and frontend (Vitest/RTL)

---

## Tech Stack

| Layer     | Choice                          |
|-----------|---------------------------------|
| Frontend  | React 18, Vite, CSS Modules     |
| Backend   | Node.js, Express                |
| Database  | SQLite (via better-sqlite3)     |
| Realtime  | WebSockets (ws library)         |
| Upload    | Multer (disk storage)           |
| Testing   | Jest + Supertest (BE), Vitest + RTL (FE) |
| Font      | Livvic (matches brand guideline)|

---

## Database Schema

```sql
-- Files table
CREATE TABLE files (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,           -- stored filename (uuid + ext)
  original_name TEXT NOT NULL,          -- user's original filename
  size         INTEGER NOT NULL,        -- bytes
  mime_type    TEXT NOT NULL,
  path         TEXT NOT NULL,           -- absolute path on disk
  status       TEXT NOT NULL DEFAULT 'complete',
  upload_date  TEXT NOT NULL,           -- ISO 8601
  batch_id     TEXT                     -- null for single uploads
);

-- Notifications table
CREATE TABLE notifications (
  id        TEXT PRIMARY KEY,
  message   TEXT NOT NULL,
  type      TEXT NOT NULL DEFAULT 'info',  -- success | error | info
  timestamp TEXT NOT NULL,
  read      INTEGER NOT NULL DEFAULT 0,    -- 0=unread, 1=read
  meta      TEXT                           -- JSON extra data
);

-- Upload batches (bulk tracking)
CREATE TABLE upload_batches (
  id              TEXT PRIMARY KEY,
  total_files     INTEGER NOT NULL,
  completed_files INTEGER NOT NULL DEFAULT 0,
  failed_files    INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'processing',
  created_at      TEXT NOT NULL
);
```

---

## Local Setup

### Prerequisites
- Node.js 18+ 
- npm 9+

### 1. Clone & Install

```bash
git clone <repo-url>
cd docuvault

# Install backend deps
cd backend
npm install

# Install frontend deps
cd ../frontend
npm install
```

### 2. Environment Variables

Backend — create `backend/.env` (optional, defaults shown):
```
PORT=3001
FRONTEND_URL=http://localhost:5173
```

### 3. Run the App

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# Server starts on http://localhost:3001
# WebSocket at ws://localhost:3001/ws
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# App available at http://localhost:5173
```

Open **http://localhost:5173** in your browser.

---

## Running Tests

### Backend Tests (Jest + Supertest)
```bash
cd backend
npm test
```

Tests cover:
- Health endpoint
- Upload with 0 files → 400
- Upload non-PDF → 400
- Upload 1 PDF → success, bulk=false
- Upload 4 PDFs → success, bulk=true, batchId set
- Download unknown ID → 404
- Notification CRUD (create, list, mark read, mark all read, delete)
- Edge cases: missing message body, unknown IDs

### Frontend Tests (Vitest + React Testing Library)
```bash
cd frontend
npm test
```

Tests cover:
- `formatBytes`, `formatDate`, `timeAgo` utility functions
- UploadPage: renders dropzone, shows bulk banner for 4+ files, rejects non-PDFs
- NotificationsPage: renders list, shows unread count, empty state

---

## API Reference

### Upload
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload` | Upload files (multipart, field: `files`) |
| GET | `/api/upload` | List all uploaded files |
| GET | `/api/upload/:id/download` | Download a file |
| DELETE | `/api/upload/:id` | Delete a file |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | Get all notifications + unread count |
| PATCH | `/api/notifications/mark-all-read` | Mark all as read |
| PATCH | `/api/notifications/:id/read` | Mark one as read |
| DELETE | `/api/notifications/:id` | Delete one |
| DELETE | `/api/notifications` | Clear all |

### WebSocket
Connect to `ws://localhost:3001/ws`

Events received:
```json
// Bulk upload complete (4+ files)
{ "type": "BULK_UPLOAD_COMPLETE", "notification": {...}, "count": 5, "failed": 0 }

// Small upload complete (≤3 files)
{ "type": "UPLOAD_COMPLETE", "notification": {...} }
```

---

## Deployment

### Docker (Recommended)

```bash
# Build and run both services
docker-compose up --build
```

### Manual Deployment

**Backend** — Deploy to any Node.js host (Railway, Render, Fly.io):
```bash
cd backend && npm start
```

**Frontend** — Build and serve statically:
```bash
cd frontend
npm run build
# Deploy the `dist/` folder to Vercel, Netlify, or any CDN
```

Remember to set `FRONTEND_URL` in backend env and update the Vite proxy config / API base URL for production.

---

## Project Structure

```
docuvault/
├── backend/
│   ├── middleware/
│   │   └── websocket.js      # WS server + broadcast
│   ├── models/
│   │   └── db.js             # SQLite setup + schema
│   ├── routes/
│   │   ├── upload.js         # File upload endpoints
│   │   └── notifications.js  # Notification endpoints
│   ├── tests/
│   │   └── api.test.js       # Backend tests
│   ├── uploads/              # File storage (gitignored)
│   ├── server.js             # Express + HTTP + WS server
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/       # Header, ToastContainer
│   │   ├── hooks/            # useWebSocket, useNotifications
│   │   ├── pages/            # Upload, Documents, Notifications
│   │   ├── tests/            # Frontend tests
│   │   └── utils/            # api.js, format.js
│   ├── index.html
│   └── package.json
├── docker-compose.yml
└── README.md
```
