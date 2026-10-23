import { useState } from 'react';

export default function CustomerModal({ customer, categories, defaultCategoryId, onSave, onClose }) {
  const [name, setName] = useState(customer?.name || '');
  const [mobile, setMobile] = useState(customer?.mobile || '');
  const [categoryId, setCategoryId] = useState(customer?.categoryId ?? defaultCategoryId ?? '');
  const [note, setNote] = useState(customer?.note || '');

  const submit = (e) => {
    e.preventDefault();
    onSave({ ...(customer?.id ? { id: customer.id } : {}), name, mobile, categoryId, note });
  };

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={submit}>
        <h2>{customer?.id ? 'Edit customer' : 'New customer'}</h2>
        <label>Name
          <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </label>
        <label>Mobile number
          <input value={mobile} onChange={(e) => setMobile(e.target.value)} inputMode="tel" placeholder="e.g. 9876543210" required />
        </label>
        <label>Subtitle
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Uncategorized</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label>Note (optional)
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <div className="row end">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary">Save customer</button>
        </div>
      </form>
    </div>
  );
}
