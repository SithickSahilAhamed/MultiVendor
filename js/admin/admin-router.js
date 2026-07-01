/* Admin Router */

const AdminRouter = {
  currentPage: null,
  loginPage: `
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);">
      <div style="background: white; padding: 48px; border-radius: 12px; width: 100%; max-width: 400px; box-shadow: 0 20px 25px rgba(0,0,0,0.15);">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="font-size: 48px; margin-bottom: 16px;">⚙️</div>
          <h1 style="margin: 0; font-size: 28px; color: #111827;">Sunfara Admin</h1>
          <p style="color: #6b7280; margin-top: 8px;">Manage your marketplace</p>
        </div>
        
        <div style="margin-bottom: 24px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #111827;">Email</label>
          <input type="email" id="login-email" value="admin@sunfara.com" style="width: 100%; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px;" />
        </div>

        <div style="margin-bottom: 32px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #111827;">Password</label>
          <input type="password" id="login-password" value="admin123" style="width: 100%; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px;" />
        </div>

        <button onclick="AdminRouter.login()" style="width: 100%; padding: 12px; background: #22c55e; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px;">
          Login to Dashboard
        </button>

        <div style="text-align: center; margin-top: 24px; font-size: 12px; color: #6b7280;">
          <p>Demo credentials pre-filled</p>
        </div>
      </div>
    </div>
  `,

  routes: {
    '/admin': 'login',
    '/admin/login': 'login',
    '/admin/dashboard': 'dashboard',
    '/admin/vendors': 'vendors',
    '/admin/products': 'products',
    '/admin/orders': 'orders',
    '/admin/customers': 'customers',
    '/admin/commissions': 'commissions',
    '/admin/withdrawals': 'withdrawals',
    '/admin/reports': 'reports',
    '/admin/settings': 'settings'
  },

  resolve: function() {
    if (!AdminStore.isLoggedIn) {
      document.getElementById('admin-page-content').innerHTML = this.loginPage;
      return;
    }

    const hash = window.location.hash.replace('#', '') || '/admin/dashboard';
    const page = this.routes[hash];

    if (page === 'dashboard') AdminDashboard.render();
    else if (page === 'vendors') AdminVendors.render();
    else if (page === 'products') AdminProducts.render();
    else if (page === 'orders') AdminOrders.render();
    else if (page === 'customers') AdminCustomers.render();
    else if (page === 'commissions') AdminCommissions.render();
    else if (page === 'withdrawals') AdminWithdrawals.render();
    else if (page === 'reports') AdminReports.render();
    else if (page === 'settings') AdminSettings.render();
    else AdminDashboard.render();

    AdminLayout.highlightActiveItem();
  },

  login: function() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    if (AdminStore.login(email, password)) {
      AdminToast.success('Welcome back, ' + AdminStore.user.name + '!');
      window.location.hash = '#/admin/dashboard';
      setTimeout(() => this.resolve(), 500);
    } else {
      AdminToast.error('Invalid email or password');
    }
  },

  init: function() {
    window.addEventListener('hashchange', () => this.resolve());
    this.resolve();
  }
};
