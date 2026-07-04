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
          <button class="admin-btn admin-btn-primary" onclick="AdminProducts.showAddModal()">➕ Add Product</button>
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
                <td><img src="${AdminUtils.escapeHtml(p.image || '')}" alt="" onerror="this.style.display='none'" style="width:40px;height:40px;object-fit:cover;border-radius:6px;vertical-align:middle;margin-right:8px;background:#f3f4f6" /><strong>${AdminUtils.escapeHtml(p.name)}</strong></td>
                <td>${AdminUtils.escapeHtml(p.vendorName || p.vendor) || '—'}</td>
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
      ${product.image ? `<img src="${AdminUtils.escapeHtml(product.image)}" alt="" onerror="this.style.display='none'" style="width:120px;height:120px;object-fit:cover;border-radius:8px;margin-bottom:12px;background:#f3f4f6" />` : ''}
      <p><strong>Vendor:</strong> ${product.vendorName || product.vendor || '—'}</p>
      <p><strong>Price:</strong> ${AdminUtils.formatPrice(product.price || 0)}</p>
      <p><strong>Stock:</strong> ${product.stock ?? '—'}</p>
      <p><strong>Status:</strong> ${AdminConfig.statusLabels[product.status] || product.status}</p>
    `, [
      { label: 'Close', class: 'admin-btn-secondary', onclick: 'AdminModal.close()' }
    ]);
  },

  approveProduct: async function(id) {
    try {
      await AdminAPI.approveProduct(id);
      AdminToast.success('Product approved!');
      await this.render();
    } catch(e) { AdminToast.error(e.message || 'Failed to approve product'); }
  },

  rejectProduct: async function(id) {
    try {
      await AdminAPI.updateProduct(id, { status: 'rejected' });
      AdminToast.success('Product rejected!');
      await this.render();
    } catch(e) { AdminToast.error(e.message || 'Failed to reject product'); }
  },

  _pendingImage: null, // { data: <base64 body>, contentType } picked in the form but not yet uploaded

  previewImage: function(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    this.compressImage(file).then(({ dataUrl, data, contentType }) => {
      this._pendingImage = { data, contentType };
      const img = document.getElementById('product-image-preview');
      if (img) { img.src = dataUrl; img.style.visibility = 'visible'; }
      const url = document.getElementById('product-image');
      if (url) url.value = '';
    }).catch(() => AdminToast.error('Could not read that image file'));
  },

  /* Resize/re-encode in the browser so uploads stay well under the API's
     600KB limit no matter what size photo gets picked. */
  compressImage: function(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, 800 / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(img.src);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        resolve({ dataUrl, data: dataUrl.split(',')[1], contentType: 'image/jpeg' });
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  },

  showAddModal: async function() {
    this._pendingImage = null;
    let vendors = [];
    try { vendors = await AdminStore.fetchVendors(); } catch (e) { /* fall through with empty list */ }
    const vendorOptions = vendors.length
      ? vendors.map(v => `<option value="${v.id}" data-name="${AdminUtils.escapeHtml(v.name)}">${AdminUtils.escapeHtml(v.name)}</option>`).join('')
      : '<option value="">No vendors yet — add one first</option>';

    AdminModal.show('Add New Product', `
      <div class="admin-form-group">
        <label class="admin-label">Product Name *</label>
        <input type="text" class="admin-input" placeholder="Enter product name" id="product-name" />
      </div>
      <div class="admin-form-group">
        <label class="admin-label">Vendor *</label>
        <select class="admin-select" id="product-vendor" style="width:100%">${vendorOptions}</select>
      </div>
      <div class="admin-form-group">
        <label class="admin-label">Category</label>
        <input type="text" class="admin-input" placeholder="e.g. Skincare" id="product-category" />
      </div>
      <div class="admin-form-group">
        <label class="admin-label">Brand</label>
        <input type="text" class="admin-input" placeholder="Defaults to vendor name" id="product-brand" />
      </div>
      <div class="admin-form-group">
        <label class="admin-label">Product Photo</label>
        <div style="display:flex;gap:12px;align-items:flex-start">
          <img id="product-image-preview" alt="" style="width:64px;height:64px;object-fit:cover;border-radius:8px;border:1px solid #e5e7eb;background:#f9fafb;flex-shrink:0;visibility:hidden" />
          <div style="flex:1">
            <input type="file" class="admin-input" id="product-image-file" accept="image/jpeg,image/png,image/webp" onchange="AdminProducts.previewImage(this)" style="padding:8px" />
            <input type="text" class="admin-input" placeholder="…or paste an image URL" id="product-image" style="margin-top:8px" />
          </div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="admin-form-group">
          <label class="admin-label">Price (₹) *</label>
          <input type="number" class="admin-input" min="0" step="0.01" id="product-price" />
        </div>
        <div class="admin-form-group">
          <label class="admin-label">MRP (₹)</label>
          <input type="number" class="admin-input" min="0" step="0.01" placeholder="Defaults to price (no discount)" id="product-mrp" />
        </div>
      </div>
      <div class="admin-form-group">
        <label class="admin-label">Stock *</label>
        <input type="number" class="admin-input" min="0" step="1" id="product-stock" />
      </div>
    `, [
      { label: 'Cancel', class: 'admin-btn-secondary', onclick: 'AdminModal.close()' },
      { label: 'Add Product', class: 'admin-btn-primary', onclick: 'AdminProducts.addProduct()' }
    ]);
  },

  addProduct: async function() {
    const name = document.getElementById('product-name')?.value.trim();
    const vendorSelect = document.getElementById('product-vendor');
    const vendorId = vendorSelect?.value;
    const vendorName = vendorSelect?.selectedOptions?.[0]?.dataset?.name || '';
    const category = document.getElementById('product-category')?.value.trim();
    const brand = document.getElementById('product-brand')?.value.trim() || vendorName;
    const image = document.getElementById('product-image')?.value.trim();
    const price = parseFloat(document.getElementById('product-price')?.value);
    const mrpInput = document.getElementById('product-mrp')?.value.trim();
    const mrp = mrpInput ? parseFloat(mrpInput) : price;
    const stock = parseInt(document.getElementById('product-stock')?.value, 10);

    if (!name || !vendorId || !Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0) {
      AdminToast.error('Please fill all required fields with valid values');
      return;
    }
    if (Number.isFinite(mrp) && mrp < price) {
      AdminToast.error('MRP cannot be lower than the price');
      return;
    }

    const discount = mrp > price ? Math.round((mrp - price) / mrp * 100) : 0;

    try {
      let finalImage = image;
      if (this._pendingImage) {
        const uploaded = await AdminAPI.post('/images', this._pendingImage);
        finalImage = `${AdminAPI.baseURL}/images/${uploaded.id}`;
      }
      finalImage = finalImage || `https://placehold.co/500x500/4a7c59/ffffff.png?text=${encodeURIComponent(name.slice(0, 26))}&font=montserrat`;
      await AdminAPI.createProduct({
        name, vendorId, vendorName, category, brand, stock, status: 'pending',
        price, mrp, discount,
        image: finalImage, images: [finalImage],
        rating: 0, reviewCount: 0,
        variants: [{ id: 'default', name: 'Standard', price }]
      });
      AdminToast.success('Product added successfully!');
      AdminModal.close();
      await this.render();
    } catch (e) {
      AdminToast.error(e.message || 'Failed to add product');
    }
  }
};
