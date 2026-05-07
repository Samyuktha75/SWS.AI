import React, { useState, useRef, useCallback } from 'react';
import { uploadFiles } from '../utils/api';
import { formatBytes } from '../utils/format';
import styles from './UploadPage.module.css';

const BULK_THRESHOLD = 3;

function FileItem({ file, status, progress, error }) {
  const statusLabel = {
    pending: 'Pending',
    uploading: 'Uploading',
    complete: 'Complete',
    failed: 'Failed'
  }[status];

  return (
    <div className={`${styles.fileItem} ${styles[status]}`}>
      <div className={styles.fileIcon}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
      </div>
      <div className={styles.fileInfo}>
        <div className={styles.fileRow}>
          <span className={styles.fileName}>{file.name}</span>
          <span className={`${styles.statusBadge} ${styles[`badge_${status}`]}`}>{statusLabel}</span>
        </div>
        <div className={styles.fileMeta}>
          <span>{formatBytes(file.size)}</span>
          <span>•</span>
          <span>{file.type || 'application/pdf'}</span>
          {error && <span className={styles.errorMsg}>— {error}</span>}
        </div>
        {(status === 'uploading' || status === 'complete') && (
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${status === 'complete' ? 100 : progress}%` }}
            />
          </div>
        )}
        {status === 'uploading' && (
          <span className={styles.progressPct}>{progress}%</span>
        )}
      </div>
    </div>
  );
}

export default function UploadPage() {
  const [fileItems, setFileItems] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [bulkBanner, setBulkBanner] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [done, setDone] = useState(false);
  const inputRef = useRef(null);

  const processFiles = useCallback(async (files) => {
    if (!files || files.length === 0) return;

    // Filter to PDFs only
    const pdfs = Array.from(files).filter(f => f.type === 'application/pdf');
    if (pdfs.length === 0) {
      alert('Only PDF files are supported. Please select PDF files.');
      return;
    }

    const isBulk = pdfs.length > BULK_THRESHOLD;

    // Initialize file states
    const items = pdfs.map(f => ({
      file: f,
      id: Math.random().toString(36).slice(2),
      status: 'pending',
      progress: 0,
      error: null
    }));
    setFileItems(items);
    setDone(false);

    if (isBulk) {
      setBulkBanner(`Upload in progress — processing ${pdfs.length} files in background.`);
    } else {
      setBulkBanner(null);
    }

    // Start all uploading
    setFileItems(prev => prev.map(i => ({ ...i, status: 'uploading', progress: 0 })));

    try {
      await uploadFiles(pdfs, (pct) => {
        // Distribute progress across all files
        setFileItems(prev => prev.map(i => ({
          ...i,
          progress: i.status === 'uploading' ? pct : i.progress
        })));
      });

      setFileItems(prev => prev.map(i => ({ ...i, status: 'complete', progress: 100 })));
      setDone(true);
      if (isBulk) setBulkBanner(null);
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Upload failed';
      setFileItems(prev => prev.map(i => ({ ...i, status: 'failed', error: errMsg })));
      if (isBulk) setBulkBanner(null);
    }
  }, []);

  const onFileChange = (e) => {
    processFiles(e.target.files);
    e.target.value = '';
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);

  const clearAll = () => {
    setFileItems([]);
    setBulkBanner(null);
    setDone(false);
  };

  const isBulkUpload = fileItems.length > BULK_THRESHOLD;
  const completedCount = fileItems.filter(f => f.status === 'complete').length;
  const failedCount = fileItems.filter(f => f.status === 'failed').length;
  const isUploading = fileItems.some(f => f.status === 'uploading');

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Upload Documents</h1>
            <p className={styles.subtitle}>Upload PDF files — single or bulk</p>
          </div>
          {fileItems.length > 0 && (
            <button className={styles.clearBtn} onClick={clearAll}>
              Clear all
            </button>
          )}
        </div>

        {/* Drop zone */}
        <div
          className={`${styles.dropzone} ${isDragging ? styles.dragging : ''}`}
          onClick={() => inputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            multiple
            onChange={onFileChange}
            className={styles.hiddenInput}
          />
          <div className={styles.dropContent}>
            <div className={styles.dropIcon}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <p className={styles.dropText}>
              {isDragging ? 'Drop your PDFs here' : 'Drag & drop PDF files here'}
            </p>
            <p className={styles.dropSub}>or click to browse — supports multiple files</p>
            <div className={styles.dropHints}>
              <span>PDF only</span>
              <span>•</span>
              <span>Max 50MB per file</span>
              <span>•</span>
              <span>Unlimited files</span>
            </div>
          </div>
        </div>

        {/* Bulk banner */}
        {bulkBanner && (
          <div className={styles.bulkBanner}>
            <div className={styles.spinnerSmall} />
            <span>{bulkBanner}</span>
          </div>
        )}

        {/* File list */}
        {fileItems.length > 0 && (
          <div className={styles.fileList}>
            <div className={styles.listHeader}>
              <div className={styles.listTitle}>
                <span>{fileItems.length} file{fileItems.length !== 1 ? 's' : ''}</span>
                {done && <span className={styles.doneTag}>✓ {completedCount} complete{failedCount > 0 ? `, ${failedCount} failed` : ''}</span>}
                {isUploading && <span className={styles.uploadingTag}>Uploading…</span>}
              </div>
              {isBulkUpload && (
                <button className={styles.collapseBtn} onClick={() => setCollapsed(c => !c)}>
                  {collapsed ? 'Expand ▼' : 'Collapse ▲'}
                </button>
              )}
            </div>
            {!collapsed && (
              <div className={styles.items}>
                {fileItems.map(item => (
                  <FileItem
                    key={item.id}
                    file={item.file}
                    status={item.status}
                    progress={item.progress}
                    error={item.error}
                  />
                ))}
              </div>
            )}
            {collapsed && (
              <div className={styles.collapsedSummary}>
                <div className={styles.miniProgress}>
                  <div className={styles.miniBar}>
                    <div
                      className={styles.miniFill}
                      style={{ width: `${Math.round((completedCount / fileItems.length) * 100)}%` }}
                    />
                  </div>
                  <span>{completedCount}/{fileItems.length} files</span>
                </div>
              </div>
            )}
            {done && (
              <div className={styles.doneFooter}>
                <a href="/documents" className={styles.viewDocsBtn}>
                  View Documents →
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
