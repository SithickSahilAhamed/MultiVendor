/* Reports Page */

const AdminReports = {
  render: function() {
    AdminLayout.renderBreadcrumb([
      { label: 'Dashboard', route: '#/admin/dashboard' },
      { label: 'Reports', route: '#/admin/reports' }
    ]);

    const html = `
      <div class="admin-page-header">
        <div>
          <h1 class="admin-page-title">Reports & Analytics</h1>
          <p class="admin-page-subtitle">View detailed marketplace analytics</p>
        </div>
        <div class="admin-page-actions">
          <select class="admin-select" style="max-width: 200px;">
            <option>Last 30 days</option>
            <option>Last 7 days</option>
            <option>Last 90 days</option>
            <option>Custom date range</option>
          </select>
        </div>
      </div>

      <div class="admin-grid">
        <div class="admin-card" onclick="AdminReports.openReport('revenue')">
          <div class="admin-card-body" style="text-align: center; padding: 32px; cursor: pointer;">
            <div style="font-size: 32px; margin-bottom: 12px;">📊</div>
            <div style="font-weight: 600;">Revenue Report</div>
            <div style="font-size: 12px; color: #6b7280; margin-top: 8px;">View sales trends</div>
          </div>
        </div>

        <div class="admin-card" onclick="AdminReports.openReport('orders')">
          <div class="admin-card-body" style="text-align: center; padding: 32px; cursor: pointer;">
            <div style="font-size: 32px; margin-bottom: 12px;">📋</div>
            <div style="font-weight: 600;">Order Report</div>
            <div style="font-size: 12px; color: #6b7280; margin-top: 8px;">Order analytics</div>
          </div>
        </div>

        <div class="admin-card" onclick="AdminReports.openReport('vendors')">
          <div class="admin-card-body" style="text-align: center; padding: 32px; cursor: pointer;">
            <div style="font-size: 32px; margin-bottom: 12px;">👥</div>
            <div style="font-weight: 600;">Vendor Report</div>
            <div style="font-size: 12px; color: #6b7280; margin-top: 8px;">Vendor performance</div>
          </div>
        </div>

        <div class="admin-card" onclick="AdminReports.openReport('products')">
          <div class="admin-card-body" style="text-align: center; padding: 32px; cursor: pointer;">
            <div style="font-size: 32px; margin-bottom: 12px;">📦</div>
            <div style="font-weight: 600;">Product Report</div>
            <div style="font-size: 12px; color: #6b7280; margin-top: 8px;">Product analytics</div>
          </div>
        </div>
      </div>

      <div class="admin-grid-2" style="margin-top: 32px;">
        <div class="admin-chart-container">
          <div class="admin-chart-title">Revenue by Vendor (Last 30 Days)</div>
          <div class="admin-chart-wrapper">
            <canvas id="vendor-revenue-chart"></canvas>
          </div>
        </div>

        <div class="admin-chart-container">
          <div class="admin-chart-title">Top Products by Sales</div>
          <div class="admin-chart-wrapper">
            <canvas id="top-products-chart"></canvas>
          </div>
        </div>
      </div>
    `;

    document.getElementById('admin-page-content').innerHTML = html;
    this.initCharts();
  },

  initCharts: function() {
    const vendorCtx = document.getElementById('vendor-revenue-chart');
    if (vendorCtx) {
      new Chart(vendorCtx, {
        type: 'bar',
        data: {
          labels: ['Haaniya', 'Green Botanics', 'Pure Wellness'],
          datasets: [{
            label: 'Revenue',
            data: [4520000, 2850000, 0],
            backgroundColor: '#22c55e'
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

    const productsCtx = document.getElementById('top-products-chart');
    if (productsCtx) {
      new Chart(productsCtx, {
        type: 'bar',
        data: {
          labels: ['Hair Oil', 'Neem Wash', 'Ashwagandha'],
          datasets: [{
            label: 'Sales',
            data: [1250, 890, 567],
            backgroundColor: '#0ea5e9'
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { x: { beginAtZero: true } }
        }
      });
    }
  },

  openReport: function(type) {
    AdminToast.info('Loading ' + type + ' report...');
  }
};
