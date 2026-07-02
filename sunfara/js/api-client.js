const SunfaraAPI = {
  baseURL: window.SUNFARA_API_URL || 'http://localhost:5187/api',
  async token() { return window.firebase?.auth?.currentUser ? window.firebase.auth.currentUser.getIdToken() : null; },
  async request(path, options = {}) {
    const token = await this.token();
    const response = await fetch(this.baseURL + path, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) } });
    const body = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) throw new Error(body?.error || body?.title || `Request failed (${response.status})`);
    return body;
  },
  get(path) { return this.request(path); },
  post(path, body) { return this.request(path, { method: 'POST', body: JSON.stringify(body) }); },
  put(path, body) { return this.request(path, { method: 'PUT', body: JSON.stringify(body) }); },
  delete(path) { return this.request(path, { method: 'DELETE' }); }
};
