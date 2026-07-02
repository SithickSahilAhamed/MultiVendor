/* Orders Page */

const AdminOrders = {
  _orders: [],
  ALL_STATUSES: ['pending', 'confirmed', 'processing', 'packed', 'shipped', 'delivered', 'completed', 'cancelled', 'return_requested', 'returned', 'refunded'],

  render: async function() {
    AdminLayout.renderBreadcrumb([
      { label: 'Dashboard', route: '#/admin/dashboard' },
      { label: 'Orders', route: '#/admin/orders' }
    ]);
    document.getElementById('admin-page-content').innerHTML = '<div style="padding:40px;text-align:center;color:#6b7280;">Loading orders...</div>';

    this._orders = await AdminStore.fetchOrders();
    const orders = this._orders;

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
          <select class="admin-select" style="max-width: 150px;">
            <option>All Status</option>
            <option>Processing</option>
            <option>Completed</option>
            <option>Refund</option>
          </select>
        </div>

        <table class="admin-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Items</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${orders.length === 0 ? '<tr><td colspan="8" style="text-align:center;padding:32px;color:#6b7280;">No orders found</td></tr>' :
              orders.map(o => `
              <tr>
                <td><strong>${o.orderNumber || o.id}</strong></td>
                <td>${o.customerId || '—'}</td>
                <td><strong>${AdminUtils.formatPrice(o.totalAmount)}</strong></td>
                <td>${(o.items || []).length}</td>
                <td>${o.paymentStatus === 'paid' ? '✅ Paid' : o.paymentMethod === 'Cash on Delivery' ? '💵 COD' : '⏳ Pending'}</td>
                <td><span class="admin-status-badge ${AdminConfig.statusColors[o.status] || 'admin-status-processing'}">${AdminConfig.statusLabels[o.status] || o.status}</span></td>
                <td>${AdminUtils.formatDate(o.createdAt)}</td>
                <td>
                  <button class="admin-btn admin-btn-sm admin-btn-secondary" onclick="AdminOrders.viewOrder('${o.id}')">View</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="admin-table-pagination">
          <span>Showing 1-${orders.length} of ${orders.length} orders</span>
        </div>
      </div>
    `;

    document.getElementById('admin-page-content').innerHTML = html;
  },

  viewOrder: function(id) {
    const order = this._orders.find(o => o.id === id);
    if (!order) return;
    const items = order.items || [];
    AdminModal.show((order.orderNumber || order.id) + ' - Order Details', `
      <div style="display: grid; gap: 16px;">
        <div><strong>Customer:</strong> ${order.customerId || '—'}</div>
        <div><strong>Amount:</strong> ${AdminUtils.formatPrice(order.totalAmount)}</div>
        <div><strong>Items:</strong>
          <ul style="margin:8px 0 0 20px;padding:0">
            ${items.map(i => `<li>${i.name} × ${i.quantity} — ${AdminUtils.formatPrice(i.total)} <span style="color:#6b7280;font-size:12px">(vendor: ${i.vendorId})</span></li>`).join('') || '<li>—</li>'}
          </ul>
        </div>
        ${order.paymentMethod ? `<div><strong>Payment Method:</strong> ${order.paymentMethod} ${order.paymentStatus === 'paid' ? '(Paid ✅)' : ''}</div>` : ''}
        <div>
          <strong>Status:</strong><br>
          <span class="admin-status-badge ${AdminConfig.statusColors[order.status] || 'admin-status-processing'}">${AdminConfig.statusLabels[order.status] || order.status}</span>
        </div>
        <div class="admin-form-group">
          <label class="admin-label">Update Status (admin override)</label>
          <select class="admin-select" id="order-status-select" style="width:100%">
            ${this.ALL_STATUSES.map(s => `<option value="${s}" ${s === order.status ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
        <div><strong>Order Date:</strong> ${AdminUtils.formatDateTime(order.createdAt)}</div>
      </div>
    `, [
      { label: 'Close', class: 'admin-btn-secondary', onclick: 'AdminModal.close()' },
      { label: 'Update Status', class: 'admin-btn-primary', onclick: `AdminOrders.updateStatus('${id}')` }
    ]);
  },

  updateStatus: async function(id) {
    const status = document.getElementById('order-status-select')?.value;
    if (!status) return;
    try {
      await AdminAPI.updateOrderStatus(id, status);
      AdminToast.success('Order status updated!');
      AdminModal.close();
      await this.render();
    } catch (e) {
      AdminToast.error(e.message || 'Failed to update order status');
    }
  }
};
