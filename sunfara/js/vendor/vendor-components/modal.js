/* Vendor Portal Modal Component */

const VendorModal = {
  show(title, content, actions = []) {
    const overlay = document.getElementById('vendor-modal-overlay');
    const container = document.getElementById('vendor-modal-container');
    const modal = VendorUtils.el('div', 'admin-modal');
    modal.innerHTML = `
      <div class="admin-modal-header"><h2 class="admin-modal-title">${title}</h2><button class="admin-modal-close" onclick="VendorModal.close()">✕</button></div>
      <div class="admin-modal-body">${content}</div>
      <div class="admin-modal-footer">${actions.map(a => `<button class="admin-btn ${a.class || 'admin-btn-secondary'}" onclick="${a.onclick}">${a.label}</button>`).join('')}</div>`;
    container.innerHTML = '';
    container.appendChild(modal);
    overlay.classList.add('visible');
  },
  close() {
    document.getElementById('vendor-modal-overlay')?.classList.remove('visible');
    const c = document.getElementById('vendor-modal-container');
    if (c) c.innerHTML = '';
  },
  confirm(title, message, onConfirm) {
    this.show(title, `<p>${message}</p>`, [
      { label: 'Cancel', class: 'admin-btn-secondary', onclick: 'VendorModal.close()' },
      { label: 'Confirm', class: 'admin-btn-primary', onclick: `${onConfirm}; VendorModal.close();` }
    ]);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('vendor-modal-overlay');
  if (overlay) overlay.addEventListener('click', (e) => { if (e.target === overlay) VendorModal.close(); });
});
