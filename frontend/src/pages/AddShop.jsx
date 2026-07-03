import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useToast } from '../components/ToastContainer';

export default function AddShop() {
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ name: '', address: '', description: '', photoUrl: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.address.trim()) { setError('Name and address are required'); return; }
    setError('');
    setLoading(true);
    try {
      const data = await api.addShop(form);
      toast.success('Shop added successfully! 🎉');
      navigate(`/shop/${data.shop._id}`);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="add-shop-page fade-in">
      <h1>Add a Chai Shop</h1>
      <p className="subtitle">Know a great spot? Share it with the community.</p>

      <form className="add-shop-form glass-card" onSubmit={handleSubmit}>
        <div className="input-group">
          <label htmlFor="shop-name">Shop Name *</label>
          <input id="shop-name" className="input-field" type="text" placeholder="e.g. Sharma Ji Ki Chai" value={form.name} onChange={set('name')} required />
        </div>
        <div className="input-group">
          <label htmlFor="shop-address">Address *</label>
          <input id="shop-address" className="input-field" type="text" placeholder="e.g. 123 MG Road, Delhi" value={form.address} onChange={set('address')} required />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>The address will be geocoded automatically to show on the map.</span>
        </div>
        <div className="input-group">
          <label htmlFor="shop-desc">Description</label>
          <textarea id="shop-desc" className="input-field" placeholder="Tell us about this chai spot..." value={form.description} onChange={set('description')} />
        </div>
        <div className="input-group">
          <label htmlFor="shop-photo">Photo URL</label>
          <input id="shop-photo" className="input-field" type="url" placeholder="https://example.com/photo.jpg" value={form.photoUrl} onChange={set('photoUrl')} />
        </div>
        {error && <div className="error-msg" style={{ color: 'var(--error)' }}>{error}</div>}
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', marginTop: 8 }}>
          {loading ? 'Adding...' : '☕ Add Shop'}
        </button>
      </form>
    </div>
  );
}
