/**
 * War Thunder localization utilities
 * - Update lang/menu.csv while preserving delimiter and structure
 */

const path = require('node:path');
const fs = require('node:fs');
const fsp = fs.promises;
const { exists } = require('./fsUtils');

function detectLineEnding(text) {
  return text.includes('\r\n') ? '\r\n' : '\n';
}

function detectDelimiterFromSampleLine(line) {
  const candidates = [';', ',', '\t'];
  let best = ';';
  let bestCount = -1;
  for (const d of candidates) {
    const count = line.split(d).length - 1;
    if (count > bestCount) {
      bestCount = count;
      best = d;
    }
  }
  return best;
}

function parseCsvLine(line, delimiter) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === delimiter) {
      fields.push(current);
      current = '';
      continue;
    }

    current += ch;
  }

  fields.push(current);
  return fields;
}

function formatCsvField(value, delimiter) {
  const str = String(value ?? '');
  const mustQuote = str.includes('"') || str.includes('\n') || str.includes('\r') || str.includes(delimiter);
  if (!mustQuote) return str;
  return '"' + str.replaceAll('"', '""') + '"';
}

function formatCsvLine(fields, delimiter) {
  return fields.map((f) => formatCsvField(f, delimiter)).join(delimiter);
}

/**
 * Update a key row in lang/menu.csv.
 * Assumes the first column is the key, and updates the 2nd column (index 1).
 *
 * @param {string} gameFolder
 * @param {string|string[]} keys - e.g. 'multiplayer/target_destroyed'
 * @param {string} newText
 */
async function updateMenuCsv(gameFolder, keys, newText) {
  const keysArr = Array.isArray(keys) ? keys : [keys];

  const langFolder = path.join(gameFolder, 'lang');
  if (!(await exists(langFolder))) {
    return {
      ok: false,
      code: 'LANG_FOLDER_MISSING',
      error: 'ไม่พบโฟลเดอร์ lang\nกรุณาเปิดเกมอย่างน้อย 1 ครั้ง โดยเปิด testLocalization ก่อน',
      langFolder,
    };
  }

  const menuPath = path.join(langFolder, 'menu.csv');
  if (!(await exists(menuPath))) {
    return {
      ok: false,
      code: 'MENU_CSV_MISSING',
      error: 'ไม่พบไฟล์ lang\\menu.csv\nกรุณาเปิดเกมอย่างน้อย 1 ครั้ง โดยเปิด testLocalization ก่อน',
      menuPath,
    };
  }

  const content = await fsp.readFile(menuPath, 'utf8');
  const lineEnding = detectLineEnding(content);

  const lines = content.split(/\r\n|\n/);
  const sample = lines.find((l) => l && l.trim() && !l.trim().startsWith('#')) || '';
  const delimiter = detectDelimiterFromSampleLine(sample);

  let found = false;
  let updatedKey = null;

  const updatedLines = lines.map((line) => {
    if (!line || !line.trim() || line.trim().startsWith('#')) {
      return line;
    }

    const fields = parseCsvLine(line, delimiter);
    const key = (fields[0] ?? '').trim();

    if (!key) return line;

    if (keysArr.includes(key)) {
      // Ensure there is at least 2 columns; preserve the rest.
      while (fields.length < 2) fields.push('');
      fields[1] = String(newText ?? '');
      found = true;
      updatedKey = key;
      return formatCsvLine(fields, delimiter);
    }

    return line;
  });

  if (!found) {
    return {
      ok: false,
      code: 'KEY_NOT_FOUND',
      error: `ไม่พบคีย์ที่ต้องการใน menu.csv: ${keysArr.join(', ')}`,
      menuPath,
    };
  }

  const finalText = updatedLines.join(lineEnding);
  await fsp.writeFile(menuPath, finalText, 'utf8');

  return {
    ok: true,
    message: `อัปเดต menu.csv สำเร็จ (${updatedKey})`,
    menuPath,
    delimiter: delimiter === '\t' ? 'TAB' : delimiter,
    updatedKey,
  };
}

module.exports = {
  updateMenuCsv,
};
