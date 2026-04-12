const colors = {
  ready: { bg: '#d4edda', color: '#155724', label: '🟢 Ready' },
  authenticated: { bg: '#cce5ff', color: '#004085', label: '🔵 Authenticated' },
  qr_ready: { bg: '#fff3cd', color: '#856404', label: '🟡 Scan QR Code' },
  disconnected: { bg: '#f8d7da', color: '#721c24', label: '🔴 Disconnected' },
};

export default function StatusBadge({ status }) {
  const c = colors[status] || colors.disconnected;
  return (
    <span style={{ background: c.bg, color: c.color, padding: '4px 12px', borderRadius: 20, fontWeight: 600, fontSize: 13 }}>
      {c.label}
    </span>
  );
}
