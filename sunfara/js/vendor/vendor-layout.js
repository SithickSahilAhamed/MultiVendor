/* Vendor Portal Layout */

const VendorLayout = {
  renderTopNav() {
    const topNav = document.getElementById('vendor-topnav');
    if (!topNav) return;
    topNav.innerHTML = `
      <div class="admin-topnav-left">
        <button class="admin-hamburger" onclick="VendorLayout.toggleSidebar()">☰</button>
        <a class="admin-topnav-logo" href="#/vendor/dashboard"><span>🌿</span><span>Sunfara Seller</span></a>
      </div>
      <div class="admin-topnav-right">
        <div id="vendor-notif-bell-wrap" style="position:relative">
          <button class="admin-topnav-btn" onclick="event.stopPropagation();VendorNotifications.toggle()" aria-label="Notifications">
            🔔<span class="admin-notification-badge" id="vendor-notif-badge" style="display:none">0</span>
          </button>
          <div class="notif-panel" id="vendor-notif-panel"></div>
        </div>
        <div class="admin-profile-menu" onclick="VendorStore.logout()" title="Logout">
          <div class="admin-profile-avatar">${(VendorStore.user?.name || 'V')[0].toUpperCase()}</div>
          <span>${VendorStore.user?.name?.split(' ')[0] || 'Vendor'}</span>
        </div>
      </div>`;
    VendorNotifications.init();
  },

  renderSidebar() {
    const sidebar = document.getElementById('vendor-sidebar');
    if (!sidebar) return;
    let html = '<div class="admin-sidebar">';
    VendorConfig.sidebar.forEach(item => {
      html += `<a class="admin-sidebar-item" href="${item.route}"><span class="admin-sidebar-icon">${item.icon}</span><span class="admin-sidebar-label">${item.label}</span></a>`;
    });
    html += '</div>';
    sidebar.innerHTML = html;
    this.highlightActiveItem();
  },

  highlightActiveItem() {
    const hash = window.location.hash || '#/vendor/dashboard';
    document.querySelectorAll('.admin-sidebar-item').forEach(item => {
      const href = item.getAttribute('href');
      item.classList.toggle('active', href && hash.startsWith(href));
    });
  },

  toggleSidebar() {
    document.getElementById('vendor-sidebar')?.classList.toggle('open');
    document.getElementById('vendor-sidebar-overlay')?.classList.toggle('visible');
  },

  renderBreadcrumb(items = []) {
    const el = document.getElementById('vendor-breadcrumb');
    if (!el) return;
    el.innerHTML = items.map((item, i) =>
      i === items.length - 1 ? `<span class="breadcrumb-current">${item.label}</span>` : `<a href="${item.route}">${item.label}</a><span class="breadcrumb-sep">/</span>`
    ).join('');
  },

  /* Banner shown across every page while status !== 'active' - a vendor can
     still explore the dashboard and prep products, but can't get lost about
     why nothing feels "live" yet. */
  renderApprovalBanner() {
    const status = VendorStore.profile?.status;
    if (status === 'active') return '';
    if (status === 'rejected') return `<div class="admin-page-header" style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin-bottom:20px;color:#991b1b">🔴 Your seller application was not approved. Contact support for details.</div>`;
    return `<div class="admin-page-header" style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin-bottom:20px;color:#92400e">🟡 Your seller account is pending admin approval. You can still add products now - they'll go live once you're approved.</div>`;
  },

  init() {
    this.renderTopNav();
    this.renderSidebar();
  }
};
