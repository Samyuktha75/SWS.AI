import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';
import { timeAgo } from '../utils/format';
import styles from './Header.module.css';

export default function Header() {
  const location = useLocation();
  const { notifications, unreadCount, handleMarkAllRead, handleMarkRead, handleDelete } = useNotifications();
  const [open, setOpen] = useState(false);
  const dropRef = useRef(null);

  useEffect(() => {
    function onClick(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const typeIcon = (type) => {
    if (type === 'success') return '✓';
    if (type === 'error') return '✕';
    return 'ℹ';
  };

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.logo}>
          <span className={styles.logoIcon}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </span>
          DocuVault
        </Link>

        <nav className={styles.nav}>
          <Link to="/" className={`${styles.navLink} ${location.pathname === '/' ? styles.active : ''}`}>
            Upload
          </Link>
          <Link to="/documents" className={`${styles.navLink} ${location.pathname === '/documents' ? styles.active : ''}`}>
            Documents
          </Link>
          <Link to="/notifications" className={`${styles.navLink} ${location.pathname === '/notifications' ? styles.active : ''}`}>
            Notifications
          </Link>
        </nav>

        <div className={styles.right} ref={dropRef}>
          <button className={styles.bellBtn} onClick={() => setOpen(o => !o)} aria-label="Notifications">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {unreadCount > 0 && (
              <span className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </button>

          {open && (
            <div className={`${styles.dropdown} animate-slide-down`}>
              <div className={styles.dropHead}>
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <button className={styles.markAllBtn} onClick={() => { handleMarkAllRead(); }}>
                    Mark all read
                  </button>
                )}
              </div>
              <div className={styles.dropList}>
                {notifications.length === 0 ? (
                  <div className={styles.empty}>No notifications yet</div>
                ) : (
                  notifications.slice(0, 8).map(n => (
                    <div key={n.id} className={`${styles.notifItem} ${!n.read ? styles.unread : ''}`}
                      onClick={() => !n.read && handleMarkRead(n.id)}>
                      <span className={`${styles.notifIcon} ${styles[n.type]}`}>{typeIcon(n.type)}</span>
                      <div className={styles.notifBody}>
                        <p>{n.message}</p>
                        <span className={styles.notifTime}>{timeAgo(n.timestamp)}</span>
                      </div>
                      <button className={styles.delBtn} onClick={(e) => { e.stopPropagation(); handleDelete(n.id); }}>×</button>
                    </div>
                  ))
                )}
              </div>
              {notifications.length > 0 && (
                <Link to="/notifications" className={styles.viewAll} onClick={() => setOpen(false)}>
                  View all notifications →
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
