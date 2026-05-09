/* ================================================
   router.js — Hash-based SPA Router
   Loaded LAST — all pages must be defined before this
   ================================================ */

const Router = {
  routes: {
    '/':                  () => HomePage.render(),
    '/category/:slug':    (p) => ProductListPage.render(p),
    '/search':            (p) => ProductListPage.render({ query: p.query }),
    '/product/:id':       (p) => ProductDetailPage.render(p),
    '/cart':              () => CartPage.render(),
    '/checkout':          () => CheckoutPage.render(),
    '/orders':            () => OrdersPage.render(),
    '/login':             () => AuthPage.render({ tab: 'login' }),
    '/signup':            () => AuthPage.render({ tab: 'signup' }),
    '/wishlist':          () => WishlistPage.render(),
    '/profile':           () => ProfilePage.render(),
    '/about':             () => AboutPage.render(),
    '/blog':              () => BlogPage.render(),
    '/faq':               () => FaqPage.render(),
    '/contact':           () => ContactPage.render(),
    '/certifications':    () => CertificationsPage.render(),
  },

  /* Parse hash and dispatch to correct page handler */
  resolve() {
    const raw = window.location.hash.replace('#', '') || '/';
    // Separate path from query string
    const [pathname, queryString] = raw.split('?');
    const params = this.parseQuery(queryString);

    // Match dynamic routes like /product/:id
    for (const [pattern, handler] of Object.entries(this.routes)) {
      const match = this.matchRoute(pattern, pathname);
      if (match !== null) {
        Object.assign(params, match);
        scrollToTop();
        handler(params);
        this.updateTitle(pattern, params);
        return;
      }
    }

    // 404
    document.getElementById('page-content').innerHTML = `
      <div class="container section">
        <div class="empty-state" style="padding:var(--space-16)">
          <div class="empty-state-icon">🌿</div>
          <h2>Page Not Found</h2>
          <p>The page you're looking for doesn't exist or may have moved.</p>
          <a href="#/" class="btn btn-primary btn-lg">Back to Home</a>
        </div>
      </div>`;
    document.title = '404 — Sunfara';
  },

  /* Match a pattern like /product/:id against a path like /product/SKN001 */
  matchRoute(pattern, path) {
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');
    if (patternParts.length !== pathParts.length) return null;

    const params = {};
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        params[patternParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
      } else if (patternParts[i] !== pathParts[i]) {
        return null;
      }
    }
    return params;
  },

  /* Parse ?key=value&key2=value2 into an object */
  parseQuery(qs) {
    if (!qs) return {};
    const params = {};
    qs.split('&').forEach(pair => {
      const [k, v] = pair.split('=');
      if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || '');
    });
    return params;
  },

  updateTitle(pattern, params) {
    const titles = {
      '/': 'Sunfara — Pure. Natural. Conscious.',
      '/category/:slug': `${params.slug?.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase())} — Sunfara`,
      '/product/:id': `${Data.getProductById(params.id)?.name || 'Product'} — Sunfara`,
      '/cart': 'My Cart — Sunfara',
      '/checkout': 'Checkout — Sunfara',
      '/orders': 'My Orders — Sunfara',
      '/login': 'Login — Sunfara',
      '/signup': 'Sign Up — Sunfara',
      '/wishlist': 'My Wishlist — Sunfara',
      '/profile': 'My Profile — Sunfara',
      '/about': 'About Us — Sunfara',
      '/blog': 'Blog — Sunfara',
      '/faq': 'FAQ — Sunfara',
      '/contact': 'Contact Us — Sunfara',
      '/certifications': 'Our Certifications — Sunfara',
      '/search': `Search: "${params.q}" — Sunfara`,
    };
    document.title = titles[pattern] || 'Sunfara — Pure. Natural. Conscious.';
  },

  init() {
    window.addEventListener('hashchange', () => this.resolve());
    this.resolve();
  }
};

/* ── App Initialisation ── */
async function initApp() {
  Store.load();              // restore persisted state first
  await Data.init();         // fetch all JSON data
  Navbar.init();             // render navbar (needs Data + Store)
  Footer.init();             // render footer
  setupBackToTop();          // back-to-top button
  Router.init();             // start routing — renders first page
}

initApp();
