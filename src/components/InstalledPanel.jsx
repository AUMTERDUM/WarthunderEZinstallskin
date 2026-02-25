import React, { useState, useMemo, useCallback } from 'react';
import { t, formatBytes } from '../lib/i18n';
import * as api from '../lib/api';

/**
 * Installed items management panel with search/filter
 */
function InstalledPanel({
  lang,
  gameFolder,
  installedSkins,
  installedSoundMods,
  loadingInstalled,
  onRefresh,
  addToast,
  confirm,
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSkins = useMemo(() => {
    if (!searchQuery.trim()) return installedSkins;
    const q = searchQuery.toLowerCase();
    return installedSkins.filter((s) => s.name.toLowerCase().includes(q));
  }, [installedSkins, searchQuery]);

  const filteredSoundMods = useMemo(() => {
    if (!searchQuery.trim()) return installedSoundMods;
    const q = searchQuery.toLowerCase();
    return installedSoundMods.filter((s) => s.name.toLowerCase().includes(q));
  }, [installedSoundMods, searchQuery]);

  const handleOpenFolder = useCallback(async (folderPath) => {
    if (!api.isElectron) {
      addToast(t(lang, 'error.electronOnly'), 'warning');
      return;
    }
    try {
      await api.openFolder(folderPath);
    } catch {
      addToast(t(lang, 'error.openFolder'), 'error');
    }
  }, [lang, addToast]);

  const handleDeleteSkin = useCallback(async (skinPath, skinName) => {
    const confirmed = await confirm({
      title: t(lang, 'installed.delete'),
      message: t(lang, 'installed.confirmDelete', { name: skinName }),
      danger: true,
      confirmText: t(lang, 'installed.delete'),
      cancelText: t(lang, 'common.cancel') || 'ยกเลิก',
    });

    if (!confirmed) return;

    try {
      const result = await api.deleteSkin(skinPath);
      if (result.ok) {
        addToast(t(lang, 'installed.deleteSuccess', { name: skinName }), 'success');
        onRefresh();
      } else {
        addToast(result.error || t(lang, 'error.delete'), 'error');
      }
    } catch (err) {
      addToast(err.message || t(lang, 'error.delete'), 'error');
    }
  }, [lang, addToast, onRefresh, confirm]);

  const handleDeleteSoundMod = useCallback(async (soundModPath, soundModName) => {
    const confirmed = await confirm({
      title: t(lang, 'installed.delete'),
      message: t(lang, 'installed.confirmDelete', { name: soundModName }),
      danger: true,
      confirmText: t(lang, 'installed.delete'),
      cancelText: t(lang, 'common.cancel') || 'ยกเลิก',
    });

    if (!confirmed) return;

    try {
      const result = await api.deleteSoundMod(soundModPath);
      if (result.ok) {
        addToast(t(lang, 'installed.deleteSoundSuccess', { name: soundModName }), 'success');
        onRefresh();
      } else {
        addToast(result.error || t(lang, 'error.delete'), 'error');
      }
    } catch (err) {
      addToast(err.message || t(lang, 'error.delete'), 'error');
    }
  }, [lang, addToast, onRefresh, confirm]);

  return (
    <div className="installed-panel">
      <div className="installed-header">
        <span>{t(lang, 'installed.title')}</span>
        <div className="installed-header-actions">
          <input
            type="text"
            className="search-input"
            placeholder={t(lang, 'installed.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button className="refresh-btn" onClick={onRefresh} disabled={loadingInstalled}>
            🔄 {t(lang, 'installed.refresh')}
          </button>
        </div>
      </div>
      <div className="installed-content">
        <div className="installed-section">
          <div className="installed-section-header">
            📦 {t(lang, 'installed.skins')} ({filteredSkins.length}{searchQuery ? `/${installedSkins.length}` : ''})
          </div>
          <div className="installed-list">
            {(() => {
              if (loadingInstalled) {
                return <div className="loading">{t(lang, 'common.loading')}</div>;
              }
              if (filteredSkins.length === 0) {
                return (
                  <div className="empty">
                    {searchQuery ? t(lang, 'installed.noResults') : t(lang, 'installed.noSkins')}
                  </div>
                );
              }
              return filteredSkins.map((skin) => (
                <div key={skin.path} className="installed-item skin">
                  <span className="installed-icon">📦</span>
                  <div className="installed-info">
                    <div className="installed-name" title={skin.name}>{skin.name}</div>
                    <div className="installed-meta">
                      {formatBytes(skin.size)}
                      {!skin.hasBlk && <span className="warning-badge">⚠ {t(lang, 'installed.noBlk')}</span>}
                    </div>
                  </div>
                  <div className="installed-actions">
                    {api.isElectron && (
                      <button className="action-btn" onClick={() => handleOpenFolder(skin.path)} title={t(lang, 'installed.openFolder')}>
                        📂
                      </button>
                    )}
                    <button className="action-btn delete-btn" onClick={() => handleDeleteSkin(skin.path, skin.name)} title={t(lang, 'installed.delete')}>
                      🗑️
                    </button>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>

        <div className="installed-section">
          <div className="installed-section-header">
            🔊 {t(lang, 'installed.soundMods')} ({filteredSoundMods.length}{searchQuery ? `/${installedSoundMods.length}` : ''})
          </div>
          <div className="installed-list">
            {(() => {
              if (loadingInstalled) {
                return <div className="loading">{t(lang, 'common.loading')}</div>;
              }
              if (filteredSoundMods.length === 0) {
                return (
                  <div className="empty">
                    {searchQuery ? t(lang, 'installed.noResults') : t(lang, 'installed.noSoundMods')}
                  </div>
                );
              }
              return filteredSoundMods.map((sound) => (
                <div key={sound.path} className="installed-item sound">
                  <span className="installed-icon">🔊</span>
                  <div className="installed-info">
                    <div className="installed-name" title={sound.name}>{sound.name}</div>
                    <div className="installed-meta">{formatBytes(sound.size)}</div>
                  </div>
                  <div className="installed-actions">
                    {api.isElectron && (
                      <button className="action-btn" onClick={() => handleOpenFolder(sound.path.replace(/[^\\/]+$/, ''))} title={t(lang, 'installed.openFolder')}>
                        📂
                      </button>
                    )}
                    <button className="action-btn delete-btn" onClick={() => handleDeleteSoundMod(sound.path, sound.name)} title={t(lang, 'installed.delete')}>
                      🗑️
                    </button>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(InstalledPanel);
