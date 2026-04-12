import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const s = {
  nav: { background: '#075e54', color: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 58 },
  brand: { fontWeight: 700, fontSize: 17, color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 },
  brandSub: { fontSize: 11, color: '#25d366', fontWeight: 400 },
  links: { display: 'flex', gap: 4, alignItems: 'center' },
  link: (active) => ({ color: active ? '#25d366' : '#ccc', textDecoration: 'none', padding: '6px 14px', borderRadius: 6, fontWeight: active ? 600 : 400, background: active ? 'rgba(255,255,255,0.1)' : 'transparent', fontSize: 14 }),
  btn: { background: '#dc3545', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  user: { color: '#ccc', fontSize: 13, marginRight: 4 },
};

export default function Navbar() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <nav style={s.nav}>
      <a style={s.brand} href="/">
        <span>🇮🇳</span>
        <div>
          <div>WhatsApp Bot India</div>
          <div style={s.brandSub}>+91 Indian Numbers</div>
        </div>
      </a>
      <div style={s.links}>
        <Link style={s.link(pathname === '/')} to="/">Dashboard</Link>
        <Link style={s.link(pathname === '/contacts')} to="/contacts">Contacts</Link>
        <Link style={s.link(pathname === '/messages')} to="/messages">Messages</Link>
        <Link style={s.link(pathname === '/bulk')} to="/bulk">📢 Bulk Send</Link>
        <Link style={s.link(pathname === '/send')} to="/send">Send</Link>
        <span style={s.user}>👤 {user}</span>
        <button style={s.btn} onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );
}
