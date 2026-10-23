import { useEffect, useMemo, useState } from 'react';
import { api } from './api.js';
import CustomerModal from './CustomerModal.jsx';
import CustomerPanel from './CustomerPanel.jsx';
import { blobToBase64, fmtShort, getConfig, saveConfig, telLink, upsert, waLink } from './utils.js';

export default function App() {
  const [cfg, setCfg] = useState(getConfig());
  const [data, setData] = useState({ categories: [], customers: [], calls: [] });
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cat, setCat] = useState('all'); // 'all' | 'none' | categoryId
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [modal, setModal] = useState(null); // null | {} | customer
  const [newCat, setNewCat] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setData(await api('getAll'));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (cfg.url) load(); }, [cfg.url, cfg.key]);

  // Runs a backend action, shows errors in the banner.
  const run = async (fn) => {
    setBusy(true);
    setError('');
    try { await fn(); return true; }
    catch (e) { setError(e.message); return false; }
    finally { setBusy(false); }
  };

  /* ----- subtitles (categories) ----- */
  const addCategory = (e) => {
    e.preventDefault();
    const name = newCat.trim();
    if (!name) return;
    run(async () => {
      const saved = await api('saveCategory', { category: { name } });
      setData((d) => ({ ...d, categories: [...d.categories, saved] }));
      setNewCat('');
    });
  };

  const renameCategory = (c) => {
    const name = window.prompt('Rename subtitle', c.name);
    if (!name || !name.trim() || name.trim() === c.name) return;
    run(async () => {
      const saved = await api('saveCategory', { category: { id: c.id, name: name.trim() } });
      setData((d) => ({ ...d, categories: upsert(d.categories, saved) }));
    });
  };

  const deleteCategory = (c) => {
    if (!window.confirm(`Delete subtitle "${c.name}"? Its customers will move to Uncategorized.`)) return;
    run(async () => {
      await api('deleteCategory', { id: c.id });
      setData((d) => ({
        ...d,
        categories: d.categories.filter((x) => x.id !== c.id),
        customers: d.customers.map((x) => (x.categoryId === c.id ? { ...x, categoryId: '' } : x)),
      }));
      setCat('all');
    });
  };

  /* ----- customers ----- */
  const saveCustomer = async (customer) => {
    const ok = await run(async () => {
      const saved = await api('saveCustomer', { customer });
      setData((d) => ({ ...d, customers: upsert(d.customers, saved) }));
      setSelectedId(saved.id);
    });
    if (ok) setModal(null);
  };

  const deleteCustomer = (c) => {
    if (!window.confirm(`Delete ${c.name} and all their logged calls?`)) return;
    run(async () => {
      await api('deleteCustomer', { id: c.id });
      setData((d) => ({
        ...d,
        customers: d.customers.filter((x) => x.id !== c.id),
        calls: d.calls.filter((x) => x.customerId !== c.id),
      }));
      setSelectedId(null);
    });
  };

  /* ----- calls ----- */
  const saveCall = (call, voiceBlob) =>
    run(async () => {
      let voiceUrl = call.voiceUrl || '';
      if (voiceBlob) {
        const base64 = await blobToBase64(voiceBlob);
        const up = await api('uploadVoice', { base64, mime: voiceBlob.type });
        voiceUrl = up.url;
      }
      const saved = await api('saveCall', { call: { ...call, voiceUrl, id: call.id || undefined } });
      setData((d) => ({ ...d, calls: upsert(d.calls, saved) }));
    });

  const deleteCall = (id) =>
    run(async () => {
      await api('deleteCall', { id });
      setData((d) => ({ ...d, calls: d.calls.filter((x) => x.id !== id) }));
    });

  /* ----- derived ----- */
  const catName = (id) => data.categories.find((c) => c.id === id)?.name || 'Uncategorized';

  const lastCall = useMemo(() => {
    const m = {};
    data.calls.forEach((c) => {
      if (!m[c.customerId] || String(c.dateTime) > String(m[c.customerId].dateTime)) m[c.customerId] = c;
    });
    return m;
  }, [data.calls]);

  const callCount = useMemo(() => {
    const m = {};
    data.calls.forEach((c) => { m[c.customerId] = (m[c.customerId] || 0) + 1; });
    return m;
  }, [data.calls]);

  const counts = useMemo(() => {
    const m = { all: data.customers.length, none: 0 };
    data.customers.forEach((c) => {
      if (!c.categoryId || !data.categories.some((x) => x.id === c.categoryId)) m.none++;
      else m[c.categoryId] = (m[c.categoryId] || 0) + 1;
    });
    return m;
  }, [data]);

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    return data.customers
      .filter((c) => {
        if (cat === 'all') return true;
        if (cat === 'none') return !c.categoryId || !data.categories.some((x) => x.id === c.categoryId);
        return c.categoryId === cat;
      })
      .filter((c) => !term || c.name.toLowerCase().includes(term) || c.mobile.includes(term))
      .sort((a, b) => {
        const la = lastCall[a.id]?.dateTime || '';
        const lb = lastCall[b.id]?.dateTime || '';
        return lb.localeCompare(la) || a.name.localeCompare(b.name);
      });
  }, [data, cat, q, lastCall]);

  const selected = data.customers.find((c) => c.id === selectedId);
  const activeCat = data.categories.find((c) => c.id === cat);
  const heading = cat === 'all' ? 'All customers' : cat === 'none' ? 'Uncategorized' : activeCat?.name || 'Customers';


  return (
    <div className={'app' + (selected ? ' has-panel' : '')}>
      <nav className="side">
        <div className="brand">
          <span className="logo" aria-hidden="true">☎</span>
          <span>Calling CRM</span>
        </div>

        <ul className="cats">
          <li>
            <button className={'cat ' + (cat === 'all' ? 'on' : '')} onClick={() => setCat('all')}>
              <span>All customers</span><em>{counts.all}</em>
            </button>
          </li>
          {data.categories.map((c) => (
            <li key={c.id}>
              <button className={'cat ' + (cat === c.id ? 'on' : '')} onClick={() => setCat(c.id)}>
                <span>{c.name}</span><em>{counts[c.id] || 0}</em>
              </button>
              {cat === c.id && (
                <div className="cat-tools">
                  <button className="link" onClick={() => renameCategory(c)}>Rename</button>
                  <button className="link danger-text" onClick={() => deleteCategory(c)}>Delete</button>
                </div>
              )}
            </li>
          ))}
          <li>
            <button className={'cat ' + (cat === 'none' ? 'on' : '')} onClick={() => setCat('none')}>
              <span>Uncategorized</span><em>{counts.none}</em>
            </button>
          </li>
        </ul>

        <form className="addcat" onSubmit={addCategory}>
          <input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="New subtitle, e.g. Housing" aria-label="New subtitle" />
          <button className="btn ghost" disabled={!newCat.trim() || busy}>Add</button>
        </form>
      </nav>

      <main className="main">
        <header className="topbar">
          <h1>{heading}</h1>
          <div className="row">
            <input className="search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or number" aria-label="Search customers" />
            <button className="btn ghost" onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</button>
            <button className="btn primary" onClick={() => setModal({})}>New customer</button>
          </div>
        </header>

        {error && (
          <div className="banner" role="alert">
            <span>{error}</span>
            <button className="link" onClick={() => setError('')}>Dismiss</button>
          </div>
        )}

        {!loading && visible.length === 0 && (
          <div className="empty">
            <h3>{data.customers.length === 0 ? 'No customers yet' : 'Nothing matches here'}</h3>
            <p className="muted">
              {data.customers.length === 0
                ? 'Create a subtitle on the left (for example Housing or Flat), then add your first customer.'
                : 'Try another subtitle or clear the search.'}
            </p>
          </div>
        )}

        <ul className="list">
          {visible.map((c) => {
            const last = lastCall[c.id];
            return (
              <li key={c.id} className={'item ' + (c.id === selectedId ? 'on' : '')}>
                <button className="item-main" onClick={() => setSelectedId(c.id)}>
                  <strong>{c.name}</strong>
                  <span className="muted">{c.mobile}</span>
                  <span className="tag">{catName(c.categoryId)}</span>
                  <span className="last">
                    {last ? (
                      <><span className={'dot ' + last.channel.toLowerCase()} />{last.channel} · {fmtShort(last.dateTime)}</>
                    ) : 'No contact yet'}
                    {callCount[c.id] ? <em> · {callCount[c.id]} logged</em> : null}
                  </span>
                </button>
                <div className="item-actions">
                  <a className="btn call sm" href={telLink(c.mobile)} aria-label={`Call ${c.name}`}>Call</a>
                  <a className="btn wa sm" href={waLink(c.mobile, cfg.cc)} target="_blank" rel="noreferrer" aria-label={`WhatsApp ${c.name}`}>WhatsApp</a>
                </div>
              </li>
            );
          })}
        </ul>
      </main>

      {selected && (
        <CustomerPanel
          key={selected.id}
          customer={selected}
          categoryName={catName(selected.categoryId)}
          calls={data.calls.filter((x) => x.customerId === selected.id)}
          cfg={cfg}
          busy={busy}
          onClose={() => setSelectedId(null)}
          onEdit={() => setModal(selected)}
          onDelete={() => deleteCustomer(selected)}
          onSaveCall={saveCall}
          onDeleteCall={deleteCall}
        />
      )}

      {modal && (
        <CustomerModal
          customer={modal.id ? modal : null}
          categories={data.categories}
          defaultCategoryId={cat !== 'all' && cat !== 'none' ? cat : ''}
          onSave={saveCustomer}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
