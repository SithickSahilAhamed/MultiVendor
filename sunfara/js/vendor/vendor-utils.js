/* Vendor Portal Utilities */

const VendorUtils = {
  formatPrice: (price) => '₹' + (price || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 }),

  formatDate: (date) => {
    if (!date) return '—';
    const d = date?.toDate ? date.toDate() : new Date(date);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  },

  formatDateTime: (date) => {
    if (!date) return '—';
    const d = date?.toDate ? date.toDate() : new Date(date);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN') + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  },

  el: (tag, className = '', html = '') => {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (html) e.innerHTML = html;
    return e;
  },

  validateEmail: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
  validatePhone: (phone) => /^[0-9]{10}$/.test((phone || '').replace(/\D/g, '')),

  setItem: (key, value) => localStorage.setItem('vendor_' + key, JSON.stringify(value)),
  getItem: (key, defaultValue = null) => {
    const value = localStorage.getItem('vendor_' + key);
    return value ? JSON.parse(value) : defaultValue;
  },
  removeItem: (key) => localStorage.removeItem('vendor_' + key)
};
