/* ================================================
   skeleton.js — Loading Skeleton Cards
   Usage: Skeleton.cards(count) → HTML string
          Skeleton.show(containerId, count)
          Skeleton.hide(containerId)
   ================================================ */
const Skeleton = {
  /* Return HTML for N skeleton product cards */
  cards(count = 9) {
    return Array.from({ length: count }, () => `
      <div class="skeleton-card">
        <div class="skeleton skeleton-image"></div>
        <div class="skeleton-body">
          <div class="skeleton skeleton-line short"></div>
          <div class="skeleton skeleton-line medium"></div>
          <div class="skeleton skeleton-line short"></div>
          <div class="skeleton skeleton-line" style="width:40%"></div>
          <div class="skeleton skeleton-btn"></div>
        </div>
      </div>`).join('');
  },

  show(containerId, count = 9, gridClass = 'products-grid') {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = `<div class="${gridClass}">${this.cards(count)}</div>`;
  },

  hide(containerId) {
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = '';
  }
};
