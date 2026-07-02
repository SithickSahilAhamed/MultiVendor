/* Vendor Portal — Order Management
   Each row here is a vendor_orders document - already scoped to just this
   vendor's items, status, and tracking info by the backend (split out of
   the customer's master order at checkout), so nothing here needs to
   filter out other vendors' products or totals. */

const VendorOrders = {
  _orders: [],

  render: async function() {
    VendorLayout.renderBreadcrumb([{ label: 'Dashboard', route: '#/vendor/dashboard' }, { label: 'Orders', route: '#/vendor/orders' }]);
    const el = document.getElementById('vendor-page-content');
    el.innerHTML = '<div style="padding:40px;text-align:center;color:#6b7280">Loading orders…</div>';

    try { this._orders = await VendorAPI.getMyOrders(); }
    catch (e) { el.innerHTML = `<div class="admin-page-header" style="color:#991b1b">Could not load orders: ${e.message}</div>`; return; }

    const orders = this._orders;

    el.innerHTML = `
      ${VendorLayout.renderApprovalBanner()}
      <div class="admin-page-header"><div><h1 class="admin-page-title">Your Orders</h1><p class="admin-page-subtitle">${orders.length} orders</p></div></div>
      <div class="admin-table-wrapper">
        <table class="admin-table">
          <thead><tr><th>Order</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Tracking</th><th>Date</th><th>Action</th></tr></thead>
          <tbody>
            ${orders.length === 0 ? '<tr><td colspan="8" style="text-align:center;padding:32px;color:#6b7280">No orders yet</td></tr>' :
              orders.map(o => {
                const next = VendorConfig.nextVendorStatus[o.status];
                return `<tr>
                  <td><strong>${o.orderNumber || o.id}</strong></td>
                  <td>${(o.items || []).map(i => `${i.name} ×${i.quantity}`).join(', ')}</td>
                  <td>${VendorUtils.formatPrice(o.subtotal)}</td>
                  <td>${o.paymentStatus === 'paid' ? '✅ Paid' : o.paymentMethod === 'Cash on Delivery' ? '💵 COD' : '⏳ Pending'}</td>
                  <td><span class="admin-status-badge ${VendorConfig.statusColors[o.status] || 'admin-status-pending'}">${VendorConfig.statusLabels[o.status] || o.status}</span></td>
                  <td>${o.trackingNumber ? `${o.carrier || ''} ${o.trackingNumber}` : '—'}</td>
                  <td>${VendorUtils.formatDate(o.createdAt)}</td>
                  <td>${next ? `<button class="admin-btn admin-btn-sm admin-btn-primary" onclick="VendorOrders.advance('${o.id}','${next}')">${VendorConfig.nextVendorStatusLabel[o.status]}</button>` : '—'}</td>
                </tr>`;
              }).join('')}
          </tbody>
        </table>
      </div>`;
  },

  async advance(orderId, nextStatus) {
    let trackingNumber, carrier;
    if (nextStatus === 'shipped') {
      trackingNumber = prompt('Tracking number (optional, you can add this later):') || undefined;
      if (trackingNumber) carrier = prompt('Carrier name (optional):') || undefined;
    }
    try {
      await VendorAPI.updateOrderStatus(orderId, nextStatus, trackingNumber, carrier);
      VendorToast.success(`Order marked as ${nextStatus}`);
      await this.render();
    } catch (e) { VendorToast.error(e.message || 'Could not update order status'); }
  }
};
