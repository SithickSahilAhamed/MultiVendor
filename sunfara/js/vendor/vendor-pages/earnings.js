/* Vendor Portal — Earnings & Payouts */

const VendorEarnings = {
  _wallet: {}, _commissions: [], _withdrawals: [],

  render: async function() {
    VendorLayout.renderBreadcrumb([{ label: 'Dashboard', route: '#/vendor/dashboard' }, { label: 'Earnings & Payouts', route: '#/vendor/earnings' }]);
    const el = document.getElementById('vendor-page-content');
    el.innerHTML = '<div style="padding:40px;text-align:center;color:#6b7280">Loading earnings…</div>';

    try {
      [this._wallet, this._commissions, this._withdrawals] = await Promise.all([
        VendorAPI.getMyWallet(), VendorAPI.getMyCommissions(), VendorAPI.getMyWithdrawals()
      ]);
    } catch (e) { el.innerHTML = `<div class="admin-page-header" style="color:#991b1b">Could not load earnings: ${e.message}</div>`; return; }

    const wallet = this._wallet;
    const pendingWithdrawals = this._withdrawals.filter(w => w.status === 'pending').reduce((s, w) => s + (w.amount || 0), 0);
    const available = (wallet.balance || 0) - pendingWithdrawals;

    document.getElementById('vendor-page-content').innerHTML = `
      ${VendorLayout.renderApprovalBanner()}
      <div class="admin-page-header"><div><h1 class="admin-page-title">Earnings & Payouts</h1><p class="admin-page-subtitle">Your commission earnings and withdrawal history</p></div></div>

      <div class="admin-grid">
        <div class="admin-kpi-card"><div class="admin-kpi-header"><span class="admin-kpi-label">Available Balance</span><span class="admin-kpi-icon">👛</span></div><div class="admin-kpi-value">${VendorUtils.formatPrice(available)}</div></div>
        <div class="admin-kpi-card"><div class="admin-kpi-header"><span class="admin-kpi-label">Total Earned</span><span class="admin-kpi-icon">📈</span></div><div class="admin-kpi-value">${VendorUtils.formatPrice(wallet.totalEarned)}</div></div>
        <div class="admin-kpi-card"><div class="admin-kpi-header"><span class="admin-kpi-label">Total Withdrawn</span><span class="admin-kpi-icon">✅</span></div><div class="admin-kpi-value">${VendorUtils.formatPrice(wallet.totalWithdrawn)}</div></div>
        <div class="admin-kpi-card"><div class="admin-kpi-header"><span class="admin-kpi-label">Pending Requests</span><span class="admin-kpi-icon">⏳</span></div><div class="admin-kpi-value">${VendorUtils.formatPrice(pendingWithdrawals)}</div></div>
      </div>

      <div class="admin-page-header" style="margin-top:24px">
        <h2 class="admin-page-title" style="font-size:18px">Request a Withdrawal</h2>
        <div class="admin-page-actions"><button class="admin-btn admin-btn-primary" onclick="VendorEarnings.showWithdrawModal()" ${available <= 0 ? 'disabled' : ''}>💸 Request Withdrawal</button></div>
      </div>

      <h3 style="font-size:15px;margin:20px 0 8px">Commission History</h3>
      <div class="admin-table-wrapper">
        <table class="admin-table">
          <thead><tr><th>Order</th><th>Gross</th><th>Rate</th><th>Commission</th><th>Net to You</th><th>Status</th></tr></thead>
          <tbody>
            ${this._commissions.length === 0 ? '<tr><td colspan="6" style="text-align:center;padding:24px;color:#6b7280">No commissions yet</td></tr>' :
              this._commissions.map(c => `<tr><td>${c.orderId}</td><td>${VendorUtils.formatPrice(c.grossAmount)}</td><td>${c.rate}%</td><td>${VendorUtils.formatPrice(c.commissionAmount)}</td><td><strong>${VendorUtils.formatPrice(c.netToVendor)}</strong></td><td><span class="admin-status-badge admin-status-active">${c.status}</span></td></tr>`).join('')}
          </tbody>
        </table>
      </div>

      <h3 style="font-size:15px;margin:20px 0 8px">Payout History</h3>
      <div class="admin-table-wrapper">
        <table class="admin-table">
          <thead><tr><th>Amount</th><th>Status</th><th>Requested</th></tr></thead>
          <tbody>
            ${this._withdrawals.length === 0 ? '<tr><td colspan="3" style="text-align:center;padding:24px;color:#6b7280">No withdrawal requests yet</td></tr>' :
              this._withdrawals.map(w => `<tr><td>${VendorUtils.formatPrice(w.amount)}</td><td><span class="admin-status-badge ${w.status === 'approved' ? 'admin-status-active' : 'admin-status-pending'}">${w.status}</span></td><td>${VendorUtils.formatDate(w.createdAt)}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  },

  showWithdrawModal() {
    const pendingWithdrawals = this._withdrawals.filter(w => w.status === 'pending').reduce((s, w) => s + (w.amount || 0), 0);
    const available = (this._wallet.balance || 0) - pendingWithdrawals;
    VendorModal.show('Request Withdrawal', `
      <p style="color:#6b7280;font-size:14px;margin-bottom:12px">Available balance: <strong>${VendorUtils.formatPrice(available)}</strong></p>
      <div class="admin-form-group"><label class="admin-label">Amount (₹) *</label><input type="number" class="admin-input" id="vw-amount" min="1" max="${available}" step="0.01" /></div>
    `, [
      { label: 'Cancel', class: 'admin-btn-secondary', onclick: 'VendorModal.close()' },
      { label: 'Submit Request', class: 'admin-btn-primary', onclick: 'VendorEarnings.submitWithdrawal()' }
    ]);
  },

  async submitWithdrawal() {
    const amount = parseFloat(document.getElementById('vw-amount')?.value);
    if (!Number.isFinite(amount) || amount <= 0) { VendorToast.error('Enter a valid amount'); return; }
    try {
      await VendorAPI.requestWithdrawal(amount);
      VendorToast.success('Withdrawal request submitted for admin approval');
      VendorModal.close();
      await this.render();
    } catch (e) { VendorToast.error(e.message || 'Failed to submit withdrawal request'); }
  }
};
