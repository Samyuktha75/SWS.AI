import React from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { timeAgo, formatDate } from '../utils/format';
import styles from './NotificationsPage.module.css';

const TYPE_CONFIG = {
  success: { label: 'Success', icon: '✓', bg: '#d1fae5', color: '#059669' },
  error:   { label: 'Error',   icon: '✕', bg: '#fee2e2', color: '#dc2626' },
  info:    { label: 'Info',    icon: 'ℹ', bg: '#dbeafe', color: '#1d4ed8' },
};

export default function NotificationsPage() {
  const {
    notifications, unreadCount,
    handleMarkRead, handleMarkAllRead,
    handleDelete, handleClearAll
  } = useNotifications();

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Notifications</h1>
            <p className={styles.subtitle}>
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'} — {notifications.length} total
            </p>
          </div>
          <div className={styles.headerActions}>
            {unreadCount > 0 && (
              <button className={styles.markAllBtn} onClick={handleMarkAllRead}>
                Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button className={styles.clearBtn} onClick={() => {
                if (confirm('Clear all notifications?')) handleClearAll();
              }}>
                Clear all
              </button>
            )}
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </div>
            <h3>No notifications</h3>
            <p>Notifications from uploads and system events will appear here.</p>
          </div>
        ) : (
          <div className={styles.list}>
            {notifications.map(n => {
              const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
              return (
                <div
                  key={n.id}
                  className={`${styles.item} ${!n.read ? styles.unread : ''} animate-fade-in`}
                  onClick={() => !n.read && handleMarkRead(n.id)}
                >
                  <div className={styles.iconWrap} style={{ background: config.bg }}>
                    <span style={{ color: config.color, fontWeight: 700, fontSize: '0.85rem' }}>{config.icon}</span>
                  </div>
                  <div className={styles.body}>
                    <div className={styles.msgRow}>
                      <p className={styles.message}>{n.message}</p>
                      <span className={styles.typePill} style={{ background: config.bg, color: config.color }}>
                        {config.label}
                      </span>
                    </div>
                    <div className={styles.meta}>
                      <span title={formatDate(n.timestamp)}>{timeAgo(n.timestamp)}</span>
                      <span>•</span>
                      <span>{formatDate(n.timestamp)}</span>
                      {!n.read && <span className={styles.unreadDot} />}
                    </div>
                  </div>
                  <div className={styles.itemActions}>
                    {!n.read && (
                      <button
                        className={styles.readBtn}
                        title="Mark as read"
                        onClick={(e) => { e.stopPropagation(); handleMarkRead(n.id); }}
                      >
                        ✓
                      </button>
                    )}
                    <button
                      className={styles.deleteBtn}
                      title="Delete"
                      onClick={(e) => { e.stopPropagation(); handleDelete(n.id); }}
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
