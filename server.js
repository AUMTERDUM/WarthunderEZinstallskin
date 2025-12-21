const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const os = require('os');
const { exec } = require('child_process');
const util = require('util');

const express = require('express');
const multer = require('multer');
const yauzl = require('yauzl');

const execAsync = util.promisify(exec);

const DEFAULT_DEST = 'F:\\SteamLibrary\\steamapps\\common\\War Thunder\\UserSkins';

// Safety limits (zip bomb mitigation)
const MAX_ZIP_ENTRIES = 5000;
const MAX_TOTAL_UNCOMPRESSED_BYTES = 1024 * 1024 * 1024; // 1 GiB
const MAX_SINGLE_ENTRY_UNCOMPRESSED_BYTES = 512 * 1024 * 1024; // 512 MiB

const app = express();
app.use(express.static(path.join(__dirname, 'dist')));

const upload = multer({
  dest: path.join(os.tmpdir(), 'wt-auto-skin-uploads'),
  limits: {
    fileSize: 250 * 1024 * 1024, // 250MB
  },
});

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
      // Keep backward-compatible shape for single-file callers
      return res.json({ ok: true, ...results[0] });
    }

    return res.json({ ok: true, results, errors, usedDestinationRoot: path.resolve(dest) });
  } catch (err) {
    const msg = (err && err.message) ? err.message : String(err);
    return res.status(500).json({ ok: false, error: msg });
  }
});

app.get('/api/ping', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/browse-folder', async (req, res) => {
  try {
    console.log('[browse-folder] Request received');
    
    // Write PowerShell script to temp file
    // Use English text to avoid encoding issues
    const psScript = `Add-Type -AssemblyName System.Windows.Forms
$folderBrowser = New-Object System.Windows.Forms.FolderBrowserDialog
$folderBrowser.Description = 'Select War Thunder UserSkins folder'
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

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(PORT, () => {
  console.log(`War Thunder Auto Skin Web running at http://localhost:${PORT}`);
  console.log('เปิดเว็บในเบราว์เซอร์ที่ http://localhost:' + PORT);
});

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

        // zip bomb mitigation using declared uncompressed sizes
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

        // Secondary safety check during extraction
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

        // Directory entry for the top folder itself: allow it.
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
    // Reject Windows drive-letter style embedded paths like C:foo
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

async function safeUnlink(p) {
  try {
    await fsp.unlink(p);
  } catch {
    // ignore
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
