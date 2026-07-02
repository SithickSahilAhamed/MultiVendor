/* Vendor Portal Toast Notifications */

const VendorToast = {
  show(message, type = 'info') {
    const container = document.getElementById('vendor-toast-container');
    if (!container) return;
    const toast = VendorUtils.el('div', 'admin-toast ' + type);
    toast.innerHTML = `<div style="flex:1">${message}</div><button style="background:none;border:none;color:inherit;cursor:pointer;font-size:16px" onclick="this.parentElement.remove()">✕</button>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  },
  success(message) { this.show(message, 'success'); },
  error(message) { this.show(message, 'error'); },
  info(message) { this.show(message, 'info'); }
};
