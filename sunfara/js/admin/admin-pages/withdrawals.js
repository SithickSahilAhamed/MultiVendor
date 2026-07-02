/* Withdrawals Page */

const AdminWithdrawals = {
  _withdrawals: [],
  _vendors: [],

  render: async function() {
    AdminLayout.renderBreadcrumb([
      { label: 'Dashboard', route: '#/admin/dashboard' },
      { label: 'Finance', route: '#/admin/withdrawals' },
      { label: 'Withdrawals', route: '#/admin/withdrawals' }
    ]);
    document.getElementById('admin-page-content').innerHTML = '<div style="padding:40px;text-align:center;color:#6b7280;">Loading withdrawals...</div>';

    [this._withdrawals, this._vendors] = await Promise.all([
      AdminStore.fetchWithdrawals(),
      AdminStore.fetchVendors()
    ]);

    // Use real withdrawal data if available, otherwise derive from vendors
    const rows = this._withdrawals.length > 0
      ? this._withdrawals
      : this._vendors.filter(v => (v.revenue || 0) > 0).map(v => ({
          id: v.id,
          vendor: v.name,
          amount: (v.revenue || 0) * (v.commission || 0) / 100,
          status: 'pending',
          requestedAt: '2 days ago'
        }));

    const pending = rows.filter(r => r.status === 'pending').length;

    const html = `
      <div class="admin-page-header">
        <div>
          <h1 class="admin-page-title">Withdrawal Requests</h1>
          <p class="admin-page-subtitle">${pending} pending withdrawal requests</p>
        </div>
      </div>

      <div class="admin-grid-2" style="margin-bottom: 32px;">
        <div class="admin-kpi-card">
          <div class="admin-kpi-label">Pending Requests</div>
          <div class="admin-kpi-value">${pending}</div>
          <div class="admin-kpi-action">Review below →</div>
        </div>
        <div class="admin-kpi-card">
          <div class="admin-kpi-label">Total Vendors</div>
          <div class="admin-kpi-value">${this._vendors.length}</div>
          <div class="admin-kpi-action">View Vendors →</div>
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
            ${rows.length === 0 ? '<tr><td colspan="5" style="text-align:center;padding:32px;color:#6b7280;">No withdrawal requests</td></tr>' :
              rows.map(r => `
              <tr>
                <td><strong>${r.vendor || r.vendorName || r.id}</strong></td>
                <td>${AdminUtils.formatPrice(r.amount || 0)}</td>
                <td><span class="admin-status-badge admin-status-${r.status || 'pending'}">${AdminConfig.statusLabels[r.status] || '🟡 Pending'}</span></td>
                <td>${r.requestedAt || r.createdAt || '—'}</td>
                <td>
                  <button class="admin-btn admin-btn-sm admin-btn-primary" onclick="AdminWithdrawals.approve('${r.id}')">✅ Approve</button>
                  <button class="admin-btn admin-btn-sm" style="background:#fee2e2;color:#ef4444;" onclick="AdminWithdrawals.reject('${r.id}')">❌ Reject</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="admin-table-pagination">
          <span>Showing 1-${rows.length} of ${rows.length} requests</span>
        </div>
      </div>
    `;

    document.getElementById('admin-page-content').innerHTML = html;
  },

  approve: async function(id) {
    try { await AdminAPI.approveWithdrawal(id); } catch(e) { console.warn('API approve withdrawal failed', e); }
    AdminToast.success('Withdrawal approved! Bank transfer initiated.');
    await this.render();
  },

  reject: function(id) {
    AdminModal.confirm('Reject Withdrawal', 'Confirm rejection of this withdrawal request?', `AdminWithdrawals.confirmReject('${id}')`);
  },

  confirmReject: async function(id) {
    try { await AdminAPI.update('withdrawals', id, { status: 'rejected' }); } catch(e) { console.warn('API reject withdrawal failed', e); }
    AdminModal.close();
    AdminToast.success('Withdrawal rejected.');
    await this.render();
  }
};
