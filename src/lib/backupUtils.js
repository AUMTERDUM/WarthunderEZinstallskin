/**
 * Backup and Restore Utilities
 * สำรองและกู้คืน Skins/Sound Mods
 */

const path = require('node:path');
const fs = require('node:fs');
const fsp = fs.promises;
const archiver = require('archiver');
const yauzl = require('yauzl');
const { exists, getFolderSize, formatBytes } = require('./fsUtils');

/**
 * Get statistics for skins and sound mods
 * @param {string} gameFolder - Path to game folder
 * @returns {Promise<object>} Statistics object
 */
async function getStatistics(gameFolder) {
  const stats = {
    skins: {
      count: 0,
      size: 0,
      items: [],
    },
    soundMods: {
      count: 0,
      size: 0,
      items: [],
    },
    totalSize: 0,
  };

  try {
    // Get skins stats
    const skinsPath = path.join(gameFolder, 'UserSkins');
    if (await exists(skinsPath)) {
      const entries = await fsp.readdir(skinsPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skinPath = path.join(skinsPath, entry.name);
          const size = await getFolderSize(skinPath);
          stats.skins.items.push({ name: entry.name, size });
          stats.skins.count++;
          stats.skins.size += size;
        }
      }
    }

    // Get sound mods stats
    const soundModPath = path.join(gameFolder, 'sound', 'mod');
    if (await exists(soundModPath)) {
      const entries = await fsp.readdir(soundModPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && entry.name.toLowerCase().endsWith('.bank')) {
          const filePath = path.join(soundModPath, entry.name);
          const fileStat = await fsp.stat(filePath);
          stats.soundMods.items.push({ name: entry.name, size: fileStat.size });
          stats.soundMods.count++;
          stats.soundMods.size += fileStat.size;
        }
      }
    }

    stats.totalSize = stats.skins.size + stats.soundMods.size;
    return { ok: true, stats };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Create backup of skins and/or sound mods
 * @param {string} gameFolder - Path to game folder
 * @param {string} outputPath - Output zip file path
 * @param {object} options - { includeSkins: boolean, includeSoundMods: boolean }
 * @returns {Promise<object>} Result object
 */
async function createBackup(gameFolder, outputPath, options = {}) {
  const { includeSkins = true, includeSoundMods = true } = options;

  try {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    let skinsCount = 0;
    let soundModsCount = 0;

    return await new Promise((resolve, reject) => {
      output.on('close', () => {
        resolve({
          ok: true,
          message: `สำรองข้อมูลสำเร็จ`,
          path: outputPath,
          size: archive.pointer(),
          skinsCount,
          soundModsCount,
        });
      });

      archive.on('error', (err) => {
        reject({ ok: false, error: err.message });
      });

      archive.pipe(output);

      // Add items helper function
      const addBackupItems = async () => {
        if (includeSkins) {
          const skinsPath = path.join(gameFolder, 'UserSkins');
          if (await exists(skinsPath)) {
            const entries = await fsp.readdir(skinsPath, { withFileTypes: true });
            for (const entry of entries) {
              if (entry.isDirectory()) {
                archive.directory(path.join(skinsPath, entry.name), `UserSkins/${entry.name}`);
                skinsCount++;
              }
            }
          }
        }

        if (includeSoundMods) {
          const soundModPath = path.join(gameFolder, 'sound', 'mod');
          if (await exists(soundModPath)) {
            const entries = await fsp.readdir(soundModPath, { withFileTypes: true });
            for (const entry of entries) {
              if (entry.isFile() && entry.name.toLowerCase().endsWith('.bank')) {
                archive.file(path.join(soundModPath, entry.name), { name: `sound/mod/${entry.name}` });
                soundModsCount++;
              }
            }
          }
        }

        await archive.finalize();
      };

      addBackupItems().catch(reject);
    });
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Extract file from backup zip
 */
async function extractBackupFile(zipfile, entry, destPath, errors) {
  return new Promise((resolve) => {
    zipfile.openReadStream(entry, (err, readStream) => {
      if (err) {
        errors.push({ file: entry.fileName, error: err.message });
        resolve();
        return;
      }

      const writeStream = fs.createWriteStream(destPath);
      readStream.pipe(writeStream);
      writeStream.on('close', resolve);
      writeStream.on('error', (err) => {
        errors.push({ file: entry.fileName, error: err.message });
        resolve();
      });
    });
  });
}

/**
 * Restore from backup zip
 * @param {string} backupPath - Path to backup zip file
 * @param {string} gameFolder - Path to game folder
 * @param {object} options - { overwrite: boolean }
 * @returns {Promise<object>} Result object
 */
async function restoreBackup(backupPath, gameFolder, options = {}) {
  const { overwrite = false } = options;

  return new Promise((resolve, reject) => {
    yauzl.open(backupPath, { lazyEntries: true }, async (err, zipfile) => {
      if (err) {
        return reject({ ok: false, error: err.message });
      }

      let skinsRestored = 0;
      let soundModsRestored = 0;
      const errors = [];

      zipfile.on('entry', async (entry) => {
        const fileName = entry.fileName;
        const isDir = fileName.endsWith('/');

        let destPath = null;

        // Determine destination
        if (fileName.startsWith('UserSkins/')) {
          const relativePath = fileName.substring('UserSkins/'.length);
          if (relativePath) {
            destPath = path.join(gameFolder, 'UserSkins', relativePath);
            if (!isDir) skinsRestored++;
          }
        } else if (fileName.startsWith('sound/mod/')) {
          const relativePath = fileName.substring('sound/mod/'.length);
          if (relativePath) {
            destPath = path.join(gameFolder, 'sound', 'mod', relativePath);
            if (!isDir) soundModsRestored++;
          }
        }

        if (!destPath) {
          zipfile.readEntry();
          return;
        }

        try {
          if (isDir) {
            await fsp.mkdir(destPath, { recursive: true });
            zipfile.readEntry();
          } else {
            // Check if file exists
            if (!overwrite && await exists(destPath)) {
              zipfile.readEntry();
              return;
            }

            // Ensure directory exists
            await fsp.mkdir(path.dirname(destPath), { recursive: true });

            // Extract file
            await extractBackupFile(zipfile, entry, destPath, errors);
            zipfile.readEntry();
          }
        } catch (err) {
          errors.push({ file: fileName, error: err.message });
          zipfile.readEntry();
        }
      });

      zipfile.on('end', () => {
        resolve({
          ok: errors.length === 0,
          message: `กู้คืนสำเร็จ: ${skinsRestored} สกิน, ${soundModsRestored} sound mods`,
          skinsRestored,
          soundModsRestored,
          errors,
        });
      });

      zipfile.on('error', (err) => {
        reject({ ok: false, error: err.message });
      });

      zipfile.readEntry();
    });
  });
}

module.exports = {
  getStatistics,
  createBackup,
  restoreBackup,
  formatBytes,
};
