import React from 'react';
import { t } from '../lib/i18n';

/**
 * Backup and Restore panel (Electron-only for create/restore,
 * but the UI renders for all modes with appropriate messaging)
 */
function BackupPanel({ lang, backupOptions, setBackupOptions, restoreOptions, setRestoreOptions, onCreateBackup, onRestoreBackup }) {
  return (
    <div className="backup-panel">
      <div className="backup-header">
        <span>💾 {t(lang, 'backup.title')}</span>
      </div>
      <div className="backup-content">
        <div className="backup-section">
          <h4>{t(lang, 'backup.create')}</h4>
          <div className="backup-options">
            <label className="check">
              <input
                type="checkbox"
                checked={backupOptions.includeSkins}
                onChange={(e) => setBackupOptions({ ...backupOptions, includeSkins: e.target.checked })}
              />
              {t(lang, 'backup.includeSkins')}
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={backupOptions.includeSoundMods}
                onChange={(e) => setBackupOptions({ ...backupOptions, includeSoundMods: e.target.checked })}
              />
              {t(lang, 'backup.includeSoundMods')}
            </label>
          </div>
          <button className="backup-btn" onClick={onCreateBackup}>
            {t(lang, 'backup.createBtn')}
          </button>
        </div>

        <div className="backup-divider"></div>

        <div className="backup-section">
          <h4>{t(lang, 'backup.restore')}</h4>
          <div className="backup-options">
            <label className="check">
              <input
                type="checkbox"
                checked={restoreOptions.overwrite}
                onChange={(e) => setRestoreOptions({ ...restoreOptions, overwrite: e.target.checked })}
              />
              {t(lang, 'backup.overwrite')}
            </label>
          </div>
          <button className="restore-btn" onClick={onRestoreBackup}>
            {t(lang, 'backup.restoreBtn')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default React.memo(BackupPanel);
