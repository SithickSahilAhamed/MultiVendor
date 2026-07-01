/* Orders Page */

const AdminOrders = {
  render: function() {
    AdminLayout.renderBreadcrumb([
      { label: 'Dashboard', route: '#/admin/dashboard' },
      { label: 'Orders', route: '#/admin/orders' }
    ]);

    const orders = AdminStore.getOrders();
    const html = `
      <div class="admin-page-header">
        <div>
          <h1 class="admin-page-title">Orders</h1>
          <p class="admin-page-subtitle">${orders.length} total orders this month</p>
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
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${orders.map(o => `
              <tr>
                <td><strong>${o.id}</strong></td>
                <td>${o.customer}</td>
                <td><strong>${AdminUtils.formatPrice(o.amount)}</strong></td>
                <td>${o.items}</td>
                <td><span class="admin-status-badge ${AdminConfig.statusColors[o.status]}">${AdminConfig.statusLabels[o.status]}</span></td>
                <td>${AdminUtils.formatDate(o.date)}</td>
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
    const order = AdminStore.getOrders().find(o => o.id === id);
    AdminModal.show(order.id + ' - Order Details', `
      <div style="display: grid; gap: 16px;">
        <div>
          <strong>Customer:</strong> ${order.customer}
          <br><small>${order.email}</small>
        </div>
        <div>
          <strong>Amount:</strong> ${AdminUtils.formatPrice(order.amount)}
        </div>
        <div>
          <strong>Items:</strong> ${order.items} products
        </div>
        <div>
          <strong>Payment Method:</strong> ${order.paymentMethod}
        </div>
        <div>
          <strong>Status:</strong>
          <br><span class="admin-status-badge ${AdminConfig.statusColors[order.status]}">${AdminConfig.statusLabels[order.status]}</span>
        </div>
        <div>
          <strong>Order Date:</strong> ${AdminUtils.formatDateTime(order.date)}
        </div>
      </div>
    `, [
      { label: 'Close', class: 'admin-btn-secondary', onclick: 'AdminModal.close()' }
    ]);
  }
};
