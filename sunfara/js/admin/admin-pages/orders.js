/* Orders Page - master orders enriched with each vendor's own sub-order,
   since status/tracking/commission all live per vendor_orders document now
   (a multi-vendor cart splits into one sub-order per seller at checkout). */

const AdminOrders = {
  _orders: [],
  _vendorOrdersByMaster: {},
  ALL_STATUSES: ['pending', 'confirmed', 'processing', 'packed', 'shipped', 'delivered', 'completed', 'cancelled', 'return_requested', 'returned', 'return_rejected', 'refunded'],

  render: async function() {
    AdminLayout.renderBreadcrumb([
      { label: 'Dashboard', route: '#/admin/dashboard' },
      { label: 'Orders', route: '#/admin/orders' }
    ]);
    document.getElementById('admin-page-content').innerHTML = '<div style="padding:40px;text-align:center;color:#6b7280;">Loading orders...</div>';

    const [orders, vendorOrders] = await Promise.all([AdminStore.fetchOrders(), AdminAPI.getVendorOrders().catch(() => [])]);
    this._orders = orders;
    this._vendorOrdersByMaster = {};
    vendorOrders.forEach(vo => {
      const key = vo.masterOrderId;
      (this._vendorOrdersByMaster[key] ||= []).push(vo);
    });

    const html = `
      <div class="admin-page-header">
        <div>
          <h1 class="admin-page-title">Orders</h1>
          <p class="admin-page-subtitle">${orders.length} total orders</p>
        </div>
        <div class="admin-page-actions">
          <button class="admin-btn admin-btn-secondary">📊 Export</button>
          <button class="admin-btn admin-btn-secondary">🔍 Filter</button>
        </div>
      </div>

      <div class="admin-table-wrapper">
        <div class="admin-table-toolbar">
          <input type="text" class="admin-input admin-table-search" placeholder="Search orders..." style="max-width: 300px;" />
        </div>

        <table class="admin-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Vendors</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${orders.length === 0 ? '<tr><td colspan="8" style="text-align:center;padding:32px;color:#6b7280;">No orders found</td></tr>' :
              orders.map(o => {
                const subOrders = this._vendorOrdersByMaster[o.id] || [];
                const overall = this.overallStatus(subOrders);
                return `
              <tr>
                <td><strong>${o.orderNumber || o.id}</strong></td>
                <td>${o.customerId || '—'}</td>
                <td><strong>${AdminUtils.formatPrice(o.totalAmount)}</strong></td>
                <td>${subOrders.length || 1}</td>
                <td>${o.paymentStatus === 'paid' ? '✅ Paid' : o.paymentMethod === 'Cash on Delivery' ? '💵 COD' : '⏳ Pending'}</td>
                <td><span class="admin-status-badge ${AdminConfig.statusColors[overall] || 'admin-status-processing'}">${AdminConfig.statusLabels[overall] || overall}</span></td>
                <td>${AdminUtils.formatDate(o.createdAt)}</td>
                <td>
                  <button class="admin-btn admin-btn-sm admin-btn-secondary" onclick="AdminOrders.viewOrder('${o.id}')">View</button>
                </td>
              </tr>
            `;}).join('')}
          </tbody>
        </table>

        <div class="admin-table-pagination">
          <span>Showing 1-${orders.length} of ${orders.length} orders</span>
        </div>
      </div>
    `;

    document.getElementById('admin-page-content').innerHTML = html;
  },

  /* Shows the least-advanced vendor sub-order's status as the master
     order's overall status - "Delivered" would be misleading if one
     seller in the cart hasn't even shipped their part yet. */
  overallStatus(subOrders) {
    if (!subOrders.length) return 'pending';
    const order = ['pending', 'confirmed', 'processing', 'packed', 'shipped', 'delivered', 'completed', 'cancelled'];
    return subOrders.reduce((min, vo) => order.indexOf(vo.status) < order.indexOf(min) ? vo.status : min, subOrders[0].status);
  },

  viewOrder: function(id) {
    const order = this._orders.find(o => o.id === id);
    if (!order) return;
    const subOrders = this._vendorOrdersByMaster[id] || [];
    AdminModal.show((order.orderNumber || order.id) + ' - Order Details', `
      <div style="display: grid; gap: 16px;">
        <div><strong>Customer:</strong> ${order.customerId || '—'}</div>
        <div><strong>Total:</strong> ${AdminUtils.formatPrice(order.totalAmount)}</div>
        ${order.paymentMethod ? `<div><strong>Payment Method:</strong> ${order.paymentMethod} ${order.paymentStatus === 'paid' ? '(Paid ✅)' : ''}</div>` : ''}
        <div><strong>Order Date:</strong> ${AdminUtils.formatDateTime(order.createdAt)}</div>
        <hr>
        <div><strong>Vendor Sub-Orders (${subOrders.length})</strong></div>
        ${subOrders.length === 0 ? '<p style="color:#6b7280">No vendor sub-orders found for this order.</p>' : subOrders.map(vo => `
          <div style="border:1px solid var(--admin-border,#e5e7eb);border-radius:8px;padding:12px;margin-bottom:4px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <strong>🏪 ${vo.vendorName || vo.vendorId}</strong>
              <span class="admin-status-badge ${AdminConfig.statusColors[vo.status] || 'admin-status-processing'}">${AdminConfig.statusLabels[vo.status] || vo.status}</span>
            </div>
            <ul style="margin:0 0 8px 20px;padding:0;font-size:13px">
              ${(vo.items || []).map(i => `<li>${i.name} × ${i.quantity} — ${AdminUtils.formatPrice(i.total)}</li>`).join('') || '<li>—</li>'}
            </ul>
            ${vo.trackingNumber ? `<p style="font-size:12px;color:#6b7280">🚚 ${vo.carrier || ''} · ${vo.trackingNumber}</p>` : ''}
            <select class="admin-select" id="status-select-${vo.id}" style="width:100%;margin-top:8px">
              ${this.ALL_STATUSES.map(s => `<option value="${s}" ${s === vo.status ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
            <button class="admin-btn admin-btn-sm admin-btn-primary" style="margin-top:8px;width:100%" onclick="AdminOrders.updateStatus('${vo.id}')">Update This Vendor's Status</button>
          </div>
        `).join('')}
      </div>
    `, [
      { label: 'Close', class: 'admin-btn-secondary', onclick: 'AdminModal.close()' }
    ]);
  },

  updateStatus: async function(vendorOrderId) {
    const status = document.getElementById(`status-select-${vendorOrderId}`)?.value;
    if (!status) return;
    try {
      await AdminAPI.updateOrderStatus(vendorOrderId, status);
      AdminToast.success('Order status updated!');
      AdminModal.close();
      await this.render();
    } catch (e) {
      AdminToast.error(e.message || 'Failed to update order status');
    }
  }
};
