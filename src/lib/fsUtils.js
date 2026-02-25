/**
 * Shared filesystem utilities
 * ใช้ร่วมกันระหว่างทุก module ฝั่ง Node.js
 */

const path = require('node:path');
const fs = require('node:fs');
const fsp = fs.promises;

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
    // Ignore errors (e.g. permission denied)
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
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = {
  exists,
  safeUnlink,
  getFolderSize,
  formatBytes,
};
