import { useState } from 'react';
import { whatsapp } from '../api/client';
import toast from 'react-hot-toast';

const s = {
  page: { padding: 32 },
  title: { fontSize: 22, fontWeight: 700, color: '#111', marginBottom: 4 },
  sub: { fontSize: 13, color: '#888', marginBottom: 24 },
  card: { background: '#fff', borderRadius: 12, padding: 32, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', maxWidth: 540 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 6 },
  phoneRow: { display: 'flex', gap: 8, marginBottom: 18 },
  prefix: { padding: '10px 14px', border: '1.5px solid #ddd', borderRadius: 8, fontSize: 14, background: '#f8f9fa', color: '#555', fontWeight: 600, whiteSpace: 'nowrap' },
  input: { width: '100%', padding: '10px 14px', border: '1.5px solid #ddd', borderRadius: 8, fontSize: 14, outline: 'none', marginBottom: 18 },
  textarea: { width: '100%', padding: '10px 14px', border: '1.5px solid #ddd', borderRadius: 8, fontSize: 14, outline: 'none', marginBottom: 18, resize: 'vertical', minHeight: 110 },
  btn: { background: '#075e54', color: '#fff', border: 'none', padding: '11px 28px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 15 },
  hint: { fontSize: 12, color: '#aaa', marginTop: -14, marginBottom: 18 },
  result: { marginTop: 20, background: '#f8f9fa', borderRadius: 8, padding: 16, fontSize: 13 },
  success: { color: '#2e7d32', fontWeight: 600 },
  error: { color: '#c62828', fontWeight: 600 },
  templates: { marginBottom: 20 },
  templateTitle: { fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 8 },
  templateBtn: { background: '#e8f5e9', color: '#075e54', border: '1px solid #c8e6c9', padding: '5px 12px', borderRadius: 16, cursor: 'pointer', fontSize: 12, marginRight: 6, marginBottom: 6 },
};

const TEMPLATES = [
  { label: 'Greeting', text: 'Hello! 👋 Welcome. How can we help you today?' },
  { label: 'Offer', text: '🎉 Special offer! Get 20% discount today only. Order now and save big!' },
  { label: 'Reminder', text: '⏰ Reminder: Your appointment is scheduled for tomorrow. Please be on time.' },
  { label: 'Thank You', text: '🙏 Thank you so much! Your trust means a lot to us. We appreciate your support.' },
  { label: 'Festival', text: '🪔 Warm festival greetings to you and your family! Wishing you joy and happiness.' },
  { label: 'Follow Up', text: '📞 Just following up on our previous conversation. Please let us know if you need any assistance.' },
];

export default function Send() {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  function getFullNumber() {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('91') && cleaned.length === 12) return cleaned;
    return '91' + cleaned;
  }

  async function handleSend(e) {
    e.preventDefault();
    const cleaned = phone.replace(/\D/g, '');
    if (!cleaned || cleaned.length < 10) return toast.error('Please enter a valid 10-digit Indian mobile number');
    if (!message) return toast.error('Message is required');

    const fullNumber = getFullNumber();
    setLoading(true);
    setResult(null);
    try {
      const res = await whatsapp.sendMessage(fullNumber, message.trim(), name.trim());
      setResult({ ok: true, data: res.data });
      toast.success('Message sent successfully! 🎉');
      setPhone(''); setName(''); setMessage('');
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to send message';
      setResult({ ok: false, error: msg });
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.page}>
      <div style={s.title}>📤 Send Message</div>
      <div style={s.sub}>Send a direct message to any Indian WhatsApp number (+91)</div>
      <div style={s.card}>

        <div style={s.templates}>
          <div style={s.templateTitle}>⚡ Quick Templates:</div>
          {TEMPLATES.map(t => (
            <button key={t.label} style={s.templateBtn} onClick={() => setMessage(t.text)}>
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSend}>
          <label style={s.label}>📱 Mobile Number (10 digits) *</label>
          <div style={s.phoneRow}>
            <span style={s.prefix}>🇮🇳 +91</span>
            <input
              style={{ ...s.input, marginBottom: 0, flex: 1 }}
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="9876543210"
              maxLength={10}
            />
          </div>
          <div style={s.hint}>Enter 10-digit Indian mobile number without 0 or +91 prefix</div>

          <label style={s.label}>👤 Contact Name (optional)</label>
          <input
            style={s.input}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Rahul Sharma"
          />

          <label style={s.label}>💬 Message *</label>
          <textarea
            style={s.textarea}
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Type your message here..."
          />

          <button style={s.btn} disabled={loading}>
            {loading ? 'Sending...' : '📤 Send Message'}
          </button>
        </form>

        {result && (
          <div style={s.result}>
            {result.ok ? (
              <div style={s.success}>
                ✅ Message sent to: +{result.data.to.replace('@c.us', '')}<br />
                <span style={{ fontWeight: 400, color: '#555' }}>{result.data.message}</span>
              </div>
            ) : (
              <div style={s.error}>❌ {result.error}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
