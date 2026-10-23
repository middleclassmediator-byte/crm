import { useMemo, useState } from 'react';
import VoiceRecorder from './VoiceRecorder.jsx';
import { audioSrc, fmtDateTime, nowLocal, telLink, waLink } from './utils.js';

const emptyForm = () => ({ id: '', channel: 'Call', dateTime: nowLocal(), remark: '', voiceUrl: '' });

export default function CustomerPanel({
  customer, categoryName, calls, cfg, busy, onClose, onEdit, onDelete, onSaveCall, onDeleteCall,
}) {
  const [form, setForm] = useState(emptyForm());
  const [voiceBlob, setVoiceBlob] = useState(null);
  const [recorderKey, setRecorderKey] = useState(0);

  const history = useMemo(
    () => [...calls].sort((a, b) => String(b.dateTime).localeCompare(String(a.dateTime))),
    [calls]
  );

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const reset = () => {
    setForm(emptyForm());
    setVoiceBlob(null);
    setRecorderKey((k) => k + 1);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.remark.trim() && !voiceBlob && !form.voiceUrl) {
      if (!window.confirm('Save this entry without a remark or voice message?')) return;
    }
    const ok = await onSaveCall({ ...form, customerId: customer.id }, voiceBlob);
    if (ok) reset();
  };

  const edit = (c) => {
    setForm({ id: c.id, channel: c.channel, dateTime: c.dateTime, remark: c.remark, voiceUrl: c.voiceUrl });
    setVoiceBlob(null);
    setRecorderKey((k) => k + 1);
  };

  return (
    <aside className="panel">
      <div className="panel-head">
        <div>
          <h2>{customer.name}</h2>
          <p className="muted">{customer.mobile} · {categoryName}</p>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
      </div>

      <div className="row wrap">
        <a className="btn call" href={telLink(customer.mobile)}>Call</a>
        <a className="btn wa" href={waLink(customer.mobile, cfg.cc)} target="_blank" rel="noreferrer">WhatsApp</a>
        <button className="btn ghost" onClick={onEdit}>Edit</button>
        <button className="btn ghost danger-text" onClick={onDelete}>Delete</button>
      </div>
      {customer.note && <p className="note">{customer.note}</p>}

      <form className="logform" onSubmit={submit}>
        <h3>{form.id ? 'Edit entry' : 'Log a contact'}</h3>
        <div className="seg" role="radiogroup" aria-label="Contact type">
          {['Call', 'WhatsApp'].map((ch) => (
            <button
              type="button" key={ch} role="radio" aria-checked={form.channel === ch}
              className={'seg-btn ' + (form.channel === ch ? 'on ' + ch.toLowerCase() : '')}
              onClick={() => set({ channel: ch })}
            >{ch}</button>
          ))}
        </div>
        <label>Date and time
          <input type="datetime-local" value={form.dateTime} onChange={(e) => set({ dateTime: e.target.value })} required />
        </label>
        <label>Remark
          <textarea rows={3} value={form.remark} onChange={(e) => set({ remark: e.target.value })} placeholder="What was discussed?" />
        </label>

        {form.voiceUrl && !voiceBlob && (
          <div className="row">
            <audio controls src={audioSrc(form.voiceUrl)} />
            <button type="button" className="btn ghost" onClick={() => set({ voiceUrl: '' })}>Remove</button>
          </div>
        )}
        <VoiceRecorder key={recorderKey} value={voiceBlob} onChange={setVoiceBlob} />

        <div className="row end">
          {form.id && <button type="button" className="btn ghost" onClick={reset}>Cancel edit</button>}
          <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : form.id ? 'Update entry' : 'Save entry'}</button>
        </div>
      </form>

      <h3>History ({history.length})</h3>
      {history.length === 0 && <p className="muted">No calls or messages logged yet. Add the first one above.</p>}
      <ol className="timeline">
        {history.map((c) => (
          <li key={c.id} className={'tl ' + c.channel.toLowerCase()}>
            <div className="tl-top">
              <span className={'badge ' + c.channel.toLowerCase()}>{c.channel}</span>
              <time>{fmtDateTime(c.dateTime)}</time>
            </div>
            {c.remark && <p className="remark">{c.remark}</p>}
            {c.voiceUrl && (
              <div className="row">
                <audio controls preload="none" src={audioSrc(c.voiceUrl)} />
                <a href={c.voiceUrl} target="_blank" rel="noreferrer" className="small">Open in Drive</a>
              </div>
            )}
            <div className="tl-actions">
              <button className="link" onClick={() => edit(c)}>Edit</button>
              <button className="link danger-text" onClick={() => window.confirm('Delete this entry?') && onDeleteCall(c.id)}>Delete</button>
            </div>
          </li>
        ))}
      </ol>
    </aside>
  );
}
