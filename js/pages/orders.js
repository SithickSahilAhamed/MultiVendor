/* ================================================
   orders.js — My Orders Page
   Route: #/orders (guard: login required)
   ================================================ */
const OrdersPage = {
  render() {
    if (!Store.user) { window.location.hash = '#/login'; return; }
    const orders = Store.getOrders();
    const main = document.getElementById('page-content');

    main.innerHTML = `
      <div class="container section">
        <h2 style="margin-bottom:var(--space-6)">My Orders</h2>
        <div class="orders-page" id="orders-list"></div>
      </div>`;

    const el = document.getElementById('orders-list');
    if (!orders.length) {
      el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📦</div><h3>No orders yet</h3><p>Start your organic journey! 🌿</p><a href="#/" class="btn btn-primary">Shop Now</a></div>`;
      return;
    }

    el.innerHTML = orders.map(order => `
      <div class="order-card">
        <div class="order-card-header">
          <div><div class="order-id">${order.id}</div><div class="order-date">${formatDate(order.date)}</div></div>
          <div style="text-align:right">
            <span class="order-status status-${order.status.toLowerCase()}">${order.status === 'Processing' ? '⏳' : order.status === 'Shipped' ? '🚚' : order.status === 'Delivered' ? '✅' : '❌'} ${order.status}</span>
            <div class="order-meta" style="margin-top:4px">${order.itemCount || order.items.length} items · ${formatPrice(order.final)} · ${order.payment}</div>
          </div>
        </div>
        <div class="order-thumbs">
          ${order.items.slice(0,3).map(item => `<img class="order-thumb" src="${item.image}" alt="${item.name}" onerror="this.style.background='var(--color-cream)'">`).join('')}
          ${order.items.length > 3 ? `<div class="order-more-count">+${order.items.length-3}</div>` : ''}
        </div>
        <div class="order-card-footer">
          <button class="btn btn-outline btn-sm" onclick="OrdersPage.toggleDetails('${order.id}')">View Details ▼</button>
          <button class="btn btn-primary btn-sm" onclick="OrdersPage.reorder('${order.id}')">Buy Again</button>
          <button class="btn btn-outline btn-sm" onclick="Toast.show('Support team will contact you within 24 hours 🌿','info')">Need Help?</button>
        </div>
        <div class="order-details-accordion" id="details-${order.id}">
          ${order.items.map(item => `
            <div class="order-detail-item">
              <img class="order-detail-img" src="${item.image}" alt="${item.name}" onerror="this.style.background='var(--color-cream)'">
              <div class="order-detail-info">
                <div class="order-detail-name">${item.name}</div>
                <div class="order-detail-meta">${item.variantName} · Qty: ${item.quantity}</div>
              </div>
              <div class="order-detail-price">${formatPrice(item.price * item.quantity)}</div>
            </div>`).join('')}
          ${order.address ? `
          <div class="order-address-section">
            <h5>Delivered to</h5>
            <p style="font-size:.85rem;color:var(--color-text-secondary)">${order.address.name} · ${order.address.phone}<br>${order.address.line1}, ${order.address.city}, ${order.address.state} — ${order.address.pincode}</p>
          </div>` : ''}
          <div style="margin-top:var(--space-4)">
            <button class="btn btn-outline btn-sm" onclick="Toast.show('Invoice sent to ${Store.user.email} 📧','success')">📄 Download Invoice</button>
          </div>
        </div>
      </div>`).join('');
  },

  toggleDetails(orderId) {
    const el = document.getElementById(`details-${orderId}`);
    if (el) el.classList.toggle('open');
  },

  reorder(orderId) {
    const order = Store.orders.find(o => o.id === orderId);
    if (!order) return;
    order.items.forEach(item => Store.addToCart(item.productId, item.variantId, item.quantity));
    Toast.show('Items added to cart! 🛒', 'success');
    Navbar.updateBadges();
    window.location.hash = '#/cart';
  }
};
