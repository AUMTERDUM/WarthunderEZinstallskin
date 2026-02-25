/**
 * High-level helpers for applying a custom kill message.
 */

const { enableTestLocalization } = require('./configUtils');
const { updateMenuCsv } = require('./localizationUtils');

const DEFAULT_KEYS = [
  'multiplayer/target_destroyed',
];

/**
 * Applies testLocalization and updates menu.csv.
 * @param {string} gameFolder
 * @param {string} newText
 * @param {string[]} [keys]
 */
async function applyCustomKillMessage(gameFolder, newText, keys = DEFAULT_KEYS) {
  if (!newText || !String(newText).trim()) {
    return { ok: false, error: 'กรุณากรอกข้อความก่อน' };
  }

  const configResult = await enableTestLocalization(gameFolder);
  if (!configResult.ok) {
    return { ok: false, error: configResult.error, step: 'config' };
  }

  const menuResult = await updateMenuCsv(gameFolder, keys, String(newText));
  if (!menuResult.ok) {
    return { ok: false, error: menuResult.error, code: menuResult.code, step: 'menu', details: menuResult };
  }

  return {
    ok: true,
    message: 'Apply Custom Kill Message สำเร็จ',
    config: configResult,
    menu: menuResult,
  };
}

module.exports = {
  applyCustomKillMessage,
};
