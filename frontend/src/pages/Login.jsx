import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const s = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' },
  card: { background: '#fff', borderRadius: 16, padding: 40, width: 380, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', border: '1px solid #eee' },
  logo: { textAlign: 'center', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: 700, color: '#075e54', textAlign: 'center', marginBottom: 2 },
  sub: { color: '#888', fontSize: 13, textAlign: 'center', marginBottom: 4 },
  badge: { background: '#e8f5e9', color: '#075e54', fontSize: 12, fontWeight: 600, textAlign: 'center', marginBottom: 24, padding: '4px 12px', borderRadius: 20, display: 'inline-block', width: '100%' },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 6 },
  input: { width: '100%', padding: '10px 14px', border: '1.5px solid #ddd', borderRadius: 8, fontSize: 14, outline: 'none', marginBottom: 16, boxSizing: 'border-box' },
  btn: { width: '100%', padding: '11px', background: '#075e54', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 4 },
};

export default function Login() {
  const mode = 'login';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username || !password) return toast.error('Please fill in all fields');
    setLoading(true);
    try {
      await login(username, password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>
          <span style={{ fontSize: 20 }}>🇮🇳</span>
          <span style={{ fontSize: 36, display: 'block' }}>💬</span>
        </div>
        <div style={s.title}>WhatsApp Bot India</div>
        <div style={s.sub}>Sign in to your dashboard</div>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <span style={s.badge}>🇮🇳 Designed for Indian WhatsApp Numbers (+91)</span>
        </div>
        <form onSubmit={handleSubmit}>
          <label style={s.label}>Username</label>
          <input style={s.input} value={username} onChange={e => setUsername(e.target.value)} placeholder="admin" autoFocus />
          <label style={s.label}>Password</label>
          <input style={s.input} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          <button style={s.btn} disabled={loading}>
            {loading ? 'Please wait...' : '🔐 Sign In'}
          </button>
        </form>

      </div>
    </div>
  );
}
