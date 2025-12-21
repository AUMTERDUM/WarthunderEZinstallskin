import { useState, useRef, useEffect } from 'react';
import './App.css';

const DEFAULT_DEST = 'F:\\SteamLibrary\\steamapps\\common\\War Thunder\\UserSkins';
const DEST_KEY = 'wt_auto_skin_dest_v1';

function App() {
  const [files, setFiles] = useState([]);
  const [dest, setDest] = useState(() => {
    try {
      return localStorage.getItem(DEST_KEY) || DEFAULT_DEST;
    } catch {
      return DEFAULT_DEST;
    }
  });
  const [force, setForce] = useState(false);
  const [status, setStatus] = useState({ kind: 'ready', message: 'พร้อมใช้งาน' });
  const [isInstalling, setIsInstalling] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(DEST_KEY, dest);
    } catch {}
  }, [dest]);

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

  const handleBrowseFolder = async () => {
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
        setDest(data.path);
      } else if (data.error) {
        if (data.error.includes('ยกเลิก')) {
          // User cancelled, do nothing
        } else {
          alert(`ไม่สามารถเปิด folder picker: ${data.error}`);
        }
      }
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        alert('ไม่สามารถเชื่อมต่อ backend\nกรุณาตรวจสอบว่า backend กำลังรันอยู่');
      } else {
        alert(`ผิดพลาด: ${err.message}`);
      }
    }
  };

  const handleClearFiles = () => {
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleResetDest = () => {
    setDest(DEFAULT_DEST);
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
        fd.append('dest', dest);
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
          <p className="muted">Local web app สำหรับติดตั้ง UserSkins จากไฟล์ .zip</p>
        </div>

        <div className="main">
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

                <label>โฟลเดอร์ปลายทาง (UserSkins)</label>
                <div className="dest-row">
                  <input
                    type="text"
                    value={dest}
                    onChange={(e) => setDest(e.target.value)}
                  />
                  <button type="button" className="browse-btn" onClick={handleBrowseFolder}>
                    📂 เลือก
                  </button>
                </div>
                <div className="hint">ถ้าเกมอยู่ไดรฟ์อื่น ให้แก้พาธตรงนี้ หรือกดปุ่มเลือกโฟลเดอร์</div>

                <div className="actions">
                  <button type="button" className="secondary" onClick={handleResetDest}>
                    ใช้พาธมาตรฐาน
                  </button>
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
        </div>
      </div>
    </div>
  );
}

export default App;
