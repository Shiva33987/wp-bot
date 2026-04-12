import { useEffect, useRef, useState } from 'react';
import { whatsapp } from '../api/client';
import toast from 'react-hot-toast';

const s = {
  page: { padding: 32, maxWidth: 900, margin: '0 auto' },
  title: { fontSize: 22, fontWeight: 700, color: '#111', marginBottom: 4 },
  sub: { fontSize: 13, color: '#888', marginBottom: 28 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 },
  card: { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' },
  cardFull: { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', marginBottom: 20 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 6 },
  input: { width: '100%', padding: '10px 14px', border: '1.5px solid #ddd', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '10px 14px', border: '1.5px solid #ddd', borderRadius: 8, fontSize: 14, outline: 'none', resize: 'vertical', minHeight: 120, boxSizing: 'border-box' },
  hint: { fontSize: 12, color: '#aaa', marginTop: 5 },
  btnStart: { background: '#075e54', color: '#fff', border: 'none', padding: '12px 32px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 15, width: '100%' },
  btnStop: { background: '#dc3545', color: '#fff', border: 'none', padding: '12px 32px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 15, width: '100%' },
  btnDisabled: { background: '#ccc', color: '#fff', border: 'none', padding: '12px 32px', borderRadius: 8, cursor: 'not-allowed', fontWeight: 700, fontSize: 15, width: '100%' },
  progressBar: { height: 14, borderRadius: 8, background: '#e0e0e0', overflow: 'hidden', marginBottom: 8 },
  progressFill: (pct, stopped) => ({ height: '100%', width: pct + '%', background: stopped ? '#ff9800' : '#075e54', transition: 'width 0.4s ease', borderRadius: 8 }),
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 },
  stat: (color) => ({ background: '#fff', borderRadius: 10, padding: '14px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: `4px solid ${color}` }),
  statVal: { fontSize: 28, fontWeight: 700, color: '#111' },
  statLabel: { fontSize: 12, color: '#888', marginTop: 2 },
  resultTable: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '8px 12px', background: '#f8f9fa', color: '#555', fontWeight: 600, borderBottom: '2px solid #eee' },
  td: { padding: '9px 12px', borderBottom: '1px solid #f0f0f0', color: '#333' },
  badge: (ok) => ({ background: ok ? '#e8f5e9' : '#fdecea', color: ok ? '#2e7d32' : '#c62828', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }),
  templateBtn: { background: '#e8f5e9', color: '#075e54', border: '1px solid #c8e6c9', padding: '5px 12px', borderRadius: 16, cursor: 'pointer', fontSize: 12, marginRight: 6, marginBottom: 6 },
  rangeRow: { display: 'flex', alignItems: 'center', gap: 12 },
  rangeVal: { fontWeight: 700, color: '#075e54', fontSize: 16, minWidth: 40 },
  mediaBox: { border: '2px dashed #ddd', borderRadius: 10, padding: 16, textAlign: 'center', cursor: 'pointer', background: '#fafafa', marginTop: 8 },
  mediaBoxActive: { border: '2px dashed #075e54', background: '#f0faf7' },
  mediaPreview: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#f0faf7', borderRadius: 8, marginTop: 8, border: '1px solid #c8e6c9' },
  mediaRemove: { background: '#dc3545', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, marginLeft: 'auto' },
};

const TEMPLATES = [
  { label: 'Greeting', text: 'Hello {name}! 👋 Welcome to our service. How can we help you today?' },
  { label: 'Offer', text: 'Hi {name}! 🎉 Special offer just for you — 20% discount today only. Reply to know more!' },
  { label: 'Reminder', text: 'Dear {name}, ⏰ this is a reminder for your upcoming appointment. Please confirm.' },
  { label: 'Follow Up', text: 'Hi {name}! 📞 Just following up on our previous conversation. Let us know if you need help.' },
  { label: 'Festival', text: 'Dear {name}, 🪔 warm festival greetings to you and your family! Wishing you joy and happiness.' },
  { label: 'Thank You', text: 'Thank you {name}! 🙏 We appreciate your trust and support. Have a wonderful day!' },
];

export default function Bulk() {
  const [contacts, setContacts] = useState([]);
  const [message, setMessage] = useState('Hello {name}! 👋 This is a message from our WhatsApp Bot.');
  const [delay, setDelay] = useState(3);
  const [job, setJob] = useState(null);
  const [waStatus, setWaStatus] = useState('disconnected');
  const [media, setMedia] = useState(null); // { filepath, filename, mediaType, size, originalName, previewUrl }
  const [mediaCaption, setMediaCaption] = useState('');
  const [mediaUploading, setMediaUploading] = useState(false);
  const [mediaDrag, setMediaDrag] = useState(false);
  const mediaRef = useRef();
  const pollRef = useRef(null);

  useEffect(() => {
    loadContacts();
    checkWAStatus();
    checkBulkStatus();
  }, []);

  async function loadContacts() {
    try {
      const res = await whatsapp.getContacts();
      setContacts(res.data.contacts || []);
    } catch { /* ignore */ }
  }

  async function checkWAStatus() {
    try {
      const res = await whatsapp.getStatus();
      setWaStatus(res.data.status);
    } catch { /* ignore */ }
  }

  async function checkBulkStatus() {
    try {
      const res = await whatsapp.bulkStatus();
      setJob(res.data);
    } catch { /* ignore */ }
  }

  // Poll while running
  useEffect(() => {
    if (job?.running) {
      pollRef.current = setInterval(async () => {
        try {
          const res = await whatsapp.bulkStatus();
          setJob(res.data);
          if (!res.data.running) clearInterval(pollRef.current);
        } catch { clearInterval(pollRef.current); }
      }, 1500);
    }
    return () => clearInterval(pollRef.current);
  }, [job?.running]);

  const isWAReady = waStatus === 'ready' || waStatus === 'authenticated';

  // ── Media upload ──────────────────────────────────────────────────────────
  async function handleMediaFile(file) {
    if (!file) return;
    const maxSize = 64 * 1024 * 1024;
    if (file.size > maxSize) return toast.error('File too large. Max 64MB allowed.');

    setMediaUploading(true);
    try {
      const res = await whatsapp.uploadMedia(file);
      const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
      setMedia({ ...res.data, previewUrl });
      toast.success(`✅ ${res.data.mediaType} uploaded: ${file.name}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Media upload failed');
    } finally {
      setMediaUploading(false);
    }
  }

  function onMediaInput(e) { handleMediaFile(e.target.files[0]); }
  function onMediaDrop(e) { e.preventDefault(); setMediaDrag(false); handleMediaFile(e.dataTransfer.files[0]); }

  async function removeMedia() {
    try {
      await whatsapp.clearMedia();
      setMedia(null);
      setMediaCaption('');
      toast.success('Media removed');
    } catch { setMedia(null); setMediaCaption(''); }
  }

  function getMediaIcon(type) {
    if (type === 'image') return '🖼️';
    if (type === 'video') return '🎬';
    if (type === 'audio') return '🎵';
    return '📄';
  }

  async function handleStart() {
    if (contacts.length === 0) return toast.error('No contacts found. Please upload contacts first.');
    if (!message.trim()) return toast.error('Please enter a message to send.');
    if (!isWAReady) return toast.error('WhatsApp is not connected. Please connect first from Dashboard.');
    if (!window.confirm(`Send to ${contacts.length} contacts with ${delay}s delay between each?\n\nEstimated time: ~${Math.ceil(contacts.length * delay / 60)} minutes`)) return;

    try {
      await whatsapp.bulkStart(message, delay, media?.filepath || null, mediaCaption || message);
      toast.success(`Bulk send started for ${contacts.length} contacts!`);
      setTimeout(checkBulkStatus, 500);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to start bulk send');
    }
  }

  async function handleStop() {
    if (!window.confirm('Stop the bulk send? Messages already sent will not be recalled.')) return;
    try {
      await whatsapp.bulkStop();
      toast.success('Bulk send stopped');
      checkBulkStatus();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to stop');
    }
  }

  const pct = job?.total > 0 ? Math.round(((job.sent + job.failed) / job.total) * 100) : 0;
  const isRunning = job?.running === true;
  const isDone = job && !job.running && job.total > 0;
  const processed = job ? job.sent + job.failed : 0;

  return (
    <div style={s.page}>
      <div style={s.title}>📢 Bulk Message Sender</div>
      <div style={s.sub}>Send personalized WhatsApp messages to all your contacts at once</div>

      {/* Stats */}
      <div style={s.statGrid}>
        <div style={s.stat('#075e54')}>
          <div style={s.statVal}>{contacts.length}</div>
          <div style={s.statLabel}>Total Contacts</div>
        </div>
        <div style={s.stat('#25d366')}>
          <div style={s.statVal}>{job?.sent ?? 0}</div>
          <div style={s.statLabel}>Sent</div>
        </div>
        <div style={s.stat('#dc3545')}>
          <div style={s.statVal}>{job?.failed ?? 0}</div>
          <div style={s.statLabel}>Failed</div>
        </div>
        <div style={s.stat('#ff9800')}>
          <div style={s.statVal}>{job?.total > 0 ? job.total - processed : 0}</div>
          <div style={s.statLabel}>Remaining</div>
        </div>
      </div>

      {/* Progress bar */}
      {job?.total > 0 && (
        <div style={s.cardFull}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, fontWeight: 600 }}>
            <span>{isRunning ? '⏳ Sending...' : job.stopped ? '⏹️ Stopped' : '✅ Completed'}</span>
            <span style={{ color: '#075e54' }}>{processed} / {job.total} ({pct}%)</span>
          </div>
          <div style={s.progressBar}>
            <div style={s.progressFill(pct, job.stopped)} />
          </div>
          <div style={{ fontSize: 12, color: '#888' }}>
            {isRunning && `Sending with ${delay}s delay • Started: ${new Date(job.startedAt).toLocaleTimeString('en-IN')}`}
            {isDone && `Finished: ${new Date(job.finishedAt).toLocaleTimeString('en-IN')} • ✅ ${job.sent} sent, ❌ ${job.failed} failed`}
          </div>
        </div>
      )}

      <div style={s.grid}>
        {/* Message Composer */}
        <div style={s.card}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, color: '#333' }}>💬 Message</div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6 }}>⚡ Quick Templates:</div>
            {TEMPLATES.map(t => (
              <button key={t.label} style={s.templateBtn} onClick={() => setMessage(t.text)}>{t.label}</button>
            ))}
          </div>

          <label style={s.label}>Message Template *</label>
          <textarea
            style={s.textarea}
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Type your message... Use {name} to personalize"
            disabled={isRunning}
          />
          <div style={s.hint}>
            💡 Use <code style={{ background: '#f0f0f0', padding: '1px 5px', borderRadius: 4 }}>{'{name}'}</code> — it will be replaced with each contact's actual name when sending
          </div>

          {/* Live preview box */}
          <div style={{ marginTop: 10, background: '#f0faf7', border: '1px solid #c8e6c9', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#075e54', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              👁️ Live Preview
              <span style={{ fontWeight: 400, color: '#888' }}>
                — {contacts[0]?.name ? `"${contacts[0].name}" will receive:` : 'sample output:'}
              </span>
            </div>
            <div style={{ fontSize: 13, color: '#222', whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#fff', padding: '8px 10px', borderRadius: 6, border: '1px solid #e0f2e9' }}>
              {message.replace(/\{name\}/gi, contacts[0]?.name || 'Rahul Sharma')}
            </div>
            {contacts.length > 1 && (
              <div style={{ fontSize: 11, color: '#888', marginTop: 6 }}>
                ✅ Each of your {contacts.length} contacts will get their own name inserted automatically
              </div>
            )}
          </div>

          {/* ── Media Upload ── */}
          <div style={{ marginTop: 20, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: '#333', marginBottom: 10 }}>
              📎 Attach Media <span style={{ fontWeight: 400, color: '#aaa', fontSize: 12 }}>(optional)</span>
            </div>

            {!media ? (
              <div
                style={{ ...s.mediaBox, ...(mediaDrag ? s.mediaBoxActive : {}) }}
                onClick={() => !isRunning && mediaRef.current.click()}
                onDragOver={e => { e.preventDefault(); setMediaDrag(true); }}
                onDragLeave={() => setMediaDrag(false)}
                onDrop={onMediaDrop}
              >
                {mediaUploading ? (
                  <div style={{ color: '#075e54', fontSize: 13 }}>⏳ Uploading...</div>
                ) : (
                  <>
                    <div style={{ fontSize: 28, marginBottom: 4 }}>📎</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#555' }}>Click or drag to attach media</div>
                    <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>
                      Images (JPG, PNG, GIF) • Videos (MP4) • Audio (MP3) • Documents (PDF, Word) • Max 64MB
                    </div>
                  </>
                )}
                <input
                  ref={mediaRef}
                  type="file"
                  accept="image/*,video/mp4,audio/*,.pdf,.doc,.docx"
                  style={{ display: 'none' }}
                  onChange={onMediaInput}
                  disabled={isRunning}
                />
              </div>
            ) : (
              <>
                <div style={s.mediaPreview}>
                  {media.previewUrl ? (
                    <img src={media.previewUrl} alt="preview" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }} />
                  ) : (
                    <span style={{ fontSize: 32 }}>{getMediaIcon(media.mediaType)}</span>
                  )}
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{media.originalName}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>
                      {media.mediaType} • {(media.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                  <button style={s.mediaRemove} onClick={removeMedia} disabled={isRunning}>✕ Remove</button>
                </div>
                <div style={{ marginTop: 10 }}>
                  <label style={{ ...s.label, marginBottom: 4 }}>Caption (optional)</label>
                  <input
                    style={s.input}
                    value={mediaCaption}
                    onChange={e => setMediaCaption(e.target.value)}
                    placeholder="Add a caption... Use {name} to personalize"
                    disabled={isRunning}
                  />
                  {mediaCaption && (
                    <div style={{ marginTop: 6, fontSize: 12, color: '#075e54', background: '#f0faf7', padding: '6px 10px', borderRadius: 6 }}>
                      Preview: {mediaCaption.replace(/\{name\}/gi, contacts[0]?.name || 'Rahul')}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>
                    💡 Use <code style={{ background: '#f0f0f0', padding: '1px 4px', borderRadius: 3 }}>{'{name}'}</code> to personalize the caption per contact
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Settings */}
        <div style={s.card}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, color: '#333' }}>⚙️ Settings</div>

          <label style={s.label}>⏱️ Delay Between Messages</label>
          <div style={s.rangeRow}>
            <input
              type="range" min={1} max={30} value={delay}
              onChange={e => setDelay(Number(e.target.value))}
              style={{ flex: 1 }}
              disabled={isRunning}
            />
            <span style={s.rangeVal}>{delay}s</span>
          </div>
          <div style={s.hint}>Recommended: 3–5 seconds to avoid WhatsApp bans</div>

          <div style={{ marginTop: 20, padding: 14, background: '#f8f9fa', borderRadius: 8, fontSize: 13 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>📊 Estimate</div>
            <div>Contacts: <strong>{contacts.length}</strong></div>
            <div>Delay: <strong>{delay}s</strong> per message</div>
            <div>Total time: <strong>~{Math.ceil(contacts.length * delay / 60)} min</strong></div>
          </div>

          <div style={{ marginTop: 16, padding: 14, background: isWAReady ? '#e8f5e9' : '#fdecea', borderRadius: 8, fontSize: 13 }}>
            <div style={{ fontWeight: 600 }}>
              {isWAReady ? '🟢 WhatsApp Connected' : '🔴 WhatsApp Disconnected'}
            </div>
            {!isWAReady && <div style={{ marginTop: 4, color: '#c62828' }}>Go to Dashboard → Connect WhatsApp first</div>}
          </div>

          <div style={{ marginTop: 20 }}>
            {isRunning ? (
              <button style={s.btnStop} onClick={handleStop}>⏹️ Stop Sending</button>
            ) : (
              <button
                style={isWAReady && contacts.length > 0 ? s.btnStart : s.btnDisabled}
                onClick={handleStart}
                disabled={!isWAReady || contacts.length === 0}
              >
                {contacts.length === 0 ? '⚠️ No Contacts' : `📤 Send to ${contacts.length} Contacts`}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results table */}
      {job?.results?.length > 0 && (
        <div style={s.cardFull}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, color: '#333' }}>
            📋 Results ({job.results.length})
          </div>
          <div style={{ overflowX: 'auto', maxHeight: 320, overflowY: 'auto' }}>
            <table style={s.resultTable}>
              <thead>
                <tr>
                  <th style={s.th}>#</th>
                  <th style={s.th}>Name</th>
                  <th style={s.th}>Phone</th>
                  <th style={s.th}>Status</th>
                  <th style={s.th}>Error</th>
                </tr>
              </thead>
              <tbody>
                {job.results.map((r, i) => (
                  <tr key={i} style={{ background: r.status === 'sent' ? 'transparent' : '#fff8f8' }}>
                    <td style={{ ...s.td, color: '#aaa' }}>{i + 1}</td>
                    <td style={s.td}><strong>{r.name}</strong></td>
                    <td style={s.td}>{r.phone}</td>
                    <td style={s.td}><span style={s.badge(r.status === 'sent')}>{r.status === 'sent' ? '✅ Sent' : '❌ Failed'}</span></td>
                    <td style={{ ...s.td, color: '#c62828', fontSize: 12 }}>{r.error || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
