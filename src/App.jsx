import { useState, useRef, useEffect, useCallback } from 'react';
import './App.css';

const DEFAULT_GAME_FOLDER = 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\War Thunder';
const GAME_FOLDER_KEY = 'wt_auto_skin_game_folder_v1';

// Check if running in Electron
const isElectron = typeof window !== 'undefined' && window.electronAPI?.isElectron === true;

// Toast notification component
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`toast toast-${type}`} onClick={onClose}>
      <span className="toast-icon">
        {type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}
      </span>
      <span className="toast-message">{message}</span>
      <button className="toast-close">×</button>
    </div>
  );
}

// Progress bar component
function ProgressBar({ current, total, fileName, percent }) {
  return (
    <div className="progress-container">
      <div className="progress-info">
        <span className="progress-text">กำลังติดตั้ง ({current}/{total})</span>
        <span className="progress-percent">{percent}%</span>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>
      <div className="progress-file">{fileName}</div>
    </div>
  );
}

// Installed item component
function InstalledItem({ item, type, onDelete, onOpenFolder }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`ต้องการลบ "${item.name}" หรือไม่?`)) return;
    setIsDeleting(true);
    await onDelete(item);
    setIsDeleting(false);
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (isoString) => {
    return new Date(isoString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={`installed-item ${type}`}>
      <div className="installed-icon">{type === 'skin' ? '🎨' : '🔊'}</div>
      <div className="installed-info">
        <div className="installed-name">{item.name}</div>
        <div className="installed-meta">
          <span>{formatSize(item.size)}</span>
          <span>•</span>
          <span>{formatDate(item.modifiedAt)}</span>
          {type === 'skin' && !item.hasBlk && (
            <span className="warning-badge">⚠️ ไม่มี .blk</span>
          )}
        </div>
      </div>
      <div className="installed-actions">
        <button 
          className="action-btn open-btn" 
          onClick={() => onOpenFolder(item.path)}
          title="เปิดโฟลเดอร์"
        >
          📂
        </button>
        <button 
          className="action-btn delete-btn" 
          onClick={handleDelete}
          disabled={isDeleting}
          title="ลบ"
        >
          {isDeleting ? '⏳' : '🗑️'}
        </button>
      </div>
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState('skin');
  const [files, setFiles] = useState([]);
  const [force, setForce] = useState(false);
  const [status, setStatus] = useState({ kind: 'ready', message: 'พร้อมใช้งาน' });
  const [isInstalling, setIsInstalling] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [installProgress, setInstallProgress] = useState(null);
  const fileInputRef = useRef(null);

  // Sound Pack states
  const [soundFiles, setSoundFiles] = useState([]);
  const [soundForce, setSoundForce] = useState(false);
  const [soundStatus, setSoundStatus] = useState({ kind: 'ready', message: 'พร้อมใช้งาน' });
  const [isSoundInstalling, setIsSoundInstalling] = useState(false);
  const [isSoundDragging, setIsSoundDragging] = useState(false);
  const [soundInstallProgress, setSoundInstallProgress] = useState(null);
  const soundFileInputRef = useRef(null);

  // Game folder and config states
  const [gameFolder, setGameFolder] = useState(() => {
    try {
      return localStorage.getItem(GAME_FOLDER_KEY) || DEFAULT_GAME_FOLDER;
    } catch {
      return DEFAULT_GAME_FOLDER;
    }
  });
  const [gameFolderValid, setGameFolderValid] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [soundModEnabled, setSoundModEnabled] = useState(null);
  const [isEnablingConfig, setIsEnablingConfig] = useState(false);
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);

  // Installed items states
  const [installedSkins, setInstalledSkins] = useState([]);
  const [installedSoundMods, setInstalledSoundMods] = useState([]);
  const [isLoadingInstalled, setIsLoadingInstalled] = useState(false);
  const [showInstalled, setShowInstalled] = useState(false);

  // Toast notifications
  const [toasts, setToasts] = useState([]);

  // Computed paths from game folder
  const skinDest = gameFolder + '\\UserSkins';
  const soundDest = gameFolder + '\\sound\\mod';

  // Add toast notification
  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  // Remove toast
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Save game folder to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(GAME_FOLDER_KEY, gameFolder);
    } catch {}
  }, [gameFolder]);

  // Setup progress listener for Electron
  useEffect(() => {
    if (isElectron && window.electronAPI.onInstallProgress) {
      window.electronAPI.onInstallProgress((data) => {
        if (activeTab === 'skin') {
          setInstallProgress(data);
        } else {
          setSoundInstallProgress(data);
        }
      });

      return () => {
        if (window.electronAPI.removeInstallProgressListener) {
          window.electronAPI.removeInstallProgressListener();
        }
      };
    }
  }, [activeTab]);

  // Validate game folder on change
  useEffect(() => {
    validateCurrentGameFolder();
  }, [gameFolder]);

  // Check sound mod status on mount and when game folder changes
  useEffect(() => {
    checkSoundModStatus();
  }, [gameFolder]);

  // Load installed items when showing
  useEffect(() => {
    if (showInstalled) {
      loadInstalledItems();
    }
  }, [showInstalled, gameFolder]);

  const validateCurrentGameFolder = async () => {
    setIsValidating(true);
    try {
      if (isElectron) {
        const result = await window.electronAPI.validateGameFolder({ gameFolder });
        setGameFolderValid(result);
      } else {
        const resp = await fetch(`/api/validate-game-folder?gameFolder=${encodeURIComponent(gameFolder)}`);
        if (resp.ok) {
          const result = await resp.json();
          setGameFolderValid(result);
        }
      }
    } catch {
      setGameFolderValid({ valid: false, message: 'ไม่สามารถตรวจสอบโฟลเดอร์ได้' });
    }
    setIsValidating(false);
  };

  const handleAutoDetect = async () => {
    setIsAutoDetecting(true);
    try {
      let result;
      if (isElectron) {
        result = await window.electronAPI.autoDetectGame();
      } else {
        const resp = await fetch('/api/auto-detect-game');
        if (resp.ok) {
          result = await resp.json();
        }
      }

      if (result?.found && result?.path) {
        setGameFolder(result.path);
        addToast(result.message, 'success');
      } else {
        addToast(result?.message || 'ไม่พบ War Thunder', 'warning');
      }
    } catch (err) {
      addToast(`ไม่สามารถค้นหาได้: ${err.message}`, 'error');
    }
    setIsAutoDetecting(false);
  };

  const checkSoundModStatus = async () => {
    try {
      if (isElectron) {
        const data = await window.electronAPI.checkSoundMod({ gameFolder });
        if (data.ok) {
          setSoundModEnabled(data.enabled);
        }
      } else {
        const resp = await fetch(`/api/check-sound-mod?gameFolder=${encodeURIComponent(gameFolder)}`);
        if (resp.ok) {
          const data = await resp.json();
          if (data.ok) {
            setSoundModEnabled(data.enabled);
          }
        }
      }
    } catch {
      setSoundModEnabled(false);
    }
  };

  const handleEnableSoundMod = async () => {
    setIsEnablingConfig(true);
    try {
      let data;
      if (isElectron) {
        data = await window.electronAPI.enableSoundMod({ gameFolder });
      } else {
        const resp = await fetch('/api/enable-sound-mod', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameFolder })
        });
        data = await resp.json();
      }
      if (data.ok) {
        setSoundModEnabled(true);
        addToast('เปิดใช้งาน Sound mod สำเร็จ!', 'success');
        setSoundStatus({ kind: 'ok', message: data.message });
      } else {
        addToast(data.error || 'ไม่สามารถแก้ไข config.blk', 'error');
        setSoundStatus({ kind: 'err', message: data.error || 'ไม่สามารถแก้ไข config.blk' });
      }
    } catch (err) {
      addToast(`ผิดพลาด: ${err.message}`, 'error');
      setSoundStatus({ kind: 'err', message: `ผิดพลาด: ${err.message}` });
    } finally {
      setIsEnablingConfig(false);
    }
  };

  const loadInstalledItems = async () => {
    setIsLoadingInstalled(true);
    try {
      if (isElectron) {
        const [skinsResult, soundsResult] = await Promise.all([
          window.electronAPI.listInstalledSkins({ gameFolder }),
          window.electronAPI.listInstalledSoundMods({ gameFolder }),
        ]);
        if (skinsResult.ok) setInstalledSkins(skinsResult.skins || []);
        if (soundsResult.ok) setInstalledSoundMods(soundsResult.soundMods || []);
      } else {
        const [skinsResp, soundsResp] = await Promise.all([
          fetch(`/api/list-installed-skins?gameFolder=${encodeURIComponent(gameFolder)}`),
          fetch(`/api/list-installed-sound-mods?gameFolder=${encodeURIComponent(gameFolder)}`),
        ]);
        if (skinsResp.ok) {
          const data = await skinsResp.json();
          if (data.ok) setInstalledSkins(data.skins || []);
        }
        if (soundsResp.ok) {
          const data = await soundsResp.json();
          if (data.ok) setInstalledSoundMods(data.soundMods || []);
        }
      }
    } catch (err) {
      addToast(`ไม่สามารถโหลดรายการ: ${err.message}`, 'error');
    }
    setIsLoadingInstalled(false);
  };

  const handleDeleteSkin = async (skin) => {
    try {
      let result;
      if (isElectron) {
        result = await window.electronAPI.deleteSkin({ skinPath: skin.path });
      } else {
        const resp = await fetch('/api/delete-skin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skinPath: skin.path }),
        });
        result = await resp.json();
      }

      if (result.ok) {
        addToast(`ลบสกิน "${skin.name}" สำเร็จ`, 'success');
        loadInstalledItems();
      } else {
        addToast(result.error || 'ไม่สามารถลบได้', 'error');
      }
    } catch (err) {
      addToast(`ผิดพลาด: ${err.message}`, 'error');
    }
  };

  const handleDeleteSoundMod = async (soundMod) => {
    try {
      let result;
      if (isElectron) {
        result = await window.electronAPI.deleteSoundMod({ soundModPath: soundMod.path });
      } else {
        const resp = await fetch('/api/delete-sound-mod', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ soundModPath: soundMod.path }),
        });
        result = await resp.json();
      }

      if (result.ok) {
        addToast(`ลบ sound mod "${soundMod.name}" สำเร็จ`, 'success');
        loadInstalledItems();
      } else {
        addToast(result.error || 'ไม่สามารถลบได้', 'error');
      }
    } catch (err) {
      addToast(`ผิดพลาด: ${err.message}`, 'error');
    }
  };

  const handleOpenFolder = async (folderPath) => {
    try {
      if (isElectron) {
        await window.electronAPI.openFolder(folderPath);
      } else {
        addToast('เปิดโฟลเดอร์ได้เฉพาะใน Desktop App', 'warning');
      }
    } catch (err) {
      addToast(`ไม่สามารถเปิดโฟลเดอร์: ${err.message}`, 'error');
    }
  };

  const handleBrowseGameFolder = async () => {
    try {
      let data;
      if (isElectron) {
        data = await window.electronAPI.browseFolder();
      } else {
        const resp = await fetch('/api/browse-folder');
        if (!resp.ok) {
          addToast(`ไม่สามารถเชื่อมต่อ backend (HTTP ${resp.status})`, 'error');
          return;
        }
        data = await resp.json().catch(() => null);
        if (!data) {
          addToast('Backend ตอบกลับมาผิดรูปแบบ', 'error');
          return;
        }
      }
      if (data.ok && data.path) {
        setGameFolder(data.path);
      } else if (data.error && !data.error.includes('ยกเลิก')) {
        addToast(`ไม่สามารถเปิด folder picker: ${data.error}`, 'error');
      }
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        addToast('ไม่สามารถเชื่อมต่อ backend', 'error');
      } else {
        addToast(`ผิดพลาด: ${err.message}`, 'error');
      }
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(selectedFiles);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer?.files || []).filter(
      f => String(f.name || '').toLowerCase().endsWith('.zip')
    );
    if (droppedFiles.length === 0) {
      setStatus({ kind: 'err', message: 'ไฟล์ที่ลากมาวางต้องเป็น .zip' });
      return;
    }
    setFiles(droppedFiles);
    if (fileInputRef.current) {
      const dt = new DataTransfer();
      droppedFiles.forEach(f => dt.items.add(f));
      fileInputRef.current.files = dt.files;
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleClearFiles = () => {
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Sound Pack handlers
  const handleSoundFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    setSoundFiles(selectedFiles);
  };

  const handleSoundDrop = (e) => {
    e.preventDefault();
    setIsSoundDragging(false);
    const droppedFiles = Array.from(e.dataTransfer?.files || []).filter(
      f => String(f.name || '').toLowerCase().endsWith('.zip')
    );
    if (droppedFiles.length === 0) {
      setSoundStatus({ kind: 'err', message: 'ไฟล์ที่ลากมาวางต้องเป็น .zip' });
      return;
    }
    setSoundFiles(droppedFiles);
    if (soundFileInputRef.current) {
      const dt = new DataTransfer();
      droppedFiles.forEach(f => dt.items.add(f));
      soundFileInputRef.current.files = dt.files;
    }
  };

  const handleSoundDragOver = (e) => {
    e.preventDefault();
    setIsSoundDragging(true);
  };

  const handleSoundDragLeave = (e) => {
    e.preventDefault();
    setIsSoundDragging(false);
  };

  const handleClearSoundFiles = () => {
    setSoundFiles([]);
    if (soundFileInputRef.current) soundFileInputRef.current.value = '';
  };

  const handleSoundSubmit = async (e) => {
    e.preventDefault();
    if (soundFiles.length === 0) {
      setSoundStatus({ kind: 'err', message: 'กรุณาเลือกไฟล์ zip' });
      return;
    }

    setIsSoundInstalling(true);
    setSoundInstallProgress({ current: 0, total: soundFiles.length, fileName: '', percent: 0 });
    setSoundStatus({ kind: 'work', message: `กำลังติดตั้ง... (0/${soundFiles.length})` });

    const results = [];
    const errors = [];
    const warnings = [];

    try {
      if (isElectron) {
        setSoundStatus({ kind: 'work', message: `กำลังติดตั้ง... (${soundFiles.length} ไฟล์)` });
        
        const filesData = soundFiles.map(f => ({
          name: f.name,
          path: window.electronAPI.getFilePath(f),
        }));

        const data = await window.electronAPI.installSound({
          files: filesData,
          dest: soundDest,
          force: soundForce,
        });

        if (data.results) {
          data.results.forEach(r => {
            if (r.warnings) {
              r.warnings.forEach(w => warnings.push({ file: r.file, warning: w }));
            }
            results.push({ file: r.file, installedPath: r.installedPath });
          });
        }
        if (data.errors) {
          data.errors.forEach(e => errors.push(e));
        }
      } else {
        for (let i = 0; i < soundFiles.length; i++) {
          const zip = soundFiles[i];
          setSoundInstallProgress({
            current: i + 1,
            total: soundFiles.length,
            fileName: zip.name,
            percent: Math.round(((i + 1) / soundFiles.length) * 100),
          });
          setSoundStatus({ kind: 'work', message: `กำลังติดตั้ง... (${i + 1}/${soundFiles.length})\n${zip.name}` });

          const fd = new FormData();
          fd.append('zip', zip);
          fd.append('dest', soundDest);
          fd.append('force', soundForce ? 'true' : 'false');

          const resp = await fetch('/api/install-sound', { method: 'POST', body: fd });
          
          if (!resp.ok) {
            const data = await resp.json().catch(() => null);
            const msg = data?.error || `HTTP ${resp.status}`;
            errors.push({ file: zip.name, error: msg });
            continue;
          }

          const data = await resp.json().catch(() => null);
          if (!data) {
            errors.push({ file: zip.name, error: 'Backend ตอบกลับมาผิดรูปแบบ' });
            continue;
          }

          if (data && Array.isArray(data.warnings) && data.warnings.length) {
            data.warnings.forEach(w => warnings.push({ file: zip.name, warning: String(w) }));
          }

          results.push({ file: zip.name, installedPath: data.installedPath });
        }
      }

      // Build result message
      const lines = [];
      if (results.length) {
        lines.push(`✅ สำเร็จ: ${results.length}/${soundFiles.length}`);
        results.forEach(r => {
          lines.push(`• ${r.file}`);
        });
      }
      if (errors.length) {
        lines.push('');
        lines.push(`❌ ล้มเหลว: ${errors.length}/${soundFiles.length}`);
        errors.forEach(er => {
          lines.push(`• ${er.file}: ${er.error}`);
        });
      }
      if (warnings.length) {
        lines.push('');
        lines.push(`⚠️ คำเตือน: ${warnings.length}`);
        warnings.forEach(w => {
          lines.push(`• ${w.file}: ${w.warning}`);
        });
      }

      const finalKind = errors.length === 0 ? 'ok' : (results.length === 0 ? 'err' : 'work');
      setSoundStatus({ kind: finalKind, message: lines.join('\n') });

      // Show toast
      if (results.length > 0) {
        addToast(`ติดตั้ง sound mod สำเร็จ ${results.length} ไฟล์`, 'success');
      }
      if (errors.length > 0) {
        addToast(`ติดตั้งล้มเหลว ${errors.length} ไฟล์`, 'error');
      }

      // Reload installed items
      if (showInstalled) {
        loadInstalledItems();
      }
    } catch (err) {
      let errMsg = `ผิดพลาด: ${err.message || String(err)}`;
      if (!isElectron && err.name === 'TypeError' && err.message.includes('fetch')) {
        errMsg = 'ไม่สามารถเชื่อมต่อ backend\nกรุณารัน backend ที่ port 3000';
      }
      setSoundStatus({ kind: 'err', message: errMsg });
      addToast(errMsg, 'error');
    } finally {
      setIsSoundInstalling(false);
      setSoundInstallProgress(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) {
      setStatus({ kind: 'err', message: 'กรุณาเลือกไฟล์ zip' });
      return;
    }

    setIsInstalling(true);
    setInstallProgress({ current: 0, total: files.length, fileName: '', percent: 0 });
    setStatus({ kind: 'work', message: `กำลังติดตั้ง... (0/${files.length})` });

    const results = [];
    const errors = [];
    const warnings = [];

    try {
      if (isElectron) {
        setStatus({ kind: 'work', message: `กำลังติดตั้ง... (${files.length} ไฟล์)` });
        
        const filesData = files.map(f => ({
          name: f.name,
          path: window.electronAPI.getFilePath(f),
        }));

        const data = await window.electronAPI.installSkins({
          files: filesData,
          dest: skinDest,
          force: force,
        });

        if (data.results) {
          data.results.forEach(r => {
            if (r.warnings) {
              r.warnings.forEach(w => warnings.push({ file: r.file, warning: w }));
            }
            results.push({ file: r.file, installedPath: r.installedPath });
          });
        }
        if (data.errors) {
          data.errors.forEach(e => errors.push(e));
        }
      } else {
        for (let i = 0; i < files.length; i++) {
          const zip = files[i];
          setInstallProgress({
            current: i + 1,
            total: files.length,
            fileName: zip.name,
            percent: Math.round(((i + 1) / files.length) * 100),
          });
          setStatus({ kind: 'work', message: `กำลังติดตั้ง... (${i + 1}/${files.length})\n${zip.name}` });

          const fd = new FormData();
          fd.append('zip', zip);
          fd.append('dest', skinDest);
          fd.append('force', force ? 'true' : 'false');

          const resp = await fetch('/api/install', { method: 'POST', body: fd });
          
          if (!resp.ok) {
            const data = await resp.json().catch(() => null);
            const msg = data?.error || `HTTP ${resp.status}`;
            errors.push({ file: zip.name, error: msg });
            continue;
          }

          const data = await resp.json().catch(() => null);
          if (!data) {
            errors.push({ file: zip.name, error: 'Backend ตอบกลับมาผิดรูปแบบ' });
            continue;
          }

          if (data && Array.isArray(data.warnings) && data.warnings.length) {
            data.warnings.forEach(w => warnings.push({ file: zip.name, warning: String(w) }));
          }

          results.push({ file: zip.name, installedPath: data.installedPath });
        }
      }

      // Build result message
      const lines = [];
      if (results.length) {
        lines.push(`✅ สำเร็จ: ${results.length}/${files.length}`);
        results.forEach(r => {
          lines.push(`• ${r.file}`);
        });
      }
      if (errors.length) {
        lines.push('');
        lines.push(`❌ ล้มเหลว: ${errors.length}/${files.length}`);
        errors.forEach(er => {
          lines.push(`• ${er.file}: ${er.error}`);
        });
      }
      if (warnings.length) {
        lines.push('');
        lines.push(`⚠️ คำเตือน: ${warnings.length}`);
        warnings.forEach(w => {
          lines.push(`• ${w.file}: ${w.warning}`);
        });
      }

      const finalKind = errors.length === 0 ? 'ok' : (results.length === 0 ? 'err' : 'work');
      setStatus({ kind: finalKind, message: lines.join('\n') });

      // Show toast
      if (results.length > 0) {
        addToast(`ติดตั้งสกินสำเร็จ ${results.length} ไฟล์`, 'success');
      }
      if (errors.length > 0) {
        addToast(`ติดตั้งล้มเหลว ${errors.length} ไฟล์`, 'error');
      }

      // Reload installed items
      if (showInstalled) {
        loadInstalledItems();
      }
    } catch (err) {
      let errMsg = `ผิดพลาด: ${err.message || String(err)}`;
      if (!isElectron && err.name === 'TypeError' && err.message.includes('fetch')) {
        errMsg = 'ไม่สามารถเชื่อมต่อ backend\nกรุณารัน backend ที่ port 3000';
      }
      setStatus({ kind: 'err', message: errMsg });
      addToast(errMsg, 'error');
    } finally {
      setIsInstalling(false);
      setInstallProgress(null);
    }
  };

  return (
    <div className="wrap">
      {/* Toast Container */}
      <div className="toast-container">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>

      <div className="card">
        <div className="header">
          <img src="./wt-logo.png" alt="War Thunder" className="logo" />
          <div className="header-text">
            <h1>War Thunder Auto Skin</h1>
            <p className="muted">
              {isElectron ? 'Desktop App' : 'Local Web App'} สำหรับติดตั้ง Skins และ Sound Mods
            </p>
          </div>
          <button 
            className={`manage-btn ${showInstalled ? 'active' : ''}`}
            onClick={() => setShowInstalled(!showInstalled)}
          >
            📋 จัดการที่ติดตั้งแล้ว
          </button>
        </div>

        {/* Game Folder Settings */}
        <div className="settings-panel">
          <div className="settings-header">
            <span className="settings-icon">⚙️</span>
            <span className="settings-title">ตั้งค่าโฟลเดอร์เกม</span>
            {isValidating ? (
              <span className="validation-status checking">⏳ กำลังตรวจสอบ...</span>
            ) : gameFolderValid?.valid ? (
              <span className="validation-status valid">✅ ถูกต้อง</span>
            ) : gameFolderValid?.valid === false ? (
              <span className="validation-status invalid">❌ ไม่ถูกต้อง</span>
            ) : null}
          </div>
          <div className="settings-body">
            <div className="dest-row">
              <input
                type="text"
                value={gameFolder}
                onChange={(e) => setGameFolder(e.target.value)}
                placeholder="เลือกโฟลเดอร์เกม War Thunder"
              />
              <button 
                type="button" 
                className="browse-btn" 
                onClick={handleAutoDetect}
                disabled={isAutoDetecting}
                title="ค้นหาอัตโนมัติ"
              >
                {isAutoDetecting ? '⏳' : '🔍'} ค้นหา
              </button>
              <button type="button" className="browse-btn" onClick={handleBrowseGameFolder}>
                📂 เลือก
              </button>
            </div>
            {gameFolderValid?.valid === false && gameFolderValid?.message && (
              <div className="validation-error">
                ⚠️ {gameFolderValid.message}
              </div>
            )}
            <div className="path-info">
              <div className="path-item">
                <span className="path-label">📁 สกิน:</span>
                <span className="path-value">{skinDest}</span>
                <button 
                  className="open-path-btn" 
                  onClick={() => handleOpenFolder(skinDest)}
                  title="เปิดโฟลเดอร์"
                >
                  📂
                </button>
              </div>
              <div className="path-item">
                <span className="path-label">🔊 เสียง:</span>
                <span className="path-value">{soundDest}</span>
                <button 
                  className="open-path-btn" 
                  onClick={() => handleOpenFolder(soundDest)}
                  title="เปิดโฟลเดอร์"
                >
                  📂
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Installed Items Panel */}
        {showInstalled && (
          <div className="installed-panel">
            <div className="installed-header">
              <span>📋 รายการที่ติดตั้งแล้ว</span>
              <button 
                className="refresh-btn" 
                onClick={loadInstalledItems}
                disabled={isLoadingInstalled}
              >
                {isLoadingInstalled ? '⏳' : '🔄'} รีเฟรช
              </button>
            </div>
            <div className="installed-content">
              <div className="installed-section">
                <div className="installed-section-header">
                  🎨 สกิน ({installedSkins.length})
                </div>
                <div className="installed-list">
                  {isLoadingInstalled ? (
                    <div className="loading">⏳ กำลังโหลด...</div>
                  ) : installedSkins.length === 0 ? (
                    <div className="empty">ยังไม่มีสกินที่ติดตั้ง</div>
                  ) : (
                    installedSkins.map((skin, i) => (
                      <InstalledItem
                        key={i}
                        item={skin}
                        type="skin"
                        onDelete={handleDeleteSkin}
                        onOpenFolder={handleOpenFolder}
                      />
                    ))
                  )}
                </div>
              </div>
              <div className="installed-section">
                <div className="installed-section-header">
                  🔊 Sound Mods ({installedSoundMods.length})
                </div>
                <div className="installed-list">
                  {isLoadingInstalled ? (
                    <div className="loading">⏳ กำลังโหลด...</div>
                  ) : installedSoundMods.length === 0 ? (
                    <div className="empty">ยังไม่มี sound mod ที่ติดตั้ง</div>
                  ) : (
                    installedSoundMods.map((mod, i) => (
                      <InstalledItem
                        key={i}
                        item={mod}
                        type="sound"
                        onDelete={handleDeleteSoundMod}
                        onOpenFolder={handleOpenFolder}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="tabs">
          <button
            type="button"
            className={`tab ${activeTab === 'skin' ? 'active' : ''}`}
            onClick={() => setActiveTab('skin')}
          >
            🎨 ติดตั้งสกิน
          </button>
          <button
            type="button"
            className={`tab ${activeTab === 'sound' ? 'active' : ''}`}
            onClick={() => setActiveTab('sound')}
          >
            🔊 ติดตั้งแพ็คเสียง
          </button>
        </div>

        <div className="main">
          {activeTab === 'skin' && (
          <>
          <div className="panel">
            <div className="panel-head">ติดตั้งสกิน</div>
            <div className="panel-body">
              <form onSubmit={handleSubmit}>
                <label>ไฟล์ zip</label>
                <div
                  className={`drop ${isDragging ? 'active' : ''}`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".zip"
                    multiple
                    required
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  <div className="drop-content">
                    <div className="drop-icon">📁</div>
                    <div className="drop-text">คลิกเพื่อเลือกไฟล์ หรือ ลากไฟล์มาวางที่นี่</div>
                    <div className="drop-hint">รองรับไฟล์ .zip หลายไฟล์พร้อมกัน</div>
                  </div>
                </div>

                {files.length > 0 && (
                  <div className="file-list">
                    <div className="file-list-header">
                      <span className="muted">เลือกแล้ว {files.length} ไฟล์</span>
                      <button type="button" className="clear-btn" onClick={handleClearFiles}>
                        ล้างทั้งหมด
                      </button>
                    </div>
                    {files.map((f, i) => (
                      <div key={i} className="file-item">{f.name}</div>
                    ))}
                  </div>
                )}

                <div className="hint">ติดตั้งทีละไฟล์ตามลำดับ • สูงสุด 50 ไฟล์</div>

                <div className="dest-display">
                  <span className="dest-label">📁 ติดตั้งไปที่:</span>
                  <span className="dest-path">{skinDest}</span>
                </div>

                {/* Progress Bar */}
                {installProgress && (
                  <ProgressBar {...installProgress} />
                )}

                <div className="actions">
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={force}
                      onChange={(e) => setForce(e.target.checked)}
                    />
                    Force overwrite
                  </label>
                  <button type="submit" disabled={isInstalling || !gameFolderValid?.valid}>
                    {isInstalling ? 'กำลังติดตั้ง...' : 'Install'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="panel status">
            <div className="panel-head">
              <span>ผลลัพธ์</span>
              <span className={`badge ${status.kind}`}>
                {status.kind === 'ok' ? 'Success' : status.kind === 'err' ? 'Error' : status.kind === 'work' ? 'Working' : 'Ready'}
              </span>
            </div>
            <pre>{status.message}</pre>
          </div>
          </>
          )}

          {activeTab === 'sound' && (
          <>
          <div className="panel">
            <div className="panel-head">ติดตั้งแพ็คเสียง (Sound Mod)</div>
            <div className="panel-body">
              <form onSubmit={handleSoundSubmit}>
                <label>ไฟล์ zip แพ็คเสียง</label>
                <div
                  className={`drop ${isSoundDragging ? 'active' : ''}`}
                  onDrop={handleSoundDrop}
                  onDragOver={handleSoundDragOver}
                  onDragLeave={handleSoundDragLeave}
                  onClick={() => soundFileInputRef.current?.click()}
                >
                  <input
                    ref={soundFileInputRef}
                    type="file"
                    accept=".zip"
                    multiple
                    required
                    onChange={handleSoundFileChange}
                    style={{ display: 'none' }}
                  />
                  <div className="drop-content">
                    <div className="drop-icon">🔊</div>
                    <div className="drop-text">คลิกเพื่อเลือกไฟล์ หรือ ลากไฟล์มาวางที่นี่</div>
                    <div className="drop-hint">รองรับไฟล์ .zip หลายไฟล์พร้อมกัน</div>
                  </div>
                </div>

                {soundFiles.length > 0 && (
                  <div className="file-list">
                    <div className="file-list-header">
                      <span className="muted">เลือกแล้ว {soundFiles.length} ไฟล์</span>
                      <button type="button" className="clear-btn" onClick={handleClearSoundFiles}>
                        ล้างทั้งหมด
                      </button>
                    </div>
                    {soundFiles.map((f, i) => (
                      <div key={i} className="file-item sound-item">{f.name}</div>
                    ))}
                  </div>
                )}

                <div className="hint">แตกไฟล์ sound mod ลงใน folder mod ของเกม</div>

                <div className="dest-display">
                  <span className="dest-label">🔊 ติดตั้งไปที่:</span>
                  <span className="dest-path">{soundDest}</span>
                </div>
                <div className="hint">หากยังไม่มี folder mod ระบบจะสร้างให้อัตโนมัติ</div>

                <div className="config-section">
                  <div className={`config-status ${soundModEnabled === true ? 'enabled' : soundModEnabled === false ? 'disabled' : 'checking'}`}>
                    <div className="config-status-icon">
                      {soundModEnabled === true ? '✅' : soundModEnabled === false ? '❌' : '⏳'}
                    </div>
                    <div className="config-status-text">
                      {soundModEnabled === true 
                        ? 'Sound mod เปิดใช้งานแล้วใน config.blk' 
                        : soundModEnabled === false 
                        ? 'Sound mod ยังไม่เปิดใช้งานใน config.blk'
                        : 'กำลังตรวจสอบ...'}
                    </div>
                    {soundModEnabled === false && (
                      <button 
                        type="button" 
                        className="enable-btn"
                        onClick={handleEnableSoundMod}
                        disabled={isEnablingConfig}
                      >
                        {isEnablingConfig ? 'กำลังแก้ไข...' : '🔧 เปิดใช้งานอัตโนมัติ'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                {soundInstallProgress && (
                  <ProgressBar {...soundInstallProgress} />
                )}

                <div className="actions">
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={soundForce}
                      onChange={(e) => setSoundForce(e.target.checked)}
                    />
                    Force overwrite
                  </label>
                  <button type="submit" disabled={isSoundInstalling || !gameFolderValid?.valid}>
                    {isSoundInstalling ? 'กำลังติดตั้ง...' : 'Install'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="panel status">
            <div className="panel-head">
              <span>ผลลัพธ์</span>
              <span className={`badge ${soundStatus.kind}`}>
                {soundStatus.kind === 'ok' ? 'Success' : soundStatus.kind === 'err' ? 'Error' : soundStatus.kind === 'work' ? 'Working' : 'Ready'}
              </span>
            </div>
            <pre>{soundStatus.message}</pre>
          </div>
          </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
