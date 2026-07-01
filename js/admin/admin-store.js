/* Admin Data Store */

const AdminStore = {
  user: null,
  isLoggedIn: false,
  
  login: function(email, password) {
    if (email === AdminConfig.demoAdmin.email && password === AdminConfig.demoAdmin.password) {
      this.user = {
        email: AdminConfig.demoAdmin.email,
        name: AdminConfig.demoAdmin.name,
        avatar: AdminConfig.demoAdmin.avatar,
        loginTime: new Date()
      };
      this.isLoggedIn = true;
      AdminUtils.setItem('user', this.user);
      return true;
    }
    return false;
  },

  logout: function() {
    this.user = null;
    this.isLoggedIn = false;
    AdminUtils.removeItem('user');
    window.location.hash = '#/admin/login';
  },

  loadStoredUser: function() {
    const stored = AdminUtils.getItem('user');
    if (stored) {
      this.user = stored;
      this.isLoggedIn = true;
    }
  },

  getVendors: function() {
    const vendors = AdminUtils.getItem('vendors', this.generateDemoVendors());
    if (!AdminUtils.getItem('vendors')) {
      AdminUtils.setItem('vendors', vendors);
    }
    return vendors;
  },

  getVendorById: function(id) {
    return this.getVendors().find(v => v.id === id);
  },

  updateVendor: function(id, updates) {
    const vendors = this.getVendors();
    const vendor = vendors.find(v => v.id === id);
    if (vendor) {
      Object.assign(vendor, updates);
      AdminUtils.setItem('vendors', vendors);
    }
    return vendor;
  },

  getProducts: function() {
    const products = AdminUtils.getItem('products', this.generateDemoProducts());
    if (!AdminUtils.getItem('products')) {
      AdminUtils.setItem('products', products);
    }
    return products;
  },

  getOrders: function() {
    const orders = AdminUtils.getItem('orders', this.generateDemoOrders());
    if (!AdminUtils.getItem('orders')) {
      AdminUtils.setItem('orders', orders);
    }
    return orders;
  },

  getCustomers: function() {
    const customers = AdminUtils.getItem('customers', this.generateDemoCustomers());
    if (!AdminUtils.getItem('customers')) {
      AdminUtils.setItem('customers', customers);
    }
    return customers;
  },

  generateDemoVendors: () => [
    { id: 'vendor-001', name: 'Haaniya', email: 'info@haaniya.com', phone: '+91-9876543210', status: 'active', products: 142, revenue: 4520000, rating: 4.8, reviews: 245, verified: true, kycStatus: 'completed', commission: 8, logo: '🧴' },
    { id: 'vendor-002', name: 'Green Botanics', email: 'contact@greenbotanics.com', phone: '+91-9876543211', status: 'active', products: 89, revenue: 2850000, rating: 4.6, reviews: 178, verified: true, kycStatus: 'completed', commission: 10, logo: '🌿' },
    { id: 'vendor-003', name: 'Pure Wellness', email: 'hello@purewellness.com', phone: '+91-9876543212', status: 'pending', products: 56, revenue: 0, rating: 0, reviews: 0, verified: false, kycStatus: 'pending', commission: 8, logo: '💚' }
  ],

  generateDemoProducts: () => [
    { id: 'prod-001', name: 'Neem Face Wash', vendor: 'vendor-001', vendorName: 'Haaniya', status: 'active', category: 'Skincare', price: 399, stock: 245, sales: 1250, rating: 4.7, image: '🧴' },
    { id: 'prod-002', name: 'Hair Oil Premium', vendor: 'vendor-001', vendorName: 'Haaniya', status: 'active', category: 'Haircare', price: 599, stock: 180, sales: 890, rating: 4.8, image: '🧴' },
    { id: 'prod-003', name: 'Ashwagandha Powder', vendor: 'vendor-002', vendorName: 'Green Botanics', status: 'active', category: 'Wellness', price: 449, stock: 156, sales: 567, rating: 4.5, image: '🌿' },
    { id: 'prod-004', name: 'Organic Vitamin C', vendor: 'vendor-002', vendorName: 'Green Botanics', status: 'pending', category: 'Supplements', price: 349, stock: 89, sales: 0, rating: 0, image: '🌿' }
  ],

  generateDemoOrders: () => [
    { id: 'ORD-001', customer: 'Priya M.', email: 'priya@email.com', amount: 2450, status: 'completed', date: new Date(), items: 2, paymentMethod: 'Credit Card' },
    { id: 'ORD-002', customer: 'Rajesh K.', email: 'rajesh@email.com', amount: 1800, status: 'completed', date: new Date(), items: 1, paymentMethod: 'Debit Card' },
    { id: 'ORD-003', customer: 'Ananya P.', email: 'ananya@email.com', amount: 3200, status: 'processing', date: new Date(), items: 3, paymentMethod: 'UPI' }
  ],

  generateDemoCustomers: () => [
    { id: 'cust-001', name: 'Priya M.', email: 'priya@email.com', phone: '+91-9000000001', orders: 12, spent: 24500 },
    { id: 'cust-002', name: 'Rajesh K.', email: 'rajesh@email.com', phone: '+91-9000000002', orders: 8, spent: 18900 },
    { id: 'cust-003', name: 'Ananya P.', email: 'ananya@email.com', phone: '+91-9000000003', orders: 15, spent: 31200 },
    { id: 'cust-004', name: 'Vikram S.', email: 'vikram@email.com', phone: '+91-9000000004', orders: 5, spent: 9800 },
    { id: 'cust-005', name: 'Neha D.', email: 'neha@email.com', phone: '+91-9000000005', orders: 20, spent: 42500 }
  ]
};

AdminStore.loadStoredUser();
