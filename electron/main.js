const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;

// Import shared utilities
const { installZip, installSoundMod, exists } = require('../src/lib/zipUtils');
const { checkSoundModStatus, enableSoundMod } = require('../src/lib/configUtils');
const { 
  validateGameFolder, 
  autoDetectGameFolder, 
  listInstalledSkins, 
  listInstalledSoundMods,
  deleteSkin,
  deleteSoundMod,
} = require('../src/lib/gameDetector');

// Determine if we're in development mode
const distPath = path.join(__dirname, '../dist/index.html');
const hasDistBuild = fs.existsSync(distPath);
const isDev = process.env.ELECTRON_DEV === 'true' || (!app.isPackaged && !hasDistBuild);

// Default paths
const DEFAULT_GAME_FOLDER = 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\War Thunder';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 750,
    minWidth: 700,
    minHeight: 550,
    icon: path.join(__dirname, '../public/icon.png'),
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

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

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

// Open folder in explorer
ipcMain.handle('open-folder', async (event, folderPath) => {
  try {
    await shell.openPath(folderPath);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// Ping (for compatibility)
ipcMain.handle('ping', async () => {
  return { ok: true };
});
