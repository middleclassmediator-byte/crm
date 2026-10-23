import { getConfig } from './utils.js';

// Content-Type text/plain avoids a CORS preflight, which Apps Script cannot answer.
export async function api(action, payload = {}) {
  const { url, key } = getConfig();
  if (!url) throw new Error('Backend URL is not set.');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, key, ...payload }),
  });
  let json;
  try { json = await res.json(); } catch (e) {
    throw new Error('Backend did not return JSON. Check the web app URL and that access is set to "Anyone".');
  }
  if (!json.ok) throw new Error(json.error || 'Request failed.');
  return json.data;
}
