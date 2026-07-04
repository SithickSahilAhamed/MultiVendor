/* ================================================
   cart.js — Shopping Cart Page
   Route: #/cart
   ================================================ */
const CartPage = {
  render() {
    const main = document.getElementById('page-content');
    if (!Store.cart.length) {
      main.innerHTML = `
        <div class="container section">
          <div class="empty-state">
            <div class="empty-state-icon">🛒</div>
            <h3>Your bag is empty 🌿</h3>
            <p>Looks like you haven't added any products yet. Start your organic journey!</p>
            <a href="#/" class="btn btn-primary btn-lg">Start Shopping</a>
          </div>
        </div>`;
      return;
    }

    main.innerHTML = `
      <div class="container section">
        <h2 style="margin-bottom:var(--space-6)">My Cart (${Store.getCartCount()} items)</h2>
        <div class="cart-layout">
          <div class="cart-items-section">
            <div class="cart-items-header">
              <span style="font-size:var(--text-sm);color:var(--color-text-muted)">Products</span>
              <button onclick="Store.clearCart();CartPage.render()" style="font-size:var(--text-xs);color:var(--color-error);background:none;border:none;cursor:pointer">Remove All</button>
            </div>
            <div id="cart-items"></div>
          </div>
          <div class="order-summary" id="order-summary"></div>
        </div>
      </div>`;

    this.renderItems();
    this.renderSummary();

    document.addEventListener('store:cart-updated', () => {
      if (!Store.cart.length) { this.render(); return; }
      this.renderItems();
      this.renderSummary();
    }, { once: true });
  },

  renderItems() {
    const el = document.getElementById('cart-items');
    if (!el) return;
    el.innerHTML = Store.cart.map(item => `
      <div class="cart-item">
        <img class="cart-item-img" src="${item.image}" alt="${item.name}" onclick="window.location.hash='#/product/${item.productId}'" style="cursor:pointer" onerror="this.style.background='var(--color-cream)'">
        <div class="cart-item-info">
          <div class="cart-item-brand">${item.brand}</div>
          <div class="cart-item-name" onclick="window.location.hash='#/product/${item.productId}'" style="cursor:pointer">${item.name}</div>
          <div class="cart-item-variant">Size: ${item.variantName}</div>
          <div class="cart-item-rating" style="color:#f59e0b">★★★★★ ${item.rating}</div>
          <div class="cart-item-price-row">
            <span class="cart-item-price">${formatPrice(item.price)}</span>
            <span class="cart-item-mrp">${formatPrice(item.mrp)}</span>
            <span class="cart-item-discount">${item.discount}% off</span>
          </div>
          <div class="cart-item-actions">
            <div class="qty-control">
              <button class="qty-btn" onclick="Store.updateQuantity('${item.productId}','${item.variantId}',${item.quantity-1});CartPage.renderItems();CartPage.renderSummary()" aria-label="Decrease">−</button>
              <span class="qty-value">${item.quantity}</span>
              <button class="qty-btn" onclick="Store.updateQuantity('${item.productId}','${item.variantId}',${item.quantity+1});CartPage.renderItems();CartPage.renderSummary()" aria-label="Increase">+</button>
            </div>
            <button class="cart-remove-btn" onclick="Store.removeFromCart('${item.productId}','${item.variantId}');CartPage.renderItems();CartPage.renderSummary();Toast.show('Item removed','info')">🗑 Remove</button>
            <button class="cart-wishlist-btn" onclick="Store.toggleWishlist('${item.productId}');Store.removeFromCart('${item.productId}','${item.variantId}');Toast.show('Moved to wishlist ♥','success');CartPage.renderItems();CartPage.renderSummary()">♥ Move to Wishlist</button>
          </div>
        </div>
      </div>`).join('');
  },

  renderSummary() {
    const el = document.getElementById('order-summary');
    if (!el) return;
    const t = Store.getCartTotal();
    const pct = Math.min((t.price / 599) * 100, 100);

    el.innerHTML = `
      <h3>ORDER SUMMARY</h3>
      ${t.price < 599 ? `
        <div class="delivery-progress">
          <div class="delivery-progress-text">Add <strong>${formatPrice(599 - t.price)}</strong> more for free delivery! 🚚</div>
          <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
        </div>` : `<div class="delivery-progress"><div class="delivery-progress-text" style="color:var(--color-primary)">🎉 You've unlocked FREE delivery!</div></div>`}
      <div class="summary-row"><span>Price (${t.itemCount} items)</span><span>${formatPrice(t.mrp)}</span></div>
      <div class="summary-row"><span>Discount</span><span style="color:var(--color-primary)">-${formatPrice(t.discount)}</span></div>
      <div class="summary-row ${t.delivery===0?'free':''}"><span>Delivery</span><span>${t.delivery===0?'FREE ✓':formatPrice(t.delivery)}</span></div>
      ${Store.appliedCoupon ? `<div class="summary-row"><span>Coupon (${Store.appliedCoupon.code})</span><span style="color:var(--color-primary)">-${formatPrice(t.couponDiscount)} <button onclick="Store.removeCoupon();CartPage.renderSummary()" style="background:none;border:none;color:var(--color-error);cursor:pointer;font-size:0.75rem">✕</button></span></div>` : ''}
      <hr class="divider">
      <div class="coupon-row">
        <input class="input" id="coupon-input" placeholder="Coupon code" style="text-transform:uppercase">
        <button class="btn btn-outline btn-sm" onclick="CartPage.applyCoupon()">Apply</button>
      </div>
      <hr class="divider">
      <div class="summary-row total"><span>Total Amount</span><span>${formatPrice(t.final)}</span></div>
      ${t.discount > 0 ? `<div class="summary-savings">🎉 You save ${formatPrice(t.discount + t.couponDiscount)} on this order!</div>` : ''}
      <a href="#/checkout" class="btn btn-primary btn-full btn-lg" style="margin-top:var(--space-4)">Proceed to Checkout →</a>
      <div class="secure-badges">
        <span class="secure-badge">🔒 Secure Payment</span>
        <span class="secure-badge">VISA</span>
        <span class="secure-badge">UPI</span>
        <span class="secure-badge">COD</span>
      </div>`;
  },

  async applyCoupon() {
    const code = document.getElementById('coupon-input')?.value;
    if (!code) return;
    const result = await Store.applyCoupon(code);
    Toast.show(result.message, result.success ? 'success' : 'error');
    if (result.success) this.renderSummary();
  }
};
