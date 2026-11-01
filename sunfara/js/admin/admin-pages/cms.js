/* CMS-001 — Admin editable banners / policies / posts */

const AdminCms = {
  collection: 'banners',

  async render() {
    AdminLayout.renderBreadcrumb([{ label: 'CMS' }]);
    const el = document.getElementById('admin-page-content');
    el.innerHTML = `
      <div class="admin-page-header">
        <div>
          <h1 class="admin-page-title">Content (CMS)</h1>
          <p class="admin-page-subtitle">Publish banners, policies, and posts without redeploying JSON.</p>
        </div>
        <button class="admin-btn admin-btn-primary" onclick="AdminCms.openEditor()">+ New</button>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:16px">
        ${['banners','policies','posts'].map(c => `
          <button class="admin-btn admin-btn-sm ${this.collection===c?'admin-btn-primary':'admin-btn-secondary'}"
            onclick="AdminCms.switchCollection('${c}')">${c}</button>`).join('')}
      </div>
      <div class="admin-table-wrapper" id="cms-table"><div style="padding:24px;color:#6b7280">Loading…</div></div>`;
    await this.load();
  },

  switchCollection(c) {
    this.collection = c;
    this.render();
  },

  async load() {
    try {
      const rows = await AdminAPI.list(this.collection);
      const wrap = document.getElementById('cms-table');
      if (!rows.length) {
        wrap.innerHTML = `<p style="padding:24px;color:#6b7280">No ${AdminUtils.escapeHtml(this.collection)} yet.</p>`;
        return;
      }
      wrap.innerHTML = `
        <table class="admin-table">
          <thead><tr><th>Title</th><th>Slug</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td>${AdminUtils.escapeHtml(r.title || r.id)}</td>
                <td>${AdminUtils.escapeHtml(r.slug || '—')}</td>
                <td><span class="admin-status-badge ${r.status==='published'?'admin-status-active':'admin-status-pending'}">${AdminUtils.escapeHtml(r.status || 'draft')}</span></td>
                <td>
                  <button class="admin-btn admin-btn-sm" onclick="AdminCms.publish('${AdminUtils.escapeHtml(r.id)}')">Publish</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>`;
    } catch (e) {
      document.getElementById('cms-table').innerHTML = `<p style="padding:24px;color:#b91c1c">${AdminUtils.escapeHtml(e.message || e)}</p>`;
    }
  },

  openEditor() {
    const title = prompt('Title');
    if (!title) return;
    const body = prompt('Body (plain text; storefront escapes HTML)') || '';
    AdminAPI.create(this.collection, { title, body, status: 'draft' })
      .then(() => { AdminToast.success('Draft created'); this.load(); })
      .catch(err => AdminToast.error(err.message || String(err)));
  },

  async publish(id) {
    try {
      await AdminAPI.update(this.collection, id, { status: 'published', publishAt: new Date().toISOString() });
      AdminToast.success('Published');
      this.load();
    } catch (e) {
      AdminToast.error(e.message || String(e));
    }
  }
};
