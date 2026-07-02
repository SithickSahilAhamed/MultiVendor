/* Vendor Portal — Product Management */

const VendorProducts = {
  _products: [],

  render: async function() {
    VendorLayout.renderBreadcrumb([{ label: 'Dashboard', route: '#/vendor/dashboard' }, { label: 'Products', route: '#/vendor/products' }]);
    const el = document.getElementById('vendor-page-content');
    el.innerHTML = '<div style="padding:40px;text-align:center;color:#6b7280">Loading products…</div>';

    try { this._products = await VendorAPI.getMyProducts(); }
    catch (e) { el.innerHTML = `<div class="admin-page-header" style="color:#991b1b">Could not load products: ${e.message}</div>`; return; }

    const products = this._products;
    el.innerHTML = `
      ${VendorLayout.renderApprovalBanner()}
      <div class="admin-page-header">
        <div><h1 class="admin-page-title">Your Products</h1><p class="admin-page-subtitle">${products.length} total</p></div>
        <div class="admin-page-actions"><button class="admin-btn admin-btn-primary" onclick="VendorProducts.showAddModal()">➕ Add Product</button></div>
      </div>
      <div class="admin-table-wrapper">
        <table class="admin-table">
          <thead><tr><th>Product</th><th>Category</th><th>Stock</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            ${products.length === 0 ? '<tr><td colspan="6" style="text-align:center;padding:32px;color:#6b7280">No products yet — add your first one</td></tr>' :
              products.map(p => `
              <tr>
                <td><strong>${p.name}</strong></td>
                <td>${p.category || '—'}</td>
                <td style="color:${(p.stock ?? 0) === 0 ? '#ef4444' : (p.stock ?? 0) <= 5 ? '#f59e0b' : 'inherit'}">${p.stock ?? 0}</td>
                <td>${VendorUtils.formatPrice(p.price)}</td>
                <td><span class="admin-status-badge ${VendorConfig.statusColors[p.status] || 'admin-status-pending'}">${VendorConfig.statusLabels[p.status] || p.status}</span></td>
                <td>
                  <button class="admin-btn admin-btn-sm admin-btn-secondary" onclick="VendorProducts.showEditModal('${p.id}')">✏️ Edit</button>
                  <button class="admin-btn admin-btn-sm admin-btn-secondary" style="color:#ef4444" onclick="VendorProducts.deleteProduct('${p.id}')">🗑️</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  },

  formFields(p = {}) {
    return `
      <div class="admin-form-group"><label class="admin-label">Product Name *</label><input type="text" class="admin-input" id="vp-name" value="${p.name || ''}" placeholder="Enter product name" /></div>
      <div class="admin-form-group"><label class="admin-label">Category</label><input type="text" class="admin-input" id="vp-category" value="${p.category || ''}" placeholder="e.g. Skincare" /></div>
      <div class="admin-form-group"><label class="admin-label">Image URL</label><input type="text" class="admin-input" id="vp-image" value="${p.image || ''}" placeholder="Leave blank to use a placeholder" /></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="admin-form-group"><label class="admin-label">Price (₹) *</label><input type="number" class="admin-input" min="0" step="0.01" id="vp-price" value="${p.price ?? ''}" /></div>
        <div class="admin-form-group"><label class="admin-label">MRP (₹)</label><input type="number" class="admin-input" min="0" step="0.01" id="vp-mrp" value="${p.mrp ?? ''}" placeholder="Defaults to price" /></div>
      </div>
      <div class="admin-form-group"><label class="admin-label">Stock *</label><input type="number" class="admin-input" min="0" step="1" id="vp-stock" value="${p.stock ?? ''}" /></div>`;
  },

  showAddModal() {
    VendorModal.show('Add New Product', this.formFields(), [
      { label: 'Cancel', class: 'admin-btn-secondary', onclick: 'VendorModal.close()' },
      { label: 'Add Product', class: 'admin-btn-primary', onclick: 'VendorProducts.saveNew()' }
    ]);
  },

  showEditModal(id) {
    const p = this._products.find(x => x.id === id);
    if (!p) { VendorToast.error('Product not found'); return; }
    VendorModal.show(`Edit: ${p.name}`, this.formFields(p), [
      { label: 'Cancel', class: 'admin-btn-secondary', onclick: 'VendorModal.close()' },
      { label: 'Save Changes', class: 'admin-btn-primary', onclick: `VendorProducts.saveEdit('${id}')` }
    ]);
  },

  readForm() {
    const name = document.getElementById('vp-name')?.value.trim();
    const category = document.getElementById('vp-category')?.value.trim();
    const image = document.getElementById('vp-image')?.value.trim();
    const price = parseFloat(document.getElementById('vp-price')?.value);
    const mrpInput = document.getElementById('vp-mrp')?.value.trim();
    const mrp = mrpInput ? parseFloat(mrpInput) : price;
    const stock = parseInt(document.getElementById('vp-stock')?.value, 10);

    if (!name || !Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0) {
      VendorToast.error('Please fill all required fields with valid values');
      return null;
    }
    if (Number.isFinite(mrp) && mrp < price) { VendorToast.error('MRP cannot be lower than the price'); return null; }

    const discount = mrp > price ? Math.round((mrp - price) / mrp * 100) : 0;
    const finalImage = image || `https://placehold.co/500x500/4a7c59/ffffff.png?text=${encodeURIComponent(name.slice(0, 26))}&font=montserrat`;
    return {
      name, category, price, mrp, discount, stock,
      brand: VendorStore.profile?.name || VendorStore.user.name,
      vendorName: VendorStore.profile?.name || VendorStore.user.name,
      image: finalImage, images: [finalImage],
      variants: [{ id: 'default', name: 'Standard', price }]
    };
  },

  async saveNew() {
    const data = this.readForm();
    if (!data) return;
    try {
      await VendorAPI.createProduct({ ...data, rating: 0, reviewCount: 0 });
      VendorToast.success('Product added! It will go live once approved.');
      VendorModal.close();
      await this.render();
    } catch (e) { VendorToast.error(e.message || 'Failed to add product'); }
  },

  async saveEdit(id) {
    const data = this.readForm();
    if (!data) return;
    try {
      await VendorAPI.updateProduct(id, data);
      VendorToast.success('Product updated!');
      VendorModal.close();
      await this.render();
    } catch (e) { VendorToast.error(e.message || 'Failed to update product'); }
  },

  deleteProduct(id) {
    VendorModal.confirm('Delete Product', 'Are you sure? This cannot be undone.', `VendorProducts.confirmDelete('${id}')`);
  },

  async confirmDelete(id) {
    try {
      await VendorAPI.deleteProduct(id);
      VendorToast.success('Product deleted');
      await this.render();
    } catch (e) { VendorToast.error(e.message || 'Failed to delete product'); }
  }
};
