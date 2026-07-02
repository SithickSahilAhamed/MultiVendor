/* ================================================
   orders.js — My Orders Page
   Route: #/orders (guard: login required)

   Real orders, fetched from the backend - each master order can contain
   multiple vendors' sub-orders (vendorOrders[]), each with its own
   status/tracking, since different sellers fulfill independently. This
   used to read Store.getOrders() (pure localStorage, never synced with
   the backend), so a customer would see "Processing" forever even after
   a vendor actually delivered their order.
   ================================================ */
const OrdersPage = {
  _orders: [],

  async render() {
    if (!Store.user) { window.location.hash = '#/login'; return; }
    const main = document.getElementById('page-content');
    main.innerHTML = `
      <div class="container section">
        <h2 style="margin-bottom:var(--space-6)">My Orders</h2>
        <div class="orders-page" id="orders-list"><div style="padding:40px;text-align:center;color:var(--color-text-muted)">Loading your orders…</div></div>
      </div>`;

    try { this._orders = await SunfaraAPI.get('/orders'); }
    catch (e) {
      document.getElementById('orders-list').innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><h3>Could not load orders</h3><p>${e.message}</p></div>`;
      return;
    }

    const el = document.getElementById('orders-list');
    const orders = [...this._orders].sort((a, b) => new Date(b.createdAt?.toDate ? b.createdAt.toDate() : b.createdAt || 0) - new Date(a.createdAt?.toDate ? a.createdAt.toDate() : a.createdAt || 0));
    if (!orders.length) {
      el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📦</div><h3>No orders yet</h3><p>Start your organic journey! 🌿</p><a href="#/" class="btn btn-primary">Shop Now</a></div>`;
      return;
    }

    el.innerHTML = orders.map(order => this.renderOrderCard(order)).join('');
  },

  renderOrderCard(order) {
    const vendorOrders = order.vendorOrders || [];
    const overallStatus = this.overallStatus(vendorOrders);
    const itemCount = (order.items || []).length;
    return `
      <div class="order-card">
        <div class="order-card-header">
          <div><div class="order-id">${order.orderNumber || order.id}</div><div class="order-date">${formatDate(order.createdAt)}</div></div>
          <div style="text-align:right">
            <span class="order-status">${overallStatus.icon} ${overallStatus.label}</span>
            <div class="order-meta" style="margin-top:4px">${itemCount} items · ${formatPrice(order.totalAmount)} · ${order.paymentMethod || ''}</div>
          </div>
        </div>
        <div class="order-thumbs">
          ${(order.items || []).slice(0,3).map(item => `<img class="order-thumb" src="${item.image || ''}" alt="${item.name}" onerror="this.style.background='var(--color-cream)'">`).join('')}
          ${itemCount > 3 ? `<div class="order-more-count">+${itemCount-3}</div>` : ''}
        </div>
        <div class="order-card-footer">
          <button class="btn btn-outline btn-sm" onclick="OrdersPage.toggleDetails('${order.id}')">View Details ▼</button>
          <button class="btn btn-primary btn-sm" onclick="OrdersPage.reorder('${order.id}')">Buy Again</button>
          <button class="btn btn-outline btn-sm" onclick="Toast.show('Support team will contact you within 24 hours 🌿','info')">Need Help?</button>
        </div>
        <div class="order-details-accordion" id="details-${order.id}">
          ${vendorOrders.length ? vendorOrders.map(vo => this.renderVendorSubOrder(vo)).join('') : (order.items || []).map(item => this.renderLineItem(item)).join('')}
          ${order.shippingAddress ? `
          <div class="order-address-section">
            <h5>Delivered to</h5>
            <p style="font-size:.85rem;color:var(--color-text-secondary)">${order.shippingAddress.name} · ${order.shippingAddress.phone}<br>${order.shippingAddress.line1}, ${order.shippingAddress.city}, ${order.shippingAddress.state} — ${order.shippingAddress.pincode}</p>
          </div>` : ''}
          <div style="margin-top:var(--space-4)">
            <button class="btn btn-outline btn-sm" onclick="Toast.show('Invoice sent to ${Store.user.email} 📧','success')">📄 Download Invoice</button>
          </div>
        </div>
      </div>`;
  },

  renderVendorSubOrder(vo) {
    const label = this.statusLabel(vo.status);
    return `
      <div class="vendor-suborder">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <strong style="font-size:.85rem">🏪 ${vo.vendorName || 'Seller'}</strong>
          <span class="order-status status-${(vo.status||'pending').toLowerCase()}" style="font-size:.75rem">${label.icon} ${label.label}</span>
        </div>
        ${(vo.items || []).map(item => this.renderLineItem(item)).join('')}
        ${vo.trackingNumber ? `<p style="font-size:.8rem;color:var(--color-text-secondary);margin-top:4px">🚚 ${vo.carrier || ''} · Tracking: <strong>${vo.trackingNumber}</strong></p>` : ''}
        ${vo.status === 'delivered' ? `<button class="btn btn-outline btn-sm" style="margin-top:8px" onclick="OrdersPage.requestReturn('${vo.id}')">↩️ Return this item</button>` : ''}
        ${vo.status === 'return_rejected' ? `<p style="font-size:.8rem;color:var(--color-danger,#c0392b);margin-top:4px">Your return request was declined by the seller.</p>` : ''}
        ${vo.status === 'refunded' ? `<p style="font-size:.8rem;color:var(--color-primary);margin-top:4px">✅ Refund completed for this item.</p>` : ''}
      </div>`;
  },

  async requestReturn(vendorOrderId) {
    const reason = prompt('Why are you returning this order? (e.g. damaged, wrong item, not as described)');
    if (reason === null) return;
    try {
      await SunfaraAPI.post(`/orders/${vendorOrderId}/return`, { reason });
      Toast.show('Return requested. The seller will review it shortly. 🌿', 'success');
      await this.render();
    } catch (e) { Toast.show(e.message || 'Could not request a return.', 'error'); }
  },

  renderLineItem(item) {
    return `
      <div class="order-detail-item">
        <img class="order-detail-img" src="${item.image || ''}" alt="${item.name}" onerror="this.style.background='var(--color-cream)'">
        <div class="order-detail-info">
          <div class="order-detail-name">${item.name}</div>
          <div class="order-detail-meta">Qty: ${item.quantity}</div>
        </div>
        <div class="order-detail-price">${formatPrice((item.price || 0) * item.quantity)}</div>
      </div>`;
  },

  statusLabel(status) {
    const map = {
      pending: { icon: '🟡', label: 'Pending' }, confirmed: { icon: '🔵', label: 'Confirmed' },
      processing: { icon: '🔵', label: 'Processing' }, packed: { icon: '🟣', label: 'Packed' },
      shipped: { icon: '🚚', label: 'Shipped' }, delivered: { icon: '✅', label: 'Delivered' },
      completed: { icon: '✅', label: 'Completed' }, cancelled: { icon: '⚫', label: 'Cancelled' },
      return_requested: { icon: '↩️', label: 'Return Requested' }, returned: { icon: '📦', label: 'Returned' },
      return_rejected: { icon: '❌', label: 'Return Rejected' }, refunded: { icon: '💰', label: 'Refunded' }
    };
    return map[status] || { icon: '🟡', label: status || 'Pending' };
  },

  /* A master order can have multiple vendor sub-orders at different
     stages - show the least-advanced one so the customer isn't told
     "Delivered" while one seller hasn't even shipped yet. Return states
     sit right after "delivered" so a return-in-progress on any one
     vendor's items surfaces ahead of another vendor's unrelated
     "completed" sub-order. */
  overallStatus(vendorOrders) {
    if (!vendorOrders.length) return this.statusLabel('pending');
    const order = ['pending', 'confirmed', 'processing', 'packed', 'shipped', 'delivered', 'return_requested', 'returned', 'return_rejected', 'refunded', 'completed', 'cancelled'];
    const least = vendorOrders.reduce((min, vo) => order.indexOf(vo.status) < order.indexOf(min) ? vo.status : min, vendorOrders[0].status);
    return this.statusLabel(least);
  },

  toggleDetails(orderId) {
    const el = document.getElementById(`details-${orderId}`);
    if (el) el.classList.toggle('open');
  },

  reorder(orderId) {
    const order = this._orders.find(o => o.id === orderId);
    if (!order) return;
    (order.items || []).forEach(item => Store.addToCart(item.productId, 'default', item.quantity));
    Toast.show('Items added to cart! 🛒', 'success');
    Navbar.updateBadges();
    window.location.hash = '#/cart';
  }
};
