/**
 * Calling CRM - Google Apps Script backend
 * Bind this script to a Google Sheet (Extensions > Apps Script),
 * then Deploy > New deployment > Web app (Execute as: Me, Access: Anyone).
 */

// Change this secret, and use the same value in the app's setup screen.
const SECRET = 'change-me';
const VOICE_FOLDER_NAME = 'Calling CRM Voice Messages';

const SCHEMA = {
  Categories: ['id', 'name', 'createdAt'],
  Customers: ['id', 'name', 'mobile', 'categoryId', 'note', 'createdAt', 'updatedAt'],
  Calls: ['id', 'customerId', 'channel', 'dateTime', 'remark', 'voiceUrl', 'createdAt'],
};

/* ---------- Web app entry points ---------- */

function doGet() {
  return json_({ ok: true, data: 'Calling CRM backend is running.' });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const req = JSON.parse(e.postData.contents);
    if (req.key !== SECRET) throw new Error('Wrong secret key.');

    switch (req.action) {
      case 'getAll':         return json_({ ok: true, data: getAll_() });
      case 'saveCategory':   return json_({ ok: true, data: saveCategory_(req.category) });
      case 'deleteCategory': return json_({ ok: true, data: deleteCategory_(req.id) });
      case 'saveCustomer':   return json_({ ok: true, data: saveCustomer_(req.customer) });
      case 'deleteCustomer': return json_({ ok: true, data: deleteCustomer_(req.id) });
      case 'saveCall':       return json_({ ok: true, data: saveCall_(req.call) });
      case 'deleteCall':     return json_({ ok: true, data: deleteRow_('Calls', req.id) });
      case 'uploadVoice':    return json_({ ok: true, data: uploadVoice_(req) });
      default: throw new Error('Unknown action: ' + req.action);
    }
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

/* ---------- Actions ---------- */

function getAll_() {
  return {
    categories: readAll_('Categories'),
    customers: readAll_('Customers'),
    calls: readAll_('Calls'),
  };
}

function saveCategory_(c) {
  const name = String(c.name || '').trim();
  if (!name) throw new Error('Subtitle name is required.');
  return upsert_('Categories', { id: c.id, name: name });
}

function deleteCategory_(id) {
  // Customers in this subtitle are kept and become "Uncategorized".
  const sh = sheet_('Customers');
  const rows = sh.getDataRange().getValues();
  const catCol = SCHEMA.Customers.indexOf('categoryId');
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][catCol]) === String(id)) sh.getRange(i + 1, catCol + 1).setValue('');
  }
  return deleteRow_('Categories', id);
}

function saveCustomer_(c) {
  const name = String(c.name || '').trim();
  if (!name) throw new Error('Customer name is required.');
  return upsert_('Customers', {
    id: c.id,
    name: name,
    mobile: String(c.mobile || '').trim(),
    categoryId: c.categoryId || '',
    note: c.note || '',
    updatedAt: new Date().toISOString(),
  });
}

function deleteCustomer_(id) {
  const sh = sheet_('Calls');
  const rows = sh.getDataRange().getValues();
  const col = SCHEMA.Calls.indexOf('customerId');
  for (let i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][col]) === String(id)) sh.deleteRow(i + 1);
  }
  return deleteRow_('Customers', id);
}

function saveCall_(c) {
  if (!c.customerId) throw new Error('customerId is required.');
  return upsert_('Calls', {
    id: c.id,
    customerId: c.customerId,
    channel: c.channel === 'WhatsApp' ? 'WhatsApp' : 'Call',
    dateTime: c.dateTime || '',
    remark: c.remark || '',
    voiceUrl: c.voiceUrl || '',
  });
}

function uploadVoice_(req) {
  const folders = DriveApp.getFoldersByName(VOICE_FOLDER_NAME);
  const folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(VOICE_FOLDER_NAME);
  const mime = (req.mime || 'audio/webm').split(';')[0];
  const ext = mime.indexOf('mp4') > -1 ? 'm4a' : mime.indexOf('ogg') > -1 ? 'ogg' : 'webm';
  const blob = Utilities.newBlob(Utilities.base64Decode(req.base64), mime, 'voice-' + Date.now() + '.' + ext);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return { url: 'https://drive.google.com/file/d/' + file.getId() + '/view' };
}

/* ---------- Sheet helpers ---------- */

function sheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    const headers = SCHEMA[name];
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    // Plain text format keeps phone numbers (+91, leading zeros) and date strings untouched.
    sh.getRange(1, 1, sh.getMaxRows(), headers.length).setNumberFormat('@');
    sh.setFrozenRows(1);
  }
  return sh;
}

function readAll_(name) {
  const sh = sheet_(name);
  const values = sh.getDataRange().getValues();
  const headers = values.shift();
  return values
    .filter(function (r) { return r[0] !== ''; })
    .map(function (r) {
      const o = {};
      headers.forEach(function (h, i) {
        o[h] = r[i] instanceof Date ? r[i].toISOString() : String(r[i]);
      });
      return o;
    });
}

function findRow_(sh, id) {
  const ids = sh.getRange(1, 1, sh.getLastRow(), 1).getValues();
  for (let i = 1; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 1;
  return -1;
}

function upsert_(name, obj) {
  const sh = sheet_(name);
  const headers = SCHEMA[name];
  const now = new Date().toISOString();
  let row = obj.id ? findRow_(sh, obj.id) : -1;
  let existing = {};

  if (row > 0) {
    const vals = sh.getRange(row, 1, 1, headers.length).getValues()[0];
    headers.forEach(function (h, i) { existing[h] = String(vals[i]); });
  } else {
    obj.id = Utilities.getUuid().slice(0, 8);
    obj.createdAt = now;
  }

  const merged = {};
  headers.forEach(function (h) {
    merged[h] = obj[h] !== undefined ? obj[h] : (existing[h] !== undefined ? existing[h] : '');
  });

  if (row < 0) row = sh.getLastRow() + 1;
  sh.getRange(row, 1, 1, headers.length).setValues([headers.map(function (h) { return merged[h]; })]);
  return merged;
}

function deleteRow_(name, id) {
  const sh = sheet_(name);
  const row = findRow_(sh, id);
  if (row > 0) sh.deleteRow(row);
  return { id: id };
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Optional: run once from the editor to create all sheets and grant permissions (incl. Drive). */
function setup() {
  Object.keys(SCHEMA).forEach(sheet_);
  DriveApp.getRootFolder();
}
