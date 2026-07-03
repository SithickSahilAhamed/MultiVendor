/* Vendor Portal — Notification Bell
   Same backend as the storefront's (GET/PUT /api/notifications, scoped
   by whichever user the caller's token belongs to), polling every 25s. */
const VendorNotifications = {
  items: [],
  pollHandle: null,

  init() {
    this.stop();
    if (!VendorStore.isLoggedIn) return;
    this.refresh();
    this.pollHandle = setInterval(() => this.refresh(), 25000);
    if (!this._clickBound) {
      document.addEventListener('click', (e) => { if (!e.target.closest('#vendor-notif-bell-wrap')) this.close(); });
      this._clickBound = true;
    }
  },

  stop() {
    if (this.pollHandle) clearInterval(this.pollHandle);
    this.pollHandle = null;
  },

  async refresh() {
    try { this.items = await VendorAPI.get('/notifications'); } catch (e) { return; }
    this.renderBadge();
    if (document.getElementById('vendor-notif-panel')?.classList.contains('open')) this.renderPanel();
  },

  unreadCount() { return this.items.filter(n => !n.read).length; },

  renderBadge() {
    const badge = document.getElementById('vendor-notif-badge');
    if (!badge) return;
    const count = this.unreadCount();
    badge.textContent = count > 9 ? '9+' : count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  },

  toggle() {
    const panel = document.getElementById('vendor-notif-panel');
    if (!panel) return;
    panel.classList.contains('open') ? this.close() : this.open();
  },

  open() { document.getElementById('vendor-notif-panel')?.classList.add('open'); this.renderPanel(); },
  close() { document.getElementById('vendor-notif-panel')?.classList.remove('open'); },

  renderPanel() {
    const panel = document.getElementById('vendor-notif-panel');
    if (!panel) return;
    const sorted = [...this.items].sort((a, b) => new Date(b.createdAt?.toDate ? b.createdAt.toDate() : b.createdAt || 0) - new Date(a.createdAt?.toDate ? a.createdAt.toDate() : a.createdAt || 0));
    panel.innerHTML = `
      <div class="notif-panel-header">
        <strong>Notifications</strong>
        ${this.unreadCount() > 0 ? `<button class="notif-mark-all" onclick="VendorNotifications.markAllRead()">Mark all read</button>` : ''}
      </div>
      <div class="notif-panel-list">
        ${sorted.length === 0 ? `<div class="notif-empty">No notifications yet</div>` :
          sorted.slice(0, 20).map(n => `
            <div class="notif-item ${n.read ? '' : 'unread'}" onclick="VendorNotifications.openItem('${n.id}','${(n.link || '').replace(/'/g, "\\'")}')">
              <div class="notif-item-title">${!n.read ? '<span class="notif-dot"></span>' : ''}${VendorUtils.escapeHtml(n.title)}</div>
              <div class="notif-item-message">${VendorUtils.escapeHtml(n.message)}</div>
            </div>`).join('')}
      </div>`;
  },

  async openItem(id, link) {
    const item = this.items.find(n => n.id === id);
    if (item && !item.read) {
      item.read = true;
      this.renderBadge();
      VendorAPI.put(`/notifications/${id}/read`, {}).catch(() => {});
    }
    this.close();
    if (link) window.location.hash = link;
  },

  async markAllRead() {
    this.items.forEach(n => n.read = true);
    this.renderBadge();
    this.renderPanel();
    try { await VendorAPI.put('/notifications/read-all', {}); } catch (e) {}
  }
};
