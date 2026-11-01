/* Admin Shipping Zones (SHIP-001) — CRUD against shipping_zones collection */

const AdminShipping = {
  _zones: [],

  render: async function() {
    AdminLayout.renderBreadcrumb([
      { label: 'Dashboard', route: '#/admin/dashboard' },
      { label: 'Shipping Zones', route: '#/admin/shipping' }
    ]);
    document.getElementById('admin-page-content').innerHTML = '<div style="padding:40px;text-align:center;color:#6b7280;">Loading shipping zones...</div>';

    try {
      this._zones = await AdminAPI.list('shipping_zones', 200);
    } catch (e) {
      document.getElementById('admin-page-content').innerHTML = `<div style="padding:40px;color:#b91c1c;">${AdminUtils.escapeHtml(e.message || 'Failed to load zones')}</div>`;
      return;
    }

    const rows = this._zones.map(z => {
      const prefixes = (z.pincodePrefixes || []).join(', ') || '—';
      const states = (z.states || []).join(', ') || '—';
      const freeAbove = z.freeAboveSubtotal ? AdminUtils.formatPrice(z.freeAboveSubtotal) : '—';
      const active = z.active !== false;
      return `
        <tr>
          <td><strong>${AdminUtils.escapeHtml(z.name || z.id)}</strong><div style="font-size:11px;color:#6b7280">${AdminUtils.escapeHtml(z.id)}</div></td>
          <td>${AdminUtils.formatPrice(z.flatAmount || 0)}</td>
          <td>${freeAbove}</td>
          <td>${AdminUtils.escapeHtml(prefixes)}</td>
          <td>${AdminUtils.escapeHtml(states)}</td>
          <td>${z.priority ?? 0}</td>
          <td><span class="admin-status-badge ${active ? 'admin-status-active' : 'admin-status-rejected'}">${active ? 'Active' : 'Inactive'}</span></td>
          <td>
            <button class="admin-btn admin-btn-sm admin-btn-secondary" onclick="AdminShipping.openEdit('${AdminUtils.escapeHtml(z.id)}')">Edit</button>
            <button class="admin-btn admin-btn-sm admin-btn-secondary" onclick="AdminShipping.toggleActive('${AdminUtils.escapeHtml(z.id)}', ${active ? 'false' : 'true'})">${active ? 'Disable' : 'Enable'}</button>
          </td>
        </tr>`;
    }).join('');

    document.getElementById('admin-page-content').innerHTML = `
      <div class="admin-page-header">
        <div>
          <h1 class="admin-page-title">Shipping Zones</h1>
          <p class="admin-page-subtitle">Rates applied at checkout from destination pincode/state. Empty zones → default ₹49 / free above ₹599.</p>
        </div>
        <div class="admin-page-actions">
          <button class="admin-btn admin-btn-primary" onclick="AdminShipping.openCreate()">＋ Add Zone</button>
        </div>
      </div>
      <div class="admin-table-wrapper">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Zone</th><th>Flat rate</th><th>Free above</th><th>Pincode prefixes</th><th>States</th><th>Priority</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="8" style="text-align:center;color:#6b7280;padding:24px;">No zones yet. Add one or rely on the default India rate.</td></tr>'}
          </tbody>
        </table>
      </div>`;
  },

  openCreate: function() {
    this.openForm(null);
  },

  openEdit: function(id) {
    const zone = this._zones.find(z => z.id === id);
    if (!zone) { AdminToast.error('Zone not found'); return; }
    this.openForm(zone);
  },

  openForm: function(zone) {
    const isEdit = !!zone;
    const prefixes = (zone?.pincodePrefixes || []).join(', ');
    const states = (zone?.states || []).join(', ');
    const ranges = (zone?.pincodeRanges || []).map(r => `${r.from}-${r.to}`).join(', ');
    AdminModal.show(
      isEdit ? 'Edit Shipping Zone' : 'Add Shipping Zone',
      `
        <div class="admin-form-group"><label class="admin-label">Name</label><input class="admin-input" id="ship-name" value="${AdminUtils.escapeHtml(zone?.name || '')}" /></div>
        <div class="admin-form-group"><label class="admin-label">Flat amount (₹)</label><input class="admin-input" type="number" id="ship-flat" min="0" step="1" value="${zone?.flatAmount ?? 49}" /></div>
        <div class="admin-form-group"><label class="admin-label">Free above subtotal (₹, blank = never)</label><input class="admin-input" type="number" id="ship-free" min="0" step="1" value="${zone?.freeAboveSubtotal ?? ''}" placeholder="599" /></div>
        <div class="admin-form-group"><label class="admin-label">Priority (higher wins)</label><input class="admin-input" type="number" id="ship-priority" value="${zone?.priority ?? 0}" /></div>
        <div class="admin-form-group"><label class="admin-label">Pincode prefixes (comma-separated)</label><input class="admin-input" id="ship-prefixes" value="${AdminUtils.escapeHtml(prefixes)}" placeholder="560, 600" /></div>
        <div class="admin-form-group"><label class="admin-label">Pincode ranges (from-to, comma-separated)</label><input class="admin-input" id="ship-ranges" value="${AdminUtils.escapeHtml(ranges)}" placeholder="110001-110099" /></div>
        <div class="admin-form-group"><label class="admin-label">States (comma-separated)</label><input class="admin-input" id="ship-states" value="${AdminUtils.escapeHtml(states)}" placeholder="Karnataka, Tamil Nadu" /></div>
        <div class="admin-form-group"><label class="admin-label">Default carrier</label><input class="admin-input" id="ship-carrier" value="${AdminUtils.escapeHtml(zone?.defaultCarrier || '')}" placeholder="Delhivery" /></div>
        <div class="admin-form-group"><label class="admin-label">ETA days min / max</label>
          <div style="display:flex;gap:8px">
            <input class="admin-input" type="number" id="ship-days-min" min="1" value="${zone?.estimatedDaysMin ?? 4}" />
            <input class="admin-input" type="number" id="ship-days-max" min="1" value="${zone?.estimatedDaysMax ?? 6}" />
          </div>
        </div>
        <div class="admin-form-group"><label class="admin-label"><input type="checkbox" id="ship-active" ${zone?.active === false ? '' : 'checked'} /> Active</label></div>
      `,
      [
        { label: 'Cancel', class: 'admin-btn-secondary', onclick: 'AdminModal.close()' },
        { label: isEdit ? 'Save' : 'Create', class: 'admin-btn-primary', onclick: `AdminShipping.save('${isEdit ? AdminUtils.escapeHtml(zone.id) : ''}')` }
      ]
    );
  },

  parseList: function(raw) {
    return String(raw || '').split(',').map(s => s.trim()).filter(Boolean);
  },

  parseRanges: function(raw) {
    return String(raw || '').split(',').map(s => s.trim()).filter(Boolean).map(part => {
      const [a, b] = part.split('-').map(x => x.trim());
      const from = Number(a);
      const to = Number(b ?? a);
      if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return null;
      return { from, to };
    }).filter(Boolean);
  },

  save: async function(id) {
    const name = document.getElementById('ship-name')?.value.trim();
    if (!name) { AdminToast.error('Name is required'); return; }
    const freeRaw = document.getElementById('ship-free')?.value;
    const payload = {
      name,
      flatAmount: Number(document.getElementById('ship-flat')?.value || 0),
      freeAboveSubtotal: freeRaw === '' || freeRaw == null ? 0 : Number(freeRaw),
      priority: Number(document.getElementById('ship-priority')?.value || 0),
      pincodePrefixes: this.parseList(document.getElementById('ship-prefixes')?.value),
      pincodeRanges: this.parseRanges(document.getElementById('ship-ranges')?.value),
      states: this.parseList(document.getElementById('ship-states')?.value),
      defaultCarrier: document.getElementById('ship-carrier')?.value.trim() || '',
      estimatedDaysMin: Number(document.getElementById('ship-days-min')?.value || 4),
      estimatedDaysMax: Number(document.getElementById('ship-days-max')?.value || 6),
      active: !!document.getElementById('ship-active')?.checked
    };
    try {
      if (id) await AdminAPI.update('shipping_zones', id, payload);
      else await AdminAPI.create('shipping_zones', payload);
      AdminToast.success(id ? 'Zone updated' : 'Zone created');
      AdminModal.close();
      await this.render();
    } catch (e) {
      AdminToast.error(e.message || 'Save failed');
    }
  },

  toggleActive: async function(id, nextActive) {
    try {
      await AdminAPI.update('shipping_zones', id, { active: nextActive === true || nextActive === 'true' });
      AdminToast.success('Zone updated');
      await this.render();
    } catch (e) {
      AdminToast.error(e.message || 'Update failed');
    }
  }
};
