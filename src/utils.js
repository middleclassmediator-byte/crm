const CFG_KEY = 'calling_crm_config';
const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycbxLLRDwZ3etoEhiH5uR-Jg1DT_08YDmv_iaIHe79k-gDZICSwzPPyYK_Es-GGzXWfDp8A/exec';

export function getConfig() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(CFG_KEY) || '{}'); } catch (e) {}
  return {
    url: saved.url || import.meta.env.VITE_API_URL || DEFAULT_API_URL,
    key: saved.key || import.meta.env.VITE_API_KEY || '',
    cc: saved.cc || '',
  };
}

export function saveConfig(cfg) {
  try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) {}
}

export function nowLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function fmtDateTime(v) {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d)) return v;
  return d.toLocaleString([], {
    day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export function fmtShort(v) {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d)) return v;
  return d.toLocaleDateString([], { day: '2-digit', month: 'short' }) + ', ' +
    d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function phoneDigits(mobile, cc) {
  let d = String(mobile || '').replace(/\D/g, '');
  if (cc && d.length === 10) d = String(cc).replace(/\D/g, '') + d;
  return d;
}

export const telLink = (mobile) => 'tel:' + String(mobile || '').replace(/[^\d+]/g, '');
export const waLink = (mobile, cc) => 'https://wa.me/' + phoneDigits(mobile, cc);

export function audioSrc(url) {
  const m = /\/d\/([^/]+)/.exec(url || '');
  return m ? `https://drive.google.com/uc?export=download&id=${m[1]}` : url;
}

export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = () => reject(new Error('Could not read the recording.'));
    r.readAsDataURL(blob);
  });
}

export function upsert(list, item) {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) return [...list, item];
  const copy = list.slice();
  copy[i] = item;
  return copy;
}
