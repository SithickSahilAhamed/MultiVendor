/* Commissions Page */

const AdminCommissions = {
  _vendors: [],
  _commissions: [],

  render: async function() {
    AdminLayout.renderBreadcrumb([
      { label: 'Dashboard', route: '#/admin/dashboard' },
      { label: 'Finance', route: '#/admin/commissions' },
      { label: 'Commissions', route: '#/admin/commissions' }
    ]);
    document.getElementById('admin-page-content').innerHTML = '<div style="padding:40px;text-align:center;color:#6b7280;">Loading commissions...</div>';

    [this._vendors, this._commissions] = await Promise.all([
      AdminStore.fetchVendors(),
      AdminStore.fetchCommissions()
    ]);

    const vendors = this._vendors;
    const totalCommissions = vendors.reduce((sum, v) => sum + ((v.revenue || 0) * (v.commission || 0) / 100), 0);

    const html = `
      <div class="admin-page-header">
        <div>
          <h1 class="admin-page-title">Commission Management</h1>
          <p class="admin-page-subtitle">Total pending commissions: ${AdminUtils.formatPrice(totalCommissions)}</p>
        </div>
        <div class="admin-page-actions">
          <button class="admin-btn admin-btn-secondary">📊 Export Report</button>
        </div>
      </div>

      <div class="admin-grid-2" style="margin-bottom: 32px;">
        <div class="admin-kpi-card">
          <div class="admin-kpi-label">Total Pending</div>
          <div class="admin-kpi-value">${AdminUtils.formatPrice(totalCommissions)}</div>
          <div class="admin-kpi-action">View Details →</div>
        </div>
        <div class="admin-kpi-card">
          <div class="admin-kpi-label">Active Vendors</div>
          <div class="admin-kpi-value">${vendors.filter(v => (v.revenue || 0) > 0).length}</div>
          <div class="admin-kpi-action">Process Withdrawals →</div>
        </div>
      </div>

      <div class="admin-table-wrapper">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Vendor</th>
              <th>Revenue</th>
              <th>Rate</th>
              <th>Commission</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${vendors.length === 0 ? '<tr><td colspan="6" style="text-align:center;padding:32px;color:#6b7280;">No vendor data</td></tr>' :
              vendors.map(v => {
                const commission = (v.revenue || 0) * (v.commission || 0) / 100;
                return `
                <tr>
                  <td><strong>${v.logo || '🏪'} ${v.name}</strong></td>
                  <td>${AdminUtils.formatPrice(v.revenue || 0)}</td>
                  <td>${v.commission || 0}%</td>
                  <td><strong>${AdminUtils.formatPrice(commission)}</strong></td>
                  <td><span class="admin-status-badge admin-status-pending">🟡 Pending</span></td>
                  <td>
                    <button class="admin-btn admin-btn-sm admin-btn-primary" onclick="AdminCommissions.processCommission('${v.id}')">Process</button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div class="admin-table-pagination">
          <span>Showing 1-${vendors.length} of ${vendors.length} vendors</span>
        </div>
      </div>
    `;

    document.getElementById('admin-page-content').innerHTML = html;
  },

  processCommission: function(id) {
    AdminToast.success('Commission processed and marked for withdrawal!');
  }
};
