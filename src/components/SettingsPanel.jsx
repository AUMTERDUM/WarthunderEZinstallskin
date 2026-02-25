import React, { useCallback } from 'react';
import { t } from '../lib/i18n';
import * as api from '../lib/api';

/**
 * Settings panel with game folder, validation, paths, and kill message
 */
function SettingsPanel({
  lang,
  gameFolder,
  setGameFolder,
  validationStatus,
  setValidationStatus,
  killMessageText,
  setKillMessageText,
  killMessageStatus,
  setKillMessageStatus,
  addToast,
}) {
  const getValidationStatusClass = () => {
    if (validationStatus.checking) return 'checking';
    return validationStatus.valid ? 'valid' : 'invalid';
  };

  const getValidationStatusText = () => {
    if (validationStatus.checking) return t(lang, 'settings.checking');
    return validationStatus.valid ? t(lang, 'settings.valid') : t(lang, 'settings.invalid');
  };

  const handleBrowseFolder = useCallback(async () => {
    try {
      const result = await api.browseFolder();
      if (result.ok && result.path) {
        setGameFolder(result.path);
      } else {
        addToast(result.error || t(lang, 'error.folderPicker'), 'error');
      }
    } catch {
      addToast(t(lang, 'error.folderPicker'), 'error');
    }
  }, [lang, setGameFolder, addToast]);

  const handleAutoDetect = useCallback(async () => {
    try {
      const result = await api.autoDetectGame();
      if (result.found) {
        setGameFolder(result.path);
        addToast(t(lang, 'settings.foundGame'), 'success');
      } else {
        addToast(result.message || t(lang, 'settings.notFound'), 'warning');
      }
    } catch {
      addToast(t(lang, 'error.autoDetect'), 'error');
    }
  }, [lang, setGameFolder, addToast]);

  const handleApplyKillMessage = useCallback(async () => {
    setKillMessageStatus({ type: 'info', text: t(lang, 'status.working') });

    try {
      if (!validationStatus.valid) {
        setKillMessageStatus({ type: 'error', text: t(lang, 'settings.invalid') });
        return;
      }

      if (!killMessageText || !killMessageText.trim()) {
        setKillMessageStatus({ type: 'error', text: t(lang, 'killMessage.empty') });
        return;
      }

      const result = await api.applyKillMessage(gameFolder, killMessageText);
      if (result.ok) {
        setKillMessageStatus({ type: 'success', text: t(lang, 'killMessage.success') });
      } else {
        setKillMessageStatus({ type: 'error', text: result.error || t(lang, 'error.generic') });
      }
    } catch (err) {
      setKillMessageStatus({ type: 'error', text: err?.message || t(lang, 'error.generic') });
    }
  }, [lang, gameFolder, killMessageText, validationStatus.valid, setKillMessageStatus]);

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

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <span className="settings-icon">⚙️</span>
        <span className="settings-title">{t(lang, 'settings.title')}</span>
        <span className={`validation-status ${getValidationStatusClass()}`}>
          {getValidationStatusText()}
        </span>
      </div>
      <div className="settings-body">
        <div className="dest-row">
          <input
            type="text"
            placeholder={t(lang, 'settings.placeholder')}
            value={gameFolder}
            onChange={(e) => setGameFolder(e.target.value)}
          />
          <button className="browse-btn" onClick={handleBrowseFolder}>
            📁 {t(lang, 'settings.browse')}
          </button>
          <button className="browse-btn" onClick={handleAutoDetect}>
            🔍 {t(lang, 'settings.autoDetect')}
          </button>
        </div>
        {validationStatus.valid && (
          <div className="path-info">
            <div className="path-item">
              <span className="path-label">📦 {t(lang, 'settings.skinPath')}:</span>
              <span className="path-value">{`${gameFolder}\\UserSkins`}</span>
              {api.isElectron && (
                <button className="open-path-btn" onClick={() => handleOpenFolder(`${gameFolder}\\UserSkins`)}>📂</button>
              )}
            </div>
            <div className="path-item">
              <span className="path-label">🔊 {t(lang, 'settings.soundPath')}:</span>
              <span className="path-value">{`${gameFolder}\\sound\\mod`}</span>
              {api.isElectron && (
                <button className="open-path-btn" onClick={() => handleOpenFolder(`${gameFolder}\\sound\\mod`)}>📂</button>
              )}
            </div>
          </div>
        )}

        <div className="killmsg-section">
          <div className="killmsg-title">🎯 {t(lang, 'killMessage.title')}</div>
          <div className="killmsg-row">
            <input
              type="text"
              value={killMessageText}
              onChange={(e) => setKillMessageText(e.target.value)}
              placeholder={t(lang, 'killMessage.placeholder')}
              disabled={!validationStatus.valid}
            />
            <button
              className="browse-btn"
              onClick={handleApplyKillMessage}
              disabled={!validationStatus.valid}
            >
              {t(lang, 'killMessage.apply')}
            </button>
          </div>
          {killMessageStatus?.text && (
            <div className={`killmsg-status ${killMessageStatus.type || 'info'}`}>
              {killMessageStatus.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default React.memo(SettingsPanel);
