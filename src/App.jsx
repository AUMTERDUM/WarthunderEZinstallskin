import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './App.css';
import { t, getLanguages } from './lib/i18n';
import * as api from './lib/api';

// Components
import ToastContainer from './components/ToastContainer';
import SettingsPanel from './components/SettingsPanel';
import StatisticsPanel from './components/StatisticsPanel';
import BackupPanel from './components/BackupPanel';
import InstalledPanel from './components/InstalledPanel';
import DropZone from './components/DropZone';
import { useConfirm } from './components/ConfirmModal';

function App() {
  // --- Language (persisted) ---
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'th');

  // --- UI state ---
  const [activeTab, setActiveTab] = useState('skin');
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [showManage, setShowManage] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showBackup, setShowBackup] = useState(false);

  // --- Game folder ---
  const [gameFolder, setGameFolder] = useState('');
  const [validationStatus, setValidationStatus] = useState({ valid: false, checking: false });

  // --- Files ---
  const [zipFiles, setZipFiles] = useState([]);
  const [soundZipFiles, setSoundZipFiles] = useState([]);
  const [forceOverwrite, setForceOverwrite] = useState(false);

  // --- Install state ---
  const [installing, setInstalling] = useState(false);
  const [result, setResult] = useState(null);
  const [progress, setProgress] = useState(null);

  // --- Sound mod ---
  const [soundModStatus, setSoundModStatus] = useState({ enabled: false, checking: false });

  // --- Installed items ---
  const [installedSkins, setInstalledSkins] = useState([]);
  const [installedSoundMods, setInstalledSoundMods] = useState([]);
  const [loadingInstalled, setLoadingInstalled] = useState(false);

  // --- Toasts ---
  const [toasts, setToasts] = useState([]);

  // --- Statistics ---
  const [statistics, setStatistics] = useState(null);

  // --- Backup ---
  const [backupOptions, setBackupOptions] = useState({ includeSkins: true, includeSoundMods: true });
  const [restoreOptions, setRestoreOptions] = useState({ overwrite: false });

  // --- Kill message ---
  const [killMessageText, setKillMessageText] = useState('');
  const [killMessageStatus, setKillMessageStatus] = useState(null);

  // --- Refs ---
  const fileInputRef = useRef(null);
  const soundFileInputRef = useRef(null);

  // --- Custom confirm modal ---
  const { confirm, ConfirmDialog } = useConfirm();

  // =====================
  // Callbacks (memoized)
  // =====================

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', next);
      return next;
    });
  }, []);

  // Persist language
  useEffect(() => {
    localStorage.setItem('lang', lang);
  }, [lang]);

  // Apply theme
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Validate game folder
  const validateFolder = useCallback(async (folder) => {
    if (!folder) return;
    setValidationStatus({ valid: false, checking: true });
    try {
      const result = await api.validateGameFolder(folder);
      setValidationStatus({ valid: result.valid, checking: false, message: result.message });
    } catch (err) {
      console.error('[validateFolder]', err);
      setValidationStatus({ valid: false, checking: false, message: t(lang, 'error.validateFolder') });
    }
  }, [lang]);

  // Check sound mod status
  const checkSoundModStatusFn = useCallback(async (folder) => {
    setSoundModStatus({ enabled: false, checking: true });
    try {
      const result = await api.checkSoundMod(folder);
      setSoundModStatus({ enabled: result.enabled, checking: false });
    } catch (err) {
      console.error('[checkSoundMod]', err);
      setSoundModStatus({ enabled: false, checking: false });
    }
  }, []);

  // Auto-detect on load
  useEffect(() => {
    const savedGameFolder = localStorage.getItem('gameFolder');
    if (savedGameFolder) {
      setGameFolder(savedGameFolder);
      validateFolder(savedGameFolder);
    } else {
      (async () => {
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
      })();
    }

    api.onInstallProgress((data) => {
      setProgress(data);
    });

    return () => {
      api.removeInstallProgressListener();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-validate when gameFolder changes
  useEffect(() => {
    if (gameFolder) {
      validateFolder(gameFolder);
      localStorage.setItem('gameFolder', gameFolder);
    }
  }, [gameFolder, validateFolder]);

  // Check sound mod when switching to sound tab
  useEffect(() => {
    if (activeTab === 'sound' && gameFolder && validationStatus.valid) {
      checkSoundModStatusFn(gameFolder);
    }
  }, [activeTab, gameFolder, validationStatus.valid, checkSoundModStatusFn]);

  // Load installed items when showing manage panel
  const loadInstalledItems = useCallback(async () => {
    setLoadingInstalled(true);
    try {
      const [skinsResult, soundModsResult] = await Promise.all([
        api.listInstalledSkins(gameFolder),
        api.listInstalledSoundMods(gameFolder),
      ]);
      setInstalledSkins(skinsResult.skins || []);
      setInstalledSoundMods(soundModsResult.soundMods || []);
    } catch (err) {
      console.error('[loadInstalledItems]', err);
      addToast(t(lang, 'error.loadInstalled'), 'error');
    } finally {
      setLoadingInstalled(false);
    }
  }, [gameFolder, lang, addToast]);

  useEffect(() => {
    if (showManage && gameFolder) {
      loadInstalledItems();
    }
  }, [showManage, gameFolder, loadInstalledItems]);

  // Load statistics
  const loadStatistics = useCallback(async () => {
    try {
      const result = await api.getStatistics(gameFolder);
      if (result.ok) {
        setStatistics(result.stats);
      } else {
        addToast(result.error || t(lang, 'error.loadStats'), 'error');
      }
    } catch (err) {
      console.error('[loadStatistics]', err);
      addToast(t(lang, 'error.loadStats'), 'error');
    }
  }, [gameFolder, lang, addToast]);

  useEffect(() => {
    if (showStats && gameFolder) {
      loadStatistics();
    }
  }, [showStats, gameFolder, loadStatistics]);

  // =====================
  // Install handler
  // =====================
  const handleInstall = useCallback(async () => {
    const files = activeTab === 'skin' ? zipFiles : soundZipFiles;

    if (files.length === 0) {
      addToast(t(lang, 'error.noFile'), 'error');
      return;
    }

    setInstalling(true);
    setResult(null);
    setProgress(null);

    try {
      const dest = activeTab === 'skin'
        ? `${gameFolder}\\UserSkins`
        : `${gameFolder}\\sound\\mod`;

      const data = await api.installFiles(files, dest, forceOverwrite, activeTab);

      setResult(data);

      if (data.ok) {
        addToast(
          t(lang, activeTab === 'skin' ? 'toast.skinInstallSuccess' : 'toast.soundInstallSuccess', { count: files.length }),
          'success'
        );
        if (activeTab === 'skin') {
          setZipFiles([]);
        } else {
          setSoundZipFiles([]);
        }
      } else {
        addToast(data.error || t(lang, 'error.generic'), 'error');
      }
    } catch (err) {
      console.error('[handleInstall]', err);
      addToast(err.message || t(lang, 'error.generic'), 'error');
    } finally {
      setInstalling(false);
      setProgress(null);
    }
  }, [activeTab, zipFiles, soundZipFiles, gameFolder, forceOverwrite, lang, addToast]);

  // Enable sound mod
  const handleEnableSoundMod = useCallback(async () => {
    setSoundModStatus((s) => ({ ...s, checking: true }));
    try {
      const result = await api.enableSoundMod(gameFolder);
      if (result.ok) {
        addToast(t(lang, 'sound.enableSuccess'), 'success');
        setSoundModStatus({ enabled: true, checking: false });
      } else {
        addToast(result.error || t(lang, 'error.enableSoundMod'), 'error');
        setSoundModStatus((s) => ({ ...s, checking: false }));
      }
    } catch (err) {
      console.error('[enableSoundMod]', err);
      addToast(t(lang, 'error.enableSoundMod'), 'error');
      setSoundModStatus((s) => ({ ...s, checking: false }));
    }
  }, [gameFolder, lang, addToast]);

  // Backup handlers
  const handleCreateBackup = useCallback(async () => {
    if (!api.isElectron) {
      addToast(t(lang, 'backup.electronOnly'), 'warning');
      return;
    }
    try {
      const result = await api.createBackup(gameFolder, backupOptions);
      if (result.ok) {
        addToast(t(lang, 'backup.success', { skins: result.skinsCount, sounds: result.soundModsCount }), 'success');
      } else {
        addToast(result.error || t(lang, 'error.backup'), 'error');
      }
    } catch (err) {
      console.error('[createBackup]', err);
      addToast(t(lang, 'error.backup'), 'error');
    }
  }, [gameFolder, backupOptions, lang, addToast]);

  const handleRestoreBackup = useCallback(async () => {
    if (!api.isElectron) {
      addToast(t(lang, 'backup.electronOnly'), 'warning');
      return;
    }
    try {
      const result = await api.restoreBackup(gameFolder, restoreOptions);
      if (result.ok) {
        addToast(t(lang, 'backup.restoreSuccess', { skins: result.skinsRestored, sounds: result.soundModsRestored }), 'success');
        if (showManage) {
          loadInstalledItems();
        }
      } else {
        addToast(result.error || t(lang, 'error.restore'), 'error');
      }
    } catch (err) {
      console.error('[restoreBackup]', err);
      addToast(t(lang, 'error.restore'), 'error');
    }
  }, [gameFolder, restoreOptions, lang, addToast, showManage, loadInstalledItems]);

  // =====================
  // Derived values (memoized)
  // =====================
  const files = activeTab === 'skin' ? zipFiles : soundZipFiles;
  const setFiles = activeTab === 'skin' ? setZipFiles : setSoundZipFiles;

  const soundModStatusDisplay = useMemo(() => {
    if (soundModStatus.checking) return { cls: 'checking', icon: 'â³', text: t(lang, 'common.checking') };
    if (soundModStatus.enabled) return { cls: 'enabled', icon: 'âœ“', text: t(lang, 'sound.configEnabled') };
    return { cls: 'disabled', icon: 'âš ', text: t(lang, 'sound.configDisabled') };
  }, [soundModStatus, lang]);

  // =====================
  // Render
  // =====================
  return (
    <div className="wrap">
      {ConfirmDialog}
      <ToastContainer toasts={toasts} setToasts={setToasts} />

      <div className="card">
        <div className="header">
          <div className="header-text">
            <h1>{t(lang, 'app.title')}</h1>
            <p className="muted">{t(lang, 'app.subtitle')}</p>
          </div>
          <div className="header-controls">
            <select className="language-select" value={lang} onChange={(e) => setLang(e.target.value)}>
              {getLanguages().map((l) => (
                <option key={l.code} value={l.code}>{l.flag} {l.name}</option>
              ))}
            </select>
            <button className="theme-btn" onClick={toggleTheme} title={t(lang, 'settings.theme')}>
              {theme === 'dark' ? 'â˜€ï¸' : 'ðŸŒ™'}
            </button>
            <button className={`stats-btn ${showStats ? 'active' : ''}`} onClick={() => setShowStats(!showStats)} title={t(lang, 'statistics.title')}>
              ðŸ“Š
            </button>
            {api.isElectron && (
              <button className={`backup-toggle-btn ${showBackup ? 'active' : ''}`} onClick={() => setShowBackup(!showBackup)} title={t(lang, 'backup.title')}>
                ðŸ’¾
              </button>
            )}
            <button className={`manage-btn ${showManage ? 'active' : ''}`} onClick={() => setShowManage(!showManage)}>
              {showManage ? 'â† ' + (t(lang, 'common.back') || 'à¸à¸¥à¸±à¸š') : t(lang, 'header.manage')}
            </button>
          </div>
        </div>

        {showManage ? (
          <InstalledPanel
            lang={lang}
            gameFolder={gameFolder}
            installedSkins={installedSkins}
            installedSoundMods={installedSoundMods}
            loadingInstalled={loadingInstalled}
            onRefresh={loadInstalledItems}
            addToast={addToast}
            confirm={confirm}
          />
        ) : (
          <>
            {showStats && statistics && (
              <StatisticsPanel lang={lang} statistics={statistics} />
            )}

            {showBackup && api.isElectron && (
              <BackupPanel
                lang={lang}
                backupOptions={backupOptions}
                setBackupOptions={setBackupOptions}
                restoreOptions={restoreOptions}
                setRestoreOptions={setRestoreOptions}
                onCreateBackup={handleCreateBackup}
                onRestoreBackup={handleRestoreBackup}
              />
            )}

            <SettingsPanel
              lang={lang}
              gameFolder={gameFolder}
              setGameFolder={setGameFolder}
              validationStatus={validationStatus}
              setValidationStatus={setValidationStatus}
              killMessageText={killMessageText}
              setKillMessageText={setKillMessageText}
              killMessageStatus={killMessageStatus}
              setKillMessageStatus={setKillMessageStatus}
              addToast={addToast}
            />

            <div className="main">
              <div className="panel">
                <div className="panel-head">
                  <div className="tabs">
                    <button className={`tab ${activeTab === 'skin' ? 'active' : ''}`} onClick={() => setActiveTab('skin')}>
                      ðŸ“¦ {t(lang, 'tabs.skin')}
                    </button>
                    <button className={`tab ${activeTab === 'sound' ? 'active' : ''}`} onClick={() => setActiveTab('sound')}>
                      ðŸ”Š {t(lang, 'tabs.sound')}
                    </button>
                  </div>
                </div>
                <div className="panel-body">
                  <DropZone
                    lang={lang}
                    activeTab={activeTab}
                    files={files}
                    setFiles={setFiles}
                    fileInputRef={fileInputRef}
                    soundFileInputRef={soundFileInputRef}
                  />

                  {activeTab === 'sound' && gameFolder && validationStatus.valid && (
                    <div className="config-section">
                      <div className={`config-status ${soundModStatusDisplay.cls}`}>
                        <span className="config-status-icon">{soundModStatusDisplay.icon}</span>
                        <span className="config-status-text">{soundModStatusDisplay.text}</span>
                        {!soundModStatus.enabled && !soundModStatus.checking && (
                          <button className="enable-btn" onClick={handleEnableSoundMod}>
                            {t(lang, 'sound.enableAuto')}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="actions">
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={forceOverwrite}
                        onChange={(e) => setForceOverwrite(e.target.checked)}
                      />
                      {t(lang, 'common.forceOverwrite')}
                    </label>
                    <button onClick={handleInstall} disabled={installing || files.length === 0 || !validationStatus.valid}>
                      {installing ? t(lang, 'common.installing') : t(lang, 'common.install')}
                    </button>
                  </div>

                  {progress && (
                    <div className="progress-container">
                      <div className="progress-info">
                        <span className="progress-text">{t(lang, 'progress.installing')}</span>
                        <span className="progress-percent">{progress.percent}%</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${progress.percent}%` }}></div>
                      </div>
                      <div className="progress-file">
                        {progress.current}/{progress.total}: {progress.file}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {result && (
                <div className="panel">
                  <div className="panel-head">{t(lang, 'result.title')}</div>
                  <div className="panel-body">
                    <p className="status">
                      <span className={`badge ${result.ok ? 'ok' : 'err'}`}>
                        {result.ok ? t(lang, 'status.success') : t(lang, 'status.failed')}
                      </span>
                    </p>
                    {result.message && <p>{result.message}</p>}
                    {result.results && (
                      <div style={{ marginTop: '0.5rem' }}>
                        {result.results.map((r) => (
                          <div key={r.file} style={{ marginBottom: '0.5rem' }}>
                            <strong>{r.file}:</strong> âœ“
                            {r.warnings && r.warnings.length > 0 && (
                              <div style={{ marginLeft: '1rem', fontSize: '0.875rem', color: 'var(--muted)' }}>
                                {r.warnings.map((w, j) => <div key={j}> âš  {w}</div>)}
                              </div>
                            )}
                          </div>
                        ))}
                        {result.errors && result.errors.map((e, i) => (
                          <div key={i} style={{ marginBottom: '0.5rem', color: 'var(--danger)' }}>
                            <strong>{e.file}:</strong> âœ• {e.error}
                          </div>
                        ))}
                      </div>
                    )}
                    {result.error && <pre>{result.error}</pre>}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
