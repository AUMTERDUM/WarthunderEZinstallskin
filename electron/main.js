const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const fsp = fs.promises;

// Import shared utilities
const { installZip, installSoundMod, exists } = require('../src/lib/zipUtils');
const { checkSoundModStatus, enableSoundMod } = require('../src/lib/configUtils');
const { applyCustomKillMessage } = require('../src/lib/killMessageUtils');
const { 
  validateGameFolder, 
  autoDetectGameFolder, 
  listInstalledSkins, 
  listInstalledSoundMods,
  deleteSkin,
  deleteSoundMod,
} = require('../src/lib/gameDetector');
const { 
  getStatistics, 
  createBackup, 
  restoreBackup, 
  formatBytes,
} = require('../src/lib/backupUtils');

// Determine if we're in development mode
const distPath = path.join(__dirname, '../dist/index.html');
const hasDistBuild = fs.existsSync(distPath);
const isDev = process.env.ELECTRON_DEV === 'true' || (!app.isPackaged && !hasDistBuild);

// Default paths
const DEFAULT_GAME_FOLDER = String.raw`C:\Program Files (x86)\Steam\steamapps\common\War Thunder`;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 750,
    minWidth: 700,
    minHeight: 550,
    icon: path.join(__dirname, '../public/wt-logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    autoHideMenuBar: true,
    title: 'War Thunder Auto Skin Installer',
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

(async () => {
  await app.whenReady();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
})();

// =====================
// IPC Handlers
// =====================

// Browse for folder
ipcMain.handle('browse-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'เลือกโฟลเดอร์เกม War Thunder',
  });

  if (result.canceled || !result.filePaths[0]) {
    return { ok: false, error: 'ยกเลิกการเลือกโฟลเดอร์' };
  }

  return { ok: true, path: result.filePaths[0] };
});

// Browse for .blk file
ipcMain.handle('browse-blk-file', async (event, { gameFolder, title, defaultPath } = {}) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      title: title || 'Select .blk file',
      defaultPath: defaultPath ? path.resolve(String(defaultPath)) : undefined,
      filters: [{ name: 'BLK Files', extensions: ['blk'] }],
    });

    if (result.canceled || !result.filePaths[0]) {
      return { ok: false, error: 'ยกเลิกการเลือกไฟล์' };
    }

    const absolutePath = result.filePaths[0];
    const root = gameFolder ? path.resolve(String(gameFolder)) : null;

    let selectedPath = absolutePath;
    let isRelative = false;

    if (root) {
      const relative = path.relative(root, absolutePath);
      const isInsideRoot = relative && !relative.startsWith('..') && !path.isAbsolute(relative);
      if (isInsideRoot) {
        selectedPath = relative;
        isRelative = true;
      }
    }

    return { ok: true, selectedPath, absolutePath, isRelative };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
});

// Auto-detect game folder
ipcMain.handle('auto-detect-game', async () => {
  return await autoDetectGameFolder();
});

// Validate game folder
ipcMain.handle('validate-game-folder', async (event, { gameFolder }) => {
  return await validateGameFolder(gameFolder);
});

// Install skin zip files
ipcMain.handle('install-skins', async (event, { files, dest, force, onProgress }) => {
  try {
    const destResolved = path.resolve(dest);
    await fsp.mkdir(destResolved, { recursive: true });

    const results = [];
    const errors = [];
    const total = files.length;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const originalName = file.name;
      const filePath = file.path;

      // Send progress update
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('install-progress', {
          current: i + 1,
          total,
          file: originalName,
          percent: Math.round(((i + 1) / total) * 100),
        });
      }

      try {
        if (!originalName.toLowerCase().endsWith('.zip')) {
          throw new Error('File must be .zip');
        }
        const result = await installZip(filePath, originalName, destResolved, force);
        results.push({ file: originalName, ...result });
      } catch (e) {
        errors.push({ file: originalName, error: e.message || String(e) });
      }
    }

    return { ok: true, results, errors, usedDestinationRoot: destResolved };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
});

// Install sound mod zip files
ipcMain.handle('install-sound', async (event, { files, dest, force }) => {
  try {
    const destResolved = path.resolve(dest);
    await fsp.mkdir(destResolved, { recursive: true });

    const results = [];
    const errors = [];
    const total = files.length;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const originalName = file.name;
      const filePath = file.path;

      // Send progress update
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('install-progress', {
          current: i + 1,
          total,
          file: originalName,
          percent: Math.round(((i + 1) / total) * 100),
        });
      }

      try {
        if (!originalName.toLowerCase().endsWith('.zip')) {
          throw new Error('File must be .zip');
        }
        const result = await installSoundMod(filePath, originalName, destResolved, force);
        results.push({ file: originalName, ...result });
      } catch (e) {
        errors.push({ file: originalName, error: e.message || String(e) });
      }
    }

    return { ok: true, results, errors, usedDestinationRoot: destResolved };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
});

// Check sound mod status
ipcMain.handle('check-sound-mod', async (event, { gameFolder }) => {
  return await checkSoundModStatus(gameFolder || DEFAULT_GAME_FOLDER);
});

// Enable sound mod in config.blk
ipcMain.handle('enable-sound-mod', async (event, { gameFolder }) => {
  return await enableSoundMod(gameFolder || DEFAULT_GAME_FOLDER);
});

// List installed skins
ipcMain.handle('list-installed-skins', async (event, { gameFolder }) => {
  return await listInstalledSkins(gameFolder || DEFAULT_GAME_FOLDER);
});

// List installed sound mods
ipcMain.handle('list-installed-sound-mods', async (event, { gameFolder }) => {
  return await listInstalledSoundMods(gameFolder || DEFAULT_GAME_FOLDER);
});

// Delete skin
ipcMain.handle('delete-skin', async (event, { skinPath }) => {
  return await deleteSkin(skinPath);
});

// Delete sound mod
ipcMain.handle('delete-sound-mod', async (event, { soundModPath }) => {
  return await deleteSoundMod(soundModPath);
});

// Get statistics
ipcMain.handle('get-statistics', async (event, { gameFolder }) => {
  return await getStatistics(gameFolder || DEFAULT_GAME_FOLDER);
});

// Create backup
ipcMain.handle('create-backup', async (event, { gameFolder, includeSkins, includeSoundMods }) => {
  try {
    // Show save dialog
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'บันทึกไฟล์สำรอง',
      defaultPath: `WT_Backup_${new Date().toISOString().slice(0,10)}.zip`,
      filters: [{ name: 'Zip Files', extensions: ['zip'] }],
    });

    if (result.canceled || !result.filePath) {
      return { ok: false, error: 'ยกเลิกการสำรอง' };
    }

    return await createBackup(
      gameFolder || DEFAULT_GAME_FOLDER, 
      result.filePath, 
      { includeSkins, includeSoundMods }
    );
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// Restore backup
ipcMain.handle('restore-backup', async (event, { gameFolder, overwrite }) => {
  try {
    // Show open dialog
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'เลือกไฟล์สำรอง',
      filters: [{ name: 'Zip Files', extensions: ['zip'] }],
      properties: ['openFile'],
    });

    if (result.canceled || !result.filePaths[0]) {
      return { ok: false, error: 'ยกเลิกการกู้คืน' };
    }

    return await restoreBackup(
      result.filePaths[0], 
      gameFolder || DEFAULT_GAME_FOLDER, 
      { overwrite }
    );
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// Open folder in explorer
ipcMain.handle('open-folder', async (event, folderPath) => {
  try {
    await shell.openPath(folderPath);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// Apply custom kill message
ipcMain.handle('apply-kill-message', async (event, { gameFolder, message, keys }) => {
  return await applyCustomKillMessage(gameFolder || DEFAULT_GAME_FOLDER, message, keys);
});

// Ping (for compatibility)
ipcMain.handle('ping', async () => {
  return { ok: true };
});
