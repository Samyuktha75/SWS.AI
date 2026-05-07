import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getNotifications, markRead, markAllRead, deleteNotification, clearAllNotifications } from '../utils/api';
import { useWebSocket } from '../hooks/useWebSocket';

const NotifContext = createContext(null);

export function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState([]);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await getNotifications();
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const addToast = useCallback((notif) => {
    const id = Date.now();
    setToasts(prev => [...prev, { ...notif, toastId: id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.toastId !== id));
    }, 6000);
  }, []);

  const handleWsMessage = useCallback((data) => {
    if (data.type === 'BULK_UPLOAD_COMPLETE' || data.type === 'UPLOAD_COMPLETE') {
      if (data.notification) {
        setNotifications(prev => [data.notification, ...prev]);
        setUnreadCount(prev => prev + 1);
        addToast(data.notification);
      }
    }
  }, [addToast]);

  useWebSocket(handleWsMessage);

  const handleMarkRead = async (id) => {
    try {
      await markRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: 1 } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {}
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: 1 })));
      setUnreadCount(0);
    } catch (e) {}
  };

  const handleDelete = async (id) => {
    try {
      const notif = notifications.find(n => n.id === id);
      await deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (notif && !notif.read) setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {}
  };

  const handleClearAll = async () => {
    try {
      await clearAllNotifications();
      setNotifications([]);
      setUnreadCount(0);
    } catch (e) {}
  };

  const dismissToast = (toastId) => {
    setToasts(prev => prev.filter(t => t.toastId !== toastId));
  };

  return (
    <NotifContext.Provider value={{
      notifications, unreadCount, toasts,
      fetchNotifications, handleMarkRead, handleMarkAllRead,
      handleDelete, handleClearAll, dismissToast
    }}>
      {children}
    </NotifContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotifContext);
}
