import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { NotificationsProvider } from './hooks/useNotifications';
import Header from './components/Header';
import ToastContainer from './components/ToastContainer';
import UploadPage from './pages/UploadPage';
import DocumentsPage from './pages/DocumentsPage';
import NotificationsPage from './pages/NotificationsPage';

export default function App() {
  return (
    <BrowserRouter>
      <NotificationsProvider>
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<UploadPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
          </Routes>
        </main>
        <ToastContainer />
      </NotificationsProvider>
    </BrowserRouter>
  );
}
