import React, { useState, useEffect, useCallback } from 'react';
import { getFiles, downloadFile, deleteFile } from '../utils/api';
import { formatBytes, formatDate } from '../utils/format';
import styles from './DocumentsPage.module.css';

export default function DocumentsPage() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState(null);

  const fetchFiles = useCallback(async () => {
    try {
      const res = await getFiles();
      setFiles(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this file permanently?')) return;
    setDeleting(id);
    try {
      await deleteFile(id);
      setFiles(prev => prev.filter(f => f.id !== id));
    } catch (e) {
      alert('Failed to delete file');
    } finally {
      setDeleting(null);
    }
  };

  const filtered = files.filter(f =>
    f.original_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Documents</h1>
            <p className={styles.subtitle}>{files.length} file{files.length !== 1 ? 's' : ''} stored</p>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.searchWrap}>
              <svg className={styles.searchIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                className={styles.searchInput}
                placeholder="Search files…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <a href="/" className={styles.uploadBtn}>+ Upload</a>
          </div>
        </div>

        {loading ? (
          <div className={styles.loadingState}>
            {[1,2,3].map(i => <div key={i} className={styles.skeleton} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <h3>{search ? 'No files match your search' : 'No documents yet'}</h3>
            <p>{search ? 'Try a different search term' : 'Upload some PDF files to get started'}</p>
            {!search && <a href="/" className={styles.emptyUploadBtn}>Upload files</a>}
          </div>
        ) : (
          <div className={styles.table}>
            <div className={styles.tableHead}>
              <span>File Name</span>
              <span>Size</span>
              <span>Type</span>
              <span>Uploaded</span>
              <span>Actions</span>
            </div>
            {filtered.map(file => (
              <div key={file.id} className={`${styles.tableRow} animate-fade-in`}>
                <div className={styles.fileCell}>
                  <span className={styles.fileIcon}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                  </span>
                  <span className={styles.fileName}>{file.original_name}</span>
                </div>
                <span className={styles.meta}>{formatBytes(file.size)}</span>
                <span className={styles.meta}>
                  <span className={styles.typeBadge}>PDF</span>
                </span>
                <span className={styles.meta}>{formatDate(file.upload_date)}</span>
                <div className={styles.actions}>
                  <a
                    href={downloadFile(file.id)}
                    className={styles.dlBtn}
                    download={file.original_name}
                    title="Download"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Download
                  </a>
                  <button
                    className={styles.delBtn}
                    onClick={() => handleDelete(file.id)}
                    disabled={deleting === file.id}
                    title="Delete"
                  >
                    {deleting === file.id ? '…' : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14H6L5 6"/>
                        <path d="M10 11v6M14 11v6"/>
                        <path d="M9 6V4h6v2"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
