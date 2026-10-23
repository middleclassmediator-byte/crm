import { useState } from 'react';

export default function Setup({ cfg, onSave, onCancel }) {
  const [url, setUrl] = useState(cfg.url);
  const [key, setKey] = useState(cfg.key);
  const [cc, setCc] = useState(cfg.cc);

  const submit = (e) => {
    e.preventDefault();
    onSave({ url: url.trim(), key: key.trim(), cc: cc.trim() });
  };

  return (
    <div className="overlay">
      <form className="modal" onSubmit={submit}>
        <h2>Connect your Google Sheet</h2>
        <p className="muted">
          Paste the web app URL from your Apps Script deployment, and the secret key you set in
          <code> Code.gs</code>.
        </p>
        <label>Web app URL
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://script.google.com/macros/s/…/exec" required />
        </label>
        <label>Secret key
          <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="Same as SECRET in Code.gs" required />
        </label>
        <label>Default country code (optional)
          <input value={cc} onChange={(e) => setCc(e.target.value)} placeholder="e.g. 91" inputMode="numeric" />
          <span className="hint">Added to 10-digit numbers for WhatsApp links.</span>
        </label>
        <div className="row end">
          {onCancel && <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>}
          <button className="btn primary">Save and connect</button>
        </div>
      </form>
    </div>
  );
}
