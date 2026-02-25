/**
 * Unified API Layer
 * Abstracts Electron IPC / Web fetch so callers don't need if/else everywhere.
 */

const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

// Base URL for web mode – uses Vite proxy in dev, relative path in production
const API_BASE = import.meta.env.VITE_API_BASE || '';

/**
 * Generic fetch wrapper with error handling
 */
async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  try {
    const res = await fetch(url, options);
    const data = await res.json();
    return data;
  } catch (err) {
    console.error(`[api] ${path} failed:`, err);
    throw new Error(err.message || 'Network error');
  }
}

// =====================
// Exported API methods
// =====================

export async function autoDetectGame() {
  if (isElectron) {
    return window.electronAPI.autoDetectGame();
  }
  return apiFetch('/api/auto-detect-game');
}

export async function validateGameFolder(gameFolder) {
  if (isElectron) {
    return window.electronAPI.validateGameFolder({ gameFolder });
  }
  return apiFetch(`/api/validate-game-folder?gameFolder=${encodeURIComponent(gameFolder)}`);
}

export async function browseFolder() {
  if (isElectron) {
    return window.electronAPI.browseFolder();
  }
  return apiFetch('/api/browse-folder');
}

export async function checkSoundMod(gameFolder) {
  if (isElectron) {
    return window.electronAPI.checkSoundMod({ gameFolder });
  }
  return apiFetch(`/api/check-sound-mod?gameFolder=${encodeURIComponent(gameFolder)}`);
}

export async function enableSoundMod(gameFolder) {
  if (isElectron) {
    return window.electronAPI.enableSoundMod({ gameFolder });
  }
  return apiFetch('/api/enable-sound-mod', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gameFolder }),
  });
}

export async function installFiles(files, dest, force, type = 'skin') {
  if (isElectron) {
    const filesData = await Promise.all(
      files.map(async (file) => ({
        name: file.name,
        path: window.electronAPI.getFilePath(file),
      }))
    );

    return type === 'skin'
      ? window.electronAPI.installSkins({ files: filesData, dest, force })
      : window.electronAPI.installSound({ files: filesData, dest, force });
  }

  const formData = new FormData();
  files.forEach((file) => formData.append('zip', file));
  formData.append('dest', dest);
  formData.append('force', force);

  const endpoint = type === 'skin' ? '/api/install' : '/api/install-sound';
  return apiFetch(endpoint, { method: 'POST', body: formData });
}

export async function listInstalledSkins(gameFolder) {
  if (isElectron) {
    return window.electronAPI.listInstalledSkins({ gameFolder });
  }
  return apiFetch(`/api/list-installed-skins?gameFolder=${encodeURIComponent(gameFolder)}`);
}

export async function listInstalledSoundMods(gameFolder) {
  if (isElectron) {
    return window.electronAPI.listInstalledSoundMods({ gameFolder });
  }
  return apiFetch(`/api/list-installed-sound-mods?gameFolder=${encodeURIComponent(gameFolder)}`);
}

export async function deleteSkin(skinPath) {
  if (isElectron) {
    return window.electronAPI.deleteSkin({ skinPath });
  }
  return apiFetch('/api/delete-skin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ skinPath }),
  });
}

export async function deleteSoundMod(soundModPath) {
  if (isElectron) {
    return window.electronAPI.deleteSoundMod({ soundModPath });
  }
  return apiFetch('/api/delete-sound-mod', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ soundModPath }),
  });
}

export async function applyKillMessage(gameFolder, message) {
  if (isElectron) {
    return window.electronAPI.applyKillMessage({ gameFolder, message });
  }
  return apiFetch('/api/apply-kill-message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gameFolder, message }),
  });
}

export async function getStatistics(gameFolder) {
  if (isElectron) {
    return window.electronAPI.getStatistics({ gameFolder });
  }
  return apiFetch(`/api/statistics?gameFolder=${encodeURIComponent(gameFolder)}`);
}

export async function createBackup(gameFolder, options) {
  if (isElectron) {
    return window.electronAPI.createBackup({ gameFolder, ...options });
  }
  // Backup not available in web mode
  return { ok: false, error: 'Backup is only available in Desktop App' };
}

export async function restoreBackup(gameFolder, options) {
  if (isElectron) {
    return window.electronAPI.restoreBackup({ gameFolder, ...options });
  }
  return { ok: false, error: 'Restore is only available in Desktop App' };
}

export async function openFolder(folderPath) {
  if (isElectron) {
    return window.electronAPI.openFolder(folderPath);
  }
  return { ok: false, error: 'Open folder is only available in Desktop App' };
}

export function onInstallProgress(callback) {
  if (isElectron) {
    window.electronAPI.onInstallProgress(callback);
  }
}

export function removeInstallProgressListener() {
  if (isElectron) {
    window.electronAPI.removeInstallProgressListener();
  }
}

export { isElectron };
