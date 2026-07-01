/* Admin Layout */

const AdminLayout = {
  renderTopNav: function() {
    const topNav = document.getElementById('admin-topnav');
    topNav.innerHTML = `
      <div class="admin-topnav-left">
        <button class="admin-hamburger" onclick="AdminLayout.toggleSidebar()">☰</button>
        <a class="admin-topnav-logo" href="#/admin/dashboard">
          <span>⚙️</span>
          <span>Sunfara Admin</span>
        </a>
        <div class="admin-topnav-search">
          <input type="text" placeholder="Search..." id="admin-search" />
          <span class="admin-topnav-search-icon">🔍</span>
        </div>
      </div>
      <div class="admin-topnav-right">
        <button class="admin-topnav-btn" title="Help">?</button>
        <button class="admin-topnav-btn" onclick="AdminLayout.toggleDarkMode()">🌙</button>
        <button class="admin-topnav-btn">
          🔔
          ${AdminLayout.getNotificationCount() > 0 ? `<span class="admin-notification-badge">${AdminLayout.getNotificationCount()}</span>` : ''}
        </button>
        <div class="admin-profile-menu" onclick="AdminLayout.toggleProfileMenu()">
          <div class="admin-profile-avatar">${AdminStore.user?.avatar || 'A'}</div>
          <span>${AdminStore.user?.name.split(' ')[0] || 'Admin'}</span>
        </div>
      </div>
    `;
  },

  renderSidebar: function() {
    const sidebar = document.getElementById('admin-sidebar');
    let html = '<div class="admin-sidebar">';
    
    AdminConfig.sidebar.forEach(item => {
      if (item.submenu) {
        html += `
          <button class="admin-sidebar-item parent-item" onclick="AdminLayout.toggleSubmenu('${item.id}')">
            <span class="admin-sidebar-icon">${item.icon}</span>
            <span class="admin-sidebar-label">${item.label}</span>
            <span class="admin-sidebar-toggle">▼</span>
          </button>
          <div class="admin-sidebar-submenu" id="submenu-${item.id}">
            ${item.submenu.map(sub => `
              <a class="admin-sidebar-item" href="${sub.route}">
                <span class="admin-sidebar-icon">${sub.icon}</span>
                <span class="admin-sidebar-label">${sub.label}</span>
                ${sub.badge ? `<span class="admin-sidebar-badge">${sub.badge}</span>` : ''}
              </a>
            `).join('')}
          </div>
        `;
      } else {
        html += `
          <a class="admin-sidebar-item" href="${item.route}">
            <span class="admin-sidebar-icon">${item.icon}</span>
            <span class="admin-sidebar-label">${item.label}</span>
            ${item.badge ? `<span class="admin-sidebar-badge">${item.badge}</span>` : ''}
          </a>
        `;
      }
    });
    
    html += '</div>';
    sidebar.innerHTML = html;
    this.highlightActiveItem();
  },

  highlightActiveItem: function() {
    const route = AdminUtils.getCurrentRoute();
    document.querySelectorAll('.admin-sidebar-item').forEach(item => {
      const href = item.getAttribute('href');
      if (href && route.includes(href.replace('#', ''))) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  },

  toggleSubmenu: function(id) {
    const submenu = document.getElementById('submenu-' + id);
    if (submenu) {
      submenu.classList.toggle('open');
      const btn = submenu.previousElementSibling;
      if (btn) btn.classList.toggle('open');
    }
  },

  toggleSidebar: function() {
    const sidebar = document.getElementById('admin-sidebar');
    const overlay = document.getElementById('admin-sidebar-overlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('visible');
  },

  toggleDarkMode: function() {
    const body = document.body;
    body.classList.toggle('admin-dark-mode');
    AdminUtils.setItem('dark-mode', body.classList.contains('admin-dark-mode'));
  },

  toggleProfileMenu: function() {
    AdminToast.info('Profile menu coming soon!');
  },

  getNotificationCount: function() {
    const vendors = AdminStore.getVendors();
    const products = AdminStore.getProducts();
    const pending = vendors.filter(v => v.status === 'pending').length + 
                   products.filter(p => p.status === 'pending').length;
    return pending;
  },

  renderBreadcrumb: function(items = []) {
    const breadcrumb = document.getElementById('admin-breadcrumb');
    if (items.length === 0) {
      breadcrumb.innerHTML = '';
      return;
    }
    breadcrumb.innerHTML = items.map((item, i) => 
      i === items.length - 1
        ? `<span class="breadcrumb-current">${item.label}</span>`
        : `<a href="${item.route}">${item.label}</a><span class="breadcrumb-sep">/</span>`
    ).join('');
  },

  init: function() {
    this.renderTopNav();
    this.renderSidebar();
    const isDark = AdminUtils.getItem('dark-mode', false);
    if (isDark) {
      document.body.classList.add('admin-dark-mode');
    }
  }
};
