/* Toast Notifications */

const AdminToast = {
  show: function(message, type = 'info') {
    const container = document.getElementById('admin-toast-container');
    const toast = AdminUtils.el('div', 'admin-toast ' + type);
    toast.innerHTML = `
      <div style="flex: 1;">${message}</div>
      <button style="background: none; border: none; color: inherit; cursor: pointer; font-size: 16px;" onclick="this.parentElement.remove()">✕</button>
    `;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  },

  success: function(message) {
    this.show(message, 'success');
  },

  error: function(message) {
    this.show(message, 'error');
  },

  warning: function(message) {
    this.show(message, 'warning');
  },

  info: function(message) {
    this.show(message, 'info');
  }
};
