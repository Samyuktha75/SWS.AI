import React from 'react';
import { useNotifications } from '../hooks/useNotifications';
import styles from './ToastContainer.module.css';

export default function ToastContainer() {
  const { toasts, dismissToast } = useNotifications();

  return (
    <div className={styles.container}>
      {toasts.map(toast => (
        <div
          key={toast.toastId}
          className={`${styles.toast} ${styles[toast.type]}`}
        >
          <span className={styles.icon}>
            {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}
          </span>
          <div className={styles.content}>
            <p className={styles.message}>{toast.message}</p>
            <span className={styles.time}>
              {new Date(toast.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <button className={styles.close} onClick={() => dismissToast(toast.toastId)}>×</button>
        </div>
      ))}
    </div>
  );
}
