/* ================================================
   navbar.js — Renders 3-row desktop navbar + mobile
   Depends on: Store, Data, Search, Toast
   ================================================ */
const Navbar = {
  init() {
    this.render();
    this.bindEvents();
    this.updateBadges();
    document.addEventListener('store:cart-updated', () => this.updateBadges());
    document.addEventListener('store:wishlist-updated', () => this.updateBadges());
    document.addEventListener('store:user-updated', () => this.render());
  },

  render() {
    const nav = document.getElementById('navbar');
    const cats = Data.categories;
    nav.innerHTML = `
      <!-- Row 1: Utility bar (desktop only) -->
      <div class="navbar-utility">
        <div class="container">
          <div class="utility-left">🌿 Free shipping on orders above ₹599</div>
          <div class="utility-right">
            <a href="#/blog">Blog</a>
            <a href="#/about">About</a>
            <a href="#/contact">Contact</a>
            ${Store.user ? `<a href="#/profile">👤 ${Store.user.name.split(' ')[0]}</a>` : '<a href="#/login">Login</a>'}
          </div>
        </div>
      </div>

      <!-- Row 2: Main bar -->
      <div class="navbar-main">
        <div class="container">
          <!-- Hamburger (mobile) -->
          <button class="hamburger-btn" id="hamburger-btn" aria-label="Open menu">
            <span></span><span></span><span></span>
          </button>

          <!-- Logo -->
          <a class="navbar-logo" href="#/">
            <svg class="navbar-logo-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2C6 2 3 8 3 12c0 5 4 9 9 9s9-4 9-9c0-4-3-10-9-10z"/><path d="M12 2v20"/><path d="M12 8c0 0-5 2-5 6"/><path d="M12 8c0 0 5 2 5 6"/></svg>
            <span class="navbar-logo-text">Sunfara</span>
          </a>

          <!-- Search -->
          <div class="navbar-search" style="position:relative;">
            <input type="text" id="navbar-search-input" placeholder="Search products, brands, ingredients..." autocomplete="off" aria-label="Search" />
            <button class="search-icon-btn" aria-label="Search">🔍</button>
          </div>

          <!-- Nav action icons -->
          <div class="navbar-actions">
            <button class="nav-action-btn" id="wishlist-nav-btn" onclick="Navbar.toggleWishlistDrawer()" aria-label="Wishlist">
              <div class="nav-action-icon">❤️<span class="nav-badge" id="wishlist-badge" style="display:none">0</span></div>
              <span class="label">Wishlist</span>
            </button>
            <button class="nav-action-btn" id="cart-nav-btn" onclick="Navbar.toggleCartDrawer()" aria-label="Shopping cart">
              <div class="nav-action-icon">🛒<span class="nav-badge" id="cart-badge" style="display:none">0</span></div>
              <span class="label">Cart</span>
            </button>
            <button class="nav-action-btn" onclick="window.location.hash='${Store.user ? '#/profile' : '#/login'}'" aria-label="Profile">
              <div class="nav-action-icon">👤</div>
              <span class="label">${Store.user ? 'Profile' : 'Login'}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Row 3: Category tabs -->
      <div class="navbar-categories">
        <div class="category-tabs">
          ${cats.map(c => `<a class="category-tab" href="#/category/${c.slug}">${c.icon} ${c.name}</a>`).join('')}
          <a class="category-tab" href="#/about">🌿 Our Story</a>
        </div>
      </div>

      <!-- Mobile nav drawer -->
      <div class="mobile-nav-drawer" id="mobile-nav-drawer">
        <div class="mobile-nav-header">
          <span class="navbar-logo-text" style="font-family:var(--font-display);color:var(--color-primary);">Sunfara</span>
          <button onclick="Navbar.closeMobileNav()" aria-label="Close menu" style="font-size:1.5rem;background:none;border:none;cursor:pointer;">✕</button>
        </div>
        <div class="mobile-nav-links">
          ${Store.user ? `<div class="mobile-nav-link">👋 Hi, ${Store.user.name.split(' ')[0]}</div>` : ''}
          <a class="mobile-nav-link" href="#/" onclick="Navbar.closeMobileNav()">🏠 Home</a>
          <div class="mobile-nav-divider"></div>
          ${cats.map(c => `<a class="mobile-nav-link" href="#/category/${c.slug}" onclick="Navbar.closeMobileNav()">${c.icon} ${c.name}</a>`).join('')}
          <div class="mobile-nav-divider"></div>
          <a class="mobile-nav-link" href="#/blog" onclick="Navbar.closeMobileNav()">📝 Blog</a>
          <a class="mobile-nav-link" href="#/about" onclick="Navbar.closeMobileNav()">🌿 About Us</a>
          <a class="mobile-nav-link" href="#/contact" onclick="Navbar.closeMobileNav()">📧 Contact</a>
          <a class="mobile-nav-link" href="#/faq" onclick="Navbar.closeMobileNav()">❓ FAQ</a>
          <div class="mobile-nav-divider"></div>
          ${Store.user
            ? `<a class="mobile-nav-link" href="#/profile" onclick="Navbar.closeMobileNav()">👤 My Profile</a>
               <a class="mobile-nav-link" href="#/orders" onclick="Navbar.closeMobileNav()">📦 My Orders</a>
               <a class="mobile-nav-link" onclick="Store.logout();Navbar.closeMobileNav();Toast.show('Logged out','info')">🚪 Logout</a>`
            : `<a class="mobile-nav-link" href="#/login" onclick="Navbar.closeMobileNav()">🔑 Login / Sign Up</a>`}
        </div>
      </div>
      <div id="mobile-nav-overlay" class="drawer-overlay" onclick="Navbar.closeMobileNav()"></div>

      <!-- Bottom tab bar (mobile) -->
      <div class="bottom-tab-bar">
        <div class="bottom-tabs">
          <a class="bottom-tab" href="#/">🏠<span>Home</span></a>
          <a class="bottom-tab" href="#/category/organic-skincare">🗂️<span>Categories</span></a>
          <a class="bottom-tab" onclick="document.getElementById('navbar-search-input')?.focus()">🔍<span>Search</span></a>
          <a class="bottom-tab" href="#/wishlist">❤️<span>Wishlist</span></a>
          <a class="bottom-tab" href="${Store.user ? '#/profile' : '#/login'}">👤<span>Profile</span></a>
        </div>
      </div>`;

    // Highlight active category tab
    this.highlightActiveTab();
    // Init search after render
    Search.init();
    // Init cart & wishlist drawers
    this.initDrawers();
  },

  highlightActiveTab() {
    const hash = window.location.hash;
    document.querySelectorAll('.category-tab').forEach(tab => {
      tab.classList.toggle('active', hash.includes(tab.getAttribute('href')));
    });
  },

  updateBadges() {
    const cartCount = Store.getCartCount();
    const wishlistCount = Store.wishlist.length;

    const cartBadge = document.getElementById('cart-badge');
    const wishlistBadge = document.getElementById('wishlist-badge');

    if (cartBadge) {
      cartBadge.textContent = cartCount;
      cartBadge.style.display = cartCount > 0 ? 'flex' : 'none';
      if (cartCount > 0) cartBadge.classList.add('pulse');
      setTimeout(() => cartBadge.classList.remove('pulse'), 300);
    }
    if (wishlistBadge) {
      wishlistBadge.textContent = wishlistCount;
      wishlistBadge.style.display = wishlistCount > 0 ? 'flex' : 'none';
    }
  },

  bindEvents() {
    document.getElementById('hamburger-btn')?.addEventListener('click', () => this.openMobileNav());
    window.addEventListener('hashchange', () => this.highlightActiveTab());
  },

  openMobileNav() {
    document.getElementById('mobile-nav-drawer')?.classList.add('open');
    document.getElementById('mobile-nav-overlay')?.classList.add('visible');
    document.body.style.overflow = 'hidden';
  },

  closeMobileNav() {
    document.getElementById('mobile-nav-drawer')?.classList.remove('open');
    document.getElementById('mobile-nav-overlay')?.classList.remove('visible');
    document.body.style.overflow = '';
  },

  initDrawers() {
    // Cart drawer
    const cartDrawer = document.getElementById('cart-drawer');
    const cartOverlay = document.getElementById('cart-drawer-overlay');
    cartOverlay?.addEventListener('click', () => this.closeCartDrawer());

    // Wishlist drawer
    const wlDrawer = document.getElementById('wishlist-drawer');
    const wlOverlay = document.getElementById('wishlist-drawer-overlay');
    wlOverlay?.addEventListener('click', () => this.closeWishlistDrawer());
  },

  toggleCartDrawer() { this.renderCartDrawer(); document.getElementById('cart-drawer')?.classList.toggle('open'); document.getElementById('cart-drawer-overlay')?.classList.toggle('visible'); },
  closeCartDrawer() { document.getElementById('cart-drawer')?.classList.remove('open'); document.getElementById('cart-drawer-overlay')?.classList.remove('visible'); },
  toggleWishlistDrawer() { this.renderWishlistDrawer(); document.getElementById('wishlist-drawer')?.classList.toggle('open'); document.getElementById('wishlist-drawer-overlay')?.classList.toggle('visible'); },
  closeWishlistDrawer() { document.getElementById('wishlist-drawer')?.classList.remove('open'); document.getElementById('wishlist-drawer-overlay')?.classList.remove('visible'); },

  renderCartDrawer() {
    const drawer = document.getElementById('cart-drawer');
    if (!drawer) return;
    const { final, itemCount } = Store.getCartTotal();
    drawer.innerHTML = `
      <div class="drawer-header">
        <h3>My Cart (${itemCount})</h3>
        <button class="modal-close" onclick="Navbar.closeCartDrawer()" aria-label="Close cart">✕</button>
      </div>
      <div class="cart-drawer-items">
        ${Store.cart.length ? Store.cart.map(item => `
          <div class="cart-drawer-item">
            <img class="cart-drawer-item-img" src="${item.image}" alt="${item.name}" onerror="this.style.background='#6a9e78'">
            <div style="flex:1;min-width:0;">
              <div style="font-size:0.8rem;color:var(--color-text-muted)">${item.brand}</div>
              <div style="font-size:0.85rem;font-weight:500;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${item.name}</div>
              <div style="font-size:0.8rem;color:var(--color-text-muted)">${item.variantName}</div>
              <div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px;">
                <span style="font-weight:700;color:var(--color-primary)">${formatPrice(item.price)}</span>
                <span style="font-size:0.8rem;color:var(--color-text-muted)">Qty: ${item.quantity}</span>
              </div>
            </div>
          </div>`).join('') : '<div class="empty-state" style="padding:2rem;text-align:center"><div style="font-size:2rem">🛒</div><p>Your cart is empty</p></div>'}
      </div>
      ${Store.cart.length ? `
      <div class="cart-drawer-footer">
        <div class="cart-drawer-total"><span>Total</span><span>${formatPrice(final)}</span></div>
        <a href="#/cart" class="btn btn-outline btn-full" onclick="Navbar.closeCartDrawer()" style="margin-bottom:8px">View Cart</a>
        <a href="#/checkout" class="btn btn-primary btn-full" onclick="Navbar.closeCartDrawer()">Checkout</a>
      </div>` : ''}`;
  },

  renderWishlistDrawer() {
    const drawer = document.getElementById('wishlist-drawer');
    if (!drawer) return;
    const items = Store.wishlist.slice(0, 5).map(id => Data.getProductById(id)).filter(Boolean);
    drawer.innerHTML = `
      <div class="drawer-header">
        <h3>My Wishlist (${Store.wishlist.length})</h3>
        <button class="modal-close" onclick="Navbar.closeWishlistDrawer()" aria-label="Close wishlist">✕</button>
      </div>
      <div style="padding:0 var(--space-6);">
        ${items.length ? items.map(p => `
          <div class="wishlist-drawer-item">
            <img class="wishlist-drawer-img" src="${p.image}" alt="${p.name}" onerror="this.style.background='#6a9e78'">
            <div class="wishlist-drawer-info">
              <div class="wishlist-drawer-name">${p.name}</div>
              <div class="wishlist-drawer-price">${formatPrice(p.price)}</div>
              <button onclick="Store.moveToCart('${p.id}');Navbar.closeWishlistDrawer();Toast.show('Moved to cart 🛒','success')" style="font-size:0.75rem;color:var(--color-primary);background:none;border:none;cursor:pointer;padding:4px 0">Move to Cart →</button>
            </div>
          </div>`).join('') : '<div class="empty-state" style="padding:2rem;text-align:center"><div style="font-size:2rem">❤️</div><p>Your wishlist is empty</p></div>'}
        ${Store.wishlist.length > 5 ? `<p style="text-align:center;font-size:0.8rem;color:var(--color-text-muted);margin-top:8px">+${Store.wishlist.length - 5} more items</p>` : ''}
      </div>
      <div style="padding:var(--space-6);border-top:1px solid var(--color-border);">
        <a href="#/wishlist" class="btn btn-primary btn-full" onclick="Navbar.closeWishlistDrawer()">View Full Wishlist</a>
      </div>`;
  }
};
