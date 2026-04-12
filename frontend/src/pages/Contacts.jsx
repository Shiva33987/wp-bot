import { useEffect, useRef, useState } from 'react';
import { whatsapp } from '../api/client';
import toast from 'react-hot-toast';

// ─── Auto-detect which column is name/phone/message ───────────────────────
const NAME_HINTS  = ['name', 'full name', 'fullname', 'contact', 'customer', 'person', 'client', 'naam'];
const PHONE_HINTS = ['phone', 'mobile', 'number', 'cell', 'contact number', 'whatsapp', 'ph', 'mob', 'no', 'phone number', 'mobile number'];
const MSG_HINTS   = ['message', 'msg', 'text', 'content', 'body', 'note', 'sandesh'];

function detectCol(headers, hints) {
  return headers.find(h => hints.some(hint => h.toLowerCase().includes(hint))) || '';
}

const s = {
  page: { padding: 32 },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 },
  title: { fontSize: 22, fontWeight: 700, color: '#111' },
  btn: { background: '#075e54', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  btnAdd: { background: '#1976d2', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  btnDanger: { background: '#dc3545', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  btnDelete: { background: '#dc3545', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 12 },
  select: { padding: '9px 14px', borderRadius: 8, border: '2px solid #075e54', background: '#fff', color: '#075e54', fontWeight: 600, cursor: 'pointer', fontSize: 13 },
  card: { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', marginBottom: 20 },
  uploadBox: { border: '2px dashed #ccc', borderRadius: 12, padding: 32, textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s', background: '#fafafa' },
  uploadBoxActive: { border: '2px dashed #075e54', background: '#f0faf7' },
  mapGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 },
  mapLabel: { fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 6 },
  mapSelect: { width: '100%', padding: '9px 12px', border: '1.5px solid #ddd', borderRadius: 8, fontSize: 13, outline: 'none', background: '#fff' },
  mapSelectHighlight: { width: '100%', padding: '9px 12px', border: '1.5px solid #075e54', borderRadius: 8, fontSize: 13, outline: 'none', background: '#f0faf7' },
  previewTable: { width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 12 },
  previewTh: { padding: '6px 10px', background: '#f0faf7', color: '#075e54', fontWeight: 600, borderBottom: '2px solid #c8e6c9', textAlign: 'left' },
  previewTd: { padding: '6px 10px', borderBottom: '1px solid #f0f0f0', color: '#555' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: { textAlign: 'left', padding: '10px 14px', background: '#f8f9fa', color: '#555', fontWeight: 600, borderBottom: '2px solid #eee' },
  td: { padding: '12px 14px', borderBottom: '1px solid #f0f0f0', color: '#333' },
  badge: { background: '#e8f5e9', color: '#2e7d32', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 },
  empty: { textAlign: 'center', padding: 40, color: '#aaa' },
  hint: { fontSize: 12, color: '#888', marginTop: 12 },
  tag: (ok) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: ok ? '#e8f5e9' : '#fff3e0', color: ok ? '#2e7d32' : '#e65100', marginLeft: 6 }),
  sheetInput: { width: '100%', padding: '10px 14px', border: '1.5px solid #ddd', borderRadius: 8, fontSize: 13, outline: 'none', marginBottom: 12, boxSizing: 'border-box' },
  sectionTitle: { fontWeight: 700, fontSize: 14, color: '#333', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 },
  defaultMsgInput: { width: '100%', padding: '9px 12px', border: '1.5px solid #ddd', borderRadius: 8, fontSize: 13, outline: 'none', resize: 'vertical', minHeight: 60, boxSizing: 'border-box' },
  // Modal
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: 14, padding: 32, width: 420, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' },
  modalTitle: { fontSize: 18, fontWeight: 700, color: '#111', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 },
  modalLabel: { display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 6 },
  modalInput: { width: '100%', padding: '10px 14px', border: '1.5px solid #ddd', borderRadius: 8, fontSize: 14, outline: 'none', marginBottom: 16, boxSizing: 'border-box' },
  modalPhoneRow: { display: 'flex', gap: 8, marginBottom: 16 },
  modalPrefix: { padding: '10px 12px', border: '1.5px solid #ddd', borderRadius: 8, fontSize: 14, background: '#f8f9fa', color: '#555', fontWeight: 600, whiteSpace: 'nowrap' },
  modalTextarea: { width: '100%', padding: '10px 14px', border: '1.5px solid #ddd', borderRadius: 8, fontSize: 14, outline: 'none', marginBottom: 16, resize: 'vertical', minHeight: 80, boxSizing: 'border-box' },
  modalFooter: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 },
  modalCancel: { background: '#f0f0f0', color: '#555', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
  modalSave: { background: '#075e54', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 8, cursor: 'pointer', fontWeight: 700 },
};

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [source, setSource] = useState('csv');

  // Upload state
  const [uploadStep, setUploadStep] = useState('idle'); // idle | mapping | done
  const [headers, setHeaders] = useState([]);
  const [preview, setPreview] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [nameCol, setNameCol] = useState('');
  const [phoneCol, setPhoneCol] = useState('');
  const [messageCol, setMessageCol] = useState('');
  const [defaultMessage, setDefaultMessage] = useState('Hello! This is a message from our WhatsApp Bot.');
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);

  // Add contact modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [addingContact, setAddingContact] = useState(false);

  // Google Sheets state
  const [sheetUrl, setSheetUrl] = useState('');
  const [sheetLoading, setSheetLoading] = useState(false);

  const fileRef = useRef();

  async function load() {
    setLoading(true);
    try {
      const res = await whatsapp.getContacts();
      setContacts(res.data.contacts);
    } catch {
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // ── Auto-detect columns from headers ──────────────────────────────────────
  function applyAutoDetect(hdrs) {
    const n = detectCol(hdrs, NAME_HINTS);
    const p = detectCol(hdrs, PHONE_HINTS);
    const m = detectCol(hdrs, MSG_HINTS);
    setNameCol(n);
    setPhoneCol(p);
    setMessageCol(m);
    if (n) toast.success(`Auto-detected: Name → "${n}"${p ? `, Phone → "${p}"` : ''}${m ? `, Message → "${m}"` : ''}`);
  }

  // ── CSV file upload ────────────────────────────────────────────────────────
  async function handleFile(file) {
    if (!file) return;
    const name = file.name.toLowerCase();
    if (!name.endsWith('.csv') && !name.endsWith('.xlsx') && !name.endsWith('.xls')) {
      return toast.error('Please upload a .csv, .xlsx or .xls file');
    }
    setUploadedFile(file);
    try {
      toast.loading('Parsing file...', { id: 'upload' });
      const res = await whatsapp.uploadCSV(file);
      toast.success(`Found ${res.data.total} rows with ${res.data.headers.length} columns`, { id: 'upload' });
      setHeaders(res.data.headers);
      setPreview(res.data.preview);
      setTotalRows(res.data.total);
      setUploadStep('mapping');
      applyAutoDetect(res.data.headers);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to parse file. Check the format.', { id: 'upload' });
    }
  }

  function onFileInput(e) { handleFile(e.target.files[0]); }
  function onDrop(e) { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }

  // ── Google Sheets preview ─────────────────────────────────────────────────
  async function handleSheetPreview() {
    if (!sheetUrl.trim()) return toast.error('Please enter a Google Sheets URL');
    setSheetLoading(true);
    try {
      const res = await whatsapp.previewSheets(sheetUrl.trim());
      setHeaders(res.data.headers);
      setPreview(res.data.preview);
      setTotalRows(res.data.total);
      setUploadStep('mapping');
      applyAutoDetect(res.data.headers);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to fetch sheet. Make sure it is publicly shared.');
    } finally {
      setSheetLoading(false);
    }
  }

  // ── Import contacts ────────────────────────────────────────────────────────
  async function handleImport() {
    if (!nameCol) return toast.error('Please select the Name column');
    if (!phoneCol) return toast.error('Please select the Phone column');
    setImporting(true);
    try {
      let res;
      if (source === 'csv') {
        res = await whatsapp.importContacts(uploadedFile, nameCol, phoneCol, messageCol, defaultMessage);
      } else {
        res = await whatsapp.importSheets(sheetUrl.trim(), nameCol, phoneCol, messageCol, defaultMessage);
      }
      toast.success(`✅ Imported ${res.data.imported} contacts successfully!`);
      setUploadStep('idle');
      setHeaders([]); setPreview([]); setUploadedFile(null); setSheetUrl('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  function resetUpload() {
    setUploadStep('idle');
    setHeaders([]); setPreview([]); setUploadedFile(null);
    setNameCol(''); setPhoneCol(''); setMessageCol('');
  }

  async function handleSendAll() {
    if (!window.confirm(`Send messages to all ${contacts.length} contacts?`)) return;
    setSending(true);
    try {
      const res = await whatsapp.sendToAll();
      toast.success(`✅ Sent: ${res.data.sent} | ❌ Failed: ${res.data.failed}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Send failed');
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(phone, name) {
    if (!window.confirm(`Delete contact "${name}" (${phone})?`)) return;
    try {
      await whatsapp.deleteContact(phone);
      toast.success(`Deleted ${name}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed');
    }
  }

  async function handleDeleteAll() {
    if (!window.confirm(`⚠️ Delete ALL ${contacts.length} contacts? This cannot be undone!`)) return;
    try {
      const res = await whatsapp.deleteAllContacts();
      toast.success(`Deleted ${res.data.deleted} contacts`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete all failed');
    }
  }

  async function handleAddContact(e) {
    e.preventDefault();
    const cleaned = newPhone.replace(/\D/g, '');
    if (cleaned.length < 10) return toast.error('Enter a valid 10-digit mobile number');
    setAddingContact(true);
    try {
      await whatsapp.addContact(newName.trim(), cleaned, newMessage.trim());
      toast.success(`✅ Contact added: ${newName || cleaned}`);
      setShowAddModal(false);
      setNewName(''); setNewPhone(''); setNewMessage('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add contact');
    } finally {
      setAddingContact(false);
    }
  }

  return (
    <div style={s.page}>

      {/* ── Header ── */}
      <div style={s.header}>
        <div style={s.title}>
          Contacts <span style={{ fontSize: 14, color: '#888', fontWeight: 400 }}>({contacts.length})</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <select style={s.select} value={source} onChange={e => { setSource(e.target.value); resetUpload(); }}>
            <option value="csv">📄 CSV File</option>
            <option value="sheets">📊 Google Sheets</option>
          </select>
          <button style={s.btnAdd} onClick={() => setShowAddModal(true)}>➕ Add Contact</button>
          <button style={s.btn} onClick={load}>🔄 Refresh</button>
          <button style={s.btnDanger} onClick={handleDeleteAll} disabled={contacts.length === 0}>🗑️ Delete All</button>
          <button style={s.btnDanger} onClick={handleSendAll} disabled={sending || contacts.length === 0}>
            {sending ? 'Sending...' : '📤 Send to All'}
          </button>
        </div>
      </div>

      {/* ── Upload / Import Section ── */}
      <div style={s.card}>
        {uploadStep === 'idle' && (
          <>
            {source === 'csv' ? (
              <>
                <div style={s.sectionTitle}>📤 Upload CSV or Excel File</div>
                <div
                  style={{ ...s.uploadBox, ...(dragOver ? s.uploadBoxActive : {}) }}
                  onClick={() => fileRef.current.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                >
                  <div style={{ fontSize: 36, marginBottom: 8 }}>📂</div>
                  <div style={{ fontWeight: 600, color: '#333', marginBottom: 4 }}>Click to upload or drag & drop</div>
                  <div style={{ fontSize: 12, color: '#aaa' }}>Supports CSV, Excel (.xlsx, .xls) — any column names, we'll auto-detect name & phone</div>
                  <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={onFileInput} />
                </div>
              </>
            ) : (
              <>
                <div style={s.sectionTitle}>📊 Import from Google Sheets</div>
                <div style={{ fontSize: 13, color: '#888', marginBottom: 10 }}>
                  Make sure your sheet is shared as <strong>"Anyone with the link can view"</strong>
                </div>
                <input
                  style={s.sheetInput}
                  value={sheetUrl}
                  onChange={e => setSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit"
                />
                <button style={s.btn} onClick={handleSheetPreview} disabled={sheetLoading}>
                  {sheetLoading ? 'Fetching...' : '🔍 Fetch & Preview'}
                </button>
              </>
            )}
          </>
        )}

        {uploadStep === 'mapping' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={s.sectionTitle}>
                🗂️ Map Columns
                <span style={{ fontSize: 12, color: '#888', fontWeight: 400 }}>
                  {totalRows} rows detected
                </span>
              </div>
              <button style={{ ...s.btn, background: '#888', padding: '6px 14px', fontSize: 12 }} onClick={resetUpload}>✕ Cancel</button>
            </div>

            {/* Column mapping */}
            <div style={s.mapGrid}>
              <div>
                <div style={s.mapLabel}>
                  👤 Name Column *
                  {nameCol && <span style={s.tag(true)}>Auto-detected</span>}
                </div>
                <select style={nameCol ? s.mapSelectHighlight : s.mapSelect} value={nameCol} onChange={e => setNameCol(e.target.value)}>
                  <option value="">— Select column —</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <div style={s.mapLabel}>
                  📱 Phone Column *
                  {phoneCol && <span style={s.tag(true)}>Auto-detected</span>}
                </div>
                <select style={phoneCol ? s.mapSelectHighlight : s.mapSelect} value={phoneCol} onChange={e => setPhoneCol(e.target.value)}>
                  <option value="">— Select column —</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <div style={s.mapLabel}>
                  💬 Message Column
                  {messageCol && <span style={s.tag(true)}>Auto-detected</span>}
                  <span style={s.tag(false)}>Optional</span>
                </div>
                <select style={messageCol ? s.mapSelectHighlight : s.mapSelect} value={messageCol} onChange={e => setMessageCol(e.target.value)}>
                  <option value="">— Use default message —</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>

            {/* Default message if no message column */}
            {!messageCol && (
              <div style={{ marginBottom: 16 }}>
                <div style={s.mapLabel}>📝 Default Message (sent to all contacts)</div>
                <textarea
                  style={s.defaultMsgInput}
                  value={defaultMessage}
                  onChange={e => setDefaultMessage(e.target.value)}
                  placeholder="Type the message to send to all contacts..."
                />
              </div>
            )}

            {/* Preview table */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 8 }}>
                👁️ Preview (first {preview.length} rows)
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={s.previewTable}>
                  <thead>
                    <tr>
                      {headers.map(h => (
                        <th key={h} style={{
                          ...s.previewTh,
                          background: h === nameCol ? '#e8f5e9' : h === phoneCol ? '#e3f2fd' : h === messageCol ? '#fff8e1' : '#f8f9fa',
                          color: h === nameCol ? '#2e7d32' : h === phoneCol ? '#1565c0' : h === messageCol ? '#f57f17' : '#555',
                        }}>
                          {h === nameCol ? '👤 ' : h === phoneCol ? '📱 ' : h === messageCol ? '💬 ' : ''}{h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i}>
                        {headers.map(h => (
                          <td key={h} style={s.previewTd}>{row[h] || '—'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button style={s.btn} onClick={handleImport} disabled={importing || !nameCol || !phoneCol}>
                {importing ? 'Importing...' : `✅ Import ${totalRows} Contacts`}
              </button>
              <button style={{ ...s.btn, background: '#888' }} onClick={resetUpload}>Cancel</button>
            </div>
          </>
        )}
      </div>

      {/* ── Contacts Table ── */}
      <div style={s.card}>
        {loading ? (
          <div style={s.empty}>Loading contacts...</div>
        ) : contacts.length === 0 ? (
          <div style={s.empty}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>No contacts yet</div>
            <div style={s.hint}>Upload a CSV file or import from Google Sheets above</div>
          </div>
        ) : (
          <>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>#</th>
                  <th style={s.th}>Name</th>
                  <th style={s.th}>Phone (+91)</th>
                  <th style={s.th}>Message to Send</th>
                  <th style={s.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c, i) => (
                  <tr key={i}>
                    <td style={s.td}>{i + 1}</td>
                    <td style={s.td}><strong>{c.name}</strong></td>
                    <td style={s.td}><span style={s.badge}>+{c.phone}</span></td>
                    <td style={{ ...s.td, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.message}>{c.message}</td>
                    <td style={s.td}>
                      <button style={s.btnDelete} onClick={() => handleDelete(c.phone, c.name)}>🗑️ Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={s.hint}>
              💡 Phone numbers should include country code (e.g. 919876543210 for +91 India)
            </div>
          </>
        )}
      </div>

      {/* ── Add Contact Modal ── */}
      {showAddModal && (
        <div style={s.overlay} onClick={() => setShowAddModal(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalTitle}>➕ Add Contact Manually</div>
            <form onSubmit={handleAddContact}>
              <label style={s.modalLabel}>Name (optional)</label>
              <input
                style={s.modalInput}
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                autoFocus
              />

              <label style={s.modalLabel}>Mobile Number * (10 digits)</label>
              <div style={s.modalPhoneRow}>
                <span style={s.modalPrefix}>🇮🇳 +91</span>
                <input
                  style={{ ...s.modalInput, marginBottom: 0, flex: 1 }}
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="9876543210"
                  maxLength={10}
                  required
                />
              </div>
              <div style={{ fontSize: 11, color: '#aaa', marginBottom: 16 }}>
                Enter 10-digit number without 0 or +91
              </div>

              <label style={s.modalLabel}>Message (optional)</label>
              <textarea
                style={s.modalTextarea}
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder="Custom message for this contact... (leave blank for default)"
              />

              <div style={s.modalFooter}>
                <button type="button" style={s.modalCancel} onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" style={s.modalSave} disabled={addingContact}>
                  {addingContact ? 'Adding...' : '✅ Add Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
