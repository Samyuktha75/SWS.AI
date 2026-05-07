import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
});

export const uploadFiles = (files, onProgress) => {
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));

  return api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        const pct = Math.round((e.loaded * 100) / e.total);
        onProgress(pct);
      }
    }
  });
};

export const getFiles = () => api.get('/upload');
export const downloadFile = (id) => `/api/upload/${id}/download`;
export const deleteFile = (id) => api.delete(`/upload/${id}`);

export const getNotifications = () => api.get('/notifications');
export const markRead = (id) => api.patch(`/notifications/${id}/read`);
export const markAllRead = () => api.patch('/notifications/mark-all-read');
export const deleteNotification = (id) => api.delete(`/notifications/${id}`);
export const clearAllNotifications = () => api.delete('/notifications');

export default api;
