/**
 * Config.blk Utilities
 * จัดการไฟล์ config.blk ของ War Thunder
 */

const path = require('path');
const fs = require('fs');
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

module.exports = {
  exists,
  checkSoundModStatus,
  enableSoundMod,
};
