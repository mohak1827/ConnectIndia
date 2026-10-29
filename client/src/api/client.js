const BASE_URL = import.meta.env.VITE_API_URL
  ? (import.meta.env.VITE_API_URL.endsWith('/api/v1') ? import.meta.env.VITE_API_URL : `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api/v1`)
  : (typeof window !== 'undefined' && window.location.hostname.includes('onrender.com')
      ? 'https://connectindia-server.onrender.com/api/v1'
      : '/api/v1');

export async function apiClient(endpoint, options = {}) {
  const token = localStorage.getItem('connectindia_token') || localStorage.getItem('ci_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const config = {
    ...options,
    headers,
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, config);

  if (response.status === 401) {
    // If not on login page, remove stale token and reload
    if (!window.location.pathname.includes('/login')) {
      localStorage.removeItem('connectindia_token');
      localStorage.removeItem('connectindia_user');
      window.location.href = '/login';
    }
  }

  // Handle binary / CSV response
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('text/csv')) {
    const blob = await response.blob();
    return { ok: response.ok, blob };
  }

  let data;
  try {
    data = await response.json();
  } catch (err) {
    data = { success: false, error: { message: 'Failed to parse server response' } };
  }

  if (!response.ok) {
    const errorMsg = data.error?.message || data.message || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.code = data.error?.code || data.status;
    err.data = data;
    throw err;
  }

  return data;
}
