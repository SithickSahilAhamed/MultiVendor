/* Modal Component */

const AdminModal = {
  show: function(title, content, actions = []) {
    const overlay = document.getElementById('admin-modal-overlay');
    const container = document.getElementById('admin-modal-container');
    
    const modal = AdminUtils.el('div', 'admin-modal');
    modal.innerHTML = `
      <div class="admin-modal-header">
        <h2 class="admin-modal-title">${title}</h2>
        <button class="admin-modal-close" onclick="AdminModal.close()">✕</button>
      </div>
      <div class="admin-modal-body">
        ${content}
      </div>
      <div class="admin-modal-footer">
        ${actions.map(a => `<button class="admin-btn ${a.class || 'admin-btn-secondary'}" onclick="${a.onclick}">${a.label}</button>`).join('')}
      </div>
    `;
    
    container.innerHTML = '';
    container.appendChild(modal);
    overlay.classList.add('visible');
  },

  close: function() {
    const overlay = document.getElementById('admin-modal-overlay');
    const container = document.getElementById('admin-modal-container');
    overlay.classList.remove('visible');
    container.innerHTML = '';
  },

  confirm: function(title, message, onConfirm) {
    this.show(title, `<p>${message}</p>`, [
      { label: 'Cancel', class: 'admin-btn-secondary', onclick: 'AdminModal.close()' },
      { label: 'Confirm', class: 'admin-btn-primary', onclick: `${onConfirm}; AdminModal.close();` }
    ]);
  }
};

// Close modal on overlay click
document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('admin-modal-overlay');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) AdminModal.close();
    });
  }
});
