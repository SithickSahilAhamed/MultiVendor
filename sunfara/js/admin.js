// ═══════════════════════════════════════════════════════════════════════════════
// admin.js — Complete Sunfara Admin Panel
// SPA with 17+ sections, auth, notifications, dark mode, responsive sidebar
// ═══════════════════════════════════════════════════════════════════════════════

let adminCharts = {};

// ─────────────────────────────────────────────────────────────────────────────
// AUTHENTICATION SYSTEM
// ─────────────────────────────────────────────────────────────────────────────
class AdminAuth {
  static login() {
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;
    const loginBtn = document.getElementById('login-btn');
    const btnText = document.getElementById('login-btn-text');
    const originalText = btnText.textContent;

    if (!email || !password) {
      AdminToast.error('Please fill in all fields');
      return;
    }

    loginBtn.disabled = true;
    btnText.textContent = 'Signing in...';

    setTimeout(() => {
      if (email === 'admin@sunfara.com' && password === 'admin123') {
        localStorage.setItem('adminAuth', JSON.stringify({ email, loggedInAt: new Date().toISOString() }));
        document.getElementById('admin-login').style.display = 'none';
        document.getElementById('admin-app').style.display = 'grid';
        Admin.showSection('dashboard');
        AdminToast.success('Welcome back, Admin!');
      } else {
        AdminToast.error('Invalid credentials');
        loginBtn.disabled = false;
        btnText.textContent = originalText;
      }
    }, 800);
  }

  static logout() {
    localStorage.removeItem('adminAuth');
    document.getElementById('admin-app').style.display = 'none';
    document.getElementById('admin-login').style.display = 'flex';
    document.getElementById('admin-email').value = 'admin@sunfara.com';
    document.getElementById('admin-password').value = 'admin123';
    AdminToast.info('Logged out');
  }

  static togglePassword() {
    const input = document.getElementById('admin-password');
    const btn = document.getElementById('eye-btn');
    if (input.type === 'password') {
      input.type = 'text';
      btn.textContent = '🙈';
    } else {
      input.type = 'password';
      btn.textContent = '👁';
    }
  }

  static checkAuth() {
    const auth = localStorage.getItem('adminAuth');
    if (!auth) {
      document.getElementById('admin-login').style.display = 'flex';
      document.getElementById('admin-app').style.display = 'none';
    } else {
      document.getElementById('admin-login').style.display = 'none';
      document.getElementById('admin-app').style.display = 'grid';
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TOAST NOTIFICATION SYSTEM
// ─────────────────────────────────────────────────────────────────────────────
class AdminToast {
  static show(message, type = 'info', duration = 4000) {
    const container = document.getElementById('admin-toast-container');
    const id = `toast-${Date.now()}`;
    const toast = document.createElement('div');
    toast.id = id;
    toast.className = `admin-toast ${type}`;

    const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
    toast.innerHTML = `
      <div class="toast-icon">${icons[type] || icons.info}</div>
      <div class="toast-message">${message}</div>
      <button class="toast-close" onclick="document.getElementById('${id}').remove()">×</button>
    `;

    container.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
  }

  static success(msg) { this.show(msg, 'success'); }
  static error(msg) { this.show(msg, 'error'); }
  static info(msg) { this.show(msg, 'info'); }
  static warning(msg) { this.show(msg, 'warning'); }
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL SYSTEM
// ─────────────────────────────────────────────────────────────────────────────
class AdminModal {
  static open(title, body) {
    document.getElementById('admin-modal-title').textContent = title;
    document.getElementById('admin-modal-body').innerHTML = body;
    document.getElementById('admin-modal-overlay').style.display = 'flex';
  }

  static close() {
    document.getElementById('admin-modal-overlay').style.display = 'none';
  }

  static closeOnOverlay(e) {
    if (e.target.id === 'admin-modal-overlay') this.close();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ADMIN CLASS
// ─────────────────────────────────────────────────────────────────────────────
class Admin {
  static currentSection = 'dashboard';
  static sidebarOpen = true;

  static init() {
    AdminAuth.checkAuth();
    this.setupEventListeners();
    this.loadTheme();
    this.setupNotifications();
  }

  static setupEventListeners() {
    const navItems = document.querySelectorAll('.admin-nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        const section = item.getAttribute('data-section');
        this.showSection(section);
      });
    });

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('topbar-search').focus();
      }
    });
  }

  static showSection(section) {
    document.querySelectorAll('.admin-nav-item').forEach(i => i.classList.remove('active'));
    document.querySelector(`[data-section="${section}"]`).classList.add('active');

    document.getElementById('topbar-title').textContent = this.sectionTitle(section);
    this.currentSection = section;

    const content = document.getElementById('admin-content');
    content.innerHTML = '';

    const sectionMap = {
      dashboard: this.renderDashboard,
      vendors: this.renderVendors,
      products: this.renderProducts,
      orders: this.renderOrders,
      customers: this.renderCustomers,
      commissions: this.renderCommissions,
      withdrawals: this.renderWithdrawals,
      refunds: this.renderRefunds,
      coupons: this.renderCoupons,
      membership: this.renderMembership,
      reviews: this.renderReviews,
      media: this.renderMedia,
      announcements: this.renderAnnouncements,
      reports: this.renderReports,
      activity: this.renderActivity,
      support: this.renderSupport,
      roles: this.renderRoles,
      settings: this.renderSettings
    };

    if (sectionMap[section]) {
      sectionMap[section].call(this);
    }
  }

  static sectionTitle(section) {
    const titles = {
      dashboard: 'Dashboard', vendors: 'Vendors', products: 'Products',
      orders: 'Orders', customers: 'Customers', commissions: 'Commissions',
      withdrawals: 'Withdrawals', refunds: 'Refunds', coupons: 'Coupons',
      membership: 'Membership Plans', reviews: 'Reviews', media: 'Media Library',
      announcements: 'Announcements', reports: 'Reports', activity: 'Activity Logs',
      support: 'Support Tickets', roles: 'Roles & Permissions', settings: 'Settings'
    };
    return titles[section] || section;
  }

  static toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
    const sidebar = document.getElementById('admin-sidebar');
    sidebar.classList.toggle('collapsed');
  }

  static closeSidebarMobile() {
    document.getElementById('sidebar-mobile-overlay').style.display = 'none';
    document.getElementById('admin-sidebar').classList.remove('mobile-open');
  }

  static filterNav(query) {
    const items = document.querySelectorAll('.admin-nav-item');
    query = query.toLowerCase();
    items.forEach(item => {
      const label = item.textContent.toLowerCase();
      item.style.display = label.includes(query) ? 'flex' : 'none';
    });
  }

  static globalSearch(query) {
    if (query.length > 2) {
      AdminToast.info(`Searching for: ${query}`);
    }
  }

  static toggleTheme() {
    const html = document.documentElement;
    const theme = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', theme);
    localStorage.setItem('adminTheme', theme);
    document.getElementById('theme-icon').textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  static loadTheme() {
    const theme = localStorage.getItem('adminTheme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
    document.getElementById('theme-icon').textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  static toggleNotifications() {
    const dropdown = document.getElementById('notif-dropdown');
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
  }

  static toggleUserMenu() {
    const dropdown = document.getElementById('user-dropdown');
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
  }

  static markAllRead() {
    document.querySelectorAll('.notif-item').forEach(n => n.classList.remove('unread'));
    document.querySelector('.notif-dot').style.display = 'none';
    AdminToast.info('All notifications marked as read');
  }

  static setupNotifications() {
    const notifList = document.getElementById('notif-list');
    const notifications = [
      { icon: '📦', text: 'New order #ORD-2405 from Sarah Johnson', time: '5 min ago' },
      { icon: '⭐', text: 'New 5-star review on Organic Face Serum', time: '12 min ago' },
      { icon: '🏢', text: 'Vendor "Green Botanics" registered', time: '1 hour ago' },
      { icon: '💳', text: 'Withdrawal request pending approval', time: '2 hours ago' }
    ];

    notifList.innerHTML = notifications.map(n => `
      <div class="notif-item unread">
        <span class="notif-icon">${n.icon}</span>
        <div class="notif-text">
          <div>${n.text}</div>
          <small>${n.time}</small>
        </div>
      </div>
    `).join('');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION RENDERERS
  // ─────────────────────────────────────────────────────────────────────────

  static renderDashboard() {
    const content = document.getElementById('admin-content');
    const mockData = {
      revenue: 24500,
      revenueChange: 12,
      orders: 342,
      ordersChange: 5,
      customers: 1240,
      customersChange: 18,
      vendors: 28,
      vendorsChange: 2
    };

    content.innerHTML = `
      <div class="dashboard-container">
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-header">
              <h3>Total Revenue</h3>
              <span class="kpi-change positive">+${mockData.revenueChange}%</span>
            </div>
            <div class="kpi-value">₹${mockData.revenue.toLocaleString()}</div>
            <div class="kpi-subtitle">Last 30 days</div>
          </div>

          <div class="kpi-card">
            <div class="kpi-header">
              <h3>Total Orders</h3>
              <span class="kpi-change positive">+${mockData.ordersChange}%</span>
            </div>
            <div class="kpi-value">${mockData.orders}</div>
            <div class="kpi-subtitle">This month</div>
          </div>

          <div class="kpi-card">
            <div class="kpi-header">
              <h3>New Customers</h3>
              <span class="kpi-change positive">+${mockData.customersChange}%</span>
            </div>
            <div class="kpi-value">${mockData.customers}</div>
            <div class="kpi-subtitle">Active users</div>
          </div>

          <div class="kpi-card">
            <div class="kpi-header">
              <h3>Total Vendors</h3>
              <span class="kpi-change positive">+${mockData.vendorsChange}%</span>
            </div>
            <div class="kpi-value">${mockData.vendors}</div>
            <div class="kpi-subtitle">Marketplace</div>
          </div>
        </div>

        <div class="charts-grid">
          <div class="chart-card">
            <h3>Revenue Trend (30 days)</h3>
            <canvas id="revenue-chart"></canvas>
          </div>
          <div class="chart-card">
            <h3>Orders by Category</h3>
            <canvas id="category-chart"></canvas>
          </div>
        </div>

        <div class="data-table-card">
          <h3>Recent Orders</h3>
          <table class="admin-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>#ORD-2405</strong></td>
                <td>Sarah Johnson</td>
                <td>₹2,450</td>
                <td><span class="status-badge success">Completed</span></td>
                <td>Today</td>
              </tr>
              <tr>
                <td><strong>#ORD-2404</strong></td>
                <td>Rajesh Patel</td>
                <td>₹1,800</td>
                <td><span class="status-badge info">Processing</span></td>
                <td>Today</td>
              </tr>
              <tr>
                <td><strong>#ORD-2403</strong></td>
                <td>Priya Sharma</td>
                <td>₹3,200</td>
                <td><span class="status-badge success">Completed</span></td>
                <td>Yesterday</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    setTimeout(() => {
      if (document.getElementById('revenue-chart')) {
        this.initRevenueChart();
      }
      if (document.getElementById('category-chart')) {
        this.initCategoryChart();
      }
    }, 100);
  }

  static initRevenueChart() {
    const ctx = document.getElementById('revenue-chart').getContext('2d');
    adminCharts.revenue = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Day 1', 'Day 5', 'Day 10', 'Day 15', 'Day 20', 'Day 25', 'Day 30'],
        datasets: [{
          label: 'Revenue (₹)',
          data: [2800, 3200, 2900, 3500, 4200, 3800, 4500],
          borderColor: '#4a7c59',
          backgroundColor: 'rgba(74, 124, 89, 0.05)',
          tension: 0.4,
          borderWidth: 2,
          fill: true,
          pointRadius: 4,
          pointBackgroundColor: '#4a7c59'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { display: true, position: 'bottom' } },
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  static initCategoryChart() {
    const ctx = document.getElementById('category-chart').getContext('2d');
    adminCharts.category = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Beauty', 'Herbal', 'Skincare', 'Haircare', 'Wellness'],
        datasets: [{
          label: 'Orders',
          data: [45, 38, 52, 31, 28],
          backgroundColor: ['#4a7c59', '#e67e22', '#3b82f6', '#8b5cf6', '#ef4444']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  static renderVendors() {
    const content = document.getElementById('admin-content');
    const vendors = [
      { id: 1, name: 'Green Botanics', email: 'hello@greenbotanics.com', products: 12, status: 'Active', commission: '15%' },
      { id: 2, name: 'Pure Wellness Co', email: 'contact@purewellness.in', products: 8, status: 'Active', commission: '18%' },
      { id: 3, name: 'Organic Essentials', email: 'info@organicessentials.com', products: 15, status: 'Inactive', commission: '15%' }
    ];

    content.innerHTML = `
      <div class="section-header">
        <h2>Vendors Management</h2>
        <button class="admin-btn-primary" onclick="AdminModal.open('Add Vendor', '<input type=\"text\" placeholder=\"Vendor Name\" class=\"modal-input\"/>')">+ Add Vendor</button>
      </div>

      <div class="data-table-card">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Vendor Name</th>
              <th>Email</th>
              <th>Products</th>
              <th>Status</th>
              <th>Commission</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${vendors.map(v => `
              <tr>
                <td><strong>${v.name}</strong></td>
                <td>${v.email}</td>
                <td>${v.products}</td>
                <td><span class="status-badge ${v.status === 'Active' ? 'success' : 'warning'}">${v.status}</span></td>
                <td>${v.commission}</td>
                <td>
                  <button class="admin-btn-ghost" onclick="AdminToast.info('View vendor details')">View</button>
                  <button class="admin-btn-ghost" onclick="AdminToast.info('Editing vendor')">Edit</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  static renderProducts() {
    const content = document.getElementById('admin-content');
    content.innerHTML = `
      <div class="section-header">
        <h2>Products Management</h2>
        <button class="admin-btn-primary" onclick="AdminToast.info('Add new product')">+ Add Product</button>
      </div>

      <div class="filters-bar">
        <input type="text" placeholder="Search products..." class="filter-input"/>
        <select class="filter-select">
          <option>All Categories</option>
          <option>Beauty</option>
          <option>Herbal</option>
          <option>Skincare</option>
        </select>
        <select class="filter-select">
          <option>All Status</option>
          <option>Published</option>
          <option>Draft</option>
        </select>
      </div>

      <div class="data-table-card">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Organic Face Serum</strong></td>
              <td>Skincare</td>
              <td>₹1,299</td>
              <td><span class="stock-indicator high">125 in stock</span></td>
              <td><span class="status-badge success">Published</span></td>
              <td><button class="admin-btn-ghost" onclick="AdminToast.info('Editing product')">Edit</button></td>
            </tr>
            <tr>
              <td><strong>Herbal Hair Oil</strong></td>
              <td>Haircare</td>
              <td>₹450</td>
              <td><span class="stock-indicator low">8 in stock</span></td>
              <td><span class="status-badge warning">Low Stock</span></td>
              <td><button class="admin-btn-ghost" onclick="AdminToast.warning('Reorder product')">Reorder</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  static renderOrders() {
    const content = document.getElementById('admin-content');
    content.innerHTML = `
      <div class="section-header">
        <h2>Orders Management</h2>
      </div>

      <div class="filters-bar">
        <input type="text" placeholder="Search orders..." class="filter-input"/>
        <select class="filter-select">
          <option>All Orders</option>
          <option>Pending</option>
          <option>Processing</option>
          <option>Completed</option>
        </select>
      </div>

      <div class="data-table-card">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Total</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>#ORD-2405</strong></td>
              <td>Sarah Johnson</td>
              <td>₹2,450</td>
              <td><span class="status-badge success">Completed</span></td>
              <td>Jun 2, 2026</td>
              <td><button class="admin-btn-ghost" onclick="AdminToast.info('View order')">View</button></td>
            </tr>
            <tr>
              <td><strong>#ORD-2404</strong></td>
              <td>Rajesh Patel</td>
              <td>₹1,800</td>
              <td><span class="status-badge info">Processing</span></td>
              <td>Jun 2, 2026</td>
              <td><button class="admin-btn-ghost" onclick="AdminToast.info('View order')">View</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  static renderCustomers() {
    const content = document.getElementById('admin-content');
    content.innerHTML = `
      <div class="section-header">
        <h2>Customers Management</h2>
      </div>

      <div class="data-table-card">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Orders</th>
              <th>Total Spent</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Sarah Johnson</strong></td>
              <td>sarah@example.com</td>
              <td>+91-9876543210</td>
              <td>5</td>
              <td>₹12,450</td>
              <td>Jan 15, 2026</td>
            </tr>
            <tr>
              <td><strong>Rajesh Patel</strong></td>
              <td>rajesh@example.com</td>
              <td>+91-9876543211</td>
              <td>3</td>
              <td>₹6,800</td>
              <td>Feb 20, 2026</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  static renderCommissions() {
    const content = document.getElementById('admin-content');
    content.innerHTML = `
      <div class="section-header">
        <h2>Commissions Management</h2>
      </div>

      <div class="data-table-card">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Vendor</th>
              <th>Sales</th>
              <th>Rate</th>
              <th>Commission</th>
              <th>Status</th>
              <th>Period</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Green Botanics</strong></td>
              <td>₹18,500</td>
              <td>15%</td>
              <td>₹2,775</td>
              <td><span class="status-badge success">Paid</span></td>
              <td>May 1-31, 2026</td>
            </tr>
            <tr>
              <td><strong>Pure Wellness Co</strong></td>
              <td>₹12,300</td>
              <td>18%</td>
              <td>₹2,214</td>
              <td><span class="status-badge info">Pending</span></td>
              <td>May 1-31, 2026</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  static renderWithdrawals() {
    const content = document.getElementById('admin-content');
    content.innerHTML = `
      <div class="section-header">
        <h2>Withdrawal Requests</h2>
      </div>

      <div class="data-table-card">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Vendor</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Green Botanics</strong></td>
              <td>₹5,000</td>
              <td>Bank Transfer</td>
              <td><span class="status-badge warning">Pending</span></td>
              <td>Jun 1, 2026</td>
              <td>
                <button class="admin-btn-ghost" onclick="AdminToast.success('Withdrawal approved')">Approve</button>
                <button class="admin-btn-danger" onclick="AdminToast.error('Withdrawal rejected')">Reject</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  static renderRefunds() {
    const content = document.getElementById('admin-content');
    content.innerHTML = `
      <div class="section-header">
        <h2>Refunds Management</h2>
      </div>

      <div class="data-table-card">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>#ORD-2401</strong></td>
              <td>Priya Sharma</td>
              <td>₹899</td>
              <td>Damaged product</td>
              <td><span class="status-badge warning">Pending</span></td>
              <td><button class="admin-btn-ghost" onclick="AdminToast.success('Refund processed')">Process</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  static renderCoupons() {
    const content = document.getElementById('admin-content');
    content.innerHTML = `
      <div class="section-header">
        <h2>Coupons Management</h2>
        <button class="admin-btn-primary" onclick="AdminToast.info('Create new coupon')">+ Create Coupon</button>
      </div>

      <div class="data-table-card">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Discount</th>
              <th>Usage</th>
              <th>Expiry</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>WELCOME10</strong></td>
              <td>10%</td>
              <td>45 / 100</td>
              <td>Dec 31, 2026</td>
              <td><span class="status-badge success">Active</span></td>
              <td><button class="admin-btn-ghost" onclick="AdminToast.info('Edit coupon')">Edit</button></td>
            </tr>
            <tr>
              <td><strong>ORGANIC15</strong></td>
              <td>15%</td>
              <td>82 / 200</td>
              <td>Dec 31, 2026</td>
              <td><span class="status-badge success">Active</span></td>
              <td><button class="admin-btn-ghost" onclick="AdminToast.info('Edit coupon')">Edit</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  static renderMembership() {
    const content = document.getElementById('admin-content');
    content.innerHTML = `
      <div class="section-header">
        <h2>Membership Plans</h2>
        <button class="admin-btn-primary" onclick="AdminToast.info('Create new plan')">+ Create Plan</button>
      </div>

      <div class="plans-grid">
        <div class="plan-card">
          <h3>Basic</h3>
          <div class="plan-price">Free</div>
          <ul class="plan-features">
            <li>✓ Browse products</li>
            <li>✓ Add to cart</li>
            <li>✗ Premium discounts</li>
          </ul>
          <button class="admin-btn-ghost">View</button>
        </div>

        <div class="plan-card featured">
          <h3>Premium</h3>
          <div class="plan-price">₹499<span>/month</span></div>
          <ul class="plan-features">
            <li>✓ Everything in Basic</li>
            <li>✓ 15% all products</li>
            <li>✓ Free shipping</li>
          </ul>
          <button class="admin-btn-primary">Edit</button>
        </div>

        <div class="plan-card">
          <h3>VIP</h3>
          <div class="plan-price">₹999<span>/month</span></div>
          <ul class="plan-features">
            <li>✓ Everything in Premium</li>
            <li>✓ 25% all products</li>
            <li>✓ Priority support</li>
          </ul>
          <button class="admin-btn-ghost">View</button>
        </div>
      </div>
    `;
  }

  static renderReviews() {
    const content = document.getElementById('admin-content');
    content.innerHTML = `
      <div class="section-header">
        <h2>Product Reviews</h2>
      </div>

      <div class="data-table-card">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Customer</th>
              <th>Rating</th>
              <th>Review</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Organic Face Serum</td>
              <td>Sarah Johnson</td>
              <td>⭐⭐⭐⭐⭐</td>
              <td>"Excellent product, highly recommended"</td>
              <td><span class="status-badge success">Approved</span></td>
              <td><button class="admin-btn-ghost" onclick="AdminToast.info('Delete review')">Delete</button></td>
            </tr>
            <tr>
              <td>Herbal Hair Oil</td>
              <td>Rajesh Patel</td>
              <td>⭐⭐⭐⭐</td>
              <td>"Good quality, arrived on time"</td>
              <td><span class="status-badge warning">Pending</span></td>
              <td>
                <button class="admin-btn-ghost" onclick="AdminToast.success('Review approved')">Approve</button>
                <button class="admin-btn-danger" onclick="AdminToast.error('Review rejected')">Reject</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  static renderMedia() {
    const content = document.getElementById('admin-content');
    content.innerHTML = `
      <div class="section-header">
        <h2>Media Library</h2>
        <button class="admin-btn-primary" onclick="AdminToast.info('Upload media')">+ Upload Media</button>
      </div>

      <div class="media-grid">
        <div class="media-item">
          <div class="media-thumbnail" style="background-color: #e8c99a;"></div>
          <div class="media-info">
            <strong>organic-face-serum.jpg</strong>
            <small>245 KB • Jun 1, 2026</small>
          </div>
        </div>
        <div class="media-item">
          <div class="media-thumbnail" style="background-color: #c17f3b;"></div>
          <div class="media-info">
            <strong>herbal-hair-oil.jpg</strong>
            <small>189 KB • May 30, 2026</small>
          </div>
        </div>
      </div>
    `;
  }

  static renderAnnouncements() {
    const content = document.getElementById('admin-content');
    content.innerHTML = `
      <div class="section-header">
        <h2>Announcements</h2>
        <button class="admin-btn-primary" onclick="AdminToast.info('Create announcement')">+ Create Announcement</button>
      </div>

      <div class="announcements-list">
        <div class="announcement-card">
          <div class="announcement-header">
            <h3>Summer Sale Started</h3>
            <span class="announcement-status active">Active</span>
          </div>
          <p>Get up to 40% off on all products. Limited time offer!</p>
          <small>Published: Jun 1, 2026</small>
        </div>
        <div class="announcement-card">
          <div class="announcement-header">
            <h3>New Payment Methods Available</h3>
            <span class="announcement-status scheduled">Scheduled</span>
          </div>
          <p>We now accept UPI, Wallets, and EMI options for your convenience.</p>
          <small>Scheduled: Jun 10, 2026</small>
        </div>
      </div>
    `;
  }

  static renderReports() {
    const content = document.getElementById('admin-content');
    content.innerHTML = `
      <div class="section-header">
        <h2>Reports & Analytics</h2>
      </div>

      <div class="reports-grid">
        <div class="report-card">
          <h3>Sales Report</h3>
          <p>Monthly sales overview and trends</p>
          <button class="admin-btn-primary" onclick="AdminToast.info('Downloading report')">Download PDF</button>
        </div>
        <div class="report-card">
          <h3>Customer Report</h3>
          <p>Customer demographics and behavior</p>
          <button class="admin-btn-primary" onclick="AdminToast.info('Downloading report')">Download PDF</button>
        </div>
        <div class="report-card">
          <h3>Inventory Report</h3>
          <p>Stock levels and product performance</p>
          <button class="admin-btn-primary" onclick="AdminToast.info('Downloading report')">Download PDF</button>
        </div>
      </div>
    `;
  }

  static renderActivity() {
    const content = document.getElementById('admin-content');
    content.innerHTML = `
      <div class="section-header">
        <h2>Activity Logs</h2>
      </div>

      <div class="activity-timeline">
        <div class="activity-item">
          <div class="activity-dot"></div>
          <div class="activity-content">
            <strong>Order #ORD-2405 placed</strong>
            <p>Sarah Johnson ordered 3 items worth ₹2,450</p>
            <small>Jun 2, 2026 • 2:30 PM</small>
          </div>
        </div>
        <div class="activity-item">
          <div class="activity-dot"></div>
          <div class="activity-content">
            <strong>New vendor registered</strong>
            <p>Green Botanics added 5 new products</p>
            <small>Jun 1, 2026 • 11:00 AM</small>
          </div>
        </div>
        <div class="activity-item">
          <div class="activity-dot"></div>
          <div class="activity-content">
            <strong>Payment processed</strong>
            <p>₹12,500 credited to Pure Wellness Co</p>
            <small>May 31, 2026 • 9:15 AM</small>
          </div>
        </div>
      </div>
    `;
  }

  static renderSupport() {
    const content = document.getElementById('admin-content');
    content.innerHTML = `
      <div class="section-header">
        <h2>Support Tickets</h2>
      </div>

      <div class="data-table-card">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Ticket ID</th>
              <th>Customer</th>
              <th>Subject</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>#TKT-001</strong></td>
              <td>Sarah Johnson</td>
              <td>Order delivery issue</td>
              <td><span class="priority-badge high">High</span></td>
              <td><span class="status-badge warning">Open</span></td>
              <td><button class="admin-btn-ghost" onclick="AdminToast.info('View ticket')">View</button></td>
            </tr>
            <tr>
              <td><strong>#TKT-002</strong></td>
              <td>Rajesh Patel</td>
              <td>Product quality complaint</td>
              <td><span class="priority-badge medium">Medium</span></td>
              <td><span class="status-badge success">Resolved</span></td>
              <td><button class="admin-btn-ghost" onclick="AdminToast.info('View ticket')">View</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  static renderRoles() {
    const content = document.getElementById('admin-content');
    content.innerHTML = `
      <div class="section-header">
        <h2>Roles & Permissions</h2>
        <button class="admin-btn-primary" onclick="AdminToast.info('Create new role')">+ Create Role</button>
      </div>

      <div class="roles-grid">
        <div class="role-card">
          <h3>Super Admin</h3>
          <div class="role-users">2 users</div>
          <div class="role-permissions">
            <span class="permission-tag">All Access</span>
            <span class="permission-tag">View Reports</span>
            <span class="permission-tag">Manage Users</span>
          </div>
          <button class="admin-btn-ghost" onclick="AdminToast.info('Edit role')">Edit</button>
        </div>

        <div class="role-card">
          <h3>Vendor Manager</h3>
          <div class="role-users">1 user</div>
          <div class="role-permissions">
            <span class="permission-tag">View Vendors</span>
            <span class="permission-tag">View Orders</span>
            <span class="permission-tag">Manage Products</span>
          </div>
          <button class="admin-btn-ghost" onclick="AdminToast.info('Edit role')">Edit</button>
        </div>
      </div>
    `;
  }

  static renderSettings() {
    const content = document.getElementById('admin-content');
    content.innerHTML = `
      <div class="section-header">
        <h2>Settings</h2>
      </div>

      <div class="settings-container">
        <div class="settings-section">
          <h3>General Settings</h3>
          <form>
            <div class="form-group">
              <label>Site Name</label>
              <input type="text" value="Sunfara" class="admin-input"/>
            </div>
            <div class="form-group">
              <label>Site URL</label>
              <input type="text" value="https://sunfara.com" class="admin-input"/>
            </div>
            <div class="form-group">
              <label>Support Email</label>
              <input type="email" value="support@sunfara.com" class="admin-input"/>
            </div>
            <button type="button" class="admin-btn-primary" onclick="AdminToast.success('Settings saved')">Save Changes</button>
          </form>
        </div>

        <div class="settings-section">
          <h3>Commission Settings</h3>
          <form>
            <div class="form-group">
              <label>Default Commission Rate (%)</label>
              <input type="number" value="15" class="admin-input"/>
            </div>
            <div class="form-group">
              <label>Minimum Withdrawal Amount (₹)</label>
              <input type="number" value="500" class="admin-input"/>
            </div>
            <button type="button" class="admin-btn-primary" onclick="AdminToast.success('Settings saved')">Save Changes</button>
          </form>
        </div>

        <div class="settings-section">
          <h3>Appearance</h3>
          <form>
            <div class="form-group">
              <label>
                <input type="checkbox" checked/> Enable Dark Mode
              </label>
            </div>
            <button type="button" class="admin-btn-primary" onclick="AdminToast.success('Settings saved')">Save Changes</button>
          </form>
        </div>
      </div>
    `;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// INITIALIZE ON PAGE LOAD
// ─────────────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  Admin.init();
});
