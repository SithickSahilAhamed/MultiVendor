/* Vendors Page */

const AdminVendors = {
  render: function() {
    AdminLayout.renderBreadcrumb([
      { label: 'Dashboard', route: '#/admin/dashboard' },
      { label: 'Vendors', route: '#/admin/vendors' }
    ]);

    const vendors = AdminStore.getVendors();
    const html = `
      <div class="admin-page-header">
        <div>
          <h1 class="admin-page-title">Vendors</h1>
          <p class="admin-page-subtitle">Manage and monitor your marketplace vendors (${vendors.length} total)</p>
        </div>
        <div class="admin-page-actions">
          <button class="admin-btn admin-btn-secondary">📊 Export</button>
          <button class="admin-btn admin-btn-primary" onclick="AdminVendors.showAddModal()">➕ Add Vendor</button>
        </div>
      </div>

      <div class="admin-table-wrapper">
        <div class="admin-table-toolbar">
          <input type="text" class="admin-input admin-table-search" placeholder="Search vendors..." id="vendor-search" style="max-width: 300px;" />
          <select class="admin-select" style="max-width: 150px;">
            <option>All Status</option>
            <option>Active</option>
            <option>Pending</option>
            <option>Rejected</option>
          </select>
        </div>

        <table class="admin-table">
          <thead>
            <tr>
              <th><input type="checkbox" /></th>
              <th>Vendor Name</th>
              <th>Status</th>
              <th>Products</th>
              <th>Revenue</th>
              <th>Rating</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${vendors.map(v => `
              <tr>
                <td><input type="checkbox" /></td>
                <td><strong>${v.logo} ${v.name}</strong><br><small style="color: #6b7280;">${v.email}</small></td>
                <td><span class="admin-status-badge ${AdminConfig.statusColors[v.status]}">${AdminConfig.statusLabels[v.status]}</span></td>
                <td>${v.products}</td>
                <td>${AdminUtils.formatPrice(v.revenue)}</td>
                <td>⭐${v.rating}</td>
                <td>
                  <div class="admin-action-menu">
                    <button class="admin-action-menu-btn">⋮</button>
                    <div class="admin-action-dropdown">
                      <a href="#/admin/vendors/${v.id}">👁️ View</a>
                      <a onclick="AdminVendors.editVendor('${v.id}')">✏️ Edit</a>
                      <a onclick="AdminVendors.approveVendor('${v.id}')">✅ Approve</a>
                      <hr />
                      <button onclick="AdminVendors.deleteVendor('${v.id}')" style="color: #ef4444;">🗑️ Delete</button>
                    </div>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="admin-table-pagination">
          <span>Showing 1-${vendors.length} of ${vendors.length} vendors</span>
          <div class="admin-pagination-controls">
            <button class="admin-pagination-btn" disabled>← Previous</button>
            <span style="padding: 0 8px;">1</span>
            <button class="admin-pagination-btn" disabled>Next →</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('admin-page-content').innerHTML = html;
    this.bindActionMenus();
  },

  bindActionMenus: function() {
    document.querySelectorAll('.admin-action-menu-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const menu = btn.nextElementSibling;
        if (menu) menu.classList.toggle('visible');
      });
    });
    document.addEventListener('click', () => {
      document.querySelectorAll('.admin-action-dropdown').forEach(m => m.classList.remove('visible'));
    });
  },

  showAddModal: function() {
    AdminModal.show('Add New Vendor', `
      <div class="admin-form-group">
        <label class="admin-label">Vendor Name *</label>
        <input type="text" class="admin-input" placeholder="Enter vendor name" id="vendor-name" />
      </div>
      <div class="admin-form-group">
        <label class="admin-label">Email *</label>
        <input type="email" class="admin-input" placeholder="vendor@example.com" id="vendor-email" />
      </div>
      <div class="admin-form-group">
        <label class="admin-label">Phone *</label>
        <input type="text" class="admin-input" placeholder="+91-9876543210" id="vendor-phone" />
      </div>
      <div class="admin-form-group">
        <label class="admin-label">Commission Rate (%)</label>
        <input type="number" class="admin-input" value="8" min="1" max="30" id="vendor-commission" />
      </div>
    `, [
      { label: 'Cancel', class: 'admin-btn-secondary', onclick: 'AdminModal.close()' },
      { label: 'Add Vendor', class: 'admin-btn-primary', onclick: 'AdminVendors.addVendor()' }
    ]);
  },

  addVendor: function() {
    const name = document.getElementById('vendor-name')?.value;
    const email = document.getElementById('vendor-email')?.value;
    if (!name || !email) {
      AdminToast.error('Please fill all required fields');
      return;
    }
    AdminToast.success('Vendor added successfully!');
    AdminModal.close();
    this.render();
  },

  approveVendor: function(id) {
    AdminStore.updateVendor(id, { status: 'active', kycStatus: 'completed' });
    AdminToast.success('Vendor approved!');
    this.render();
  },

  deleteVendor: function(id) {
    AdminModal.confirm('Delete Vendor', 'Are you sure? This action cannot be undone.', 'AdminVendors.confirmDelete("' + id + '")');
  },

  confirmDelete: function(id) {
    AdminToast.success('Vendor deleted!');
    this.render();
  },

  editVendor: function(id) {
    const vendor = AdminStore.getVendorById(id);
    AdminModal.show('Edit Vendor: ' + vendor.name, `
      <div class="admin-form-group">
        <label class="admin-label">Vendor Name</label>
        <input type="text" class="admin-input" value="${vendor.name}" />
      </div>
      <div class="admin-form-group">
        <label class="admin-label">Commission Rate (%)</label>
        <input type="number" class="admin-input" value="${vendor.commission}" />
      </div>
    `, [
      { label: 'Cancel', class: 'admin-btn-secondary', onclick: 'AdminModal.close()' },
      { label: 'Save Changes', class: 'admin-btn-primary', onclick: 'AdminToast.success("Vendor updated!"); AdminModal.close();' }
    ]);
  }
};
