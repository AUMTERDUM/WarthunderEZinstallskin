/**
 * Game Detector Utilities
 * ตรวจหาและตรวจสอบโฟลเดอร์เกม War Thunder
 */

const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

// Common Steam library paths on Windows
const COMMON_STEAM_PATHS = [
  'C:\\Program Files (x86)\\Steam',
  'C:\\Program Files\\Steam',
  'C:\\SteamLibrary',
  'D:\\Steam',
  'D:\\SteamLibrary',
  'E:\\Steam',
  'E:\\SteamLibrary',
  'F:\\Steam',
  'F:\\SteamLibrary',
  'G:\\Steam',
  'G:\\SteamLibrary',
];

// Possible War Thunder executable names
const WAR_THUNDER_EXECUTABLES = [
  'aces.exe',
  'aces_BE.exe',      // BattlEye version
  'launcher.exe',
];

const WAR_THUNDER_SUBPATH = 'steamapps\\common\\War Thunder';

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
 * Validate if a folder is a valid War Thunder installation
 * @param {string} gameFolder - Path to the game folder
 * @returns {Promise<{valid: boolean, message: string, details?: object}>}
 */
async function validateGameFolder(gameFolder) {
  const result = {
    valid: false,
    message: '',
    details: {
      hasExecutable: false,
      executableName: null,
      hasConfig: false,
      hasUserSkins: false,
      hasSoundFolder: false,
    },
  };

  try {
    // Check if folder exists
    if (!(await exists(gameFolder))) {
      result.message = 'โฟลเดอร์ไม่มีอยู่';
      return result;
    }

    // Check for any War Thunder executable
    for (const exeName of WAR_THUNDER_EXECUTABLES) {
      const exePath = path.join(gameFolder, exeName);
      if (await exists(exePath)) {
        result.details.hasExecutable = true;
        result.details.executableName = exeName;
        break;
      }
    }

    // Check for config.blk
    const configPath = path.join(gameFolder, 'config.blk');
    result.details.hasConfig = await exists(configPath);

    // Check for UserSkins folder
    const userSkinsPath = path.join(gameFolder, 'UserSkins');
    result.details.hasUserSkins = await exists(userSkinsPath);

    // Check for sound folder
    const soundPath = path.join(gameFolder, 'sound');
    result.details.hasSoundFolder = await exists(soundPath);

    // Validation logic
    if (!result.details.hasExecutable) {
      result.message = 'ไม่พบไฟล์ executable ของ War Thunder (aces.exe, aces_BE.exe, launcher.exe)';
      return result;
    }

    result.valid = true;
    result.message = `โฟลเดอร์ War Thunder ถูกต้อง (พบ ${result.details.executableName})`;

    // Additional warnings
    const warnings = [];
    if (!result.details.hasConfig) {
      warnings.push('ไม่พบ config.blk (อาจยังไม่เคยเปิดเกม)');
    }
    if (!result.details.hasUserSkins) {
      warnings.push('ไม่พบโฟลเดอร์ UserSkins (จะถูกสร้างอัตโนมัติ)');
    }
    if (warnings.length > 0) {
      result.warnings = warnings;
    }

    return result;
  } catch (err) {
    result.message = `เกิดข้อผิดพลาด: ${err.message}`;
    return result;
  }
}

/**
 * Try to get Steam installation path from Windows Registry
 */
async function getSteamPathFromRegistry() {
  try {
    const { stdout } = await execAsync(
      'reg query "HKLM\\SOFTWARE\\WOW6432Node\\Valve\\Steam" /v InstallPath 2>nul || reg query "HKCU\\SOFTWARE\\Valve\\Steam" /v SteamPath 2>nul',
      { encoding: 'utf8' }
    );
    
    const match = stdout.match(/(?:InstallPath|SteamPath)\s+REG_SZ\s+(.+)/i);
    if (match && match[1]) {
      return match[1].trim();
    }
  } catch {
    // Registry query failed, return null
  }
  return null;
}

/**
 * Parse Steam libraryfolders.vdf to find all library paths
 */
async function getSteamLibraryPaths(steamPath) {
  const libraryPaths = [steamPath];
  
  try {
    const vdfPath = path.join(steamPath, 'steamapps', 'libraryfolders.vdf');
    if (!(await exists(vdfPath))) {
      return libraryPaths;
    }

    const content = await fsp.readFile(vdfPath, 'utf8');
    
    // Parse VDF format - look for "path" entries
    const pathMatches = content.matchAll(/"path"\s+"([^"]+)"/g);
    for (const match of pathMatches) {
      const libPath = match[1].replace(/\\\\/g, '\\');
      if (!libraryPaths.includes(libPath)) {
        libraryPaths.push(libPath);
      }
    }
  } catch {
    // Failed to parse, return what we have
  }

  return libraryPaths;
}

/**
 * Auto-detect War Thunder installation folder
 * @returns {Promise<{found: boolean, path?: string, paths?: string[], message: string}>}
 */
async function autoDetectGameFolder() {
  const candidates = [];
  
  try {
    // 1. Try to get Steam path from registry
    const steamPath = await getSteamPathFromRegistry();
    if (steamPath) {
      const libraryPaths = await getSteamLibraryPaths(steamPath);
      for (const libPath of libraryPaths) {
        const wtPath = path.join(libPath, WAR_THUNDER_SUBPATH);
        if (await exists(wtPath)) {
          const validation = await validateGameFolder(wtPath);
          if (validation.valid) {
            candidates.push({ path: wtPath, source: 'steam-registry' });
          }
        }
      }
    }

    // 2. Check common Steam paths
    for (const steamBase of COMMON_STEAM_PATHS) {
      const wtPath = path.join(steamBase, WAR_THUNDER_SUBPATH);
      if (!candidates.find(c => c.path === wtPath) && await exists(wtPath)) {
        const validation = await validateGameFolder(wtPath);
        if (validation.valid) {
          candidates.push({ path: wtPath, source: 'common-path' });
        }
      }
    }

    // 3. Check for standalone installation in common locations
    const standalonePaths = [
      'C:\\Games\\War Thunder',
      'D:\\Games\\War Thunder',
      'C:\\Program Files\\War Thunder',
      'C:\\Program Files (x86)\\War Thunder',
    ];

    for (const wtPath of standalonePaths) {
      if (!candidates.find(c => c.path === wtPath) && await exists(wtPath)) {
        const validation = await validateGameFolder(wtPath);
        if (validation.valid) {
          candidates.push({ path: wtPath, source: 'standalone' });
        }
      }
    }

    if (candidates.length === 0) {
      return {
        found: false,
        message: 'ไม่พบการติดตั้ง War Thunder\nกรุณาเลือกโฟลเดอร์ด้วยตนเอง',
      };
    }

    if (candidates.length === 1) {
      return {
        found: true,
        path: candidates[0].path,
        message: `พบ War Thunder ที่: ${candidates[0].path}`,
      };
    }

    return {
      found: true,
      path: candidates[0].path,
      paths: candidates.map(c => c.path),
      message: `พบ War Thunder หลายที่ ใช้: ${candidates[0].path}`,
    };
  } catch (err) {
    return {
      found: false,
      message: `เกิดข้อผิดพลาดในการค้นหา: ${err.message}`,
    };
  }
}

/**
 * List installed skins in UserSkins folder
 * @param {string} gameFolder - Path to the game folder
 * @returns {Promise<{ok: boolean, skins?: Array, error?: string}>}
 */
async function listInstalledSkins(gameFolder) {
  try {
    const userSkinsPath = path.join(gameFolder, 'UserSkins');
    
    if (!(await exists(userSkinsPath))) {
      return { ok: true, skins: [], message: 'โฟลเดอร์ UserSkins ยังไม่มี' };
    }

    const entries = await fsp.readdir(userSkinsPath, { withFileTypes: true });
    const skins = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skinPath = path.join(userSkinsPath, entry.name);
        const stats = await fsp.stat(skinPath);
        
        // Check if it has .blk file (valid skin)
        const files = await fsp.readdir(skinPath);
        const hasBlk = files.some(f => f.toLowerCase().endsWith('.blk'));
        
        skins.push({
          name: entry.name,
          path: skinPath,
          hasBlk,
          modifiedAt: stats.mtime.toISOString(),
          size: await getFolderSize(skinPath),
        });
      }
    }

    // Sort by modified date (newest first)
    skins.sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));

    return { ok: true, skins };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
}

/**
 * List installed sound mods
 * @param {string} gameFolder - Path to the game folder
 * @returns {Promise<{ok: boolean, soundMods?: Array, error?: string}>}
 */
async function listInstalledSoundMods(gameFolder) {
  try {
    const soundModPath = path.join(gameFolder, 'sound', 'mod');
    
    if (!(await exists(soundModPath))) {
      return { ok: true, soundMods: [], message: 'โฟลเดอร์ sound/mod ยังไม่มี' };
    }

    const entries = await fsp.readdir(soundModPath, { withFileTypes: true });
    const soundMods = [];

    for (const entry of entries) {
      if (entry.isFile() && entry.name.toLowerCase().endsWith('.bank')) {
        const filePath = path.join(soundModPath, entry.name);
        const stats = await fsp.stat(filePath);
        
        soundMods.push({
          name: entry.name,
          path: filePath,
          modifiedAt: stats.mtime.toISOString(),
          size: stats.size,
        });
      }
    }

    // Sort by modified date (newest first)
    soundMods.sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));

    return { ok: true, soundMods };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
}

/**
 * Delete an installed skin
 * @param {string} skinPath - Full path to the skin folder
 * @returns {Promise<{ok: boolean, message?: string, error?: string}>}
 */
async function deleteSkin(skinPath) {
  try {
    if (!(await exists(skinPath))) {
      return { ok: false, error: 'ไม่พบโฟลเดอร์สกิน' };
    }

    await fsp.rm(skinPath, { recursive: true, force: true });
    return { ok: true, message: 'ลบสกินสำเร็จ' };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
}

/**
 * Delete a sound mod file
 * @param {string} soundModPath - Full path to the sound mod file
 * @returns {Promise<{ok: boolean, message?: string, error?: string}>}
 */
async function deleteSoundMod(soundModPath) {
  try {
    if (!(await exists(soundModPath))) {
      return { ok: false, error: 'ไม่พบไฟล์ sound mod' };
    }

    await fsp.unlink(soundModPath);
    return { ok: true, message: 'ลบ sound mod สำเร็จ' };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
}

/**
 * Get folder size recursively
 */
async function getFolderSize(folderPath) {
  let totalSize = 0;
  
  try {
    const entries = await fsp.readdir(folderPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const entryPath = path.join(folderPath, entry.name);
      if (entry.isFile()) {
        const stats = await fsp.stat(entryPath);
        totalSize += stats.size;
      } else if (entry.isDirectory()) {
        totalSize += await getFolderSize(entryPath);
      }
    }
  } catch {
    // Ignore errors
  }
  
  return totalSize;
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = {
  exists,
  validateGameFolder,
  autoDetectGameFolder,
  listInstalledSkins,
  listInstalledSoundMods,
  deleteSkin,
  deleteSoundMod,
  formatBytes,
};
