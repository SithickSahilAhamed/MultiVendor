/* Admin Data Store — with Firebase Auth + API integration
   CAT-003: demoVendors/Products/Orders/Customers are NEVER used as live
   data in production. Localhost may opt into demos for UI work. */

const AdminStore = {
  user: null,
  isLoggedIn: false,
  lastError: null,
  _cache: {
    vendors: [],
    products: [],
    orders: [],
    customers: []
  },

  // ==================== ENV / DEMO GATE (CAT-003) ====================

  /* Production hostnames never render demo entities as live KPIs/lists.
     Opt-in only on localhost, or via explicit window.SUNFARA_ALLOW_ADMIN_DEMO. */
  allowDemoFallbacks: function() {
    if (typeof window !== 'undefined' && window.SUNFARA_ALLOW_ADMIN_DEMO === true) return true;
    const host = (typeof location !== 'undefined' && location.hostname) ? location.hostname : '';
    return host === 'localhost' || host === '127.0.0.1';
  },

  isProductionAdmin: function() {
    return !this.allowDemoFallbacks();
  },

  // ==================== AUTH ====================

  login: async function(email, password) {
    try {
      // Firebase Auth sign-in
      const { signInWithEmailAndPassword, getAuth } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js");
      const { initializeApp, getApps } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js");

      const firebaseConfig = {
        apiKey: "AIzaSyBN-0IvpsqfHULbddiauMFz9Dh3iL5aXw0",
        authDomain: "sunfara-500b0.firebaseapp.com",
        projectId: "sunfara-500b0",
        storageBucket: "sunfara-500b0.firebasestorage.app",
        messagingSenderId: "678617069984",
        appId: "1:678617069984:web:c807a635452f3d1f6c4cc5"
      };

      const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
      const auth = getAuth(app);
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const token = await credential.user.getIdToken();

      this.user = {
        email: credential.user.email,
        name: credential.user.displayName || email.split("@")[0],
        avatar: (credential.user.displayName || email)[0].toUpperCase(),
        uid: credential.user.uid,
        loginTime: new Date()
      };
      this.isLoggedIn = true;

      AdminUtils.setItem("user", this.user);
      AdminAPI.setToken(token);

      // Refresh token every 55 minutes
      setInterval(async () => {
        try {
          const fresh = await credential.user.getIdToken(true);
          AdminAPI.setToken(fresh);
        } catch(e) { console.warn("Token refresh failed", e); }
      }, 55 * 60 * 1000);

      return true;
    } catch (firebaseError) {
      throw new Error(firebaseError.code === "auth/invalid-credential"
        ? "Invalid email or password"
        : firebaseError.message);
    }
  },

  logout: function() {
    this.user = null;
    this.isLoggedIn = false;
    AdminUtils.removeItem("user");
    AdminUtils.removeItem("authToken");
    window.location.hash = "#/admin/login";
    window.location.reload();
  },

  loadStoredUser: function() {
    const stored = AdminUtils.getItem("user");
    if (stored) {
      this.user = stored;
      this.isLoggedIn = true;
      AdminAPI.init();
    }
  },

  // ==================== DATA — API first; demo only when allowDemoFallbacks ====================

  _onApiError: function(err, demoFn) {
    this.lastError = err?.message || String(err);
    if (this.allowDemoFallbacks()) return demoFn();
    return [];
  },

  async fetchVendors() {
    try {
      const rows = await AdminAPI.getVendors();
      this._cache.vendors = Array.isArray(rows) ? rows : [];
      this.lastError = null;
      return this._cache.vendors;
    } catch (err) {
      return this._onApiError(err, () => this.demoVendors());
    }
  },

  async fetchProducts() {
    try {
      const rows = await AdminAPI.getProducts();
      this._cache.products = Array.isArray(rows) ? rows : [];
      this.lastError = null;
      return this._cache.products;
    } catch (err) {
      return this._onApiError(err, () => this.demoProducts());
    }
  },

  async fetchOrders() {
    try {
      const rows = await AdminAPI.getOrders();
      this._cache.orders = Array.isArray(rows) ? rows : [];
      this.lastError = null;
      return this._cache.orders;
    } catch (err) {
      return this._onApiError(err, () => this.demoOrders());
    }
  },

  async fetchCustomers() {
    try {
      const rows = await AdminAPI.getCustomers();
      this._cache.customers = Array.isArray(rows) ? rows : [];
      this.lastError = null;
      return this._cache.customers;
    } catch (err) {
      return this._onApiError(err, () => this.demoCustomers());
    }
  },

  async fetchCommissions() {
    try { return await AdminAPI.getCommissions(); }
    catch (err) { this.lastError = err?.message || String(err); return []; }
  },

  async fetchWithdrawals() {
    try { return await AdminAPI.getWithdrawals(); }
    catch (err) { this.lastError = err?.message || String(err); return []; }
  },

  async fetchReturns() {
    try { return await AdminAPI.getReturns(); }
    catch (err) { this.lastError = err?.message || String(err); return []; }
  },

  async fetchRefunds() {
    try { return await AdminAPI.getRefunds(); }
    catch (err) { this.lastError = err?.message || String(err); return []; }
  },

  /* Sync readers: cache only in production; demos only when allowDemoFallbacks */
  getVendors() {
    if (this._cache.vendors.length) return this._cache.vendors;
    return this.allowDemoFallbacks() ? this.demoVendors() : [];
  },
  getProducts() {
    if (this._cache.products.length) return this._cache.products;
    return this.allowDemoFallbacks() ? this.demoProducts() : [];
  },
  getOrders() {
    if (this._cache.orders.length) return this._cache.orders;
    return this.allowDemoFallbacks() ? this.demoOrders() : [];
  },
  getCustomers() {
    if (this._cache.customers.length) return this._cache.customers;
    return this.allowDemoFallbacks() ? this.demoCustomers() : [];
  },

  getVendorById(id) {
    return this.getVendors().find(v => v.id === id) || null;
  },
  getOrderById(id) {
    return this.getOrders().find(o => o.id === id) || null;
  },

  updateVendor(id, data) {
    AdminAPI.updateVendor(id, data).catch((err) => { this.lastError = err?.message || String(err); });
    const vendor = this.getVendorById(id);
    return vendor ? Object.assign({}, vendor, data) : null;
  },

  updateProduct(id, data) {
    AdminAPI.updateProduct(id, data).catch((err) => { this.lastError = err?.message || String(err); });
    const product = this.getProducts().find(p => p.id === id);
    return product ? Object.assign({}, product, data) : null;
  },

  // ==================== DEMO DATA (local / explicit opt-in only) ====================

  demoVendors: () => [
    { id: "vendor-001", name: "Haaniya", email: "info@haaniya.com", phone: "+91-9876543210", status: "active", products: 142, revenue: 4520000, rating: 4.8, reviews: 245, verified: true, kycStatus: "completed", commission: 8, logo: "🧴" },
    { id: "vendor-002", name: "Green Botanics", email: "contact@greenbotanics.com", phone: "+91-9876543211", status: "active", products: 89, revenue: 2850000, rating: 4.6, reviews: 178, verified: true, kycStatus: "completed", commission: 10, logo: "🌿" },
    { id: "vendor-003", name: "Pure Wellness", email: "hello@purewellness.com", phone: "+91-9876543212", status: "pending", products: 56, revenue: 0, rating: 0, reviews: 0, verified: false, kycStatus: "pending", commission: 8, logo: "💚" }
  ],

  demoProducts: () => [
    { id: "prod-001", name: "Neem Face Wash", vendor: "vendor-001", vendorName: "Haaniya", status: "active", category: "Skincare", price: 399, stock: 245, sales: 1250, rating: 4.7, image: "🧴" },
    { id: "prod-002", name: "Hair Oil Premium", vendor: "vendor-001", vendorName: "Haaniya", status: "active", category: "Haircare", price: 599, stock: 180, sales: 890, rating: 4.8, image: "🧴" },
    { id: "prod-003", name: "Ashwagandha Powder", vendor: "vendor-002", vendorName: "Green Botanics", status: "active", category: "Wellness", price: 449, stock: 156, sales: 567, rating: 4.5, image: "🌿" },
    { id: "prod-004", name: "Organic Vitamin C", vendor: "vendor-002", vendorName: "Green Botanics", status: "pending", category: "Supplements", price: 349, stock: 89, sales: 0, rating: 0, image: "🌿" }
  ],

  demoOrders: () => [
    { id: "ORD-001", customer: "Priya M.", email: "priya@email.com", amount: 2450, status: "completed", date: new Date().toISOString(), items: 2, paymentMethod: "Credit Card" },
    { id: "ORD-002", customer: "Rajesh K.", email: "rajesh@email.com", amount: 1800, status: "completed", date: new Date().toISOString(), items: 1, paymentMethod: "Debit Card" },
    { id: "ORD-003", customer: "Ananya P.", email: "ananya@email.com", amount: 3200, status: "processing", date: new Date().toISOString(), items: 3, paymentMethod: "UPI" }
  ],

  demoCustomers: () => [
    { id: "cust-001", name: "Priya M.", email: "priya@email.com", phone: "+91-9000000001", orders: 12, spent: 24500 },
    { id: "cust-002", name: "Rajesh K.", email: "rajesh@email.com", phone: "+91-9000000002", orders: 8, spent: 18900 },
    { id: "cust-003", name: "Ananya P.", email: "ananya@email.com", phone: "+91-9000000003", orders: 15, spent: 31200 },
    { id: "cust-004", name: "Vikram S.", email: "vikram@email.com", phone: "+91-9000000004", orders: 5, spent: 9800 },
    { id: "cust-005", name: "Neha D.", email: "neha@email.com", phone: "+91-9000000005", orders: 20, spent: 42500 }
  ]
};

AdminStore.loadStoredUser();
