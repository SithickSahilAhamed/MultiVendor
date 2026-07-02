/* Vendor Portal Router */

const VendorRouter = {
  routes: {
    '/vendor/register': 'register',
    '/vendor/login': 'login',
    '/vendor/forgot-password': 'forgot',
    '/vendor/dashboard': 'dashboard',
    '/vendor/products': 'products',
    '/vendor/orders': 'orders',
    '/vendor/returns': 'returns',
    '/vendor/earnings': 'earnings'
  },

  resolve() {
    const hash = window.location.hash.replace('#', '') || (VendorStore.isLoggedIn ? '/vendor/dashboard' : '/vendor/login');
    const page = this.routes[hash] || (VendorStore.isLoggedIn ? 'dashboard' : 'login');

    if (!VendorStore.isLoggedIn) {
      document.getElementById('vendor-app-shell').style.display = 'none';
      document.getElementById('vendor-auth-shell').style.display = '';
      if (page === 'register') VendorAuthPage.renderRegister();
      else if (page === 'forgot') VendorAuthPage.renderForgotPassword();
      else VendorAuthPage.renderLogin();
      return;
    }

    document.getElementById('vendor-app-shell').style.display = '';
    document.getElementById('vendor-auth-shell').style.display = 'none';
    VendorLayout.init();

    if (page === 'products') VendorProducts.render();
    else if (page === 'orders') VendorOrders.render();
    else if (page === 'returns') VendorReturns.render();
    else if (page === 'earnings') VendorEarnings.render();
    else VendorDashboard.render();

    VendorLayout.highlightActiveItem();
  },

  init() {
    window.addEventListener('hashchange', () => this.resolve());
    VendorStore.init(() => this.resolve());
  }
};
