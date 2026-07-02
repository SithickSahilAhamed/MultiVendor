/* Vendor Portal — Returns Review
   Each row is a `returns` document tied to one of this vendor's
   vendor_orders. Approving triggers the real refund pipeline server-side
   (Razorpay refund for online payments, or a straight ledger reversal for
   COD) - the vendor only ever sees approve/reject, the money movement is
   handled entirely by the backend. */

const VendorReturns = {
  _returns: [],

  render: async function() {
    VendorLayout.renderBreadcrumb([{ label: 'Dashboard', route: '#/vendor/dashboard' }, { label: 'Returns', route: '#/vendor/returns' }]);
    const el = document.getElementById('vendor-page-content');
    el.innerHTML = '<div style="padding:40px;text-align:center;color:#6b7280">Loading return requests…</div>';

    try { this._returns = await VendorAPI.getMyReturns(); }
    catch (e) { el.innerHTML = `<div class="admin-page-header" style="color:#991b1b">Could not load returns: ${e.message}</div>`; return; }

    const returns = [...this._returns].sort((a, b) => new Date(b.requestedAt?.toDate ? b.requestedAt.toDate() : b.requestedAt || 0) - new Date(a.requestedAt?.toDate ? a.requestedAt.toDate() : a.requestedAt || 0));

    el.innerHTML = `
      ${VendorLayout.renderApprovalBanner()}
      <div class="admin-page-header"><div><h1 class="admin-page-title">Returns</h1><p class="admin-page-subtitle">${returns.length} return request${returns.length === 1 ? '' : 's'}</p></div></div>
      <div class="admin-table-wrapper">
        <table class="admin-table">
          <thead><tr><th>Order</th><th>Amount</th><th>Reason</th><th>Status</th><th>Requested</th><th>Action</th></tr></thead>
          <tbody>
            ${returns.length === 0 ? '<tr><td colspan="6" style="text-align:center;padding:32px;color:#6b7280">No return requests</td></tr>' :
              returns.map(r => `<tr>
                  <td><strong>${r.vendorOrderId}</strong></td>
                  <td>${VendorUtils.formatPrice(r.amount)}</td>
                  <td>${r.reason || '—'}</td>
                  <td><span class="admin-status-badge ${VendorConfig.statusColors[r.status === 'requested' ? 'pending' : r.status === 'approved' ? 'processing' : r.status === 'rejected' ? 'rejected' : 'active']}">${r.status === 'requested' ? '🟡 Awaiting Review' : r.status === 'approved' ? '↩️ Approved · Refund ' + (r.refundStatus === 'completed' ? 'Completed' : 'Processing') : '❌ Rejected'}</span></td>
                  <td>${VendorUtils.formatDate(r.requestedAt)}</td>
                  <td>${r.status === 'requested'
                    ? `<button class="admin-btn admin-btn-sm admin-btn-primary" onclick="VendorReturns.review('${r.id}',true)">Approve</button>
                       <button class="admin-btn admin-btn-sm" onclick="VendorReturns.review('${r.id}',false)">Reject</button>`
                    : '—'}</td>
                </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  },

  async review(returnId, approve) {
    if (approve && !confirm('Approve this return? This will immediately refund the customer and reverse your commission for this order.')) return;
    try {
      await VendorAPI.reviewReturn(returnId, approve);
      VendorToast.success(approve ? 'Return approved and refund processed' : 'Return request rejected');
      await this.render();
    } catch (e) { VendorToast.error(e.message || 'Could not review this return'); }
  }
};
