/**
 * Config.blk Utilities
 * จัดการไฟล์ config.blk ของ War Thunder
 */

const path = require('node:path');
const fs = require('node:fs');
const fsp = fs.promises;
const { exists } = require('./fsUtils');

/**
 * Check if sound mod is enabled in config.blk
 */
async function checkSoundModStatus(gameFolder) {
  try {
    const configPath = path.join(gameFolder, 'config.blk');

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
}

/**
 * Enable sound mod in config.blk
 */
async function enableSoundMod(gameFolder) {
  try {
    const configPath = path.join(gameFolder, 'config.blk');

    // Check if config.blk exists
    if (!(await exists(configPath))) {
      return { 
        ok: false, 
        error: `ไม่พบไฟล์ config.blk ที่ ${configPath}\nกรุณาตรวจสอบว่าโฟลเดอร์เกมถูกต้อง` 
      };
    }

    // Read current config
    let content = await fsp.readFile(configPath, 'utf8');
    
    // Check if sound section exists
    const soundSectionRegex = /sound\s*\{([^}]*)\}/s;
    const soundMatch = content.match(soundSectionRegex);

    if (soundMatch) {
      const soundContent = soundMatch[1];
      
      // Check if enable_mod already exists
      if (/enable_mod\s*:\s*b\s*=\s*yes/i.test(soundContent)) {
        return { 
          ok: true, 
          message: 'Sound mod เปิดใช้งานอยู่แล้ว',
          alreadyEnabled: true,
          configPath 
        };
      }

      // Check if enable_mod exists but is set to no
      if (/enable_mod\s*:\s*b\s*=\s*no/i.test(soundContent)) {
        // Replace enable_mod:b=no with enable_mod:b=yes
        const updatedSoundContent = soundContent.replace(
          /enable_mod\s*:\s*b\s*=\s*no/i,
          'enable_mod:b=yes'
        );
        content = content.replace(soundSectionRegex, `sound{${updatedSoundContent}}`);
      } else {
        // Add enable_mod:b=yes to sound section
        const updatedSoundContent = soundContent.trimEnd() + '\n  enable_mod:b=yes\n';
        content = content.replace(soundSectionRegex, `sound{${updatedSoundContent}}`);
      }
    } else {
      // No sound section found, add one at the end
      content = content.trimEnd() + '\n\nsound{\n  fmod_sound_enable:b=yes\n  speakerMode:t="auto"\n  enable_mod:b=yes\n}\n';
    }

    // Backup original config
    const backupPath = configPath + '.backup';
    if (!(await exists(backupPath))) {
      await fsp.copyFile(configPath, backupPath);
    }

    // Write updated config
    await fsp.writeFile(configPath, content, 'utf8');

    // Create sound/mod folder if not exists
    const soundModFolder = path.join(gameFolder, 'sound', 'mod');
    await fsp.mkdir(soundModFolder, { recursive: true });

    return { 
      ok: true, 
      message: 'เปิดใช้งาน Sound mod สำเร็จ!\nไฟล์ config.blk ถูกอัปเดตแล้ว\nสร้างโฟลเดอร์ sound\\mod แล้ว',
      configPath,
      backupPath,
      soundModFolder
    };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
}

/**
 * Ensure testLocalization is enabled in config.blk under the debug block.
 * - Creates debug block if missing
 * - Converts testLocalization:b=no -> yes
 * - Avoids duplicating the entry if it already exists
 */
async function enableTestLocalization(gameFolder) {
  try {
    const configPath = path.join(gameFolder, 'config.blk');

    if (!(await exists(configPath))) {
      return {
        ok: false,
        error: `ไม่พบไฟล์ config.blk ที่ ${configPath}\nกรุณาตรวจสอบว่าโฟลเดอร์เกมถูกต้อง`,
      };
    }

    let content = await fsp.readFile(configPath, 'utf8');

    const debugSectionRegex = /debug\s*\{([\s\S]*?)\}/i;
    const debugMatch = content.match(debugSectionRegex);

    if (debugMatch) {
      const debugContent = debugMatch[1];

      if (/testLocalization\s*:\s*b\s*=\s*yes/i.test(debugContent)) {
        return {
          ok: true,
          message: 'testLocalization เปิดใช้งานอยู่แล้ว',
          alreadyEnabled: true,
          configPath,
        };
      }

      let updatedDebugContent = debugContent;

      if (/testLocalization\s*:\s*b\s*=\s*no/i.test(updatedDebugContent)) {
        updatedDebugContent = updatedDebugContent.replace(
          /testLocalization\s*:\s*b\s*=\s*no/i,
          'testLocalization:b=yes'
        );
      } else {
        const trimmed = updatedDebugContent.trimEnd();
        const needsLeadingNewline = trimmed.length > 0 && !trimmed.endsWith('\n');
        updatedDebugContent = trimmed + (needsLeadingNewline ? '\n' : '') + '  testLocalization:b=yes\n';
      }

      content = content.replace(debugSectionRegex, `debug{${updatedDebugContent}}`);
    } else {
      content = content.trimEnd() + '\n\ndebug{\n  testLocalization:b=yes\n}\n';
    }

    // Backup original config (shared with other features)
    const backupPath = configPath + '.backup';
    if (!(await exists(backupPath))) {
      await fsp.copyFile(configPath, backupPath);
    }

    await fsp.writeFile(configPath, content, 'utf8');

    return {
      ok: true,
      message: 'เปิดใช้งาน testLocalization สำเร็จ!\nไฟล์ config.blk ถูกอัปเดตแล้ว',
      configPath,
      backupPath,
    };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
}

function escapeBlkString(str) {
  return String(str ?? '')
    .replaceAll('\\', '\\\\')
    .replaceAll('"', '\\"');
}

/**
 * Update or append hangarBlk:t="..." in a config.blk file.
 * @param {string} configPath
 * @param {string} newHangarPath - absolute or relative path; backslashes will be escaped for .blk
 */
async function updateHangarPath(configPath, newHangarPath) {
  try {
    const resolved = path.resolve(String(configPath));
    if (!(await exists(resolved))) {
      return { ok: false, error: `ไม่พบไฟล์ config.blk ที่ ${resolved}` };
    }

    const escaped = escapeBlkString(newHangarPath);
    const targetLine = `hangarBlk:t="${escaped}"`;

    const content = await fsp.readFile(resolved, 'utf8');
    const lineEnding = content.includes('\r\n') ? '\r\n' : '\n';
    const lines = content.split(/\r\n|\n/);

    let changed = false;

    const updated = lines.map((line) => {
      const trimmed = line.trimStart();
      if (!trimmed || trimmed.startsWith('//')) return line;

      // match lines starting with hangarBlk:t=
      if (/^hangarBlk\s*:\s*t\s*=/.test(trimmed)) {
        changed = true;
        const indent = line.slice(0, line.length - trimmed.length);
        return indent + targetLine;
      }
      return line;
    });

    let finalText;
    if (!changed) {
      const trimmedEnd = content.trimEnd();
      const needsNewline = trimmedEnd.length > 0 && !trimmedEnd.endsWith('\n') && !trimmedEnd.endsWith('\r');
      finalText = trimmedEnd + (needsNewline ? lineEnding : '') + targetLine + lineEnding;
    } else {
      finalText = updated.join(lineEnding);
    }

    const backupPath = resolved + '.backup';
    if (!(await exists(backupPath))) {
      await fsp.copyFile(resolved, backupPath);
    }

    await fsp.writeFile(resolved, finalText, 'utf8');
    return { ok: true, message: 'อัปเดต hangarBlk สำเร็จ', configPath: resolved, backupPath, value: targetLine };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
}

/**
 * Reset hangarBlk in config.blk by commenting out the line.
 * @param {string} configPath
 */
async function resetHangarPath(configPath) {
  try {
    const resolved = path.resolve(String(configPath));
    if (!(await exists(resolved))) {
      return { ok: false, error: `ไม่พบไฟล์ config.blk ที่ ${resolved}` };
    }

    const content = await fsp.readFile(resolved, 'utf8');
    const lineEnding = content.includes('\r\n') ? '\r\n' : '\n';
    const lines = content.split(/\r\n|\n/);

    let found = false;

    const updated = lines.map((line) => {
      const trimmed = line.trimStart();
      if (!trimmed) return line;
      if (trimmed.startsWith('//')) return line;

      if (/^hangarBlk\s*:\s*t\s*=/.test(trimmed)) {
        found = true;
        const indent = line.slice(0, line.length - trimmed.length);
        return indent + '//' + trimmed;
      }

      return line;
    });

    if (!found) {
      return { ok: true, message: 'ไม่พบ hangarBlk ในไฟล์ (ไม่ต้องรีเซ็ต)', configPath: resolved, changed: false };
    }

    const backupPath = resolved + '.backup';
    if (!(await exists(backupPath))) {
      await fsp.copyFile(resolved, backupPath);
    }

    await fsp.writeFile(resolved, updated.join(lineEnding), 'utf8');
    return { ok: true, message: 'รีเซ็ต hangarBlk สำเร็จ', configPath: resolved, backupPath, changed: true };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
}

module.exports = {
  checkSoundModStatus,
  enableSoundMod,
  enableTestLocalization,
  updateHangarPath,
  resetHangarPath,
};
