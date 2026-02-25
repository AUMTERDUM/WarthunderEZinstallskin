import React, { useRef, useCallback } from 'react';
import { t } from '../lib/i18n';

/**
 * Drop zone for file selection (drag & drop + click)
 */
function DropZone({ lang, activeTab, files, setFiles, fileInputRef, soundFileInputRef }) {
  const currentRef = activeTab === 'skin' ? fileInputRef : soundFileInputRef;

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('active');

    const droppedFiles = Array.from(e.dataTransfer.files).filter((f) =>
      f.name.toLowerCase().endsWith('.zip')
    );

    if (droppedFiles.length === 0) {
      return; // Toast handled by parent if needed
    }

    setFiles((prev) => [...prev, ...droppedFiles]);
  }, [setFiles]);

  const handleFileSelect = useCallback((e) => {
    const selected = Array.from(e.target.files).filter((f) =>
      f.name.toLowerCase().endsWith('.zip')
    );
    setFiles((prev) => [...prev, ...selected]);
    // Reset input so re-selecting same file works
    e.target.value = '';
  }, [setFiles]);

  return (
    <>
      <label>{activeTab === 'skin' ? t(lang, 'skin.zipFile') : t(lang, 'sound.zipFile')}</label>
      <p className="hint">{activeTab === 'skin' ? t(lang, 'skin.hint') : t(lang, 'sound.hint')}</p>

      <div
        className="drop"
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.classList.add('active');
        }}
        onDragLeave={(e) => {
          e.currentTarget.classList.remove('active');
        }}
        onDrop={handleDrop}
        onClick={() => currentRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && currentRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <div className="drop-icon">📦</div>
        <div className="drop-text">{t(lang, 'drop.text')}</div>
        <div className="drop-hint">{t(lang, 'drop.hint')}</div>
      </div>

      <input
        ref={currentRef}
        type="file"
        accept=".zip"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {files.length > 0 && (
        <div className="file-list">
          <div className="file-list-header">
            <p className="muted">{t(lang, 'fileList.selected', { count: files.length })}</p>
            <button className="clear-btn" onClick={() => setFiles([])}>
              {t(lang, 'fileList.clear')}
            </button>
          </div>
          {files.map((f) => (
            <div key={f.name + f.size} className={`file-item ${activeTab === 'sound' ? 'sound-item' : ''}`}>
              {f.name}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default React.memo(DropZone);
