/**
 * Shared Zip Utilities
 * ใช้ร่วมกันระหว่าง server.js และ electron/main.js
 */

const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const yauzl = require('yauzl');

// Safety limits (zip bomb mitigation)
const MAX_ZIP_ENTRIES = 5000;
const MAX_TOTAL_UNCOMPRESSED_BYTES = 1024 * 1024 * 1024; // 1 GiB
const MAX_SINGLE_ENTRY_UNCOMPRESSED_BYTES = 512 * 1024 * 1024; // 512 MiB

/**
 * Check if a path exists
 */
async function exists(p) {
  try {
    await fsp.access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely delete a file (ignore errors)
 */
async function safeUnlink(p) {
  try {
    await fsp.unlink(p);
  } catch {
    // ignore
  }
}

/**
 * Open and process a zip file with a callback
 */
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

/**
 * Safely resolve a path within a base directory (prevent path traversal)
 */
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

/**
 * Strip top level directory from a path
 */
function stripTopLevel(rawPath, expected) {
  const parts = String(rawPath).replace(/\\/g, '/').split('/').filter(Boolean);
  if (parts.length === 0) return '';
  if (parts[0] !== expected) return null;
  return parts.slice(1).join('/');
}

/**
 * Sanitize a folder name to be safe for filesystem
 */
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

/**
 * Build installation plan for a skin zip
 */
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

/**
 * Extract zip file according to install plan
 */
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

/**
 * Install a skin zip file
 */
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

/**
 * Extract sound mod files directly to destination
 */
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

        // Get just the filename (strip any directory structure in zip)
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

        // Check if file exists and force is not enabled
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

/**
 * Install a sound mod zip file
 */
async function installSoundMod(zipPath, originalName, destRoot, force) {
  const dest = path.resolve(destRoot);
  await fsp.mkdir(dest, { recursive: true });

  const warnings = [];
  let hasFmodBank = false;
  let entryCount = 0;
  let totalUncompressed = 0;

  // First pass: check contents
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

        // Check for FMOD bank files (.bank)
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

  // Extract all files directly to dest folder
  await extractSoundMod(zipPath, dest, force);

  return {
    installedPath: dest,
    usedDestinationRoot: dest,
    warnings,
  };
}

module.exports = {
  MAX_ZIP_ENTRIES,
  MAX_TOTAL_UNCOMPRESSED_BYTES,
  MAX_SINGLE_ENTRY_UNCOMPRESSED_BYTES,
  exists,
  safeUnlink,
  withZipFile,
  safeResolveWithin,
  stripTopLevel,
  sanitizeFolderName,
  buildInstallPlan,
  extractZip,
  extractSoundMod,
  installZip,
  installSoundMod,
};
