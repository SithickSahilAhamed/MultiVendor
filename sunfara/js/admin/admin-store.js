/* Admin Data Store — with Firebase Auth + API integration */

const AdminStore = {
  user: null,
  isLoggedIn: false,

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
      console.warn("Firebase auth failed, trying demo:", firebaseError.message);

      // Demo fallback for local dev
      if (email === "admin@sunfara.com" && password === "admin123") {
        this.user = { email, name: "Admin User", avatar: "A", loginTime: new Date() };
        this.isLoggedIn = true;
        AdminUtils.setItem("user", this.user);
        return true;
      }
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

  // ==================== DATA — API first, demo fallback ====================

  async fetchVendors() {
    try { return await AdminAPI.getVendors(); }
    catch { return this.demoVendors(); }
  },

  async fetchProducts() {
    try { return await AdminAPI.getProducts(); }
    catch { return this.demoProducts(); }
  },

  async fetchOrders() {
    try { return await AdminAPI.getOrders(); }
    catch { return this.demoOrders(); }
  },

  async fetchCustomers() {
    try { return await AdminAPI.getCustomers(); }
    catch { return this.demoCustomers(); }
  },

  async fetchCommissions() {
    try { return await AdminAPI.getCommissions(); }
    catch { return []; }
  },

  async fetchWithdrawals() {
    try { return await AdminAPI.getWithdrawals(); }
    catch { return []; }
  },

  // Sync versions (return demo data — used for layout badges and fallback)
  getVendors()   { return this.demoVendors(); },
  getProducts()  { return this.demoProducts(); },
  getOrders()    { return this.demoOrders(); },
  getCustomers() { return this.demoCustomers(); },

  getVendorById(id)  { return this.demoVendors().find(v => v.id === id) || null; },
  getOrderById(id)   { return this.demoOrders().find(o => o.id === id) || null; },

  updateVendor(id, data) {
    // Async fire-and-forget for API; sync returns updated demo object
    AdminAPI.updateVendor(id, data).catch(() => {});
    const vendor = this.demoVendors().find(v => v.id === id);
    return vendor ? Object.assign({}, vendor, data) : null;
  },

  updateProduct(id, data) {
    AdminAPI.updateProduct(id, data).catch(() => {});
    const product = this.demoProducts().find(p => p.id === id);
    return product ? Object.assign({}, product, data) : null;
  },

  // ==================== DEMO DATA ====================

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
