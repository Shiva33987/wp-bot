import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: BASE ? `${BASE}/api` : '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Helper for multipart uploads (file uploads bypass the shared instance)
function multipart(url, form) {
  return axios.post(`${BASE}/api${url}`, form, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  });
}

export const auth = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  register: (username, password) => api.post('/auth/register', { username, password }),
};

export const whatsapp = {
  getStatus: () => api.get('/whatsapp/status'),
  initWhatsApp: () => api.post('/whatsapp/init'),
  logoutWhatsApp: () => api.post('/whatsapp/logout'),

  getContacts: () => api.get('/whatsapp/contacts'),
  addContact: (name, phone, message) => api.post('/whatsapp/contacts', { name, phone, message }),
  deleteContact: (phone) => api.delete(`/whatsapp/contacts/${phone}`),
  deleteAllContacts: () => api.delete('/whatsapp/contacts'),

  sendMessage: (to, message, name) => api.post('/whatsapp/send', { to, message, name }),
  sendToAll: () => api.post('/whatsapp/send-all'),

  bulkStart: (message, delaySeconds, mediaPath, mediaCaption) =>
    api.post('/whatsapp/bulk/start', { message, delaySeconds, mediaPath, mediaCaption }),
  bulkStatus: () => api.get('/whatsapp/bulk/status'),
  bulkStop: () => api.post('/whatsapp/bulk/stop'),

  uploadMedia: (file) => {
    const form = new FormData();
    form.append('media', file);
    return multipart('/whatsapp/media/upload', form);
  },
  clearMedia: () => api.delete('/whatsapp/media'),

  getMessages: (direction) => api.get('/whatsapp/messages', { params: { direction } }),
  clearMessages: () => api.delete('/whatsapp/messages'),

  uploadCSV: (file) => {
    const form = new FormData();
    form.append('file', file);
    return multipart('/whatsapp/upload-csv', form);
  },
  importContacts: (file, nameCol, phoneCol, messageCol, defaultMessage) => {
    const form = new FormData();
    form.append('file', file);
    form.append('nameCol', nameCol);
    form.append('phoneCol', phoneCol);
    if (messageCol) form.append('messageCol', messageCol);
    if (defaultMessage) form.append('defaultMessage', defaultMessage);
    return multipart('/whatsapp/import-contacts', form);
  },
  previewSheets: (sheetUrl) => api.post('/whatsapp/preview-sheets', { sheetUrl }),
  importSheets: (sheetUrl, nameCol, phoneCol, messageCol, defaultMessage) =>
    api.post('/whatsapp/import-sheets', { sheetUrl, nameCol, phoneCol, messageCol, defaultMessage }),
};

export default api;
