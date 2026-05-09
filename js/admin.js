/* ================================================
   admin.js — Sunfara Admin Dashboard Logic
   Sections: Dashboard, Products, Orders, Customers,
             Categories, Coupons, Analytics, Settings
   ================================================ */

/* ── Auth ── */
const AdminAuth = {
  CREDENTIALS: { email: 'admin@sunfara.com', password: 'admin123' },

  login() {
    const email = document.getElementById('admin-email')?.value.trim();
    const password = document.getElementById('admin-password')?.value;
    if (email === this.CREDENTIALS.email && password === this.CREDENTIALS.password) {
      document.getElementById('admin-login').style.display = 'none';
      document.getElementById('admin-app').style.display = 'flex';
      Admin.init();
    } else {
      AdminToast.show('Invalid credentials. Try admin@sunfara.com / admin123', 'error');
    }
  },

  logout() {
    document.getElementById('admin-login').style.display = 'flex';
    document.getElementById('admin-app').style.display = 'none';
  }
};

/* ── Toast ── */
const AdminToast = {
  show(msg, type = 'success') {
    const c = document.getElementById('admin-toast');
    const t = document.createElement('div');
    const colors = { success: '#4a7c59', error: '#c0392b', info: '#2980b9' };
    t.style.cssText = `background:${colors[type]||colors.success};color:white;padding:12px 20px;border-radius:8px;margin-top:8px;font-size:.875rem;animation:slideInRight .3s ease;box-shadow:0 4px 12px rgba(0,0,0,.2);max-width:320px`;
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 300); }, 3000);
  }
};

/* ── Admin Core ── */
const Admin = {
  currentSection: 'dashboard',
  mockOrders: [],
  editingProduct: null,

  async init() {
    await Data.init();
    Store.load();
    this.generateMockOrders();
    this.showSection('dashboard');
  },

  generateMockOrders() {
    const statuses = ['Processing', 'Shipped', 'Delivered', 'Delivered', 'Delivered', 'Cancelled'];
    const payments = ['UPI', 'Card', 'COD', 'Net Banking'];
    const names = ['Priya Sharma', 'Ananya R.', 'Meena K.', 'Riya T.', 'Deepa M.', 'Sunita G.', 'Kavya N.', 'Pooja S.', 'Asha V.', 'Divya P.'];
    this.mockOrders = Array.from({ length: 24 }, (_, i) => {
      const product = Data.products[Math.floor(Math.random() * Data.products.length)];
      const qty = Math.floor(Math.random() * 3) + 1;
      const total = product.price * qty;
      return {
        id: `SUN-2024-${Math.random().toString(36).substr(2,6).toUpperCase()}`,
        customer: names[Math.floor(Math.random() * names.length)],
        email: `customer${i}@gmail.com`,
        items: [{ name: product.name, qty, price: product.price, image: product.image }],
        total, payment: payments[Math.floor(Math.random() * payments.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        date: new Date(Date.now() - Math.random() * 30 * 24 * 3600000).toISOString(),
        city: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad'][Math.floor(Math.random() * 5)]
      };
    });
    this.mockOrders = [...Store.orders.map(o => ({ ...o, customer: Store.user?.name || 'Customer', email: Store.user?.email || 'user@email.com', city: o.address?.city || 'Bangalore' })), ...this.mockOrders];
  },

  showSection(section) {
    this.currentSection = section;
    document.querySelectorAll('.admin-nav-item').forEach(a => a.classList.toggle('active', a.dataset.section === section));
    const titles = { dashboard: 'Dashboard', products: 'Products', orders: 'Orders', customers: 'Customers', categories: 'Categories', coupons: 'Coupons', analytics: 'Analytics', settings: 'Settings' };
    document.getElementById('admin-page-title').textContent = titles[section] || section;
    const el = document.getElementById('admin-content');
    const sections = { dashboard: () => this.renderDashboard(el), products: () => this.renderProducts(el), orders: () => this.renderOrders(el), customers: () => this.renderCustomers(el), categories: () => this.renderCategories(el), coupons: () => this.renderCoupons(el), analytics: () => this.renderAnalytics(el), settings: () => this.renderSettings(el) };
    (sections[section] || (() => {}))();
  },

  toggleSidebar() {
    const sb = document.getElementById('admin-sidebar');
    if (window.innerWidth <= 768) sb.classList.toggle('mobile-open');
    else sb.classList.toggle('collapsed');
  },

  globalSearch(q) {
    if (!q.trim()) return;
    const results = Data.products.filter(p => p.name.toLowerCase().includes(q.toLowerCase())).slice(0, 5);
    if (results.length) { this.showSection('products'); AdminToast.show(`Showing ${results.length} results for "${q}"`, 'info'); }
  },

  /* ── DASHBOARD ── */
  renderDashboard(el) {
    const totalRevenue = this.mockOrders.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + (o.final || o.total || 0), 0);
    const totalOrders = this.mockOrders.length;
    const deliveredOrders = this.mockOrders.filter(o => o.status === 'Delivered').length;
    const totalProducts = Data.products.length;

    const weeklySales = [42, 58, 35, 71, 63, 49, 88];
    const maxSale = Math.max(...weeklySales);
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    el.innerHTML = `
      <div class="admin-stat-grid">
        <div class="admin-stat-card green"><div class="admin-stat-label">Total Revenue</div><div class="admin-stat-value">${formatPrice(totalRevenue)}</div><div class="admin-stat-change up">↑ 12.5% this month</div></div>
        <div class="admin-stat-card orange"><div class="admin-stat-label">Total Orders</div><div class="admin-stat-value">${totalOrders}</div><div class="admin-stat-change up">↑ 8.3% this week</div></div>
        <div class="admin-stat-card blue"><div class="admin-stat-label">Products Listed</div><div class="admin-stat-value">${totalProducts}</div><div class="admin-stat-change up">↑ 3 new this week</div></div>
        <div class="admin-stat-card purple"><div class="admin-stat-label">Delivery Rate</div><div class="admin-stat-value">${Math.round(deliveredOrders/totalOrders*100)}%</div><div class="admin-stat-change up">↑ 2.1% improvement</div></div>
      </div>

      <div class="admin-grid-2">
        <div class="admin-card">
          <div class="admin-table-header"><strong>Weekly Sales</strong><span style="font-size:.8rem;color:var(--color-text-muted)">Orders per day</span></div>
          <div class="admin-chart-wrap">
            <div class="admin-bar-chart">
              ${weeklySales.map((v, i) => `<div class="admin-bar" style="height:${Math.round(v/maxSale*100)}%" title="${v} orders"><div class="admin-bar-label">${days[i]}</div></div>`).join('')}
            </div>
          </div>
        </div>
        <div class="admin-card">
          <div class="admin-table-header"><strong>Recent Orders</strong><a onclick="Admin.showSection('orders')" style="font-size:.8rem;color:var(--color-primary);cursor:pointer">View All →</a></div>
          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead><tr><th>Order ID</th><th>Customer</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                ${this.mockOrders.slice(0, 6).map(o => `
                  <tr>
                    <td style="font-size:.8rem;font-weight:600">${o.id}</td>
                    <td>${o.customer}</td>
                    <td>${formatPrice(o.final || o.total)}</td>
                    <td><span class="admin-badge badge-${o.status.toLowerCase()}">${o.status}</span></td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="admin-grid-2" style="margin-top:20px">
        <div class="admin-card">
          <div class="admin-table-header"><strong>Top Products</strong></div>
          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th></tr></thead>
              <tbody>
                ${Data.products.filter(p => p.isBestseller || p.isFeatured).slice(0, 6).map(p => `
                  <tr>
                    <td style="display:flex;align-items:center;gap:8px"><img src="${p.image}" alt="${p.name}" onerror="this.style.background='#6a9e78'"><span style="font-size:.8rem">${truncate(p.name, 25)}</span></td>
                    <td><span class="admin-badge badge-active">${p.category.replace(/-/g,' ')}</span></td>
                    <td>${formatPrice(p.price)}</td>
                    <td style="color:${p.stock < 20?'#c0392b':'var(--color-primary)'}">${p.stock}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div class="admin-card">
          <div class="admin-table-header"><strong>Category Performance</strong></div>
          ${Data.categories.map(c => {
            const count = Data.getProductsByCategory(c.id).length;
            const pct = Math.round(count / Data.products.length * 100);
            return `<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;font-size:.85rem;margin-bottom:4px"><span>${c.icon} ${c.name}</span><span>${count} products</span></div><div style="height:6px;background:var(--color-border);border-radius:3px;overflow:hidden"><div style="height:100%;background:var(--color-primary);width:${pct}%;border-radius:3px"></div></div></div>`;
          }).join('')}
        </div>
      </div>`;
  },

  /* ── PRODUCTS ── */
  renderProducts(el) {
    el.innerHTML = `
      <div class="admin-card">
        <div class="admin-table-header">
          <div style="display:flex;gap:12px;align-items:center">
            <input type="text" class="admin-input" style="width:220px" placeholder="Search products..." oninput="Admin.filterProductTable(this.value)" id="prod-search">
            <select class="admin-input" style="width:160px" onchange="Admin.filterProductCategory(this.value)">
              <option value="">All Categories</option>
              ${Data.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
            </select>
          </div>
          <button class="admin-btn-primary" style="width:auto;padding:10px 20px" onclick="Admin.openProductModal()">+ Add Product</button>
        </div>
        <div class="admin-table-wrap">
          <table class="admin-table" id="products-table">
            <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>MRP</th><th>Stock</th><th>Rating</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody id="products-tbody">${this.buildProductRows(Data.products)}</tbody>
          </table>
        </div>
      </div>
      <div id="product-modal-overlay" class="admin-modal-overlay" onclick="if(event.target===this)this.classList.remove('open')"></div>`;
  },

  buildProductRows(products) {
    return products.map(p => `
      <tr>
        <td style="display:flex;align-items:center;gap:8px;min-width:200px"><img src="${p.image}" alt="${p.name}" onerror="this.style.background='var(--color-cream)'"><div><div style="font-weight:500;font-size:.85rem">${truncate(p.name,28)}</div><div style="font-size:.75rem;color:var(--color-text-muted)">${p.brand}</div></div></td>
        <td style="font-size:.8rem">${p.category.replace(/-/g,' ')}</td>
        <td>${formatPrice(p.price)}</td>
        <td style="text-decoration:line-through;color:var(--color-text-muted)">${formatPrice(p.mrp)}</td>
        <td style="color:${p.stock<20?'#c0392b':p.stock<50?'#e67e22':'var(--color-primary)'}"><strong>${p.stock}</strong></td>
        <td>⭐ ${p.rating} <span style="font-size:.75rem;color:var(--color-text-muted)">(${p.reviewCount})</span></td>
        <td><span class="admin-badge ${p.stock>0?'badge-active':'badge-inactive'}">${p.stock>0?'Active':'Out of Stock'}</span></td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="admin-btn-secondary" style="padding:4px 10px;font-size:.75rem" onclick="Admin.openProductModal('${p.id}')">Edit</button>
            <button class="admin-btn-danger" style="padding:4px 10px;font-size:.75rem" onclick="Admin.deleteProduct('${p.id}')">Del</button>
          </div>
        </td>
      </tr>`).join('');
  },

  filterProductTable(q) {
    const products = q ? Data.products.filter(p => p.name.toLowerCase().includes(q.toLowerCase()) || p.brand.toLowerCase().includes(q.toLowerCase())) : Data.products;
    const tbody = document.getElementById('products-tbody');
    if (tbody) tbody.innerHTML = this.buildProductRows(products);
  },

  filterProductCategory(cat) {
    const products = cat ? Data.products.filter(p => p.category === cat) : Data.products;
    const tbody = document.getElementById('products-tbody');
    if (tbody) tbody.innerHTML = this.buildProductRows(products);
  },

  openProductModal(productId = null) {
    const p = productId ? Data.getProductById(productId) : null;
    const overlay = document.getElementById('product-modal-overlay');
    overlay.innerHTML = `
      <div class="admin-modal">
        <div class="admin-modal-header">
          <div class="admin-modal-title">${p ? 'Edit Product' : 'Add New Product'}</div>
          <button class="admin-modal-close" onclick="document.getElementById('product-modal-overlay').classList.remove('open')">✕</button>
        </div>
        <div class="admin-form-grid">
          <div class="admin-form-group full"><label class="admin-label">Product Name *</label><input class="admin-input" id="pm-name" value="${p?.name||''}"></div>
          <div class="admin-form-group"><label class="admin-label">Brand *</label><input class="admin-input" id="pm-brand" value="${p?.brand||'Sunfara Organics'}"></div>
          <div class="admin-form-group"><label class="admin-label">Category *</label>
            <select class="admin-input" id="pm-cat">
              ${Data.categories.map(c => `<option value="${c.id}" ${p?.category===c.id?'selected':''}>${c.name}</option>`).join('')}
            </select>
          </div>
          <div class="admin-form-group"><label class="admin-label">Price (₹) *</label><input class="admin-input" id="pm-price" type="number" value="${p?.price||''}"></div>
          <div class="admin-form-group"><label class="admin-label">MRP (₹) *</label><input class="admin-input" id="pm-mrp" type="number" value="${p?.mrp||''}"></div>
          <div class="admin-form-group"><label class="admin-label">Stock *</label><input class="admin-input" id="pm-stock" type="number" value="${p?.stock||''}"></div>
          <div class="admin-form-group"><label class="admin-label">Image Path</label><input class="admin-input" id="pm-image" value="${p?.image||''}"></div>
          <div class="admin-form-group">
            <label class="admin-label">Flags</label>
            <div style="display:flex;gap:12px;margin-top:4px">
              <label style="display:flex;align-items:center;gap:4px;font-size:.85rem"><input type="checkbox" id="pm-new" ${p?.isNew?'checked':''}> New</label>
              <label style="display:flex;align-items:center;gap:4px;font-size:.85rem"><input type="checkbox" id="pm-bs" ${p?.isBestseller?'checked':''}> Bestseller</label>
              <label style="display:flex;align-items:center;gap:4px;font-size:.85rem"><input type="checkbox" id="pm-feat" ${p?.isFeatured?'checked':''}> Featured</label>
            </div>
          </div>
          <div class="admin-form-group full"><label class="admin-label">Description</label><textarea class="admin-input" id="pm-desc" rows="3">${p?.description||''}</textarea></div>
          <div class="admin-form-group full"><label class="admin-label">How to Use</label><textarea class="admin-input" id="pm-how" rows="2">${p?.howToUse||''}</textarea></div>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:24px">
          <button class="admin-btn-secondary" onclick="document.getElementById('product-modal-overlay').classList.remove('open')">Cancel</button>
          <button class="admin-btn-primary" style="width:auto;padding:10px 24px" onclick="Admin.saveProduct('${productId||''}')">${p?'Update Product':'Add Product'}</button>
        </div>
      </div>`;
    overlay.classList.add('open');
  },

  saveProduct(productId) {
    const name = document.getElementById('pm-name')?.value.trim();
    if (!name) { AdminToast.show('Product name is required', 'error'); return; }
    const price = +document.getElementById('pm-price')?.value;
    const mrp = +document.getElementById('pm-mrp')?.value;
    if (productId) {
      const p = Data.getProductById(productId);
      if (p) { p.name = name; p.brand = document.getElementById('pm-brand').value; p.price = price; p.mrp = mrp; p.stock = +document.getElementById('pm-stock').value; p.isNew = document.getElementById('pm-new').checked; p.isBestseller = document.getElementById('pm-bs').checked; p.isFeatured = document.getElementById('pm-feat').checked; p.description = document.getElementById('pm-desc').value; p.discount = Math.round((mrp-price)/mrp*100); }
      AdminToast.show('Product updated successfully!', 'success');
    } else {
      AdminToast.show('Product added! (Persists in session only)', 'success');
    }
    document.getElementById('product-modal-overlay').classList.remove('open');
    this.renderProducts(document.getElementById('admin-content'));
  },

  deleteProduct(productId) {
    if (!confirm(`Delete product ${productId}? This is demo-only.`)) return;
    AdminToast.show('Product deleted (demo mode — refreshing restores it)', 'info');
  },

  /* ── ORDERS ── */
  renderOrders(el) {
    const filterStatus = ['All', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
    el.innerHTML = `
      <div class="admin-card">
        <div class="admin-table-header">
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${filterStatus.map((s,i) => `<button class="admin-btn-secondary ${i===0?'active':''}" style="padding:6px 14px" onclick="Admin.filterOrders('${s}',this)">${s}</button>`).join('')}
          </div>
          <span style="font-size:.85rem;color:var(--color-text-muted)">${this.mockOrders.length} total orders</span>
        </div>
        <div class="admin-table-wrap">
          <table class="admin-table" id="orders-table">
            <thead><tr><th>Order ID</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>City</th><th>Date</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>${this.buildOrderRows(this.mockOrders)}</tbody>
          </table>
        </div>
      </div>`;
  },

  buildOrderRows(orders) {
    return orders.map(o => `
      <tr>
        <td style="font-size:.8rem;font-weight:700;color:var(--color-primary)">${o.id}</td>
        <td><div style="font-weight:500;font-size:.85rem">${o.customer}</div><div style="font-size:.75rem;color:var(--color-text-muted)">${o.email||''}</div></td>
        <td>${o.items?.length||1}</td>
        <td style="font-weight:700">${formatPrice(o.final||o.total||0)}</td>
        <td style="font-size:.8rem">${o.payment||'UPI'}</td>
        <td style="font-size:.8rem">${o.city||o.address?.city||'—'}</td>
        <td style="font-size:.8rem;color:var(--color-text-muted)">${formatDate(o.date)}</td>
        <td><span class="admin-badge badge-${o.status.toLowerCase()}">${o.status}</span></td>
        <td>
          <select class="admin-input" style="font-size:.75rem;padding:4px 8px" onchange="Admin.updateOrderStatus('${o.id}',this.value)">
            ${['Processing','Shipped','Delivered','Cancelled'].map(s=>`<option ${s===o.status?'selected':''}>${s}</option>`).join('')}
          </select>
        </td>
      </tr>`).join('');
  },

  filterOrders(status, btn) {
    document.querySelectorAll('.admin-btn-secondary').forEach(b => b.style.background = 'white');
    if (btn) btn.style.background = 'var(--color-primary)';
    const filtered = status === 'All' ? this.mockOrders : this.mockOrders.filter(o => o.status === status);
    const tbody = document.querySelector('#orders-table tbody');
    if (tbody) tbody.innerHTML = this.buildOrderRows(filtered);
  },

  updateOrderStatus(orderId, newStatus) {
    const order = this.mockOrders.find(o => o.id === orderId);
    if (order) { order.status = newStatus; AdminToast.show(`Order ${orderId} → ${newStatus}`, 'success'); }
  },

  /* ── CUSTOMERS ── */
  renderCustomers(el) {
    const customers = [
      { name: Store.user?.name || 'Priya Sharma', email: Store.user?.email || 'priya@gmail.com', orders: Store.orders.length || 3, spent: Store.orders.reduce((s,o)=>s+(o.final||0),0) || 2847, joined: '2024-01-15', city: 'Mumbai' },
      { name: 'Ananya R.', email: 'ananya@gmail.com', orders: 5, spent: 4231, joined: '2023-11-20', city: 'Bangalore' },
      { name: 'Meena K.', email: 'meena@gmail.com', orders: 2, spent: 1199, joined: '2024-02-05', city: 'Delhi' },
      { name: 'Riya T.', email: 'riya@gmail.com', orders: 8, spent: 7890, joined: '2023-09-10', city: 'Chennai' },
      { name: 'Deepa M.', email: 'deepa@gmail.com', orders: 1, spent: 699, joined: '2024-03-01', city: 'Hyderabad' }
    ];
    el.innerHTML = `
      <div class="admin-card">
        <div class="admin-table-header"><strong>${customers.length} Customers</strong><button class="admin-btn-secondary" onclick="AdminToast.show('Export feature coming soon!','info')">Export CSV</button></div>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead><tr><th>Customer</th><th>Email</th><th>City</th><th>Orders</th><th>Total Spent</th><th>Joined</th><th>Status</th></tr></thead>
            <tbody>
              ${customers.map(c => `<tr>
                <td style="font-weight:500">${c.name}</td>
                <td style="font-size:.85rem">${c.email}</td>
                <td style="font-size:.85rem">${c.city}</td>
                <td><strong>${c.orders}</strong></td>
                <td style="font-weight:700;color:var(--color-primary)">${formatPrice(c.spent)}</td>
                <td style="font-size:.8rem;color:var(--color-text-muted)">${formatDate(c.joined)}</td>
                <td><span class="admin-badge badge-active">Active</span></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  /* ── CATEGORIES ── */
  renderCategories(el) {
    el.innerHTML = `
      <div class="admin-card">
        <div class="admin-table-header"><strong>Product Categories</strong><button class="admin-btn-primary" style="width:auto;padding:10px 20px" onclick="AdminToast.show('Add category feature coming soon!','info')">+ Add Category</button></div>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead><tr><th>Icon</th><th>Category Name</th><th>Slug</th><th>Products</th><th>Description</th><th>Actions</th></tr></thead>
            <tbody>
              ${Data.categories.map(c => `<tr>
                <td style="font-size:1.5rem;text-align:center">${c.icon}</td>
                <td style="font-weight:600">${c.name}</td>
                <td><code style="font-size:.75rem;background:#f0f0f0;padding:2px 6px;border-radius:4px">${c.slug}</code></td>
                <td><strong>${Data.getProductsByCategory(c.id).length}</strong></td>
                <td style="font-size:.85rem;color:var(--color-text-muted)">${c.description}</td>
                <td><button class="admin-btn-secondary" style="padding:4px 10px;font-size:.75rem" onclick="AdminToast.show('Edit category coming soon!','info')">Edit</button></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  /* ── COUPONS ── */
  renderCoupons(el) {
    el.innerHTML = `
      <div class="admin-card">
        <div class="admin-table-header"><strong>Coupon Codes</strong><button class="admin-btn-primary" style="width:auto;padding:10px 20px" onclick="Admin.addCouponPrompt()">+ Add Coupon</button></div>
        <div class="admin-table-wrap">
          <table class="admin-table" id="coupons-table">
            <thead><tr><th>Code</th><th>Type</th><th>Discount</th><th>Min Order</th><th>Description</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>${this.buildCouponRows()}</tbody>
          </table>
        </div>
      </div>`;
  },

  buildCouponRows() {
    return Data.coupons.map(c => `<tr>
      <td><code style="font-weight:700;color:var(--color-primary);background:#f0f7f2;padding:3px 8px;border-radius:4px">${c.code}</code></td>
      <td style="text-transform:capitalize">${c.type}</td>
      <td>${c.type==='percent'?c.discount+'%':c.type==='flat'?'₹'+c.discount:'Free Shipping'}</td>
      <td>${formatPrice(c.minOrder)}</td>
      <td style="font-size:.85rem">${c.description}</td>
      <td><span class="admin-badge badge-active">Active</span></td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="admin-btn-secondary" style="padding:4px 10px;font-size:.75rem" onclick="AdminToast.show('Coupon edited (demo)','success')">Edit</button>
          <button class="admin-btn-danger" style="padding:4px 10px;font-size:.75rem" onclick="AdminToast.show('Coupon deactivated (demo)','info')">Disable</button>
        </div>
      </td>
    </tr>`).join('');
  },

  addCouponPrompt() {
    const code = prompt('Enter new coupon code:');
    if (code) { AdminToast.show(`Coupon "${code}" added (demo mode)`, 'success'); }
  },

  /* ── ANALYTICS ── */
  renderAnalytics(el) {
    const catSales = Data.categories.map(c => ({ name: c.name, icon: c.icon, count: Data.getProductsByCategory(c.id).length, revenue: Data.getProductsByCategory(c.id).reduce((s, p) => s + p.price * Math.floor(Math.random() * 10 + 1), 0) }));
    el.innerHTML = `
      <div class="admin-stat-grid">
        <div class="admin-stat-card green"><div class="admin-stat-label">This Month Revenue</div><div class="admin-stat-value">${formatPrice(128450)}</div><div class="admin-stat-change up">↑ 18.2% vs last month</div></div>
        <div class="admin-stat-card orange"><div class="admin-stat-label">Conversion Rate</div><div class="admin-stat-value">3.4%</div><div class="admin-stat-change up">↑ 0.5% improvement</div></div>
        <div class="admin-stat-card blue"><div class="admin-stat-label">Avg Order Value</div><div class="admin-stat-value">${formatPrice(1247)}</div><div class="admin-stat-change up">↑ ₹89 this month</div></div>
        <div class="admin-stat-card purple"><div class="admin-stat-label">Return Customers</div><div class="admin-stat-value">42%</div><div class="admin-stat-change up">↑ 5% growth</div></div>
      </div>
      <div class="admin-grid-2">
        <div class="admin-card">
          <strong>Revenue by Category</strong>
          <div style="margin-top:16px">
            ${catSales.map(c => `<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;font-size:.85rem;margin-bottom:4px"><span>${c.icon} ${c.name}</span><span style="font-weight:600">${formatPrice(c.revenue)}</span></div><div style="height:8px;background:var(--color-border);border-radius:4px;overflow:hidden"><div style="height:100%;background:var(--color-primary);width:${Math.min(c.revenue/5000,100)}%;border-radius:4px"></div></div></div>`).join('')}
          </div>
        </div>
        <div class="admin-card">
          <strong>Traffic Sources</strong>
          <div style="margin-top:16px;display:flex;flex-direction:column;gap:12px">
            ${[{src:'Organic Search',pct:38},{src:'Direct',pct:24},{src:'Social Media',pct:19},{src:'Email',pct:12},{src:'Referral',pct:7}].map(s=>`<div><div style="display:flex;justify-content:space-between;font-size:.85rem;margin-bottom:4px"><span>${s.src}</span><span>${s.pct}%</span></div><div style="height:8px;background:var(--color-border);border-radius:4px;overflow:hidden"><div style="height:100%;background:var(--color-secondary);width:${s.pct}%;border-radius:4px"></div></div></div>`).join('')}
          </div>
        </div>
      </div>`;
  },

  /* ── SETTINGS ── */
  renderSettings(el) {
    el.innerHTML = `
      <div class="admin-grid-2">
        <div class="admin-card">
          <h3 style="margin-bottom:16px">Store Settings</h3>
          <div style="display:flex;flex-direction:column;gap:16px">
            <div class="admin-form-group"><label class="admin-label">Store Name</label><input class="admin-input" value="Sunfara Organics"></div>
            <div class="admin-form-group"><label class="admin-label">Contact Email</label><input class="admin-input" value="care@sunfara.com" type="email"></div>
            <div class="admin-form-group"><label class="admin-label">Contact Phone</label><input class="admin-input" value="+91 80 4567 8900"></div>
            <div class="admin-form-group"><label class="admin-label">Free Shipping Threshold (₹)</label><input class="admin-input" value="599" type="number"></div>
            <div class="admin-form-group"><label class="admin-label">COD Charge (₹)</label><input class="admin-input" value="40" type="number"></div>
            <button class="admin-btn-primary" onclick="AdminToast.show('Settings saved!','success')">Save Settings</button>
          </div>
        </div>
        <div class="admin-card">
          <h3 style="margin-bottom:16px">Design & Branding</h3>
          <div style="display:flex;flex-direction:column;gap:16px">
            <div class="admin-form-group"><label class="admin-label">Primary Color</label><input class="admin-input" type="color" value="#4a7c59"></div>
            <div class="admin-form-group"><label class="admin-label">Secondary Color</label><input class="admin-input" type="color" value="#c17f3b"></div>
            <div class="admin-form-group"><label class="admin-label">Offer Bar Text</label><input class="admin-input" value="🌿 Free shipping on orders above ₹599"></div>
            <div class="admin-form-group"><label class="admin-label">Meta Description</label><textarea class="admin-input" rows="2">Sunfara — Premium organic & wellness brand. Pure. Natural. Conscious.</textarea></div>
            <button class="admin-btn-primary" onclick="AdminToast.show('Branding settings saved!','success')">Save Branding</button>
          </div>
        </div>
      </div>
      <div class="admin-card" style="margin-top:20px">
        <h3 style="margin-bottom:16px">Admin Account</h3>
        <div class="admin-form-grid">
          <div class="admin-form-group"><label class="admin-label">Admin Email</label><input class="admin-input" value="admin@sunfara.com" type="email"></div>
          <div class="admin-form-group"><label class="admin-label">New Password</label><input class="admin-input" type="password" placeholder="Enter new password"></div>
        </div>
        <button class="admin-btn-primary" style="margin-top:16px" onclick="AdminToast.show('Account updated!','success')">Update Account</button>
      </div>`;
  }
};

// Enter key support on login
document.getElementById('admin-password')?.addEventListener('keydown', e => { if (e.key === 'Enter') AdminAuth.login(); });
