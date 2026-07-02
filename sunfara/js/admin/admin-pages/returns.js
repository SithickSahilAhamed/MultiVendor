/* Returns & Refunds Page — read-mostly visibility for admin, plus an
   override review action for the rare case a vendor doesn't act on a
   return request (uses the same MarketplaceService.ReviewReturnAsync
   pipeline as the vendor's own approve/reject, isAdmin:true so it bypasses
   the "does this return belong to you" ownership check). */

const AdminReturns = {
  _returns: [],
  _refunds: [],

  render: async function() {
    AdminLayout.renderBreadcrumb([
      { label: 'Dashboard', route: '#/admin/dashboard' },
      { label: 'Finance', route: '#/admin/returns' },
      { label: 'Returns & Refunds', route: '#/admin/returns' }
    ]);
    document.getElementById('admin-page-content').innerHTML = '<div style="padding:40px;text-align:center;color:#6b7280;">Loading returns...</div>';

    [this._returns, this._refunds] = await Promise.all([
      AdminStore.fetchReturns(),
      AdminStore.fetchRefunds()
    ]);

    const returns = [...this._returns].sort((a, b) => new Date(b.requestedAt?.toDate ? b.requestedAt.toDate() : b.requestedAt || 0) - new Date(a.requestedAt?.toDate ? a.requestedAt.toDate() : a.requestedAt || 0));
    const pending = returns.filter(r => r.status === 'requested' || r.status === 'refund_failed').length;
    const totalRefunded = this._refunds.reduce((sum, r) => sum + (r.amount || 0), 0);

    const html = `
      <div class="admin-page-header">
        <div>
          <h1 class="admin-page-title">Returns & Refunds</h1>
          <p class="admin-page-subtitle">${returns.length} return requests · ${this._refunds.length} refunds completed</p>
        </div>
      </div>

      <div class="admin-grid-2" style="margin-bottom: 32px;">
        <div class="admin-kpi-card">
          <div class="admin-kpi-label">Awaiting Vendor Review</div>
          <div class="admin-kpi-value">${pending}</div>
          <div class="admin-kpi-action">Review below →</div>
        </div>
        <div class="admin-kpi-card">
          <div class="admin-kpi-label">Total Refunded</div>
          <div class="admin-kpi-value">${AdminUtils.formatPrice(totalRefunded)}</div>
          <div class="admin-kpi-action">${this._refunds.length} completed refunds</div>
        </div>
      </div>

      <div class="admin-table-wrapper">
        <table class="admin-table">
          <thead>
            <tr><th>Order</th><th>Vendor</th><th>Amount</th><th>Reason</th><th>Status</th><th>Requested</th><th>Admin Action</th></tr>
          </thead>
          <tbody>
            ${returns.length === 0 ? '<tr><td colspan="7" style="text-align:center;padding:32px;color:#6b7280;">No return requests</td></tr>' :
              returns.map(r => `
              <tr>
                <td><strong>${AdminUtils.escapeHtml(r.vendorOrderId)}</strong></td>
                <td>${AdminUtils.escapeHtml(r.vendorName || r.vendorId)}</td>
                <td>${AdminUtils.formatPrice(r.amount || 0)}</td>
                <td>${AdminUtils.escapeHtml(r.reason) || '—'}</td>
                <td><span class="admin-status-badge ${AdminConfig.statusColors[r.status === 'requested' ? 'return_requested' : r.status === 'refund_failed' ? 'return_rejected' : r.status === 'approved' ? (r.refundStatus === 'completed' ? 'refunded' : 'return_requested') : 'return_rejected']}">${r.status === 'requested' ? '🟡 Awaiting Vendor' : r.status === 'refund_failed' ? '⚠️ Refund Failed' : r.status === 'approved' ? (r.refundStatus === 'completed' ? '💸 Refunded' : '↩️ Approved') : '🔴 Rejected'}</span></td>
                <td>${AdminUtils.formatDate(r.requestedAt)}</td>
                <td>${r.status === 'requested' || r.status === 'refund_failed'
                  ? `<button class="admin-btn admin-btn-sm admin-btn-primary" onclick="AdminReturns.review('${r.id}',true)">${r.status === 'refund_failed' ? 'Retry Refund' : 'Approve'}</button>
                     ${r.status === 'refund_failed' ? '' : `<button class="admin-btn admin-btn-sm" style="background:#fee2e2;color:#ef4444;" onclick="AdminReturns.review('${r.id}',false)">Reject</button>`}`
                  : '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="admin-table-pagination">
          <span>Showing 1-${returns.length} of ${returns.length} return requests</span>
        </div>
      </div>
    `;

    document.getElementById('admin-page-content').innerHTML = html;
  },

  review: async function(id, approve) {
    if (approve && !confirm('Approve this return as admin? This immediately refunds the customer and reverses the vendor\'s commission.')) return;
    try {
      await AdminAPI.reviewReturn(id, approve);
      AdminToast.success(approve ? 'Return approved and refund processed' : 'Return rejected');
    } catch (e) { console.warn('Admin review return failed', e); }
    await this.render();
  }
};
