/* Reports Page — includes PAY-004 payment reconciliation */

const AdminReports = {
  _recon: null,

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
      </div>

      <div class="admin-page-header" style="margin-top: 8px;">
        <div>
          <h2 class="admin-page-title" style="font-size: 1.15rem;">Payment reconciliation</h2>
          <p class="admin-page-subtitle">Compare unpaid online orders vs Razorpay captures (last 30 days by default)</p>
        </div>
        <div class="admin-page-actions">
          <button class="admin-btn admin-btn-primary" type="button" onclick="AdminReports.loadReconciliation()">Refresh mismatches</button>
        </div>
      </div>
      <div id="payment-recon-panel" class="admin-card" style="margin-bottom: 32px;">
        <div class="admin-card-body" style="padding: 20px; color: #6b7280;">Click “Refresh mismatches” to load reconciliation.</div>
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
    this.loadReconciliation();
  },

  loadReconciliation: async function() {
    const panel = document.getElementById('payment-recon-panel');
    if (!panel) return;
    panel.innerHTML = '<div class="admin-card-body" style="padding: 20px;">Loading reconciliation…</div>';
    try {
      const to = new Date().toISOString();
      const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const data = await AdminAPI.getPaymentReconciliation(from, to);
      this._recon = data;
      const rows = (data.mismatches || []).map(m => `
        <tr>
          <td><code>${AdminUtils.escapeHtml ? AdminUtils.escapeHtml(m.kind) : m.kind}</code></td>
          <td>${m.orderId || '—'}</td>
          <td>${m.razorpayOrderId || '—'}</td>
          <td>${m.razorpayPaymentId || '—'}</td>
          <td>${m.detail || ''}</td>
          <td>${m.kind === 'unpaid_online' && m.orderId
            ? `<button class="admin-btn" type="button" onclick="AdminReports.cancelUnpaid('${m.orderId}')">Cancel unpaid</button>`
            : ''}</td>
        </tr>`).join('');
      panel.innerHTML = `
        <div class="admin-card-body" style="padding: 20px;">
          <p style="margin: 0 0 12px 0; color: #6b7280;">
            Window ${from.slice(0, 10)} → ${to.slice(0, 10)} ·
            ${data.orderCount || 0} orders ·
            <strong>${data.mismatchCount || 0}</strong> mismatches ·
            ${(data.unpaidOnline || []).length} unpaid online
          </p>
          ${!(data.mismatches || []).length
            ? '<p style="margin:0;color:#15803d;">No mismatches in this window.</p>'
            : `<div class="admin-table-wrap"><table class="admin-table">
                <thead><tr><th>Kind</th><th>Order</th><th>Razorpay order</th><th>Payment</th><th>Detail</th><th></th></tr></thead>
                <tbody>${rows}</tbody>
              </table></div>`}
        </div>`;
    } catch (err) {
      panel.innerHTML = `<div class="admin-card-body" style="padding: 20px; color: #b91c1c;">Could not load reconciliation: ${err.message || err}</div>`;
    }
  },

  cancelUnpaid: async function(orderId) {
    if (!orderId) return;
    if (!confirm(`Cancel unpaid online order ${orderId}? Stock was not held for online pending orders.`)) return;
    try {
      await AdminAPI.cancelUnpaidOrder(orderId);
      if (typeof AdminToast !== 'undefined') AdminToast.success('Unpaid order cancelled');
      await this.loadReconciliation();
    } catch (err) {
      if (typeof AdminToast !== 'undefined') AdminToast.error(err.message || 'Cancel failed');
    }
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
