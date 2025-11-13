import axios from 'axios';
import { API_BASE_URL, ENDPOINTS } from './constants';
import { getCurrentUserId } from './auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

export async function login({ email, password }) {
  const res = await api.post(ENDPOINTS.LOGIN, { email, password });
  return res.data;
}

export async function register(payload) {
  // payload: { fullName, email, password, skinType, dateOfBirth }
  const res = await api.post(ENDPOINTS.REGISTER, payload);
  return res.data;
}

export default api;

// Helpers for authorized requests
async function authHeaders() {
  const token = await AsyncStorage.getItem('auth.token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// User APIs
export async function getProfile() {
  const res = await api.get('/api/users/me', { headers: await authHeaders() });
  return res.data;
}

// Chat APIs (specialist flow)
export async function createChatSession({ channel, title } = {}) {
  // Include userId from JWT (sub) as requested
  const userId = await getCurrentUserId();
  const payload = { channel };
  if (title) payload.title = title;
  if (userId) payload.userId = userId;
  const res = await api.post('/api/chat/sessions', payload, { headers: await authHeaders() });
  return res.data;
}

export async function getChatSession(sessionId, { includeMessages = true } = {}) {
  const res = await api.get(`/api/chat/sessions/${sessionId}`, { headers: await authHeaders(), params: includeMessages ? { includeMessages: true } : undefined });
  return res.data;
}

export async function listUserSessions({ userId, pageNumber = 1, pageSize = 20 } = {}) {
  if (!userId) {
    userId = await getCurrentUserId();
  }
  const params = { pageNumber, pageSize };
  const res = await api.get(`/api/chat/sessions/user/${userId}`, { headers: await authHeaders(), params });
  return res.data;
}

export async function listSpecialistSessions({ state = 'waiting_specialist', pageNumber = 1, pageSize = 20, mine } = {}) {
  const params = { state, pageNumber, pageSize };
  if (typeof mine !== 'undefined') params.mine = mine;
  try {
    const res = await api.get('/api/chat/specialist-sessions', { headers: await authHeaders(), params });
    return res.data; // Expect PagedResult<ChatSessionDto>
  } catch (e) {
    if (e?.response?.status === 404) return { items: [], totalCount: 0, pageNumber, pageSize };
    throw e;
  }
}

export async function assignSession(sessionId) {
  const res = await api.post(`/api/chat/sessions/${sessionId}/assignments`, null, { headers: await authHeaders() });
  return res.data;
}

export async function closeSession(sessionId) {
  const res = await api.post(`/api/chat/sessions/${sessionId}/closures`, null, { headers: await authHeaders() });
  return res.data;
}

export async function sendSessionMessage(sessionId, { text, files = [] } = {}) {
  const form = new FormData();
  if (text) form.append('text', text);
  // Attach any file(s), if provided. Each item: { uri, name, type }
  for (const f of files) {
    if (f?.uri) form.append('files', { uri: f.uri, name: f.name || 'attachment', type: f.type || 'application/octet-stream' });
  }
  const headers = { ...(await authHeaders()), 'Content-Type': 'multipart/form-data' };
  const res = await api.post(`/api/chat/sessions/${sessionId}/messages`, form, { headers });
  return res.data; // ServiceResult of ChatMessageDto
}

// Alias for tests: map to sendSessionMessage
export async function createChatMessage(sessionId, { role, content, imageUrl, files = [] } = {}) {
  // role/imageUrl ignored by current backend; include content as text
  return sendSessionMessage(sessionId, { text: content, files });
}

// Symptom APIs
export async function createUserSymptom(payload) {
  // payload: { userId, symptomName, severity }
  const res = await api.post('/api/user-symptoms', payload, { headers: await authHeaders() });
  return res.data;
}

// AI Analysis APIs
export async function createAIAnalysis(payload) {
  // payload: { userId, imageUrl, analysisType }
  const res = await api.post('/api/ai/analysis', payload, { headers: await authHeaders() });
  return res.data;
}

export async function createAIResponse(payload) {
  // payload: { analysisId, responseText, confidence }
  const res = await api.post('/api/ai/responses', payload, { headers: await authHeaders() });
  return res.data;
}

// Routine APIs
export async function createRoutine(payload) {
  const res = await api.post('/api/routines', payload, { headers: await authHeaders() });
  return res.data;
}

export async function createRoutineInstance(payload) {
  const res = await api.post('/api/routine-instances', payload, { headers: await authHeaders() });
  return res.data;
}
