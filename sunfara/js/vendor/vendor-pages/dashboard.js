/* Vendor Portal — Dashboard Overview */

const VendorDashboard = {
  render: async function() {
    VendorLayout.renderBreadcrumb([{ label: 'Dashboard', route: '#/vendor/dashboard' }]);
    const el = document.getElementById('vendor-page-content');
    el.innerHTML = '<div style="padding:40px;text-align:center;color:#6b7280">Loading dashboard…</div>';

    let products = [], orders = [], wallet = { balance: 0, totalEarned: 0, totalWithdrawn: 0 };
    try {
      [products, orders, wallet] = await Promise.all([
        VendorAPI.getMyProducts(), VendorAPI.getMyOrders(), VendorAPI.getMyWallet()
      ]);
    } catch (e) {
      el.innerHTML = `<div class="admin-page-header" style="color:#991b1b">Could not load dashboard data: ${e.message}</div>`;
      return;
    }

    const itemCount = orders.reduce((s, o) => s + (o.items || []).length, 0);
    const totalSales = orders.reduce((s, o) => s + (o.subtotal || 0), 0);
    const pendingOrders = orders.filter(o => ['pending', 'confirmed', 'processing', 'packed'].includes(o.status)).length;
    const lowStock = products.filter(p => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= 5).length;
    const outOfStock = products.filter(p => (p.stock ?? 0) === 0).length;
    const activeProducts = products.filter(p => p.status === 'active').length;
    const pendingProducts = products.filter(p => p.status === 'pending').length;

    const el2 = document.getElementById('vendor-page-content');
    el2.innerHTML = `
      ${VendorLayout.renderApprovalBanner()}
      <div class="admin-page-header"><div><h1 class="admin-page-title">Welcome, ${VendorStore.user.name}</h1><p class="admin-page-subtitle">Here's how your store is doing</p></div></div>

      <div class="admin-grid">
        <div class="admin-kpi-card"><div class="admin-kpi-header"><span class="admin-kpi-label">Total Sales</span><span class="admin-kpi-icon">💰</span></div><div class="admin-kpi-value">${VendorUtils.formatPrice(totalSales)}</div><div class="admin-kpi-trend">${itemCount} items sold</div></div>
        <div class="admin-kpi-card"><div class="admin-kpi-header"><span class="admin-kpi-label">Wallet Balance</span><span class="admin-kpi-icon">👛</span></div><div class="admin-kpi-value">${VendorUtils.formatPrice(wallet.balance)}</div><div class="admin-kpi-trend">Available to withdraw</div></div>
        <div class="admin-kpi-card"><div class="admin-kpi-header"><span class="admin-kpi-label">Total Earned</span><span class="admin-kpi-icon">📈</span></div><div class="admin-kpi-value">${VendorUtils.formatPrice(wallet.totalEarned)}</div><div class="admin-kpi-trend">After commission, lifetime</div></div>
        <div class="admin-kpi-card"><div class="admin-kpi-header"><span class="admin-kpi-label">Orders Needing Action</span><span class="admin-kpi-icon">📋</span></div><div class="admin-kpi-value">${pendingOrders}</div><div class="admin-kpi-trend">${orders.length} total orders</div></div>
      </div>

      <div class="admin-page-header" style="margin-top:24px"><h2 class="admin-page-title" style="font-size:18px">Inventory Overview</h2></div>
      <div class="admin-grid">
        <div class="admin-kpi-card"><div class="admin-kpi-header"><span class="admin-kpi-label">Active Products</span><span class="admin-kpi-icon">✅</span></div><div class="admin-kpi-value">${activeProducts}</div></div>
        <div class="admin-kpi-card"><div class="admin-kpi-header"><span class="admin-kpi-label">Pending Approval</span><span class="admin-kpi-icon">🟡</span></div><div class="admin-kpi-value">${pendingProducts}</div></div>
        <div class="admin-kpi-card"><div class="admin-kpi-header"><span class="admin-kpi-label">Low Stock (≤5)</span><span class="admin-kpi-icon">⚠️</span></div><div class="admin-kpi-value" style="color:${lowStock ? '#f59e0b' : 'inherit'}">${lowStock}</div></div>
        <div class="admin-kpi-card"><div class="admin-kpi-header"><span class="admin-kpi-label">Out of Stock</span><span class="admin-kpi-icon">🚫</span></div><div class="admin-kpi-value" style="color:${outOfStock ? '#ef4444' : 'inherit'}">${outOfStock}</div></div>
      </div>

      <div class="admin-page-header" style="margin-top:24px"><h2 class="admin-page-title" style="font-size:18px">Recent Orders</h2><a class="admin-btn admin-btn-secondary" href="#/vendor/orders">View All →</a></div>
      <div class="admin-table-wrapper">
        <table class="admin-table">
          <thead><tr><th>Order</th><th>Your Items</th><th>Your Total</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            ${orders.length === 0 ? '<tr><td colspan="5" style="text-align:center;padding:32px;color:#6b7280">No orders yet</td></tr>' :
              orders.slice(0, 5).map(o => `<tr><td><strong>${o.orderNumber || o.id}</strong></td><td>${(o.items || []).length}</td><td>${VendorUtils.formatPrice(o.subtotal)}</td>
                  <td><span class="admin-status-badge ${VendorConfig.statusColors[o.status] || 'admin-status-pending'}">${VendorConfig.statusLabels[o.status] || o.status}</span></td>
                  <td>${VendorUtils.formatDate(o.createdAt)}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }
};
