import { useState, useRef, useEffect } from 'react';
import './App.css';

const DEFAULT_GAME_FOLDER = 'F:\\SteamLibrary\\steamapps\\common\\War Thunder';
const GAME_FOLDER_KEY = 'wt_auto_skin_game_folder_v1';

function App() {
  const [activeTab, setActiveTab] = useState('skin'); // 'skin' or 'sound'
  const [files, setFiles] = useState([]);
  const [force, setForce] = useState(false);
  const [status, setStatus] = useState({ kind: 'ready', message: 'พร้อมใช้งาน' });
  const [isInstalling, setIsInstalling] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Sound Pack states
  const [soundFiles, setSoundFiles] = useState([]);
  const [soundForce, setSoundForce] = useState(false);
  const [soundStatus, setSoundStatus] = useState({ kind: 'ready', message: 'พร้อมใช้งาน' });
  const [isSoundInstalling, setIsSoundInstalling] = useState(false);
  const [isSoundDragging, setIsSoundDragging] = useState(false);
  const soundFileInputRef = useRef(null);

  // Game folder and config states
  const [gameFolder, setGameFolder] = useState(() => {
    try {
      return localStorage.getItem(GAME_FOLDER_KEY) || DEFAULT_GAME_FOLDER;
    } catch {
      return DEFAULT_GAME_FOLDER;
    }
  });
  const [soundModEnabled, setSoundModEnabled] = useState(null); // null = checking, true/false = status
  const [isEnablingConfig, setIsEnablingConfig] = useState(false);

  // Computed paths from game folder
  const skinDest = gameFolder + '\\UserSkins';
  const soundDest = gameFolder + '\\sound\\mod';

  useEffect(() => {
    try {
      localStorage.setItem(GAME_FOLDER_KEY, gameFolder);
    } catch {}
  }, [gameFolder]);

  // Check sound mod status on mount and when game folder changes
  useEffect(() => {
    checkSoundModStatus();
  }, [gameFolder]);

  const checkSoundModStatus = async () => {
    try {
      const resp = await fetch(`/api/check-sound-mod?gameFolder=${encodeURIComponent(gameFolder)}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.ok) {
          setSoundModEnabled(data.enabled);
        }
      }
    } catch {
      setSoundModEnabled(false);
    }
  };

  const handleEnableSoundMod = async () => {
    setIsEnablingConfig(true);
    try {
      const resp = await fetch('/api/enable-sound-mod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameFolder })
      });
      const data = await resp.json();
      if (data.ok) {
        setSoundModEnabled(true);
        setSoundStatus({ kind: 'ok', message: data.message });
      } else {
        setSoundStatus({ kind: 'err', message: data.error || 'ไม่สามารถแก้ไข config.blk' });
      }
    } catch (err) {
      setSoundStatus({ kind: 'err', message: `ผิดพลาด: ${err.message}` });
    } finally {
      setIsEnablingConfig(false);
    }
  };

  const handleBrowseGameFolder = async () => {
    try {
      const resp = await fetch('/api/browse-folder');
      if (!resp.ok) {
        alert(`ไม่สามารถเชื่อมต่อ backend (HTTP ${resp.status})`);
        return;
      }
      const data = await resp.json().catch(() => null);
      if (!data) {
        alert('Backend ตอบกลับมาผิดรูปแบบ');
        return;
      }
      if (data.ok && data.path) {
        setGameFolder(data.path);
      } else if (data.error) {
        if (!data.error.includes('ยกเลิก')) {
          alert(`ไม่สามารถเปิด folder picker: ${data.error}`);
        }
      }
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        alert('ไม่สามารถเชื่อมต่อ backend');
      } else {
        alert(`ผิดพลาด: ${err.message}`);
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
    setSoundStatus({ kind: 'work', message: `กำลังติดตั้ง... (0/${soundFiles.length})` });

    const results = [];
    const errors = [];
    const warnings = [];

    try {
      for (let i = 0; i < soundFiles.length; i++) {
        const zip = soundFiles[i];
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

      const lines = [];
      if (results.length) {
        lines.push(`สำเร็จ: ${results.length}/${soundFiles.length}`);
        results.forEach(r => {
          lines.push(`• ${r.file}`);
          lines.push(`  ติดตั้งที่: ${r.installedPath}`);
        });
      }
      if (errors.length) {
        lines.push('');
        lines.push(`ล้มเหลว: ${errors.length}/${soundFiles.length}`);
        errors.forEach(er => {
          lines.push(`• ${er.file}`);
          lines.push(`  เหตุผล: ${er.error}`);
        });
      }
      if (warnings.length) {
        lines.push('');
        lines.push(`คำเตือน: ${warnings.length}`);
        warnings.forEach(w => {
          lines.push(`• ${w.file}`);
          lines.push(`  ${w.warning}`);
        });
      }

      const finalKind = errors.length === 0 ? 'ok' : (results.length === 0 ? 'err' : 'work');
      setSoundStatus({ kind: finalKind, message: lines.join('\n') });
    } catch (err) {
      let errMsg = `ผิดพลาด: ${err.message || String(err)}`;
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        errMsg = 'ไม่สามารถเชื่อมต่อ backend\nกรุณารัน backend ที่ port 3000';
      }
      setSoundStatus({ kind: 'err', message: errMsg });
    } finally {
      setIsSoundInstalling(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) {
      setStatus({ kind: 'err', message: 'กรุณาเลือกไฟล์ zip' });
      return;
    }

    setIsInstalling(true);
    setStatus({ kind: 'work', message: `กำลังติดตั้ง... (0/${files.length})` });

    const results = [];
    const errors = [];
    const warnings = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const zip = files[i];
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

      const lines = [];
      if (results.length) {
        lines.push(`สำเร็จ: ${results.length}/${files.length}`);
        results.forEach(r => {
          lines.push(`• ${r.file}`);
          lines.push(`  ติดตั้งที่: ${r.installedPath}`);
        });
      }
      if (errors.length) {
        lines.push('');
        lines.push(`ล้มเหลว: ${errors.length}/${files.length}`);
        errors.forEach(er => {
          lines.push(`• ${er.file}`);
          lines.push(`  เหตุผล: ${er.error}`);
        });
      }
      if (warnings.length) {
        lines.push('');
        lines.push(`คำเตือน: ${warnings.length}`);
        warnings.forEach(w => {
          lines.push(`• ${w.file}`);
          lines.push(`  ${w.warning}`);
        });
      }

      const finalKind = errors.length === 0 ? 'ok' : (results.length === 0 ? 'err' : 'work');
      setStatus({ kind: finalKind, message: lines.join('\n') });
    } catch (err) {
      let errMsg = `ผิดพลาด: ${err.message || String(err)}`;
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        errMsg = 'ไม่สามารถเชื่อมต่อ backend\nกรุณารัน backend ที่ port 3000:\n\ncd webapp\nnpm start';
      }
      setStatus({ kind: 'err', message: errMsg });
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div className="wrap">
      <div className="card">
        <div className="header">
          <img src="/wt-logo.png" alt="War Thunder" className="logo" />
          <h1>War Thunder Auto Skin</h1>
          <p className="muted">Local web app สำหรับติดตั้ง Skins และ Sound Mods</p>
        </div>

        {/* Game Folder Settings */}
        <div className="settings-panel">
          <div className="settings-header">
            <span className="settings-icon">⚙️</span>
            <span className="settings-title">ตั้งค่าโฟลเดอร์เกม</span>
          </div>
          <div className="settings-body">
            <div className="dest-row">
              <input
                type="text"
                value={gameFolder}
                onChange={(e) => setGameFolder(e.target.value)}
                placeholder="เลือกโฟลเดอร์เกม War Thunder"
              />
              <button type="button" className="browse-btn" onClick={handleBrowseGameFolder}>
                📂 เลือก
              </button>
            </div>
            <div className="path-info">
              <div className="path-item">
                <span className="path-label">📁 สกิน:</span>
                <span className="path-value">{skinDest}</span>
              </div>
              <div className="path-item">
                <span className="path-label">🔊 เสียง:</span>
                <span className="path-value">{soundDest}</span>
              </div>
            </div>
          </div>
        </div>

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

                <div className="actions">
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={force}
                      onChange={(e) => setForce(e.target.checked)}
                    />
                    Force overwrite
                  </label>
                  <button type="submit" disabled={isInstalling}>
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

                <div className="actions">
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={soundForce}
                      onChange={(e) => setSoundForce(e.target.checked)}
                    />
                    Force overwrite
                  </label>
                  <button type="submit" disabled={isSoundInstalling}>
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
