/* Admin Panel Configuration */

const AdminConfig = {
  version: '2026.1.0',
  appName: 'Sunfara Admin',
  
  // Demo data
  demoAdmin: {
    email: 'admin@sunfara.com',
    password: 'admin123',
    name: 'Admin User',
    avatar: 'A'
  },

  // Routes
  routes: {
    '/admin': 'dashboard',
    '/admin/dashboard': 'dashboard',
    '/admin/vendors': 'vendors',
    '/admin/vendors/:id': 'vendor-detail',
    '/admin/products': 'products',
    '/admin/orders': 'orders',
    '/admin/customers': 'customers',
    '/admin/commissions': 'commissions',
    '/admin/withdrawals': 'withdrawals',
    '/admin/reports': 'reports',
    '/admin/settings': 'settings',
  },

  // Sidebar menu
  sidebar: [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: '🏠',
      route: '/admin/dashboard',
      badge: null
    },
    {
      id: 'vendors',
      label: 'Vendors',
      icon: '👥',
      route: '/admin/vendors',
      badge: 'pending'
    },
    {
      id: 'products',
      label: 'Products',
      icon: '📦',
      route: '/admin/products',
      badge: 'pending'
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: '📋',
      route: '/admin/orders',
      badge: null
    },
    {
      id: 'customers',
      label: 'Customers',
      icon: '👤',
      route: '/admin/customers',
      badge: null
    },
    {
      id: 'finance',
      label: 'Finance',
      icon: '💰',
      submenu: [
        {
          id: 'commissions',
          label: 'Commissions',
          icon: '📊',
          route: '/admin/commissions',
          badge: null
        },
        {
          id: 'withdrawals',
          label: 'Withdrawals',
          icon: '💳',
          route: '/admin/withdrawals',
          badge: 3
        }
      ]
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: '📊',
      route: '/admin/reports',
      badge: null
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: '⚙️',
      route: '/admin/settings',
      badge: null
    }
  ],

  // Status colors
  statusColors: {
    active: 'admin-status-active',
    pending: 'admin-status-pending',
    rejected: 'admin-status-rejected',
    processing: 'admin-status-processing'
  },

  // Status labels
  statusLabels: {
    active: '🟢 Active',
    pending: '🟡 Pending',
    rejected: '🔴 Rejected',
    processing: '🔵 Processing'
  }
};

// Freeze config to prevent accidental mutations
Object.freeze(AdminConfig);
