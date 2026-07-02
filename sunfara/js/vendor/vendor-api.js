/* Vendor API Client — real backend calls, no demo fallback */

const VendorAPI = {
  baseURL: (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'http://localhost:5187/api'
    : 'https://web-production-97b5f.up.railway.app/api',

  async token() {
    return window.firebase?.auth?.currentUser ? window.firebase.auth.currentUser.getIdToken() : null;
  },

  async request(path, options = {}) {
    const token = await this.token();
    const response = await fetch(this.baseURL + path, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) }
    });
    if (response.status === 401) throw new Error('Your session has expired. Please log in again.');
    const body = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) throw new Error(body?.error || body?.title || `Request failed (${response.status})`);
    return body;
  },

  get(path) { return this.request(path); },
  post(path, body) { return this.request(path, { method: 'POST', body: JSON.stringify(body) }); },
  put(path, body) { return this.request(path, { method: 'PUT', body: JSON.stringify(body) }); },
  delete(path) { return this.request(path, { method: 'DELETE' }); },

  register(data) { return this.request('/vendor-auth/register', { method: 'POST', body: JSON.stringify(data) }); },

  getMe() { return this.get('/vendor/me'); },
  getMyProducts() { return this.get('/products/mine'); },
  createProduct(data) { return this.post('/products', data); },
  updateProduct(id, data) { return this.put(`/products/${id}`, data); },
  deleteProduct(id) { return this.delete(`/products/${id}`); },

  getMyOrders() { return this.get('/vendor/orders'); },
  updateOrderStatus(id, status) { return this.put(`/vendor/orders/${id}/status`, { status }); },

  getMyCommissions() { return this.get('/vendor/commissions'); },
  getMyWallet() { return this.get('/vendor/wallet'); },
  requestWithdrawal(amount) { return this.post('/vendor/withdrawal', { amount }); },
  getMyWithdrawals() { return this.get('/vendor/withdrawals'); }
};
