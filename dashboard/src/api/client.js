import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
});

export async function fetchHealth() {
  const response = await api.get('/health');
  return response.data;
}

export async function fetchStats() {
  const response = await api.get('/stats');
  return response.data;
}

export async function fetchLogs() {
  const response = await api.get('/logs');
  return response.data;
}

export async function classifyEmail(payload) {
  const response = await api.post('/classify', payload);
  return response.data;
}

export async function updateLogAction(logId, action, overrideClassification = null) {
  const response = await api.post(`/logs/${logId}/action`, {
    action,
    override_classification: overrideClassification,
  });
  return response.data;
}
