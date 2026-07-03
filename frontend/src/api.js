const API = import.meta.env.VITE_API_URL;

function getToken() {
  return localStorage.getItem('chaispot_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Something went wrong');
  return data;
}

export const api = {
  signup: (body) => request('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  getMe: () => request('/auth/me'),
  getShops: (q = '', minRating = '') => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (minRating) params.set('minRating', minRating);
    const qs = params.toString();
    return request(`/shops${qs ? '?' + qs : ''}`);
  },
  getShop: (id) => request(`/shops/${id}`),
  addShop: (body) => request('/shops', { method: 'POST', body: JSON.stringify(body) }),

  addReview: (body) => request('/reviews', { method: 'POST', body: JSON.stringify(body) }),
  editReview: (id, body) => request(`/reviews/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  getBalance: () => request('/points/balance'),
  getHistory: () => request('/points/history'),
  redeem: () => request('/points/redeem', { method: 'POST' }),
  getLeaderboard: () => request('/points/leaderboard'),

  getDirections: (origin, destination) =>
    request('/directions', { method: 'POST', body: JSON.stringify({ origin, destination }) }),
};
