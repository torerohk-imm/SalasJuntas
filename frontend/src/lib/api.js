const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const request = async (path, options = {}) => {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
    },
    ...options
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Error de API');
  }

  return response.json();
};

export const api = {
  getRooms: (token) => request('/api/rooms', { token }),
  getEvents: (roomId, start, end, token) =>
    request(`/api/rooms/${roomId}/events?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`, { token }),
  getNotice: () => request('/api/settings/notice'),
  saveNotice: (notice) => request('/api/settings/notice', { method: 'PUT', body: JSON.stringify({ notice }) }),
  getAuthUrl: () => request('/api/auth/url')
};
