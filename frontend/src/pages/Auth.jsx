import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastContainer';

export default function Auth() {
  const { user, login, signup } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [tab, setTab] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) { navigate('/', { replace: true }); return null; }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'login') {
        await login(form.email, form.password);
        toast.success('Welcome back!');
      } else {
        if (!form.name.trim()) { setError('Name is required'); setLoading(false); return; }
        if (form.password.length < 6) { setError('Password must be at least 6 characters'); setLoading(false); return; }
        await signup(form.name, form.email, form.password);
        toast.success('Account created! Welcome to ChaiSpot!');
      }
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <div className="auth-page fade-in">
      <div className="auth-card glass-card">
        <h2>☕ ChaiSpot</h2>
        <p className="subtitle">{tab === 'login' ? 'Welcome back, chai lover!' : 'Join the chai community'}</p>

        <div className="auth-tabs">
          <button className={`auth-tab${tab === 'login' ? ' active' : ''}`} onClick={() => { setTab('login'); setError(''); }}>
            Login
          </button>
          <button className={`auth-tab${tab === 'signup' ? ' active' : ''}`} onClick={() => { setTab('signup'); setError(''); }}>
            Sign Up
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {tab === 'signup' && (
            <div className="input-group">
              <label htmlFor="auth-name">Name</label>
              <input id="auth-name" className="input-field" type="text" placeholder="Your name" value={form.name} onChange={set('name')} />
            </div>
          )}
          <div className="input-group">
            <label htmlFor="auth-email">Email</label>
            <input id="auth-email" className="input-field" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
          </div>
          <div className="input-group">
            <label htmlFor="auth-password">Password</label>
            <input id="auth-password" className="input-field" type="password" placeholder="••••••••" value={form.password} onChange={set('password')} required />
          </div>
          {error && <div className="error-msg">{error}</div>}
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Please wait...' : tab === 'login' ? 'Log In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
