import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT
api.interceptors.request.use(config => {
  const token = localStorage.getItem('tax_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('tax_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (creds) => api.post('/auth/login', creds),
  me: () => api.get('/auth/me'),
};

// ── Contribuenti ──────────────────────────────────────────────────────────
export const contribuentiAPI = {
  list:   (params) => api.get('/contribuenti', { params }),
  cerca:  (params) => api.get('/contribuenti/cerca', { params }),
  getOne: (id) => api.get(`/contribuenti/${id}`),
  create: (data) => api.post('/contribuenti', data),
  update: (id, data) => api.put(`/contribuenti/${id}`, data),
  annulla:(id, data) => api.patch(`/contribuenti/${id}/annulla`, data),
};

// ── Immobili ──────────────────────────────────────────────────────────────
export const immobiliAPI = {
  list:       (params) => api.get('/immobili', { params }),
  categorie:  () => api.get('/immobili/categorie'),
  getOne:     (id) => api.get(`/immobili/${id}`),
  create:     (data) => api.post('/immobili', data),
  update:     (id, data) => api.put(`/immobili/${id}`, data),
  annulla:    (id) => api.patch(`/immobili/${id}/annulla`),
};

// ── Aliquote ──────────────────────────────────────────────────────────────
export const aliquoteAPI = {
  list:     (params) => api.get('/aliquote', { params }),
  create:   (data) => api.post('/aliquote', data),
  update:   (id, data) => api.put(`/aliquote/${id}`, data),
  copiaAnno:(data) => api.post('/aliquote/copia-anno', data),
};

// ── Dichiarazioni ─────────────────────────────────────────────────────────
export const dichiarazioniAPI = {
  list:       (params) => api.get('/dichiarazioni', { params }),
  getOne:     (id) => api.get(`/dichiarazioni/${id}`),
  create:     (data) => api.post('/dichiarazioni', data),
  update:     (id, data) => api.put(`/dichiarazioni/${id}`, data),
  annulla:    (id, data) => api.patch(`/dichiarazioni/${id}/annulla`, data),
  cambiaStato:(id, data) => api.patch(`/dichiarazioni/${id}/stato`, data),
  calcola:    (id, data) => api.post(`/dichiarazioni/${id}/calcola`, data),
  stampa:     (id) => api.get(`/dichiarazioni/${id}/stampa`, { responseType: 'blob' }),
};

// ── Versamenti ────────────────────────────────────────────────────────────
export const versamentiAPI = {
  list:             (params) => api.get('/versamenti', { params }),
  getOne:           (id) => api.get(`/versamenti/${id}`),
  create:           (data) => api.post('/versamenti', data),
  update:           (id, data) => api.put(`/versamenti/${id}`, data),
  annulla:          (id, data) => api.patch(`/versamenti/${id}/annulla`, data),
  estratto:         (params) => api.get('/versamenti/estratto', { params }),
  calcolaRavvedimento: (data) => api.post('/versamenti/ravvedimento', data),
};

// ── Atti ──────────────────────────────────────────────────────────────────
export const attiAPI = {
  list:             (params) => api.get('/atti', { params }),
  getOne:           (id) => api.get(`/atti/${id}`),
  create:           (data) => api.post('/atti', data),
  update:           (id, data) => api.put(`/atti/${id}`, data),
  annulla:          (id, data) => api.patch(`/atti/${id}/annulla`, data),
  cambiaStato:      (id, data) => api.patch(`/atti/${id}/stato`, data),
  stampa:           (id) => api.get(`/atti/${id}/stampa`, { responseType: 'blob' }),
  emissioneMassiva: (data) => api.post('/atti/emissione-massiva', data),
};

// ── Elaborazioni Massive ──────────────────────────────────────────────────
export const elaborazioniAPI = {
  list:              (params) => api.get('/elaborazioni', { params }),
  getOne:            (id) => api.get(`/elaborazioni/${id}`),
  avviaCalcolo:      (data) => api.post('/elaborazioni/calcolo-massivo', data),
  avviaStampa:       (data) => api.post('/elaborazioni/stampa-massiva', data),
  annulla:           (id) => api.patch(`/elaborazioni/${id}/annulla`),
  scaricaOutput:     (id) => api.get(`/elaborazioni/${id}/output`, { responseType: 'blob' }),
};

// ── RAG – Documenti normativi ─────────────────────────────────────────────
export const ragAPI = {
  list:   (params) => api.get('/rag', { params }),
  getOne: (id) => api.get(`/rag/${id}`),
  upload: (formData) => api.post('/rag/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  remove: (id) => api.delete(`/rag/${id}`),
};

// ── Chat – Sessioni & messaggi ────────────────────────────────────────────
export const chatAPI = {
  listSessions:   () => api.get('/chat/sessioni'),
  createSession:  (data) => api.post('/chat/sessioni', data),
  getSession:     (id) => api.get(`/chat/sessioni/${id}`),
  archiveSession: (id) => api.patch(`/chat/sessioni/${id}/archivia`),
  // sendMessage uses fetch directly in ChatWidget for SSE streaming
};

// ── TARI – Tariffe ────────────────────────────────────────────────────────
export const tariffeTariAPI = {
  list:     (params) => api.get('/tari/tariffe', { params }),
  getOne:   (id) => api.get(`/tari/tariffe/${id}`),
  create:   (data) => api.post('/tari/tariffe', data),
  update:   (id, data) => api.put(`/tari/tariffe/${id}`, data),
  copiaAnno:(data) => api.post('/tari/tariffe/copia-anno', data),
};

// ── TARI – Utenze ─────────────────────────────────────────────────────────
export const utenzeTariAPI = {
  list:            (params) => api.get('/tari/utenze', { params }),
  getOne:          (id) => api.get(`/tari/utenze/${id}`),
  create:          (data) => api.post('/tari/utenze', data),
  update:          (id, data) => api.put(`/tari/utenze/${id}`, data),
  annulla:         (id, data) => api.patch(`/tari/utenze/${id}/annulla`, data),
  cambiaStato:     (id, data) => api.patch(`/tari/utenze/${id}/stato`, data),
  perContribuente: (params) => api.get('/tari/utenze/per-contribuente', { params }),
};

// ── TARI – Dichiarazioni ──────────────────────────────────────────────────
export const dichiarazioniTariAPI = {
  list:       (params) => api.get('/tari/dichiarazioni', { params }),
  getOne:     (id) => api.get(`/tari/dichiarazioni/${id}`),
  create:     (data) => api.post('/tari/dichiarazioni', data),
  update:     (id, data) => api.put(`/tari/dichiarazioni/${id}`, data),
  annulla:    (id, data) => api.patch(`/tari/dichiarazioni/${id}/annulla`, data),
  cambiaStato:(id, data) => api.patch(`/tari/dichiarazioni/${id}/stato`, data),
  calcola:    (id) => api.post(`/tari/dichiarazioni/${id}/calcola`),
  stampa:     (id) => api.get(`/tari/dichiarazioni/${id}/stampa`, { responseType: 'blob' }),
};

// ── TARI – Versamenti ─────────────────────────────────────────────────────
export const versamenti_tariAPI = {
  list:    (params) => api.get('/tari/versamenti', { params }),
  getOne:  (id) => api.get(`/tari/versamenti/${id}`),
  create:  (data) => api.post('/tari/versamenti', data),
  update:  (id, data) => api.put(`/tari/versamenti/${id}`, data),
  annulla: (id, data) => api.patch(`/tari/versamenti/${id}/annulla`, data),
  estratto:(params) => api.get('/tari/versamenti/estratto', { params }),
};

// ── Dashboard ─────────────────────────────────────────────────────────────
export const dashboardAPI = {
  summary:              (params) => api.get('/dashboard/summary', { params }),
  andamentoVersamenti:  (params) => api.get('/dashboard/andamento-versamenti', { params }),
};

export default api;
