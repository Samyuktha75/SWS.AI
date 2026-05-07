import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ---------- Format utilities ----------
import { formatBytes, formatDate, timeAgo } from '../utils/format';

describe('formatBytes', () => {
  it('returns "0 B" for 0', () => expect(formatBytes(0)).toBe('0 B'));
  it('formats kilobytes', () => expect(formatBytes(1024)).toBe('1 KB'));
  it('formats megabytes', () => expect(formatBytes(1048576)).toBe('1 MB'));
  it('formats with decimals', () => expect(formatBytes(1536)).toBe('1.5 KB'));
});

describe('formatDate', () => {
  it('returns a readable string', () => {
    const iso = '2024-01-15T10:30:00.000Z';
    const result = formatDate(iso);
    expect(result).toContain('2024');
    expect(typeof result).toBe('string');
  });
});

describe('timeAgo', () => {
  it('shows seconds for recent times', () => {
    const fiveSecsAgo = new Date(Date.now() - 5000).toISOString();
    expect(timeAgo(fiveSecsAgo)).toMatch(/s ago/);
  });

  it('shows minutes for ~1min ago', () => {
    const twoMinsAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    expect(timeAgo(twoMinsAgo)).toMatch(/m ago/);
  });

  it('shows hours for ~2h ago', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
    expect(timeAgo(twoHoursAgo)).toMatch(/h ago/);
  });

  it('shows days for old timestamps', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400 * 1000).toISOString();
    expect(timeAgo(twoDaysAgo)).toMatch(/d ago/);
  });
});

// ---------- UploadPage component ----------
vi.mock('../utils/api', () => ({
  uploadFiles: vi.fn(),
  getFiles: vi.fn(() => Promise.resolve({ data: [] })),
  getNotifications: vi.fn(() => Promise.resolve({ data: { notifications: [], unreadCount: 0 } })),
  markRead: vi.fn(),
  markAllRead: vi.fn(),
  deleteNotification: vi.fn(),
  clearAllNotifications: vi.fn(),
}));

// Mock WebSocket globally
global.WebSocket = class {
  constructor() { this.readyState = 1; }
  send() {}
  close() {}
  addEventListener() {}
  removeEventListener() {}
};

import UploadPage from '../pages/UploadPage';
import { BrowserRouter } from 'react-router-dom';
import { NotificationsProvider } from '../hooks/useNotifications';

function renderWithProviders(ui) {
  return render(
    <BrowserRouter>
      <NotificationsProvider>
        {ui}
      </NotificationsProvider>
    </BrowserRouter>
  );
}

describe('UploadPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the upload dropzone', () => {
    renderWithProviders(<UploadPage />);
    expect(screen.getByText(/Drag & drop PDF files here/i)).toBeInTheDocument();
  });

  it('shows "or click to browse" hint', () => {
    renderWithProviders(<UploadPage />);
    expect(screen.getByText(/click to browse/i)).toBeInTheDocument();
  });

  it('shows file size and type constraints', () => {
    renderWithProviders(<UploadPage />);
    expect(screen.getByText(/Max 50MB/i)).toBeInTheDocument();
  });

  it('shows bulk banner for more than 3 files', async () => {
    const { uploadFiles } = await import('../utils/api');
    uploadFiles.mockResolvedValue({ data: { success: true, files: [], bulk: true } });

    renderWithProviders(<UploadPage />);
    const input = document.querySelector('input[type="file"]');
    expect(input).toBeTruthy();

    const files = Array.from({ length: 4 }, (_, i) =>
      new File(['%PDF-1.4'], `file${i}.pdf`, { type: 'application/pdf' })
    );

    await userEvent.upload(input, files);

    await waitFor(() => {
      expect(screen.getByText(/processing 4 files in background/i)).toBeInTheDocument();
    });
  });

  it('rejects non-PDF files with alert', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    renderWithProviders(<UploadPage />);
    const input = document.querySelector('input[type="file"]');

    const txtFile = new File(['hello'], 'test.txt', { type: 'text/plain' });
    await userEvent.upload(input, [txtFile]);

    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('PDF'));
    alertSpy.mockRestore();
  });

  it('shows "Clear all" button when files are loaded', async () => {
    const { uploadFiles } = await import('../utils/api');
    uploadFiles.mockResolvedValue({ data: { success: true, files: [], bulk: false } });

    renderWithProviders(<UploadPage />);
    const input = document.querySelector('input[type="file"]');
    const pdfFile = new File(['%PDF-1.4'], 'test.pdf', { type: 'application/pdf' });

    await userEvent.upload(input, [pdfFile]);

    await waitFor(() => {
      expect(screen.getByText(/Clear all/i)).toBeInTheDocument();
    });
  });
});

// ---------- NotificationsPage component ----------
import NotificationsPage from '../pages/NotificationsPage';
import * as notifHook from '../hooks/useNotifications';

describe('NotificationsPage', () => {
  const mockNotifications = [
    { id: '1', message: '3 files uploaded successfully', type: 'success', timestamp: new Date().toISOString(), read: 0 },
    { id: '2', message: 'Upload failed', type: 'error', timestamp: new Date().toISOString(), read: 1 },
  ];

  beforeEach(() => {
    vi.spyOn(notifHook, 'useNotifications').mockReturnValue({
      notifications: mockNotifications,
      unreadCount: 1,
      handleMarkRead: vi.fn(),
      handleMarkAllRead: vi.fn(),
      handleDelete: vi.fn(),
      handleClearAll: vi.fn(),
    });
  });

  it('renders notifications list', () => {
    render(<BrowserRouter><NotificationsPage /></BrowserRouter>);
    expect(screen.getByText('3 files uploaded successfully')).toBeInTheDocument();
    expect(screen.getByText('Upload failed')).toBeInTheDocument();
  });

  it('shows unread count in subtitle', () => {
    render(<BrowserRouter><NotificationsPage /></BrowserRouter>);
    expect(screen.getByText(/1 unread/i)).toBeInTheDocument();
  });

  it('renders mark all read button when unread > 0', () => {
    render(<BrowserRouter><NotificationsPage /></BrowserRouter>);
    expect(screen.getByText(/Mark all read/i)).toBeInTheDocument();
  });

  it('shows empty state when no notifications', () => {
    vi.spyOn(notifHook, 'useNotifications').mockReturnValue({
      notifications: [],
      unreadCount: 0,
      handleMarkRead: vi.fn(),
      handleMarkAllRead: vi.fn(),
      handleDelete: vi.fn(),
      handleClearAll: vi.fn(),
    });

    render(<BrowserRouter><NotificationsPage /></BrowserRouter>);
    expect(screen.getByText(/No notifications/i)).toBeInTheDocument();
  });
});
