/* Admin Utilities */

const AdminUtils = {
  /* Formatting */
  formatPrice: (price) => {
    return '₹' + (price || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 });
  },

  formatDate: (date) => {
    return new Date(date).toLocaleDateString('en-IN', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  },

  formatTime: (date) => {
    return new Date(date).toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  },

  formatDateTime: (date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-IN') + ' ' + d.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  },

  timeAgo: (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + 'm ago';
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + 'h ago';
    const days = Math.floor(hours / 24);
    return days + 'd ago';
  },

  /* DOM Helpers */
  qs: (selector) => document.querySelector(selector),
  qsa: (selector) => document.querySelectorAll(selector),
  
  el: (tag, className = '', html = '') => {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (html) e.innerHTML = html;
    return e;
  },

  hide: (el) => { if (el) el.style.display = 'none'; },
  show: (el) => { if (el) el.style.display = ''; },

  /* Analytics */
  generateChartColors: () => ({
    primary: '#22c55e',
    secondary: '#0ea5e9',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444'
  }),

  generateRandomData: (count, min = 1000, max = 10000) => {
    return Array.from({ length: count }, () => Math.floor(Math.random() * (max - min) + min));
  },

  generateChartLabels: (count) => {
    const labels = [];
    for (let i = count; i > 0; i--) {
      labels.push('Day ' + i);
    }
    return labels;
  },

  /* Validation */
  validateEmail: (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  validatePhone: (phone) => {
    return /^[0-9]{10}$/.test(phone.replace(/\D/g, ''));
  },

  /* Storage */
  setItem: (key, value) => {
    localStorage.setItem('admin_' + key, JSON.stringify(value));
  },

  getItem: (key, defaultValue = null) => {
    const value = localStorage.getItem('admin_' + key);
    return value ? JSON.parse(value) : defaultValue;
  },

  removeItem: (key) => {
    localStorage.removeItem('admin_' + key);
  },

  /* Navigation */
  navigate: (route) => {
    window.location.hash = route;
  },

  getCurrentRoute: () => {
    return window.location.hash.replace('#', '') || '/admin/dashboard';
  },

  /* Generate IDs */
  generateId: () => '_' + Math.random().toString(36).substr(2, 9),

  /* Copy to clipboard */
  copyToClipboard: (text) => {
    navigator.clipboard.writeText(text);
  },

  /* Scrolling */
  scrollToTop: () => {
    document.getElementById('admin-content').scrollTop = 0;
  },

  /* Debounce */
  debounce: (func, delay) => {
    let timeoutId;
    return function(...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }
};
