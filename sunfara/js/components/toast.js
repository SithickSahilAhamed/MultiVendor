/* ================================================
   toast.js — Notification System
   Usage: Toast.show('Message', 'success'|'error'|'info'|'warning')
   ================================================ */
const Toast = {
  queue: [],

  show(message, type = 'success', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    // Cap at 3 toasts stacked
    if (container.children.length >= 3) {
      const oldest = container.firstElementChild;
      if (oldest) oldest.remove();
    }

    const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.success}</span>
      <span class="toast-msg">${message}</span>
      <button class="toast-close" onclick="this.parentElement.remove()" aria-label="Close">✕</button>`;

    toast.style.cssText = `
      display:flex;align-items:center;gap:10px;padding:12px 16px;
      background:${type==='success'?'#4a7c59':type==='error'?'#c0392b':type==='warning'?'#e67e22':'#2980b9'};
      color:white;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,0.15);
      max-width:360px;min-width:240px;font-size:0.875rem;font-family:var(--font-body);
      animation:slideInRight 0.3s ease;margin-bottom:8px;`;

    toast.querySelector('.toast-close').style.cssText = 'background:none;border:none;color:rgba(255,255,255,0.7);cursor:pointer;font-size:1rem;padding:0 0 0 8px;flex-shrink:0;';
    toast.querySelector('.toast-icon').style.cssText = 'font-size:1rem;flex-shrink:0;';

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(120%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
};

/* Position toast container */
document.addEventListener('DOMContentLoaded', () => {
  const c = document.getElementById('toast-container');
  if (c) c.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;align-items:flex-end;';
});
