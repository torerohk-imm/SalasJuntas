<<<<<<< codex/develop-web-platform-for-meeting-rooms-7sbaq4
const RAW_API_URL = import.meta.env.VITE_API_URL || '';
const API_URL = RAW_API_URL.endsWith('/') ? RAW_API_URL.slice(0, -1) : RAW_API_URL;
=======
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
>>>>>>> main

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
<<<<<<< codex/develop-web-platform-for-meeting-rooms-7sbaq4
  getHealth: () => request('/api/health'),
=======
>>>>>>> main
  getRooms: (token) => request('/api/rooms', { token }),
  getEvents: (roomId, start, end, token) =>
    request(`/api/rooms/${roomId}/events?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`, { token }),
  getNotice: () => request('/api/settings/notice'),
  saveNotice: (notice) => request('/api/settings/notice', { method: 'PUT', body: JSON.stringify({ notice }) }),
<<<<<<< codex/develop-web-platform-for-meeting-rooms-7sbaq4
  getAuthUrl: () => request('/api/auth/url'),
  exchangeCode: (code) => request('/api/auth/exchange', { method: 'POST', body: JSON.stringify({ code }) })
=======
  getAuthUrl: () => request('/api/auth/url')
>>>>>>> main
};
