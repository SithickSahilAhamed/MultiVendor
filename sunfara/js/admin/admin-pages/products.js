/* Products Page */

const AdminProducts = {
  _products: [],

  render: async function() {
    AdminLayout.renderBreadcrumb([
      { label: 'Dashboard', route: '#/admin/dashboard' },
      { label: 'Products', route: '#/admin/products' }
    ]);
    document.getElementById('admin-page-content').innerHTML = '<div style="padding:40px;text-align:center;color:#6b7280;">Loading products...</div>';

    this._products = await AdminStore.fetchProducts();
    const products = this._products;
    const pending = products.filter(p => p.status === 'pending').length;

    const html = `
      <div class="admin-page-header">
        <div>
          <h1 class="admin-page-title">Products</h1>
          <p class="admin-page-subtitle">${products.length} total products (${pending} pending approval)</p>
        </div>
        <div class="admin-page-actions">
          <button class="admin-btn admin-btn-secondary">📥 Import</button>
          <button class="admin-btn admin-btn-primary">➕ Add Product</button>
        </div>
      </div>

      <div class="admin-table-wrapper">
        <div class="admin-table-toolbar">
          <input type="text" class="admin-input admin-table-search" placeholder="Search products..." style="max-width: 300px;" />
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
              <th>Product</th>
              <th>Vendor</th>
              <th>Stock</th>
              <th>Price</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${products.length === 0 ? '<tr><td colspan="7" style="text-align:center;padding:32px;color:#6b7280;">No products found</td></tr>' :
              products.map(p => `
              <tr>
                <td><input type="checkbox" /></td>
                <td><strong>${p.image || '📦'} ${p.name}</strong></td>
                <td>${p.vendorName || p.vendor || '—'}</td>
                <td>${p.stock ?? '—'}</td>
                <td>${AdminUtils.formatPrice(p.price || 0)}</td>
                <td><span class="admin-status-badge ${AdminConfig.statusColors[p.status] || 'admin-status-pending'}">${AdminConfig.statusLabels[p.status] || p.status}</span></td>
                <td>
                  <div class="admin-action-menu">
                    <button class="admin-action-menu-btn">⋮</button>
                    <div class="admin-action-dropdown">
                      <a onclick="AdminProducts.viewProduct('${p.id}')">👁️ View</a>
                      <a onclick="AdminProducts.approveProduct('${p.id}')">✅ Approve</a>
                      <a onclick="AdminProducts.rejectProduct('${p.id}')" style="color: #ef4444;">❌ Reject</a>
                    </div>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="admin-table-pagination">
          <span>Showing 1-${products.length} of ${products.length} products</span>
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
    }, { once: true });
  },

  viewProduct: function(id) {
    const product = this._products.find(p => p.id === id);
    if (!product) return;
    AdminModal.show(product.name, `
      <p><strong>Vendor:</strong> ${product.vendorName || product.vendor || '—'}</p>
      <p><strong>Price:</strong> ${AdminUtils.formatPrice(product.price || 0)}</p>
      <p><strong>Stock:</strong> ${product.stock ?? '—'}</p>
      <p><strong>Status:</strong> ${AdminConfig.statusLabels[product.status] || product.status}</p>
    `, [
      { label: 'Close', class: 'admin-btn-secondary', onclick: 'AdminModal.close()' }
    ]);
  },

  approveProduct: async function(id) {
    try { await AdminAPI.approveProduct(id); } catch(e) { console.warn('API approve product failed', e); }
    AdminToast.success('Product approved!');
    await this.render();
  },

  rejectProduct: async function(id) {
    try { await AdminAPI.updateProduct(id, { status: 'rejected' }); } catch(e) { console.warn('API reject product failed', e); }
    AdminToast.success('Product rejected!');
    await this.render();
  }
};
