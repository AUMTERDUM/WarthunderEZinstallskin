/**
 * Internationalization (i18n) System
 * รองรับภาษาไทยและอังกฤษ
 */

export const translations = {
  th: {
    // App
    app: {
      title: 'War Thunder Auto Skin',
      subtitle: 'สำหรับติดตั้ง Skins และ Sound Mods',
    },

    // Header
    header: {
      manage: 'จัดการที่ติดตั้งแล้ว',
    },

    // Settings
    settings: {
      title: 'ตั้งค่าโฟลเดอร์เกม',
      search: 'ค้นหา',
      browse: 'เลือก',
      autoDetect: 'ค้นหาอัตโนมัติ',
      placeholder: 'เลือกโฟลเดอร์เกม War Thunder',
      skinPath: 'สกิน',
      soundPath: 'เสียง',
      checking: 'กำลังตรวจสอบ...',
      valid: 'ถูกต้อง',
      invalid: 'ไม่ถูกต้อง',
      foundGame: 'พบ War Thunder แล้ว!',
      notFound: 'ไม่พบ War Thunder',
      theme: 'เปลี่ยนธีม',
    },

    // Tabs
    tabs: {
      skin: 'ติดตั้งสกิน',
      sound: 'ติดตั้งแพ็คเสียง',
    },

    // Skin Panel
    skin: {
      panelTitle: 'ติดตั้งสกิน',
      zipFile: 'ไฟล์ zip',
      hint: 'ติดตั้งทีละไฟล์ตามลำดับ • สูงสุด 50 ไฟล์',
      installTo: 'ติดตั้งไปที่',
    },

    // Sound Panel
    sound: {
      panelTitle: 'ติดตั้งแพ็คเสียง (Sound Mod)',
      zipFile: 'ไฟล์ zip แพ็คเสียง',
      hint: 'แตกไฟล์ sound mod ลงใน folder mod ของเกม',
      installTo: 'ติดตั้งไปที่',
      autoCreateFolder: 'หากยังไม่มี folder mod ระบบจะสร้างให้อัตโนมัติ',
      configEnabled: 'Sound mod เปิดใช้งานแล้วใน config.blk',
      configDisabled: 'Sound mod ยังไม่เปิดใช้งานใน config.blk',
      enableAuto: 'เปิดใช้งานอัตโนมัติ',
      enableSuccess: 'เปิดใช้งาน Sound mod สำเร็จ!',
    },

    // Custom Kill Message
    killMessage: {
      title: 'Custom Kill Message',
      placeholder: 'ใส่ข้อความ Kill Message ที่ต้องการ',
      apply: 'Apply Custom Kill Message',
      success: 'เปลี่ยน Kill Message สำเร็จ!',
      empty: 'กรุณากรอกข้อความก่อน',
      langMissing: 'ไม่พบโฟลเดอร์ lang\nกรุณาเปิดเกมอย่างน้อย 1 ครั้ง โดยเปิด testLocalization ก่อน',
    },

    // Drop Zone
    drop: {
      text: 'คลิกเพื่อเลือกไฟล์ หรือ ลากไฟล์มาวางที่นี่',
      hint: 'รองรับไฟล์ .zip หลายไฟล์พร้อมกัน',
    },

    // File List
    fileList: {
      selected: 'เลือกแล้ว {count} ไฟล์',
      clear: 'ล้างทั้งหมด',
    },

    // Progress
    progress: {
      installing: 'กำลังติดตั้ง',
    },

    // Common
    common: {
      forceOverwrite: 'Force overwrite',
      install: 'Install',
      installing: 'กำลังติดตั้ง...',
      loading: 'กำลังโหลด...',
      checking: 'กำลังตรวจสอบ...',
      editing: 'กำลังแก้ไข...',
      files: 'ไฟล์',
      back: 'กลับ',
      cancel: 'ยกเลิก',
    },

    // Result
    result: {
      title: 'ผลลัพธ์',
    },

    // Status
    status: {
      ready: 'พร้อมใช้งาน',
      success: 'สำเร็จ',
      failed: 'ล้มเหลว',
      error: 'Error',
      working: 'Working',
      warning: 'คำเตือน',
    },

    // Toast
    toast: {
      skinInstallSuccess: 'ติดตั้งสกินสำเร็จ {count} ไฟล์',
      soundInstallSuccess: 'ติดตั้ง sound mod สำเร็จ {count} ไฟล์',
      installFailed: 'ติดตั้งล้มเหลว {count} ไฟล์',
    },

    // Installed
    installed: {
      title: 'รายการที่ติดตั้งแล้ว',
      refresh: 'รีเฟรช',
      search: '🔍 ค้นหา...',
      skins: 'สกิน',
      soundMods: 'Sound Mods',
      noSkins: 'ยังไม่มีสกินที่ติดตั้ง',
      noSoundMods: 'ยังไม่มี sound mod ที่ติดตั้ง',
      noResults: 'ไม่พบรายการที่ตรงกับคำค้นหา',
      confirmDelete: 'ต้องการลบ "{name}" หรือไม่?',
      deleteSuccess: 'ลบสกิน "{name}" สำเร็จ',
      deleteSoundSuccess: 'ลบ sound mod "{name}" สำเร็จ',
      openFolder: 'เปิดโฟลเดอร์',
      delete: 'ลบ',
      noBlk: 'ไม่มี .blk',
    },

    // Statistics
    statistics: {
      title: 'สถิติ',
      skins: 'สกิน',
      soundMods: 'Sound Mods',
      totalSize: 'ขนาดรวม',
      items: 'รายการ',
    },

    // Backup
    backup: {
      title: 'สำรอง/กู้คืน',
      create: 'สร้างไฟล์สำรอง',
      restore: 'กู้คืนจากไฟล์สำรอง',
      includeSkins: 'รวมสกิน',
      includeSoundMods: 'รวม Sound Mods',
      overwrite: 'เขียนทับไฟล์ที่มีอยู่',
      createBtn: 'สร้างไฟล์สำรอง',
      restoreBtn: 'กู้คืน',
      success: 'สำรองสำเร็จ: {skins} สกิน, {sounds} sound mods',
      restoreSuccess: 'กู้คืนสำเร็จ: {skins} สกิน, {sounds} sound mods',
      electronOnly: 'ฟีเจอร์นี้ใช้ได้เฉพาะใน Desktop App',
    },

    // Errors
    error: {
      noFile: 'กรุณาเลือกไฟล์ zip',
      notZip: 'ไฟล์ที่ลากมาวางต้องเป็น .zip',
      generic: 'ผิดพลาด',
      backend: 'ไม่สามารถเชื่อมต่อ backend',
      backendConnection: 'ไม่สามารถเชื่อมต่อ backend\nกรุณารัน backend ที่ port 3000',
      invalidResponse: 'Backend ตอบกลับมาผิดรูปแบบ',
      folderPicker: 'ไม่สามารถเปิด folder picker',
      openFolder: 'ไม่สามารถเปิดโฟลเดอร์',
      validateFolder: 'ไม่สามารถตรวจสอบโฟลเดอร์ได้',
      autoDetect: 'ไม่สามารถค้นหาได้',
      enableSoundMod: 'ไม่สามารถแก้ไข config.blk',
      loadInstalled: 'ไม่สามารถโหลดรายการ',
      loadStats: 'ไม่สามารถโหลดสถิติ',
      delete: 'ไม่สามารถลบได้',
      backup: 'ไม่สามารถสำรองได้',
      restore: 'ไม่สามารถกู้คืนได้',
      electronOnly: 'ฟีเจอร์นี้ใช้ได้เฉพาะใน Desktop App',
    },
  },

  en: {
    // App
    app: {
      title: 'War Thunder Auto Skin',
      subtitle: 'for installing Skins and Sound Mods',
    },

    // Header
    header: {
      manage: 'Manage Installed',
    },

    // Settings
    settings: {
      title: 'Game Folder Settings',
      search: 'Search',
      browse: 'Browse',
      autoDetect: 'Auto-detect',
      placeholder: 'Select War Thunder game folder',
      skinPath: 'Skins',
      soundPath: 'Sounds',
      checking: 'Checking...',
      valid: 'Valid',
      invalid: 'Invalid',
      foundGame: 'Found War Thunder!',
      notFound: 'War Thunder not found',
      theme: 'Toggle theme',
    },

    // Tabs
    tabs: {
      skin: 'Install Skins',
      sound: 'Install Sound Pack',
    },

    // Skin Panel
    skin: {
      panelTitle: 'Install Skins',
      zipFile: 'Zip file',
      hint: 'Install one file at a time • Max 50 files',
      installTo: 'Install to',
    },

    // Sound Panel
    sound: {
      panelTitle: 'Install Sound Pack (Sound Mod)',
      zipFile: 'Sound pack zip file',
      hint: 'Extract sound mod to game mod folder',
      installTo: 'Install to',
      autoCreateFolder: 'If mod folder does not exist, it will be created automatically',
      configEnabled: 'Sound mod is enabled in config.blk',
      configDisabled: 'Sound mod is not enabled in config.blk',
      enableAuto: 'Enable automatically',
      enableSuccess: 'Sound mod enabled successfully!',
    },

    // Custom Kill Message
    killMessage: {
      title: 'Custom Kill Message',
      placeholder: 'Enter your custom kill message',
      apply: 'Apply Custom Kill Message',
      success: 'Custom kill message applied!',
      empty: 'Please enter a message first.',
      langMissing: 'lang folder not found. Run the game once with testLocalization enabled.',
    },

    // Drop Zone
    drop: {
      text: 'Click to select files or drag and drop here',
      hint: 'Supports multiple .zip files',
    },

    // File List
    fileList: {
      selected: 'Selected {count} files',
      clear: 'Clear all',
    },

    // Progress
    progress: {
      installing: 'Installing',
    },

    // Common
    common: {
      forceOverwrite: 'Force overwrite',
      install: 'Install',
      installing: 'Installing...',
      loading: 'Loading...',
      checking: 'Checking...',
      editing: 'Editing...',
      files: 'files',
      back: 'Back',
      cancel: 'Cancel',
    },

    // Result
    result: {
      title: 'Result',
    },

    // Status
    status: {
      ready: 'Ready',
      success: 'Success',
      failed: 'Failed',
      error: 'Error',
      working: 'Working',
      warning: 'Warning',
    },

    // Toast
    toast: {
      skinInstallSuccess: 'Installed {count} skins successfully',
      soundInstallSuccess: 'Installed {count} sound mods successfully',
      installFailed: 'Failed to install {count} files',
    },

    // Installed
    installed: {
      title: 'Installed Items',
      refresh: 'Refresh',
      search: '🔍 Search...',
      skins: 'Skins',
      soundMods: 'Sound Mods',
      noSkins: 'No skins installed',
      noSoundMods: 'No sound mods installed',
      noResults: 'No items match the search',
      confirmDelete: 'Do you want to delete "{name}"?',
      deleteSuccess: 'Deleted skin "{name}" successfully',
      deleteSoundSuccess: 'Deleted sound mod "{name}" successfully',
      openFolder: 'Open folder',
      delete: 'Delete',
      noBlk: 'No .blk file',
    },

    // Statistics
    statistics: {
      title: 'Statistics',
      skins: 'Skins',
      soundMods: 'Sound Mods',
      totalSize: 'Total Size',
      items: 'items',
    },

    // Backup
    backup: {
      title: 'Backup/Restore',
      create: 'Create Backup',
      restore: 'Restore from Backup',
      includeSkins: 'Include Skins',
      includeSoundMods: 'Include Sound Mods',
      overwrite: 'Overwrite existing files',
      createBtn: 'Create Backup',
      restoreBtn: 'Restore',
      success: 'Backup successful: {skins} skins, {sounds} sound mods',
      restoreSuccess: 'Restore successful: {skins} skins, {sounds} sound mods',
      electronOnly: 'This feature is only available in Desktop App',
    },

    // Errors
    error: {
      noFile: 'Please select a zip file',
      notZip: 'Dropped files must be .zip',
      generic: 'Error',
      backend: 'Cannot connect to backend',
      backendConnection: 'Cannot connect to backend\nPlease run backend on port 3000',
      invalidResponse: 'Invalid backend response',
      folderPicker: 'Cannot open folder picker',
      openFolder: 'Cannot open folder',
      validateFolder: 'Cannot validate folder',
      autoDetect: 'Cannot auto-detect',
      enableSoundMod: 'Cannot edit config.blk',
      loadInstalled: 'Cannot load installed items',
      loadStats: 'Cannot load statistics',
      delete: 'Cannot delete',
      backup: 'Cannot create backup',
      restore: 'Cannot restore',
      electronOnly: 'This feature is only available in Desktop App',
    },
  },
};

/**
 * Get translation for a key using dot notation (e.g., 'app.title')
 * @param {string} lang - Language code ('th' or 'en')
 * @param {string} key - Translation key with dot notation
 * @param {object} params - Optional parameters for interpolation
 * @returns {string} Translated string
 */
export function t(lang, key, params = {}) {
  const langData = translations[lang] || translations.th;
  const fallbackData = translations.th;

  // Split key by dots and traverse the object
  const keys = key.split('.');
  let text = langData;
  let fallback = fallbackData;

  for (const k of keys) {
    text = text?.[k];
    fallback = fallback?.[k];
  }

  // Use fallback if not found
  if (text === undefined) {
    text = fallback;
  }

  // Return key if still not found
  if (text === undefined) {
    return key;
  }

  // Simple interpolation
  Object.keys(params).forEach((param) => {
    text = text.replaceAll(`{${param}}`, params[param]);
  });

  return text;
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get all available languages
 */
export function getLanguages() {
  return [
    { code: 'th', name: 'ไทย', flag: '🇹🇭' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
  ];
}

// ESM exports are declared above.
