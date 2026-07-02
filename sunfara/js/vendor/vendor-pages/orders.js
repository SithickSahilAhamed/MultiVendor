/* Vendor Portal — Order Management
   Orders aren't split per-vendor yet (see MARKETPLACE_READINESS_AUDIT.md,
   Phase 4) - a single order can contain other vendors' items too. This page
   only ever shows this vendor's own line items and totals, never another
   vendor's pricing or products, even though the underlying order document
   is shared. */

const VendorOrders = {
  _orders: [],

  render: async function() {
    VendorLayout.renderBreadcrumb([{ label: 'Dashboard', route: '#/vendor/dashboard' }, { label: 'Orders', route: '#/vendor/orders' }]);
    const el = document.getElementById('vendor-page-content');
    el.innerHTML = '<div style="padding:40px;text-align:center;color:#6b7280">Loading orders…</div>';

    try { this._orders = await VendorAPI.getMyOrders(); }
    catch (e) { el.innerHTML = `<div class="admin-page-header" style="color:#991b1b">Could not load orders: ${e.message}</div>`; return; }

    const myUid = VendorStore.user.uid;
    const orders = this._orders;

    el.innerHTML = `
      ${VendorLayout.renderApprovalBanner()}
      <div class="admin-page-header"><div><h1 class="admin-page-title">Your Orders</h1><p class="admin-page-subtitle">${orders.length} orders containing your products</p></div></div>
      <div class="admin-table-wrapper">
        <table class="admin-table">
          <thead><tr><th>Order</th><th>Your Items</th><th>Your Total</th><th>Payment</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
          <tbody>
            ${orders.length === 0 ? '<tr><td colspan="7" style="text-align:center;padding:32px;color:#6b7280">No orders yet</td></tr>' :
              orders.map(o => {
                const mine = (o.items || []).filter(i => i.vendorId === myUid);
                const mineTotal = mine.reduce((s, i) => s + (i.total || 0), 0);
                const next = VendorConfig.nextVendorStatus[o.status];
                return `<tr>
                  <td><strong>${o.orderNumber || o.id}</strong></td>
                  <td>${mine.map(i => `${i.name} ×${i.quantity}`).join(', ')}</td>
                  <td>${VendorUtils.formatPrice(mineTotal)}</td>
                  <td>${o.paymentStatus === 'paid' ? '✅ Paid' : o.paymentMethod === 'Cash on Delivery' ? '💵 COD' : '⏳ Pending'}</td>
                  <td><span class="admin-status-badge ${VendorConfig.statusColors[o.status] || 'admin-status-pending'}">${VendorConfig.statusLabels[o.status] || o.status}</span></td>
                  <td>${VendorUtils.formatDate(o.createdAt)}</td>
                  <td>${next ? `<button class="admin-btn admin-btn-sm admin-btn-primary" onclick="VendorOrders.advance('${o.id}','${next}')">${VendorConfig.nextVendorStatusLabel[o.status]}</button>` : '—'}</td>
                </tr>`;
              }).join('')}
          </tbody>
        </table>
      </div>`;
  },

  async advance(orderId, nextStatus) {
    try {
      await VendorAPI.updateOrderStatus(orderId, nextStatus);
      VendorToast.success(`Order marked as ${nextStatus}`);
      await this.render();
    } catch (e) { VendorToast.error(e.message || 'Could not update order status'); }
  }
};
