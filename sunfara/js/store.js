/* ================================================
   store.js — Global State Management for Sunfara
   Persists cart, wishlist, user, orders in localStorage
   ================================================ */

const Store = {
  cart: [],
  wishlist: [],
  user: null,
  orders: [],
  recentlyViewed: [],
  appliedCoupon: null,

  /* ── CART ── */
  addToCart(productId, variantId, quantity = 1) {
    const product = Data.getProductById(productId);
    if (!product) return false;
    const variant = product.variants.find(v => v.id === variantId) || product.variants[0];
    const existing = this.cart.find(i => i.productId === productId && i.variantId === variant.id);
    if (existing) {
      existing.quantity = clamp(existing.quantity + quantity, 1, product.stock);
    } else {
      this.cart.push({
        productId, variantId: variant.id, quantity: clamp(quantity, 1, product.stock),
        price: variant.price, mrp: product.mrp, name: product.name,
        brand: product.brand, image: product.image, variantName: variant.name,
        rating: product.rating, discount: product.discount
      });
    }
    this.save();
    this.emit('cart-updated');
    return true;
  },

  removeFromCart(productId, variantId) {
    this.cart = this.cart.filter(i => !(i.productId === productId && i.variantId === variantId));
    this.save();
    this.emit('cart-updated');
  },

  updateQuantity(productId, variantId, quantity) {
    const item = this.cart.find(i => i.productId === productId && i.variantId === variantId);
    if (!item) return;
    const product = Data.getProductById(productId);
    if (quantity < 1) { this.removeFromCart(productId, variantId); return; }
    item.quantity = clamp(quantity, 1, product ? product.stock : 99);
    this.save();
    this.emit('cart-updated');
  },

  clearCart() {
    this.cart = [];
    this.appliedCoupon = null;
    this.save();
    this.emit('cart-updated');
  },

  getCartTotal() {
    const mrp = this.cart.reduce((s, i) => s + i.mrp * i.quantity, 0);
    const price = this.cart.reduce((s, i) => s + i.price * i.quantity, 0);
    const discount = mrp - price;
    const delivery = price >= 599 ? 0 : 49;
    let couponDiscount = 0;

    if (this.appliedCoupon) {
      const c = this.appliedCoupon;
      if (c.type === 'percent') couponDiscount = Math.min(Math.round(price * c.discount / 100), c.maxDiscount || Infinity);
      else if (c.type === 'flat') couponDiscount = c.discount;
      else if (c.type === 'freeshipping') couponDiscount = delivery;
    }

    const finalDelivery = this.appliedCoupon?.type === 'freeshipping' ? 0 : delivery;
    const final = price - couponDiscount + finalDelivery;
    return { mrp, price, discount, delivery: finalDelivery, couponDiscount, final, itemCount: this.cart.reduce((s, i) => s + i.quantity, 0) };
  },

  getCartCount() {
    return this.cart.reduce((s, i) => s + i.quantity, 0);
  },

  /* ── WISHLIST ── */
  toggleWishlist(productId) {
    if (this.isWishlisted(productId)) {
      this.wishlist = this.wishlist.filter(id => id !== productId);
    } else {
      this.wishlist.push(productId);
    }
    this.save();
    this.emit('wishlist-updated');
  },

  isWishlisted(productId) {
    return this.wishlist.includes(productId);
  },

  moveToCart(productId) {
    const product = Data.getProductById(productId);
    if (!product) return;
    this.addToCart(productId, product.variants[0].id, 1);
    this.wishlist = this.wishlist.filter(id => id !== productId);
    this.save();
    this.emit('wishlist-updated');
    this.emit('cart-updated');
  },

  /* ── COUPONS ── */
  applyCoupon(code) {
    const coupon = Data.coupons.find(c => c.code === code.toUpperCase());
    if (!coupon) return { success: false, message: 'Invalid coupon code.' };
    const { price } = this.getCartTotal();
    if (price < coupon.minOrder) return { success: false, message: `Minimum order of ${formatPrice(coupon.minOrder)} required.` };
    this.appliedCoupon = coupon;
    this.save();
    this.emit('cart-updated');
    return { success: true, message: coupon.description };
  },

  removeCoupon() {
    this.appliedCoupon = null;
    this.save();
    this.emit('cart-updated');
  },

  /* ── USER ── */
  login(userData) {
    this.user = { id: userData.id || 'u_' + Date.now(), name: userData.name, email: userData.email, phone: userData.phone || '', addresses: userData.addresses || [] };
    this.save();
    this.emit('user-updated');
  },

  logout() {
    this.user = null;
    this.save();
    this.emit('user-updated');
    if (window.firebase?.auth && window.FirebaseAuth?.signOut) {
      window.FirebaseAuth.signOut(window.firebase.auth).catch(() => {});
    }
  },

  updateProfile(data) {
    if (!this.user) return;
    Object.assign(this.user, data);
    this.save();
    this.emit('user-updated');
  },

  addAddress(address) {
    if (!this.user) return;
    address.id = 'addr_' + Date.now();
    if (!this.user.addresses.length) address.isDefault = true;
    this.user.addresses.push(address);
    this.save();
  },

  removeAddress(addressId) {
    if (!this.user) return;
    this.user.addresses = this.user.addresses.filter(a => a.id !== addressId);
    this.save();
  },

  /* ── ORDERS ── */
  placeOrder(orderData) {
    const orderId = orderData.orderId || generateOrderId();
    const totals = this.getCartTotal();
    const order = {
      id: orderId, items: [...this.cart], ...totals,
      address: orderData.address, payment: orderData.payment,
      status: 'Processing', date: new Date().toISOString(),
      estimatedDelivery: addDays(4)
    };
    this.orders.unshift(order);
    this.clearCart();
    this.save();
    this.emit('orders-updated');
    return orderId;
  },

  getOrders() {
    return this.orders;
  },

  /* ── RECENTLY VIEWED ── */
  addRecentlyViewed(productId) {
    this.recentlyViewed = [productId, ...this.recentlyViewed.filter(id => id !== productId)].slice(0, 10);
    this.save();
  },

  /* ── PERSISTENCE ── */
  save() {
    try {
      localStorage.setItem('sunfara_state', JSON.stringify({
        cart: this.cart, wishlist: this.wishlist, user: this.user,
        orders: this.orders, recentlyViewed: this.recentlyViewed, appliedCoupon: this.appliedCoupon
      }));
    } catch (e) { /* localStorage full or unavailable — degrade silently */ }
  },

  load() {
    try {
      const saved = localStorage.getItem('sunfara_state');
      if (saved) {
        const s = JSON.parse(saved);
        this.cart = s.cart || [];
        this.wishlist = s.wishlist || [];
        this.user = s.user || null;
        this.orders = s.orders || [];
        this.recentlyViewed = s.recentlyViewed || [];
        this.appliedCoupon = s.appliedCoupon || null;
      }
    } catch (e) { /* corrupt data — start fresh */ }
  },

  /* Dispatch a CustomEvent so any component can listen */
  emit(eventName) {
    document.dispatchEvent(new CustomEvent('store:' + eventName));
  }
};
