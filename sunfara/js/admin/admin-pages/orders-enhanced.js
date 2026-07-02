/* Enhanced Orders Page with Timeline, Refunds, Communication & Tracking */

const AdminOrdersEnhanced = {
  currentOrder: null,

  render: function() {
    AdminLayout.renderBreadcrumb([
      { label: 'Dashboard', route: '#/admin/dashboard' },
      { label: 'Orders', route: '#/admin/orders' }
    ]);

    const orders = AdminStore.getOrders();

    const html = `
      <div class="admin-page-header">
        <div>
          <h1 class="admin-page-title">Order Management</h1>
          <p class="admin-page-subtitle">Track orders, manage refunds, communicate with customers (${orders.length} total orders)</p>
        </div>
        <div class="admin-page-actions">
          <button class="admin-btn admin-btn-secondary">📊 Export</button>
          <button class="admin-btn admin-btn-secondary">🔍 Advanced Search</button>
        </div>
      </div>

      <div class="admin-table-wrapper">
        <div class="admin-table-toolbar">
          <input type="text" class="admin-input" placeholder="Search by order ID or customer..." style="max-width: 350px;" />
          <select class="admin-select" style="max-width: 150px;">
            <option>All Status</option>
            <option>Completed</option>
            <option>Processing</option>
            <option>Shipped</option>
            <option>Refund Pending</option>
          </select>
          <select class="admin-select" style="max-width: 150px;">
            <option>Date Filter</option>
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
            <option>Last 90 Days</option>
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
              <th>Shipping</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${orders.map(o => `
              <tr style="cursor: pointer;">
                <td><strong>${o.id}</strong></td>
                <td onclick="AdminOrdersEnhanced.showOrderDetail('${o.id}')">${o.customer}</td>
                <td><strong>${AdminUtils.formatPrice(o.amount)}</strong></td>
                <td>${o.items}</td>
                <td><span class="admin-status-badge ${AdminConfig.statusColors[o.status]}">${AdminConfig.statusLabels[o.status]}</span></td>
                <td>
                  <span style="font-size: 12px; color: #6b7280;">
                    ${o.status === 'completed' ? '✅ Delivered' : o.status === 'processing' ? '📦 Shipped' : '⏳ In Transit'}
                  </span>
                </td>
                <td style="font-size: 12px; color: #6b7280;">${AdminUtils.formatDate(o.date)}</td>
                <td>
                  <button class="admin-btn admin-btn-sm admin-btn-primary" onclick="AdminOrdersEnhanced.showOrderDetail('${o.id}')">Details</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    document.getElementById('admin-page-content').innerHTML = html;
  },

  showOrderDetail: function(orderId) {
    const order = AdminStore.getOrderById(orderId);
    this.currentOrder = order;

    AdminLayout.renderBreadcrumb([
      { label: 'Dashboard', route: '#/admin/dashboard' },
      { label: 'Orders', route: '#/admin/orders' },
      { label: order.id, route: '#/admin/orders/' + orderId }
    ]);

    const html = `
      <div class="admin-page-header">
        <div>
          <h1 class="admin-page-title">${order.id}</h1>
          <p class="admin-page-subtitle">Order details, tracking, and customer communication</p>
        </div>
        <div class="admin-page-actions">
          <button class="admin-btn admin-btn-secondary" onclick="AdminOrdersEnhanced.render()">← Back to Orders</button>
          ${order.status === 'completed' ? `<button class="admin-btn admin-btn-secondary" onclick="AdminOrdersEnhanced.showRefundModal('${order.id}')">💰 Process Refund</button>` : ''}
        </div>
      </div>

      <div class="admin-grid-2">
        <!-- Order Summary -->
        <div class="admin-card">
          <div class="admin-card-header">Order Summary</div>
          <div class="admin-card-body">
            <div style="display: grid; gap: 16px;">
              <div style="padding: 12px; background: #f9fafb; border-radius: 8px;">
                <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Total Amount</div>
                <div style="font-size: 24px; font-weight: 700; color: #22c55e; margin-top: 4px;">${AdminUtils.formatPrice(order.amount)}</div>
              </div>
              <div>
                <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Items</div>
                <div style="font-weight: 600; margin-top: 4px;">${order.items} products</div>
              </div>
              <div>
                <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Payment Method</div>
                <div style="margin-top: 4px;">${order.paymentMethod}</div>
              </div>
              <div>
                <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Status</div>
                <div style="margin-top: 4px;"><span class="admin-status-badge ${AdminConfig.statusColors[order.status]}">${AdminConfig.statusLabels[order.status]}</span></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Customer Information -->
        <div class="admin-card">
          <div class="admin-card-header">Customer Information</div>
          <div class="admin-card-body">
            <div style="display: grid; gap: 16px;">
              <div>
                <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Name</div>
                <div style="font-weight: 600; margin-top: 4px;">${order.customer}</div>
              </div>
              <div>
                <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Email</div>
                <div style="margin-top: 4px;"><a href="mailto:${order.email}" style="color: #22c55e; text-decoration: none;">${order.email}</a></div>
              </div>
              <div>
                <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Phone</div>
                <div style="margin-top: 4px;"><a href="tel:+919876543210" style="color: #22c55e; text-decoration: none;">+91-9876543210</a></div>
              </div>
              <button class="admin-btn admin-btn-secondary" style="width: 100%; margin-top: 8px;" onclick="AdminOrdersEnhanced.openChat('${order.id}')">💬 Send Message</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Order Timeline (Tracking) -->
      <div class="admin-card" style="margin-top: 24px;">
        <div class="admin-card-header">Order Timeline & Tracking</div>
        <div class="admin-card-body">
          <div style="display: grid; gap: 16px; padding: 16px;">
            ${this.renderOrderTimeline(order)}
          </div>
        </div>
      </div>

      <!-- Shipment Tracking -->
      <div class="admin-card" style="margin-top: 24px;">
        <div class="admin-card-header">Shipment Details</div>
        <div class="admin-card-body">
          <div style="display: grid; gap: 12px;">
            <div style="padding: 12px; background: #f9fafb; border-radius: 8px;">
              <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Tracking Number</div>
              <div style="font-weight: 600; margin-top: 4px; font-family: monospace;">TRK${Math.random().toString(36).substring(7).toUpperCase()}</div>
            </div>
            <div style="padding: 12px; background: #f9fafb; border-radius: 8px;">
              <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Shipping Address</div>
              <div style="margin-top: 4px; font-size: 13px;">123 Main Street, Bangalore, Karnataka 560001</div>
            </div>
            <div style="padding: 12px; background: #f9fafb; border-radius: 8px;">
              <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Estimated Delivery</div>
              <div style="font-weight: 600; margin-top: 4px;">March 22, 2024</div>
            </div>
            <button class="admin-btn admin-btn-secondary" style="width: 100%;" onclick="AdminOrdersEnhanced.trackShipment('${order.id}')">📍 Live Tracking</button>
          </div>
        </div>
      </div>

      <!-- Customer Communication -->
      <div class="admin-card" style="margin-top: 24px;">
        <div class="admin-card-header">Customer Messages</div>
        <div class="admin-card-body">
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px; max-height: 250px; overflow-y: auto;">
            <div style="display: grid; gap: 12px; font-size: 13px;">
              <div style="text-align: right;">
                <div style="background: #dcfce7; padding: 12px; border-radius: 8px; display: inline-block; max-width: 80%;">
                  <div>Great product! When will it arrive?</div>
                  <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">2 hours ago</div>
                </div>
              </div>
              <div>
                <div style="background: #f3f4f6; padding: 12px; border-radius: 8px; display: inline-block; max-width: 80%;">
                  <div>Your package is on the way! Estimated delivery March 22.</div>
                  <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">1 hour ago</div>
                </div>
              </div>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr auto; gap: 8px;">
            <input type="text" class="admin-input" placeholder="Send message to customer..." />
            <button class="admin-btn admin-btn-primary" onclick="AdminOrdersEnhanced.sendMessage('${order.id}')">Send</button>
          </div>
        </div>
      </div>

      <!-- Refund Status (if applicable) -->
      ${order.status === 'completed' ? `
      <div class="admin-card" style="margin-top: 24px;">
        <div class="admin-card-header">Refund Status</div>
        <div class="admin-card-body">
          <div style="padding: 16px; background: #f0fdf4; border-left: 4px solid #22c55e; border-radius: 8px;">
            <div style="font-weight: 600;">No refund requests</div>
            <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Customer has not requested refund</div>
          </div>
          <button class="admin-btn admin-btn-secondary" style="width: 100%; margin-top: 16px;" onclick="AdminOrdersEnhanced.initiateRefund('${order.id}')">💰 Initiate Refund</button>
        </div>
      </div>
      ` : ''}
    `;

    document.getElementById('admin-page-content').innerHTML = html;
  },

  renderOrderTimeline: function(order) {
    const timelineSteps = [
      { icon: '✅', status: 'Order Placed', time: AdminUtils.formatDateTime(order.date), completed: true },
      { icon: '✅', status: 'Payment Verified', time: 'March 15, 2:35 PM', completed: true },
      { icon: '✅', status: 'Picked', time: 'March 16, 9:00 AM', completed: true },
      { icon: '✅', status: 'Packed', time: 'March 16, 9:45 AM', completed: true },
      { icon: '📦', status: 'Shipped', time: 'March 16, 3:00 PM', completed: order.status === 'completed' },
      { icon: '🚚', status: 'In Transit', time: 'March 17 - Present', completed: order.status === 'completed' },
      { icon: '🏠', status: 'Delivered', time: 'March 22 (Expected)', completed: false }
    ];

    return timelineSteps.map((step, i) => `
      <div style="display: flex; gap: 16px; position: relative;">
        <div style="display: flex; flex-direction: column; align-items: center;">
          <div style="width: 40px; height: 40px; border-radius: 50%; background: ${step.completed ? '#dcfce7' : '#f3f4f6'}; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 600; color: ${step.completed ? '#22c55e' : '#6b7280'};">
            ${step.completed ? '✓' : i + 1}
          </div>
          ${i < timelineSteps.length - 1 ? `<div style="width: 2px; height: 50px; background: ${step.completed ? '#22c55e' : '#e5e7eb'}; margin: 8px 0;"></div>` : ''}
        </div>
        <div style="padding-top: 8px;">
          <div style="font-weight: 600; color: ${step.completed ? '#111827' : '#6b7280'};">${step.status}</div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">${step.time}</div>
        </div>
      </div>
    `).join('');
  },

  showRefundModal: function(orderId) {
    AdminModal.show('Process Refund', `
      <div style="display: grid; gap: 16px;">
        <div>
          <label class="admin-label">Refund Reason</label>
          <select class="admin-select">
            <option>Customer Request</option>
            <option>Defective Product</option>
            <option>Wrong Item Shipped</option>
            <option>Not As Described</option>
            <option>Other</option>
          </select>
        </div>
        <div>
          <label class="admin-label">Refund Amount</label>
          <input type="text" class="admin-input" value="${AdminStore.getOrderById(orderId)?.amount || 0}" />
        </div>
        <div>
          <label class="admin-label">Notes</label>
          <textarea class="admin-input" style="min-height: 100px; resize: none;" placeholder="Add refund notes..."></textarea>
        </div>
      </div>
    `, [
      { label: 'Cancel', class: 'admin-btn-secondary', onclick: 'AdminModal.close()' },
      { label: 'Process Refund', class: 'admin-btn-primary', onclick: 'AdminOrdersEnhanced.confirmRefund("' + orderId + '")' }
    ]);
  },

  openChat: function(orderId) {
    AdminToast.info('Opening customer chat...');
  },

  trackShipment: function(orderId) {
    AdminToast.info('Live tracking opened in new window');
  },

  sendMessage: function(orderId) {
    AdminToast.success('Message sent to customer!');
  },

  confirmRefund: function(orderId) {
    AdminToast.success('Refund processed successfully!');
    AdminModal.close();
  },

  initiateRefund: function(orderId) {
    this.showRefundModal(orderId);
  }
};

AdminOrders = AdminOrdersEnhanced;
