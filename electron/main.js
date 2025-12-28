const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const os = require('os');
const yauzl = require('yauzl');

// Determine if we're in development mode
// Check if dist/index.html exists - if yes, use production mode
const distPath = path.join(__dirname, '../dist/index.html');
const hasDistBuild = fs.existsSync(distPath);
const isDev = process.env.ELECTRON_DEV === 'true' || (!app.isPackaged && !hasDistBuild);

// Default paths
const DEFAULT_GAME_FOLDER = 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\War Thunder';

// Safety limits (zip bomb mitigation)
const MAX_ZIP_ENTRIES = 5000;
const MAX_TOTAL_UNCOMPRESSED_BYTES = 1024 * 1024 * 1024; // 1 GiB
const MAX_SINGLE_ENTRY_UNCOMPRESSED_BYTES = 512 * 1024 * 1024; // 512 MiB

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 600,
    minHeight: 500,
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
    // In development, load from Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built files
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

// Install skin zip files
ipcMain.handle('install-skins', async (event, { files, dest, force }) => {
  try {
    const destResolved = path.resolve(dest);
    await fsp.mkdir(destResolved, { recursive: true });

    const results = [];
    const errors = [];

    for (const file of files) {
      const originalName = file.name;
      const filePath = file.path;

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

    for (const file of files) {
      const originalName = file.name;
      const filePath = file.path;

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
  try {
    const configPath = path.join(gameFolder || DEFAULT_GAME_FOLDER, 'config.blk');

    if (!(await exists(configPath))) {
      return { ok: true, exists: false, enabled: false };
    }

    const content = await fsp.readFile(configPath, 'utf8');
    const soundSectionRegex = /sound\s*\{([^}]*)\}/s;
    const soundMatch = content.match(soundSectionRegex);

    if (soundMatch) {
      const soundContent = soundMatch[1];
      const enabled = /enable_mod\s*:\s*b\s*=\s*yes/i.test(soundContent);
      return { ok: true, exists: true, enabled, configPath };
    }

    return { ok: true, exists: true, enabled: false, configPath };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
});

// Enable sound mod in config.blk
ipcMain.handle('enable-sound-mod', async (event, { gameFolder }) => {
  try {
    const gameFolderResolved = gameFolder || DEFAULT_GAME_FOLDER;
    const configPath = path.join(gameFolderResolved, 'config.blk');

    if (!(await exists(configPath))) {
      return {
        ok: false,
        error: `ไม่พบไฟล์ config.blk ที่ ${configPath}\nกรุณาตรวจสอบว่าโฟลเดอร์เกมถูกต้อง`,
      };
    }

    let content = await fsp.readFile(configPath, 'utf8');
    const soundSectionRegex = /sound\s*\{([^}]*)\}/s;
    const soundMatch = content.match(soundSectionRegex);

    if (soundMatch) {
      const soundContent = soundMatch[1];

      if (/enable_mod\s*:\s*b\s*=\s*yes/i.test(soundContent)) {
        return {
          ok: true,
          message: 'Sound mod เปิดใช้งานอยู่แล้ว',
          alreadyEnabled: true,
          configPath,
        };
      }

      if (/enable_mod\s*:\s*b\s*=\s*no/i.test(soundContent)) {
        const updatedSoundContent = soundContent.replace(
          /enable_mod\s*:\s*b\s*=\s*no/i,
          'enable_mod:b=yes'
        );
        content = content.replace(soundSectionRegex, `sound{${updatedSoundContent}}`);
      } else {
        const updatedSoundContent = soundContent.trimEnd() + '\n  enable_mod:b=yes\n';
        content = content.replace(soundSectionRegex, `sound{${updatedSoundContent}}`);
      }
    } else {
      content = content.trimEnd() + '\n\nsound{\n  fmod_sound_enable:b=yes\n  speakerMode:t="auto"\n  enable_mod:b=yes\n}\n';
    }

    // Backup original config
    const backupPath = configPath + '.backup';
    if (!(await exists(backupPath))) {
      await fsp.copyFile(configPath, backupPath);
    }

    await fsp.writeFile(configPath, content, 'utf8');

    // Create sound/mod folder if not exists
    const soundModFolder = path.join(gameFolderResolved, 'sound', 'mod');
    await fsp.mkdir(soundModFolder, { recursive: true });

    return {
      ok: true,
      message: 'เปิดใช้งาน Sound mod สำเร็จ!\nไฟล์ config.blk ถูกอัปเดตแล้ว\nสร้างโฟลเดอร์ sound\\mod แล้ว',
      configPath,
      backupPath,
      soundModFolder,
    };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
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

// Ping (for compatibility)
ipcMain.handle('ping', async () => {
  return { ok: true };
});

// =====================
// Helper Functions
// =====================

async function installZip(zipPath, originalName, destRoot, force) {
  const dest = path.resolve(destRoot);
  await fsp.mkdir(dest, { recursive: true });

  const { plan, warnings } = await buildInstallPlan(zipPath, originalName, dest);

  if (await exists(plan.installDir)) {
    if (!force) {
      throw new Error(`Destination already exists: ${plan.installDir} (enable Force overwrite)`);
    }
    await fsp.rm(plan.installDir, { recursive: true, force: true });
  }

  await fsp.mkdir(plan.installDir, { recursive: true });
  await extractZip(zipPath, plan);

  return {
    installedPath: plan.installDir,
    usedDestinationRoot: dest,
    warnings,
  };
}

async function installSoundMod(zipPath, originalName, destRoot, force) {
  const dest = path.resolve(destRoot);
  await fsp.mkdir(dest, { recursive: true });

  const warnings = [];
  let hasFmodBank = false;
  let entryCount = 0;
  let totalUncompressed = 0;

  await withZipFile(zipPath, (zip) => {
    return new Promise((resolve, reject) => {
      zip.on('entry', (entry) => {
        entryCount += 1;
        if (entryCount > MAX_ZIP_ENTRIES) {
          reject(new Error(`Zip มีจำนวนไฟล์มากเกินไป (>${MAX_ZIP_ENTRIES})`));
          return;
        }

        const raw = String(entry.fileName || '').replace(/\\/g, '/');
        if (!raw || raw.startsWith('__MACOSX/')) {
          zip.readEntry();
          return;
        }

        const uncompressed = Number(entry.uncompressedSize || 0);
        if (uncompressed > MAX_SINGLE_ENTRY_UNCOMPRESSED_BYTES) {
          reject(new Error(`ไฟล์ใน zip ใหญ่เกินไป: ${raw}`));
          return;
        }
        totalUncompressed += uncompressed;
        if (totalUncompressed > MAX_TOTAL_UNCOMPRESSED_BYTES) {
          reject(new Error(`ขนาดรวมหลังแตกใหญ่เกินไป`));
          return;
        }

        if (raw.toLowerCase().endsWith('.bank')) {
          hasFmodBank = true;
        }

        zip.readEntry();
      });

      zip.on('end', resolve);
      zip.on('error', reject);
      zip.readEntry();
    });
  });

  if (!hasFmodBank) {
    warnings.push('ไม่พบไฟล์ .bank ใน zip (อาจไม่ใช่ sound mod ของ War Thunder)');
  }

  await extractSoundMod(zipPath, dest, force);

  return {
    installedPath: dest,
    usedDestinationRoot: dest,
    warnings,
  };
}

async function extractSoundMod(zipPath, destDir, force) {
  const destDirResolved = path.resolve(destDir);
  let totalWritten = 0;

  await withZipFile(zipPath, (zip) => {
    return new Promise((resolve, reject) => {
      zip.on('entry', (entry) => {
        const raw = String(entry.fileName || '').replace(/\\/g, '/');
        if (!raw || raw.startsWith('__MACOSX/')) {
          zip.readEntry();
          return;
        }

        const isDir = raw.endsWith('/');
        const declared = Number(entry.uncompressedSize || 0);
        if (declared > MAX_SINGLE_ENTRY_UNCOMPRESSED_BYTES) {
          reject(new Error(`ไฟล์ใน zip ใหญ่เกินไป: ${raw}`));
          return;
        }
        totalWritten += declared;
        if (totalWritten > MAX_TOTAL_UNCOMPRESSED_BYTES) {
          reject(new Error(`ขนาดรวมหลังแตกใหญ่เกินไป`));
          return;
        }

        const parts = raw.split('/').filter(Boolean);
        const fileName = parts[parts.length - 1];

        if (!fileName || isDir) {
          zip.readEntry();
          return;
        }

        const outPath = safeResolveWithin(destDirResolved, fileName);
        if (!outPath) {
          reject(new Error(`Unsafe path in zip entry: ${raw}`));
          return;
        }

        fsp.access(outPath)
          .then(() => {
            if (!force) {
              reject(new Error(`ไฟล์มีอยู่แล้ว: ${fileName} (เปิด Force overwrite เพื่อเขียนทับ)`));
              return;
            }
            return extractEntry();
          })
          .catch(() => extractEntry());

        function extractEntry() {
          zip.openReadStream(entry, (err, readStream) => {
            if (err) {
              reject(err);
              return;
            }
            const writeStream = fs.createWriteStream(outPath);
            readStream.on('error', reject);
            writeStream.on('error', reject);
            writeStream.on('close', () => {
              zip.readEntry();
            });
            readStream.pipe(writeStream);
          });
        }
      });

      zip.on('end', resolve);
      zip.on('error', reject);
      zip.readEntry();
    });
  });
}

async function buildInstallPlan(zipPath, originalName, destRoot) {
  const topLevels = new Set();
  let hasRootFiles = false;
  let rootFileSamples = [];
  let hasBlk = false;
  let entryCount = 0;
  let totalUncompressed = 0;

  await withZipFile(zipPath, (zip) => {
    return new Promise((resolve, reject) => {
      zip.on('entry', (entry) => {
        entryCount += 1;
        if (entryCount > MAX_ZIP_ENTRIES) {
          reject(new Error(`Zip มีจำนวนไฟล์มากเกินไป (>${MAX_ZIP_ENTRIES})`));
          return;
        }

        const raw = String(entry.fileName || '').replace(/\\/g, '/');
        if (!raw || raw.startsWith('__MACOSX/')) {
          zip.readEntry();
          return;
        }

        const uncompressed = Number(entry.uncompressedSize || 0);
        if (uncompressed > MAX_SINGLE_ENTRY_UNCOMPRESSED_BYTES) {
          reject(new Error(`ไฟล์ใน zip ใหญ่เกินไป (>${MAX_SINGLE_ENTRY_UNCOMPRESSED_BYTES} bytes): ${raw}`));
          return;
        }
        totalUncompressed += uncompressed;
        if (totalUncompressed > MAX_TOTAL_UNCOMPRESSED_BYTES) {
          reject(new Error(`ขนาดรวมหลังแตกใหญ่เกินไป (>${MAX_TOTAL_UNCOMPRESSED_BYTES} bytes)`));
          return;
        }

        const parts = raw.split('/').filter(Boolean);
        if (parts.length === 0) {
          zip.readEntry();
          return;
        }
        topLevels.add(parts[0]);

        const isDir = raw.endsWith('/');
        if (!isDir && parts.length === 1) {
          hasRootFiles = true;
          if (rootFileSamples.length < 10) rootFileSamples.push(raw);
        }

        if (!isDir && raw.toLowerCase().endsWith('.blk')) {
          hasBlk = true;
        }

        zip.readEntry();
      });

      zip.on('end', resolve);
      zip.on('error', reject);
      zip.readEntry();
    });
  });

  const stem = sanitizeFolderName(path.parse(originalName).name || 'skin');

  const warnings = [];
  if (hasRootFiles) {
    warnings.push(`พบไฟล์ที่อยู่ระดับรากของ zip (อาจทำให้โครงสร้างสกินไม่ชัดเจน): ${rootFileSamples.join(', ')}`);
  }
  if (!hasBlk) {
    warnings.push('ไม่พบไฟล์ .blk ใน zip (อาจไม่ใช่สกินของ War Thunder หรือแตกไว้ไม่ถูกโครงสร้าง)');
  }
  if (topLevels.size === 0) {
    warnings.push('zip ดูเหมือนว่างเปล่า');
  }

  if (topLevels.size === 1 && !hasRootFiles) {
    const only = Array.from(topLevels)[0];
    return {
      plan: {
        installDir: path.join(destRoot, only),
        topLevelDirInZip: only,
      },
      warnings,
    };
  }

  return {
    plan: {
      installDir: path.join(destRoot, stem),
      topLevelDirInZip: null,
    },
    warnings,
  };
}

async function extractZip(zipPath, plan) {
  const installDirResolved = path.resolve(plan.installDir);
  let totalWritten = 0;

  await withZipFile(zipPath, (zip) => {
    return new Promise((resolve, reject) => {
      zip.on('entry', (entry) => {
        const raw = String(entry.fileName || '').replace(/\\/g, '/');
        if (!raw || raw.startsWith('__MACOSX/')) {
          zip.readEntry();
          return;
        }

        const isDir = raw.endsWith('/');
        const declared = Number(entry.uncompressedSize || 0);
        if (declared > MAX_SINGLE_ENTRY_UNCOMPRESSED_BYTES) {
          reject(new Error(`ไฟล์ใน zip ใหญ่เกินไป (>${MAX_SINGLE_ENTRY_UNCOMPRESSED_BYTES} bytes): ${raw}`));
          return;
        }
        totalWritten += declared;
        if (totalWritten > MAX_TOTAL_UNCOMPRESSED_BYTES) {
          reject(new Error(`ขนาดรวมหลังแตกใหญ่เกินไป (>${MAX_TOTAL_UNCOMPRESSED_BYTES} bytes)`));
          return;
        }

        let rel = raw;
        if (plan.topLevelDirInZip) {
          rel = stripTopLevel(raw, plan.topLevelDirInZip);
          if (rel === null) {
            reject(new Error(`Zip entry not under expected folder '${plan.topLevelDirInZip}': ${raw}`));
            return;
          }
        }

        if (rel === '') {
          if (isDir) {
            zip.readEntry();
            return;
          }
          reject(new Error(`Unexpected root file for top-level extraction: ${raw}`));
          return;
        }

        const outPath = safeResolveWithin(installDirResolved, rel);
        if (!outPath) {
          reject(new Error(`Unsafe path in zip entry: ${raw}`));
          return;
        }

        const outDir = isDir ? outPath : path.dirname(outPath);
        fsp.mkdir(outDir, { recursive: true })
          .then(() => {
            if (isDir) {
              zip.readEntry();
              return;
            }

            zip.openReadStream(entry, (err, readStream) => {
              if (err) {
                reject(err);
                return;
              }
              const writeStream = fs.createWriteStream(outPath);
              readStream.on('error', reject);
              writeStream.on('error', reject);
              writeStream.on('close', () => {
                zip.readEntry();
              });
              readStream.pipe(writeStream);
            });
          })
          .catch(reject);
      });

      zip.on('end', resolve);
      zip.on('error', reject);
      zip.readEntry();
    });
  });
}

function stripTopLevel(rawPath, expected) {
  const parts = String(rawPath).replace(/\\/g, '/').split('/').filter(Boolean);
  if (parts.length === 0) return '';
  if (parts[0] !== expected) return null;
  return parts.slice(1).join('/');
}

function safeResolveWithin(baseDirResolved, relZipPath) {
  const parts = String(relZipPath).replace(/\\/g, '/').split('/').filter(p => p && p !== '.');
  for (const p of parts) {
    if (p === '..') return null;
    if (/^[A-Za-z]:/.test(p)) return null;
  }

  const out = path.resolve(baseDirResolved, ...parts);
  if (out === baseDirResolved) return out;
  if (out.startsWith(baseDirResolved + path.sep)) return out;
  return null;
}

function sanitizeFolderName(name) {
  const cleaned = String(name)
    .split('')
    .map((ch) => {
      const ok = /[A-Za-z0-9._ -]/.test(ch);
      return ok ? ch : '_';
    })
    .join('')
    .trim()
    .replace(/^\.+/, '')
    .replace(/\s+$/g, '');

  return cleaned.length ? cleaned : 'skin';
}

async function exists(p) {
  try {
    await fsp.access(p);
    return true;
  } catch {
    return false;
  }
}

function withZipFile(zipPath, fn) {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) return reject(err);
      Promise.resolve()
        .then(() => fn(zipfile))
        .then((val) => {
          try { zipfile.close(); } catch {}
          resolve(val);
        })
        .catch((e) => {
          try { zipfile.close(); } catch {}
          reject(e);
        });
    });
  });
}
