const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const os = require('os');
const { exec } = require('child_process');
const util = require('util');

const express = require('express');
const multer = require('multer');

// Import shared utilities
const { installZip, installSoundMod, safeUnlink } = require('./src/lib/zipUtils');
const { checkSoundModStatus, enableSoundMod } = require('./src/lib/configUtils');
const { 
  validateGameFolder, 
  autoDetectGameFolder, 
  listInstalledSkins, 
  listInstalledSoundMods,
  deleteSkin,
  deleteSoundMod,
} = require('./src/lib/gameDetector');

const execAsync = util.promisify(exec);

const DEFAULT_DEST = 'F:\\SteamLibrary\\steamapps\\common\\War Thunder\\UserSkins';
const DEFAULT_SOUND_DEST = 'F:\\SteamLibrary\\steamapps\\common\\War Thunder\\sound\\mod';
const DEFAULT_GAME_FOLDER = 'F:\\SteamLibrary\\steamapps\\common\\War Thunder';

const app = express();
app.use(express.static(path.join(__dirname, 'dist')));
app.use(express.json());

const upload = multer({
  dest: path.join(os.tmpdir(), 'wt-auto-skin-uploads'),
  limits: {
    fileSize: 250 * 1024 * 1024, // 250MB
  },
});

// =====================
// Skin Installation API
// =====================
app.post('/api/install', upload.array('zip', 50), async (req, res) => {
  try {
    const zipFiles = req.files;
    if (!zipFiles || !Array.isArray(zipFiles) || zipFiles.length === 0) {
      return res.status(400).json({ ok: false, error: 'Missing zip file(s)' });
    }

    const dest = (req.body && req.body.dest) ? String(req.body.dest) : DEFAULT_DEST;
    const force = String((req.body && req.body.force) || '') === 'on' || String((req.body && req.body.force) || '') === 'true';

    const results = [];
    const errors = [];

    for (const f of zipFiles) {
      const originalName = f.originalname || '';
      try {
        if (!originalName.toLowerCase().endsWith('.zip')) {
          throw new Error('File must be .zip');
        }
        const result = await installZip(f.path, originalName, dest, force);
        results.push({ file: originalName, ...result });
      } catch (e) {
        errors.push({ file: originalName || path.basename(f.path), error: (e && e.message) ? e.message : String(e) });
      } finally {
        await safeUnlink(f.path);
      }
    }

    if (zipFiles.length === 1) {
      if (errors.length) {
        return res.status(400).json({ ok: false, error: errors[0].error });
      }
      return res.json({ ok: true, ...results[0] });
    }

    return res.json({ ok: true, results, errors, usedDestinationRoot: path.resolve(dest) });
  } catch (err) {
    const msg = (err && err.message) ? err.message : String(err);
    return res.status(500).json({ ok: false, error: msg });
  }
});

// =====================
// Sound Mod Installation API
// =====================
app.post('/api/install-sound', upload.array('zip', 50), async (req, res) => {
  try {
    const zipFiles = req.files;
    if (!zipFiles || !Array.isArray(zipFiles) || zipFiles.length === 0) {
      return res.status(400).json({ ok: false, error: 'Missing zip file(s)' });
    }

    const dest = (req.body && req.body.dest) ? String(req.body.dest) : DEFAULT_SOUND_DEST;
    const force = String((req.body && req.body.force) || '') === 'on' || String((req.body && req.body.force) || '') === 'true';

    // Ensure the mod directory exists
    await fsp.mkdir(dest, { recursive: true });

    const results = [];
    const errors = [];

    for (const f of zipFiles) {
      const originalName = f.originalname || '';
      try {
        if (!originalName.toLowerCase().endsWith('.zip')) {
          throw new Error('File must be .zip');
        }
        const result = await installSoundMod(f.path, originalName, dest, force);
        results.push({ file: originalName, ...result });
      } catch (e) {
        errors.push({ file: originalName || path.basename(f.path), error: (e && e.message) ? e.message : String(e) });
      } finally {
        await safeUnlink(f.path);
      }
    }

    if (zipFiles.length === 1) {
      if (errors.length) {
        return res.status(400).json({ ok: false, error: errors[0].error });
      }
      return res.json({ ok: true, ...results[0] });
    }

    return res.json({ ok: true, results, errors, usedDestinationRoot: path.resolve(dest) });
  } catch (err) {
    const msg = (err && err.message) ? err.message : String(err);
    return res.status(500).json({ ok: false, error: msg });
  }
});

// =====================
// Config APIs
// =====================
app.get('/api/ping', (req, res) => {
  res.json({ ok: true });
});

// Enable Sound Mod in config.blk
app.post('/api/enable-sound-mod', async (req, res) => {
  try {
    const gameFolder = (req.body && req.body.gameFolder) ? String(req.body.gameFolder) : DEFAULT_GAME_FOLDER;
    const result = await enableSoundMod(gameFolder);
    
    if (!result.ok) {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (err) {
    const msg = (err && err.message) ? err.message : String(err);
    return res.status(500).json({ ok: false, error: msg });
  }
});

// Check Sound Mod status in config.blk
app.get('/api/check-sound-mod', async (req, res) => {
  try {
    const gameFolder = (req.query && req.query.gameFolder) ? String(req.query.gameFolder) : DEFAULT_GAME_FOLDER;
    const result = await checkSoundModStatus(gameFolder);
    return res.json(result);
  } catch (err) {
    const msg = (err && err.message) ? err.message : String(err);
    return res.status(500).json({ ok: false, error: msg });
  }
});

// =====================
// Game Detection APIs
// =====================
app.get('/api/auto-detect-game', async (req, res) => {
  try {
    const result = await autoDetectGameFolder();
    return res.json(result);
  } catch (err) {
    const msg = (err && err.message) ? err.message : String(err);
    return res.status(500).json({ ok: false, error: msg });
  }
});

app.get('/api/validate-game-folder', async (req, res) => {
  try {
    const gameFolder = (req.query && req.query.gameFolder) ? String(req.query.gameFolder) : DEFAULT_GAME_FOLDER;
    const result = await validateGameFolder(gameFolder);
    return res.json(result);
  } catch (err) {
    const msg = (err && err.message) ? err.message : String(err);
    return res.status(500).json({ ok: false, error: msg });
  }
});

// =====================
// Installed Items APIs
// =====================
app.get('/api/list-installed-skins', async (req, res) => {
  try {
    const gameFolder = (req.query && req.query.gameFolder) ? String(req.query.gameFolder) : DEFAULT_GAME_FOLDER;
    const result = await listInstalledSkins(gameFolder);
    return res.json(result);
  } catch (err) {
    const msg = (err && err.message) ? err.message : String(err);
    return res.status(500).json({ ok: false, error: msg });
  }
});

app.get('/api/list-installed-sound-mods', async (req, res) => {
  try {
    const gameFolder = (req.query && req.query.gameFolder) ? String(req.query.gameFolder) : DEFAULT_GAME_FOLDER;
    const result = await listInstalledSoundMods(gameFolder);
    return res.json(result);
  } catch (err) {
    const msg = (err && err.message) ? err.message : String(err);
    return res.status(500).json({ ok: false, error: msg });
  }
});

app.post('/api/delete-skin', async (req, res) => {
  try {
    const skinPath = (req.body && req.body.skinPath) ? String(req.body.skinPath) : '';
    if (!skinPath) {
      return res.status(400).json({ ok: false, error: 'Missing skinPath' });
    }
    const result = await deleteSkin(skinPath);
    if (!result.ok) {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (err) {
    const msg = (err && err.message) ? err.message : String(err);
    return res.status(500).json({ ok: false, error: msg });
  }
});

app.post('/api/delete-sound-mod', async (req, res) => {
  try {
    const soundModPath = (req.body && req.body.soundModPath) ? String(req.body.soundModPath) : '';
    if (!soundModPath) {
      return res.status(400).json({ ok: false, error: 'Missing soundModPath' });
    }
    const result = await deleteSoundMod(soundModPath);
    if (!result.ok) {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (err) {
    const msg = (err && err.message) ? err.message : String(err);
    return res.status(500).json({ ok: false, error: msg });
  }
});

// =====================
// Browse Folder API
// =====================
app.get('/api/browse-folder', async (req, res) => {
  try {
    console.log('[browse-folder] Request received');
    
    // Write PowerShell script to temp file
    const psScript = `Add-Type -AssemblyName System.Windows.Forms
$folderBrowser = New-Object System.Windows.Forms.FolderBrowserDialog
$folderBrowser.Description = 'Select War Thunder folder'
$folderBrowser.ShowNewFolderButton = $true
$result = $folderBrowser.ShowDialog()
if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
    Write-Output $folderBrowser.SelectedPath
}`;

    const tempFile = path.join(os.tmpdir(), `folder-picker-${Date.now()}.ps1`);
    console.log('[browse-folder] Writing script to:', tempFile);
    
    // Write with UTF-8 BOM for PowerShell
    const utf8Bom = Buffer.from([0xEF, 0xBB, 0xBF]);
    const scriptBuffer = Buffer.concat([utf8Bom, Buffer.from(psScript, 'utf8')]);
    await fsp.writeFile(tempFile, scriptBuffer);

    try {
      console.log('[browse-folder] Executing PowerShell script...');
      const { stdout, stderr } = await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${tempFile}"`);
      console.log('[browse-folder] stdout:', stdout);
      console.log('[browse-folder] stderr:', stderr);
      
      const selectedPath = String(stdout || '').trim();

      await fsp.unlink(tempFile).catch(() => {});

      if (!selectedPath) {
        console.log('[browse-folder] No path selected (user cancelled)');
        return res.json({ ok: false, error: 'ยกเลิกการเลือกโฟลเดอร์' });
      }

      console.log('[browse-folder] Selected path:', selectedPath);
      return res.json({ ok: true, path: selectedPath });
    } catch (execErr) {
      console.error('[browse-folder] Execution error:', execErr);
      await fsp.unlink(tempFile).catch(() => {});
      throw execErr;
    }
  } catch (err) {
    console.error('[browse-folder] Error:', err);
    const msg = (err && err.message) ? err.message : String(err);
    return res.status(500).json({ ok: false, error: msg });
  }
});

// =====================
// Start Server
// =====================
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(PORT, () => {
  console.log(`War Thunder Auto Skin Web running at http://localhost:${PORT}`);
  console.log('เปิดเว็บในเบราว์เซอร์ที่ http://localhost:' + PORT);
});
