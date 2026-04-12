const s = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: 16, padding: 32, maxWidth: 400, textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' },
  title: { fontSize: 20, fontWeight: 700, marginBottom: 8, color: '#075e54' },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 24 },
  qr: { width: 256, height: 256, margin: '0 auto 24px', border: '4px solid #075e54', borderRadius: 12, padding: 8 },
  btn: { background: '#dc3545', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  loading: { fontSize: 14, color: '#888', padding: 40 },
};

export default function QRModal({ qr, onClose }) {
  if (!qr) return null;

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <div style={s.title}>📱 Scan QR Code</div>
        <div style={s.subtitle}>Open WhatsApp on your phone and scan this code</div>
        {qr === 'loading' ? (
          <div style={s.loading}>Generating QR code...</div>
        ) : (
          <img src={qr} alt="WhatsApp QR Code" style={s.qr} />
        )}
        <button style={s.btn} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
