import { useEffect, useRef, useState } from 'react';
import { whatsapp } from '../api/client';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const s = {
  page: { padding: 32 },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  title: { fontSize: 22, fontWeight: 700, color: '#111' },
  filters: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  filterBtn: (active) => ({
    padding: '7px 14px', borderRadius: 20,
    border: '1.5px solid ' + (active ? '#075e54' : '#ddd'),
    background: active ? '#075e54' : '#fff',
    color: active ? '#fff' : '#555',
    cursor: 'pointer', fontWeight: 600, fontSize: 13,
  }),
  btnRefresh: { background: '#075e54', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  btnClear: { background: '#dc3545', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  exportGroup: { display: 'flex', gap: 6, alignItems: 'center' },
  exportLabel: { fontSize: 12, color: '#888', fontWeight: 600 },
  btnExcel: { background: '#217346', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  btnPdf: { background: '#e53935', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  btnCsv: { background: '#1565c0', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  card: { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '10px 14px', background: '#f8f9fa', color: '#555', fontWeight: 600, borderBottom: '2px solid #eee', whiteSpace: 'nowrap' },
  td: { padding: '11px 14px', borderBottom: '1px solid #f0f0f0', color: '#333', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  empty: { textAlign: 'center', padding: 40, color: '#aaa' },
};

function StatusBadge({ status }) {
  if (!status) return <span style={{ color: '#aaa' }}>—</span>;
  const s = status.toLowerCase();
  if (s === 'sent') return <span style={{ background: '#e8f5e9', color: '#2e7d32', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>✅ Sent</span>;
  if (s === 'received') return <span style={{ background: '#e3f2fd', color: '#1565c0', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>📥 Received</span>;
  if (s.startsWith('failed')) return <span style={{ background: '#fdecea', color: '#c62828', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }} title={status}>❌ Failed</span>;
  return <span style={{ background: '#f5f5f5', color: '#666', padding: '3px 10px', borderRadius: 12, fontSize: 12 }}>{status}</span>;
}

function DirectionBadge({ direction }) {
  if (direction === 'sent') return <span style={{ color: '#075e54', fontWeight: 600 }}>↑ Sent</span>;
  return <span style={{ color: '#e67e22', fontWeight: 600 }}>↓ Received</span>;
}

// Helper to clean phone number for display
function cleanNumber(raw) {
  return String(raw || '')
    .replace('@c.us', '')
    .replace(/#.*$/, '')   // strip #lid
    .trim();
}
function buildRows(messages) {
  return messages.map(m => ({
    Timestamp: new Date(m.timestamp).toLocaleString('en-IN'),
    Direction: m.direction === 'sent' ? 'Sent' : 'Received',
    Name: m.name || '',
    Number: (m.direction === 'sent' ? m.to : m.from).replace('@c.us', '').replace(/#.*$/, ''),
    Message: m.message,
    Status: m.status,
  }));
}

function exportExcel(messages, filename = 'messages') {
  const rows = buildRows(messages);
  const ws = XLSX.utils.json_to_sheet(rows);
  // Column widths
  ws['!cols'] = [{ wch: 22 }, { wch: 10 }, { wch: 20 }, { wch: 18 }, { wch: 50 }, { wch: 12 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Messages');
  XLSX.writeFile(wb, `${filename}.xlsx`);
  toast.success('Exported as Excel');
}

function exportCSV(messages, filename = 'messages') {
  const rows = buildRows(messages);
  const ws = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${filename}.csv`; a.click();
  URL.revokeObjectURL(url);
  toast.success('Exported as CSV');
}

function exportPDF(messages, filter, filename = 'messages') {
  const rows = buildRows(messages);
  const doc = new jsPDF({ orientation: 'landscape' });

  // Header
  doc.setFontSize(16);
  doc.setTextColor(7, 94, 84);
  doc.text('WhatsApp Bot India — Message Log', 14, 16);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Filter: ${filter.toUpperCase()} | Total: ${rows.length} | Generated: ${new Date().toLocaleString('en-IN')}`, 14, 23);

  autoTable(doc, {
    startY: 28,
    head: [['Timestamp', 'Direction', 'Name', 'Number', 'Message', 'Status']],
    body: rows.map(r => [r.Timestamp, r.Direction, r.Name, r.Number, r.Message, r.Status]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [7, 94, 84], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 250, 248] },
    columnStyles: {
      0: { cellWidth: 38 },
      1: { cellWidth: 20 },
      2: { cellWidth: 30 },
      3: { cellWidth: 30 },
      4: { cellWidth: 90 },
      5: { cellWidth: 20 },
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 5) {
        const val = data.cell.raw?.toLowerCase() || '';
        if (val === 'sent') doc.setTextColor(46, 125, 50);
        else if (val === 'received') doc.setTextColor(21, 101, 192);
        else if (val.startsWith('failed')) doc.setTextColor(198, 40, 40);
      }
    },
  });

  doc.save(`${filename}.pdf`);
  toast.success('Exported as PDF');
}

// ── Component ───────────────────────────────────────────────────────────────
export default function Messages() {
  const [messages, setMessages] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showExport, setShowExport] = useState(false);
  const exportRef = useRef();

  async function load(dir) {
    setLoading(true);
    try {
      const res = await whatsapp.getMessages(dir === 'all' ? undefined : dir);
      setMessages(res.data.messages.reverse());
    } catch {
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(filter); }, [filter]);

  // Close export dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (exportRef.current && !exportRef.current.contains(e.target)) setShowExport(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleClearLog() {
    if (!window.confirm('⚠️ Clear all message logs? This cannot be undone.')) return;
    try {
      await whatsapp.clearMessages();
      toast.success('Message log cleared');
      setMessages([]);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to clear log');
    }
  }

  const sent     = messages.filter(m => m.status === 'sent').length;
  const received = messages.filter(m => m.status === 'received').length;
  const failed   = messages.filter(m => m.status?.startsWith('failed')).length;

  const FILTERS = [
    { key: 'all',      label: `📋 All (${messages.length})` },
    { key: 'sent',     label: `↑ Sent (${sent})` },
    { key: 'received', label: `↓ Received (${received})` },
    { key: 'failed',   label: `❌ Failed (${failed})` },
  ];

  const displayed = filter === 'failed'
    ? messages.filter(m => m.status?.startsWith('failed'))
    : filter === 'all' ? messages
    : messages.filter(m => m.direction === filter);

  const filename = `messages_${filter}_${new Date().toISOString().slice(0, 10)}`;

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.title}>
          Message Log <span style={{ fontSize: 14, color: '#888', fontWeight: 400 }}>({displayed.length})</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={s.filters}>
            {FILTERS.map(f => (
              <button key={f.key} style={s.filterBtn(filter === f.key)} onClick={() => setFilter(f.key)}>
                {f.label}
              </button>
            ))}
          </div>
          <button style={s.btnRefresh} onClick={() => load(filter)}>🔄 Refresh</button>

          {/* Export dropdown */}
          <div style={{ position: 'relative' }} ref={exportRef}>
            <button
              style={{ ...s.btnExcel, background: '#555' }}
              onClick={() => setShowExport(v => !v)}
              disabled={displayed.length === 0}
            >
              📥 Export ▾
            </button>
            {showExport && (
              <div style={{
                position: 'absolute', right: 0, top: '110%', background: '#fff',
                borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                minWidth: 180, zIndex: 100, overflow: 'hidden', border: '1px solid #eee',
              }}>
                <button
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 14, textAlign: 'left' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f0faf7'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  onClick={() => { exportExcel(displayed, filename); setShowExport(false); }}
                >
                  <span style={{ fontSize: 20 }}>📊</span>
                  <div>
                    <div style={{ fontWeight: 600, color: '#217346' }}>Excel (.xlsx)</div>
                    <div style={{ fontSize: 11, color: '#888' }}>Open in Microsoft Excel</div>
                  </div>
                </button>
                <div style={{ height: 1, background: '#f0f0f0' }} />
                <button
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 14, textAlign: 'left' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fff8f8'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  onClick={() => { exportPDF(displayed, filter, filename); setShowExport(false); }}
                >
                  <span style={{ fontSize: 20 }}>📄</span>
                  <div>
                    <div style={{ fontWeight: 600, color: '#e53935' }}>PDF (.pdf)</div>
                    <div style={{ fontSize: 11, color: '#888' }}>Print or share as PDF</div>
                  </div>
                </button>
                <div style={{ height: 1, background: '#f0f0f0' }} />
                <button
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 14, textAlign: 'left' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f0f4ff'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  onClick={() => { exportCSV(displayed, filename); setShowExport(false); }}
                >
                  <span style={{ fontSize: 20 }}>📋</span>
                  <div>
                    <div style={{ fontWeight: 600, color: '#1565c0' }}>CSV (.csv)</div>
                    <div style={{ fontSize: 11, color: '#888' }}>Import to Google Sheets</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          <button style={s.btnClear} onClick={handleClearLog} disabled={messages.length === 0}>🗑️ Clear Log</button>
        </div>
      </div>

      <div style={s.card}>
        {loading ? (
          <div style={s.empty}>Loading messages...</div>
        ) : displayed.length === 0 ? (
          <div style={s.empty}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <div>{filter === 'all' ? 'No messages recorded yet.' : `No ${filter} messages.`}</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>#</th>
                  <th style={s.th}>Time</th>
                  <th style={s.th}>Direction</th>
                  <th style={s.th}>Name</th>
                  <th style={s.th}>Number</th>
                  <th style={s.th}>Message</th>
                  <th style={s.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((m, i) => (
                  <tr key={i} style={{ background: m.status?.startsWith('failed') ? '#fff8f8' : 'transparent' }}>
                    <td style={{ ...s.td, color: '#aaa', maxWidth: 40 }}>{i + 1}</td>
                    <td style={{ ...s.td, maxWidth: 160, fontSize: 12 }}>
                      {new Date(m.timestamp).toLocaleString('en-IN')}
                    </td>
                    <td style={{ ...s.td, maxWidth: 90 }}>
                      <DirectionBadge direction={m.direction} />
                    </td>
                    <td style={s.td}>{m.name || '—'}</td>
                    <td style={{ ...s.td, maxWidth: 140 }}>
                      {(m.direction === 'sent' ? m.to : m.from)
                        .replace('@c.us', '')
                        .replace(/#.*$/, '')
                        .replace(/@lid$/, '')}
                    </td>
                    <td style={{ ...s.td, maxWidth: 280 }} title={m.message}>{m.message}</td>
                    <td style={{ ...s.td, maxWidth: 110 }}>
                      <StatusBadge status={m.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
