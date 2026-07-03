/* ================================================
   notifications.js — Real notification bell for the storefront
   Backed by GET/PUT /api/notifications - polls every 25s rather than a
   Firestore realtime listener, keeping the "everything goes through the
   API, no direct client Firestore access" pattern the rest of the app
   already follows.
   ================================================ */
const Notifications = {
  items: [],
  pollHandle: null,

  init() {
    this.stop();
    if (!Store.user) return;
    this.refresh();
    this.pollHandle = setInterval(() => this.refresh(), 25000);
    if (!this._clickBound) {
      document.addEventListener('click', (e) => { if (!e.target.closest('#notif-bell-wrap')) this.close(); });
      this._clickBound = true;
    }
  },

  stop() {
    if (this.pollHandle) clearInterval(this.pollHandle);
    this.pollHandle = null;
  },

  async refresh() {
    if (!Store.user) return;
    try { this.items = await SunfaraAPI.get('/notifications'); } catch (e) { return; }
    this.renderBadge();
    if (document.getElementById('notif-panel')?.classList.contains('open')) this.renderPanel();
  },

  unreadCount() {
    return this.items.filter(n => !n.read).length;
  },

  renderBadge() {
    const badge = document.getElementById('notif-badge');
    if (!badge) return;
    const count = this.unreadCount();
    badge.textContent = count > 9 ? '9+' : count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  },

  toggle() {
    const panel = document.getElementById('notif-panel');
    if (!panel) return;
    panel.classList.contains('open') ? this.close() : this.open();
  },

  open() {
    document.getElementById('notif-panel')?.classList.add('open');
    this.renderPanel();
  },

  close() {
    document.getElementById('notif-panel')?.classList.remove('open');
  },

  renderPanel() {
    const panel = document.getElementById('notif-panel');
    if (!panel) return;
    const sorted = [...this.items].sort((a, b) => new Date(b.createdAt?.toDate ? b.createdAt.toDate() : b.createdAt || 0) - new Date(a.createdAt?.toDate ? a.createdAt.toDate() : a.createdAt || 0));
    panel.innerHTML = `
      <div class="notif-panel-header">
        <strong>Notifications</strong>
        ${this.unreadCount() > 0 ? `<button class="notif-mark-all" onclick="Notifications.markAllRead()">Mark all read</button>` : ''}
      </div>
      <div class="notif-panel-list">
        ${sorted.length === 0 ? `<div class="notif-empty">No notifications yet</div>` :
          sorted.slice(0, 20).map(n => `
            <div class="notif-item ${n.read ? '' : 'unread'}" onclick="Notifications.openItem('${n.id}','${(n.link || '').replace(/'/g, "\\'")}')">
              <div class="notif-item-title">${!n.read ? '<span class="notif-dot"></span>' : ''}${escapeHtml(n.title)}</div>
              <div class="notif-item-message">${escapeHtml(n.message)}</div>
            </div>`).join('')}
      </div>`;
  },

  async openItem(id, link) {
    const item = this.items.find(n => n.id === id);
    if (item && !item.read) {
      item.read = true;
      this.renderBadge();
      SunfaraAPI.put(`/notifications/${id}/read`, {}).catch(() => {});
    }
    this.close();
    if (link) window.location.hash = link;
  },

  async markAllRead() {
    this.items.forEach(n => n.read = true);
    this.renderBadge();
    this.renderPanel();
    try { await SunfaraAPI.put('/notifications/read-all', {}); } catch (e) {}
  }
};
