/* Withdrawals Page */

const AdminWithdrawals = {
  render: function() {
    AdminLayout.renderBreadcrumb([
      { label: 'Dashboard', route: '#/admin/dashboard' },
      { label: 'Finance', route: '#/admin/withdrawals' },
      { label: 'Withdrawals', route: '#/admin/withdrawals' }
    ]);

    const vendors = AdminStore.getVendors();
    const pending = vendors.filter(v => v.revenue > 0).length;

    const html = `
      <div class="admin-page-header">
        <div>
          <h1 class="admin-page-title">Withdrawal Requests</h1>
          <p class="admin-page-subtitle">${pending} pending withdrawal requests</p>
        </div>
      </div>

      <div class="admin-grid-2" style="margin-bottom: 32px;">
        <div class="admin-kpi-card">
          <div class="admin-kpi-label">Pending Amount</div>
          <div class="admin-kpi-value">₹8,75,000</div>
          <div class="admin-kpi-action">3 vendors awaiting</div>
        </div>
        <div class="admin-kpi-card">
          <div class="admin-kpi-label">Last Payout</div>
          <div class="admin-kpi-value">₹12,50,000</div>
          <div class="admin-kpi-action">5 days ago</div>
        </div>
      </div>

      <div class="admin-table-wrapper">
        <div class="admin-table-toolbar">
          <select class="admin-select" style="max-width: 200px;">
            <option>All Requests</option>
            <option>Pending</option>
            <option>Approved</option>
            <option>Processed</option>
          </select>
        </div>

        <table class="admin-table">
          <thead>
            <tr>
              <th>Vendor</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Requested</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${vendors.slice(0, 3).map(v => `
              <tr>
                <td><strong>${v.name}</strong></td>
                <td>${AdminUtils.formatPrice(v.revenue * v.commission / 100)}</td>
                <td><span class="admin-status-badge admin-status-pending">🟡 Pending</span></td>
                <td>2 days ago</td>
                <td>
                  <button class="admin-btn admin-btn-sm admin-btn-primary" onclick="AdminWithdrawals.approve('${v.id}')">✅ Approve</button>
                  <button class="admin-btn admin-btn-sm admin-btn-danger" onclick="AdminWithdrawals.reject('${v.id}')">❌ Reject</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="admin-table-pagination">
          <span>Showing 1-3 of ${pending} pending requests</span>
        </div>
      </div>
    `;

    document.getElementById('admin-page-content').innerHTML = html;
  },

  approve: function(id) {
    AdminToast.success('Withdrawal approved! Bank transfer initiated.');
    this.render();
  },

  reject: function(id) {
    AdminModal.confirm('Reject Withdrawal', 'Provide a reason for rejection?', 'AdminWithdrawals.confirmReject("' + id + '")');
  },

  confirmReject: function(id) {
    AdminToast.success('Withdrawal rejected.');
    this.render();
  }
};
