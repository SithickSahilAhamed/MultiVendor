/* Dashboard Page */

const AdminDashboard = {
  render: async function() {
    AdminLayout.renderBreadcrumb([{ label: 'Dashboard', route: '#/admin/dashboard' }]);
    document.getElementById('admin-page-content').innerHTML = '<div style="padding:40px;text-align:center;color:#6b7280;">Loading dashboard...</div>';

    const [vendors, products, orders, customers, revenue, transactions] = await Promise.all([
      AdminStore.fetchVendors(),
      AdminStore.fetchProducts(),
      AdminStore.fetchOrders(),
      AdminStore.fetchCustomers(),
      AdminAPI.getRevenue().catch(() => ({ totalGrossSales: 0, totalCommissionEarned: 0, totalVendorPayouts: 0 })),
      AdminAPI.getTransactions().catch(() => [])
    ]);

    const activeVendors = vendors.filter(v => v.status === 'active').length;
    const totalOrders = orders.length;
    const totalCustomers = customers.length;
    const pendingApprovals = vendors.filter(v => v.status === 'pending').length + products.filter(p => p.status === 'pending').length;

    const html = `
      <div class="admin-page-header">
        <div>
          <h1 class="admin-page-title">Dashboard</h1>
          <p class="admin-page-subtitle">Welcome back, ${AdminStore.user?.name}! Here's your marketplace overview.</p>
        </div>
        <div class="admin-page-actions">
          <button class="admin-btn admin-btn-secondary">📥 Export Report</button>
          <button class="admin-btn admin-btn-primary">📊 View Analytics</button>
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="admin-grid">
        <div class="admin-kpi-card">
          <div class="admin-kpi-header">
            <span class="admin-kpi-label">Platform Revenue</span>
            <span class="admin-kpi-icon">💰</span>
          </div>
          <div class="admin-kpi-value">${AdminUtils.formatPrice(revenue.totalCommissionEarned)}</div>
          <div class="admin-kpi-trend"><span>Commission earned, all-time</span></div>
          <a href="#/admin/commissions" class="admin-kpi-action">View Details →</a>
        </div>

        <div class="admin-kpi-card">
          <div class="admin-kpi-header">
            <span class="admin-kpi-label">Gross Sales (GMV)</span>
            <span class="admin-kpi-icon">🧾</span>
          </div>
          <div class="admin-kpi-value">${AdminUtils.formatPrice(revenue.totalGrossSales)}</div>
          <div class="admin-kpi-trend"><span>Total sales volume through the platform</span></div>
        </div>

        <div class="admin-kpi-card">
          <div class="admin-kpi-header">
            <span class="admin-kpi-label">Orders</span>
            <span class="admin-kpi-icon">📋</span>
          </div>
          <div class="admin-kpi-value">${totalOrders}</div>
          <div class="admin-kpi-trend"><span>${orders.filter(o => o.paymentStatus === 'paid').length} paid</span></div>
          <a href="#/admin/orders" class="admin-kpi-action">View Orders →</a>
        </div>

        <div class="admin-kpi-card">
          <div class="admin-kpi-header">
            <span class="admin-kpi-label">Active Vendors</span>
            <span class="admin-kpi-icon">👥</span>
          </div>
          <div class="admin-kpi-value">${activeVendors}</div>
          <div class="admin-kpi-trend"><span>${vendors.length} total registered</span></div>
          <a href="#/admin/vendors" class="admin-kpi-action">Manage Vendors →</a>
        </div>
      </div>

      <!-- Charts Section -->
      <div class="admin-grid-2" style="margin-top: 32px;">
        <div class="admin-chart-container">
          <div class="admin-chart-title">Commission Revenue (Last 14 Days)</div>
          <div class="admin-chart-wrapper">
            <canvas id="revenue-chart"></canvas>
          </div>
        </div>

        <div class="admin-chart-container">
          <div class="admin-chart-title">Orders (Last 14 Days)</div>
          <div class="admin-chart-wrapper">
            <canvas id="orders-chart"></canvas>
          </div>
        </div>
      </div>

      <!-- Activity Section -->
      <div class="admin-grid-2" style="margin-top: 32px;">
        <div class="admin-card">
          <div class="admin-card-header">
            Latest Orders
            <a href="#/admin/orders" style="text-decoration: none; color: #22c55e; font-size: 12px;">View All →</a>
          </div>
          <div class="admin-card-body">
            <table class="admin-table">
              <tbody>
                ${orders.length === 0 ? '<tr><td style="text-align:center;padding:16px;color:#6b7280">No orders yet</td></tr>' : orders.slice(0, 3).map(o => `
                  <tr>
                    <td style="font-weight: 600;">${o.orderNumber || o.id}</td>
                    <td>${AdminUtils.formatPrice(o.totalAmount)}</td>
                    <td><span class="admin-status-badge ${o.paymentStatus === 'paid' ? 'admin-status-active' : 'admin-status-pending'}">${o.paymentStatus === 'paid' ? '✅ Paid' : '⏳ Pending'}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="admin-card">
          <div class="admin-card-header">
            Pending Approvals
            <span class="admin-sidebar-badge" style="margin-left: auto;">${pendingApprovals}</span>
          </div>
          <div class="admin-card-body">
            <div style="text-align: center; padding: 24px; color: #6b7280;">
              ${pendingApprovals > 0
                ? `<p>${pendingApprovals} items awaiting approval</p>
                   <button class="admin-btn admin-btn-primary admin-btn-sm" onclick="window.location.hash='#/admin/vendors'">Review Vendors</button>`
                : '<p>All items approved! ✅</p>'
              }
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('admin-page-content').innerHTML = html;
    this.initCharts(orders, transactions);
  },

  /* Real day-bucketed trends from real orders/transactions - not
     Math.random(). A brand-new marketplace will show a mostly-flat line
     until real activity accumulates, which is the honest picture. */
  initCharts: function(orders, transactions) {
    const days = 14;
    const labels = [];
    const dayKeys = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      dayKeys.push(d.toISOString().slice(0, 10));
      labels.push(d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }));
    }
    const toDateKey = (ts) => {
      const d = ts?.toDate ? ts.toDate() : new Date(ts);
      return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
    };

    const revenueByDay = Object.fromEntries(dayKeys.map(k => [k, 0]));
    transactions.filter(t => t.type === 'commission_split').forEach(t => {
      const key = toDateKey(t.createdAt);
      if (key && key in revenueByDay) revenueByDay[key] += (t.amount || 0);
    });

    const ordersByDay = Object.fromEntries(dayKeys.map(k => [k, 0]));
    orders.forEach(o => {
      const key = toDateKey(o.createdAt);
      if (key && key in ordersByDay) ordersByDay[key] += 1;
    });

    const revenueCtx = document.getElementById('revenue-chart');
    if (revenueCtx) {
      new Chart(revenueCtx, {
        type: 'line',
        data: { labels, datasets: [{ label: 'Commission Revenue', data: dayKeys.map(k => revenueByDay[k]), borderColor: '#22c55e', backgroundColor: 'rgba(34, 197, 94, 0.1)', fill: true, tension: 0.4, borderWidth: 2 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: v => '₹' + v } } } }
      });
    }

    const ordersCtx = document.getElementById('orders-chart');
    if (ordersCtx) {
      new Chart(ordersCtx, {
        type: 'line',
        data: { labels, datasets: [{ label: 'Orders', data: dayKeys.map(k => ordersByDay[k]), borderColor: '#0ea5e9', backgroundColor: 'rgba(14, 165, 233, 0.1)', fill: true, tension: 0.4, borderWidth: 2 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
      });
    }
  }
};
