import { useEffect, useState } from 'react';
import { whatsapp } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import QRModal from '../components/QRModal';
import toast from 'react-hot-toast';

const s = {
  page: { padding: 32 },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 24, color: '#111' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 32 },
  card: { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' },
  cardLabel: { fontSize: 13, color: '#888', marginBottom: 8 },
  cardValue: { fontSize: 32, fontWeight: 700, color: '#075e54' },
  statusCard: { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column', gap: 12 },
  row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  btn: { background: '#075e54', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  btnDanger: { background: '#dc3545', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  section: { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' },
  sectionTitle: { fontWeight: 700, fontSize: 15, marginBottom: 16, color: '#333' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '8px 12px', background: '#f8f9fa', color: '#555', fontWeight: 600, borderBottom: '1px solid #eee' },
  td: { padding: '10px 12px', borderBottom: '1px solid #f0f0f0', color: '#333' },
};

export default function Dashboard() {
  const [status, setStatus] = useState('disconnected');
  const [qr, setQr] = useState(null);
  const [stats, setStats] = useState({ contacts: 0, sent: 0, received: 0 });
  const [recent, setRecent] = useState([]);
  const [sending, setSending] = useState(false);
  const [showQR, setShowQR] = useState(false);

  async function load() {
    try {
      const [st, contacts, msgs] = await Promise.all([
        whatsapp.getStatus(),
        whatsapp.getContacts(),
        whatsapp.getMessages(),
      ]);
      setStatus(st.data.status);
      setQr(st.data.qr);
      if (st.data.qr && st.data.status === 'qr_ready') {
        setShowQR(true);
      }
      const sent = msgs.data.messages.filter(m => m.direction === 'sent').length;
      const received = msgs.data.messages.filter(m => m.direction === 'received').length;
      setStats({ contacts: contacts.data.total, sent, received });
      setRecent(msgs.data.messages.slice(-5).reverse());
    } catch {
      // backend may not be running
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(() => {
      whatsapp.getStatus().then(r => {
        setStatus(r.data.status);
        setQr(r.data.qr);
        if (r.data.qr && r.data.status === 'qr_ready' && !showQR) {
          setShowQR(true);
        }
        if (r.data.status === 'ready' || r.data.status === 'authenticated') {
          setShowQR(false);
        }
      }).catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, [showQR]);

  async function handleSendAll() {
    if (!window.confirm('Send messages to all contacts in contacts.csv?')) return;
    setSending(true);
    try {
      const res = await whatsapp.sendToAll();
      toast.success(`Sent: ${res.data.sent} | Failed: ${res.data.failed}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send');
    } finally {
      setSending(false);
    }
  }

  async function handleInit() {
    try {
      await whatsapp.initWhatsApp();
      toast.success('Initializing WhatsApp... QR code will appear shortly');
      setTimeout(load, 2000);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to initialize');
    }
  }

  async function handleLogout() {
    if (!window.confirm('Logout from WhatsApp? You will need to scan QR code again.')) return;
    try {
      await whatsapp.logoutWhatsApp();
      toast.success('Logged out successfully');
      setStatus('disconnected');
      setQr(null);
      setShowQR(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to logout');
    }
  }

  return (
    <div style={s.page}>
      <div style={s.title}>🇮🇳 Dashboard — WhatsApp Bot India</div>

      <div style={s.grid}>
        <div style={s.card}>
          <div style={s.cardLabel}>📋 Total Contacts</div>
          <div style={s.cardValue}>{stats.contacts}</div>
        </div>
        <div style={s.card}>
          <div style={s.cardLabel}>📤 Messages Sent</div>
          <div style={s.cardValue}>{stats.sent}</div>
        </div>
        <div style={s.card}>
          <div style={s.cardLabel}>📥 Replies Received</div>
          <div style={s.cardValue}>{stats.received}</div>
        </div>
        <div style={s.statusCard}>
          <div style={s.cardLabel}>WhatsApp Status</div>
          <StatusBadge status={status} />
          <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
            {status === 'disconnected' && (
              <button style={s.btn} onClick={handleInit}>🔌 Connect</button>
            )}
            {status === 'qr_ready' && (
              <button style={s.btn} onClick={() => setShowQR(true)}>📱 Scan QR Code</button>
            )}
            {(status === 'ready' || status === 'authenticated') && (
              <>
                <button style={s.btnDanger} onClick={handleLogout}>🚪 Logout</button>
                <button style={s.btnDanger} onClick={handleSendAll} disabled={sending}>
                  {sending ? 'Sending...' : '📤 Send to All'}
                </button>
              </>
            )}
            <button style={s.btn} onClick={load}>🔄 Refresh</button>
          </div>
        </div>
      </div>

      <div style={s.section}>
        <div style={s.sectionTitle}>📨 Recent Messages</div>
        {recent.length === 0 ? (
          <p style={{ color: '#aaa', fontSize: 13 }}>No messages yet.</p>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Time</th>
                <th style={s.th}>Direction</th>
                <th style={s.th}>Name</th>
                <th style={s.th}>Number</th>
                <th style={s.th}>Message</th>
                <th style={s.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((m, i) => (
                <tr key={i}>
                  <td style={s.td}>{new Date(m.timestamp).toLocaleString('en-IN')}</td>
                  <td style={s.td}>
                    <span style={{ color: m.direction === 'sent' ? '#075e54' : '#e67e22', fontWeight: 600 }}>
                      {m.direction === 'sent' ? '↑ Sent' : '↓ Received'}
                    </span>
                  </td>
                  <td style={s.td}>{m.name || '—'}</td>
                  <td style={s.td}>{(m.direction === 'sent' ? m.to : m.from).replace('@c.us', '').replace(/#.*$/, '').replace(/@lid$/, '')}</td>
                  <td style={s.td}>{m.message}</td>
                  <td style={s.td}>{m.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showQR && <QRModal qr={qr} onClose={() => setShowQR(false)} />}
    </div>
  );
}
