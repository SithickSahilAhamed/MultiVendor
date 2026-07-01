/* Dashboard Page */

const AdminDashboard = {
  render: function() {
    AdminLayout.renderBreadcrumb([
      { label: 'Dashboard', route: '#/admin/dashboard' }
    ]);

    const vendors = AdminStore.getVendors();
    const products = AdminStore.getProducts();
    const orders = AdminStore.getOrders();
    const customers = AdminStore.getCustomers();

    const totalRevenue = vendors.reduce((sum, v) => sum + (v.revenue || 0), 0);
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
            <span class="admin-kpi-label">Total Revenue</span>
            <span class="admin-kpi-icon">💰</span>
          </div>
          <div class="admin-kpi-value">${AdminUtils.formatPrice(totalRevenue)}</div>
          <div class="admin-kpi-trend positive">
            <span>📈</span>
            <span class="admin-kpi-trend-value">+12.5%</span>
            <span>vs last month</span>
          </div>
          <a href="#/admin/reports" class="admin-kpi-action">View Details →</a>
        </div>

        <div class="admin-kpi-card">
          <div class="admin-kpi-header">
            <span class="admin-kpi-label">Orders</span>
            <span class="admin-kpi-icon">📋</span>
          </div>
          <div class="admin-kpi-value">${totalOrders}</div>
          <div class="admin-kpi-trend positive">
            <span>📈</span>
            <span class="admin-kpi-trend-value">+8.2%</span>
            <span>vs last month</span>
          </div>
          <a href="#/admin/orders" class="admin-kpi-action">View Orders →</a>
        </div>

        <div class="admin-kpi-card">
          <div class="admin-kpi-header">
            <span class="admin-kpi-label">Active Vendors</span>
            <span class="admin-kpi-icon">👥</span>
          </div>
          <div class="admin-kpi-value">${activeVendors}</div>
          <div class="admin-kpi-trend positive">
            <span>📈</span>
            <span class="admin-kpi-trend-value">+2 new</span>
            <span>this month</span>
          </div>
          <a href="#/admin/vendors" class="admin-kpi-action">Manage Vendors →</a>
        </div>

        <div class="admin-kpi-card">
          <div class="admin-kpi-header">
            <span class="admin-kpi-label">Customers</span>
            <span class="admin-kpi-icon">👤</span>
          </div>
          <div class="admin-kpi-value">${totalCustomers}</div>
          <div class="admin-kpi-trend positive">
            <span>📈</span>
            <span class="admin-kpi-trend-value">+450</span>
            <span>new users</span>
          </div>
          <a href="#/admin/customers" class="admin-kpi-action">View Customers →</a>
        </div>
      </div>

      <!-- Charts Section -->
      <div class="admin-grid-2" style="margin-top: 32px;">
        <div class="admin-chart-container">
          <div class="admin-chart-title">Revenue Trend (Last 30 Days)</div>
          <div class="admin-chart-wrapper">
            <canvas id="revenue-chart"></canvas>
          </div>
        </div>

        <div class="admin-chart-container">
          <div class="admin-chart-title">Order Trend (Last 30 Days)</div>
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
                ${orders.slice(0, 3).map(o => `
                  <tr>
                    <td style="font-weight: 600;">${o.id}</td>
                    <td>${AdminUtils.formatPrice(o.amount)}</td>
                    <td><span class="admin-status-badge ${AdminConfig.statusColors[o.status]}">${AdminConfig.statusLabels[o.status]}</span></td>
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
    this.initCharts();
  },

  initCharts: function() {
    // Revenue Chart
    const revenueCtx = document.getElementById('revenue-chart');
    if (revenueCtx) {
      new Chart(revenueCtx, {
        type: 'line',
        data: {
          labels: Array.from({length: 30}, (_, i) => 'Day ' + (i+1)),
          datasets: [{
            label: 'Revenue',
            data: AdminUtils.generateRandomData(30, 50000, 150000),
            borderColor: '#22c55e',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            fill: true,
            tension: 0.4,
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { callback: v => '₹' + (v/1000).toFixed(0) + 'K' }
            }
          }
        }
      });
    }

    // Orders Chart
    const ordersCtx = document.getElementById('orders-chart');
    if (ordersCtx) {
      new Chart(ordersCtx, {
        type: 'line',
        data: {
          labels: Array.from({length: 30}, (_, i) => 'Day ' + (i+1)),
          datasets: [{
            label: 'Orders',
            data: AdminUtils.generateRandomData(30, 10, 100),
            borderColor: '#0ea5e9',
            backgroundColor: 'rgba(14, 165, 233, 0.1)',
            fill: true,
            tension: 0.4,
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true } }
        }
      });
    }
  }
};
