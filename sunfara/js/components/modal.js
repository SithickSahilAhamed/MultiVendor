/* ================================================
   modal.js — Reusable Modal Component
   Usage: Modal.show({ title, content, onConfirm })
          Modal.close()
   ================================================ */
const Modal = {
  show({ title = '', content = '', confirmText = 'Confirm', showCancel = true, onConfirm = null }) {
    const overlay = document.getElementById('modal-overlay');
    overlay.innerHTML = `
      <div class="modal animate-scale-in">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="modal-close" onclick="Modal.close()" aria-label="Close modal">✕</button>
        </div>
        <div class="modal-body">${content}</div>
        ${onConfirm || showCancel ? `
        <div class="modal-footer" style="display:flex;gap:12px;justify-content:flex-end;margin-top:24px;">
          ${showCancel ? `<button class="btn btn-outline" onclick="Modal.close()">Cancel</button>` : ''}
          ${onConfirm ? `<button class="btn btn-primary" id="modal-confirm-btn">${confirmText}</button>` : ''}
        </div>` : ''}
      </div>`;

    if (onConfirm) {
      document.getElementById('modal-confirm-btn').addEventListener('click', () => { onConfirm(); Modal.close(); });
    }

    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Close on overlay click
    overlay.addEventListener('click', (e) => { if (e.target === overlay) Modal.close(); }, { once: true });

    // Close on Escape key
    const escHandler = (e) => { if (e.key === 'Escape') { Modal.close(); document.removeEventListener('keydown', escHandler); } };
    document.addEventListener('keydown', escHandler);
  },

  close() {
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    setTimeout(() => { overlay.innerHTML = ''; }, 300);
  }
};
