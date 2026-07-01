/* API Client for Frontend Integration with Firebase Backend */

const AdminAPI = {
  baseURL: "http://localhost:5000/api",
  token: null,

  // ==================== INITIALIZATION ====================

  init: function(token) {
    this.token = token || AdminUtils.getItem("authToken");
  },

  // ==================== VENDOR ENDPOINTS ====================

  async getVendors() {
    return this.get("/vendors");
  },

  async getVendorById(id) {
    return this.get(`/vendors/${id}`);
  },

  async createVendor(data) {
    return this.post("/vendors", data);
  },

  async updateVendor(id, data) {
    return this.put(`/vendors/${id}`, data);
  },

  async deleteVendor(id) {
    return this.delete(`/vendors/${id}`);
  },

  // ==================== PRODUCT ENDPOINTS ====================

  async getProducts() {
    return this.get("/products");
  },

  async createProduct(data) {
    return this.post("/products", data);
  },

  async updateProduct(id, data) {
    return this.put(`/products/${id}`, data);
  },

  async deleteProduct(id) {
    return this.delete(`/products/${id}`);
  },

  // ==================== ORDER ENDPOINTS ====================

  async getOrders() {
    return this.get("/orders");
  },

  async getOrderById(id) {
    return this.get(`/orders/${id}`);
  },

  async createOrder(data) {
    return this.post("/orders", data);
  },

  async updateOrderStatus(id, status) {
    return this.put(`/orders/${id}/status`, { status });
  },

  // ==================== CUSTOMER ENDPOINTS ====================

  async getCustomers() {
    return this.get("/customers");
  },

  async createCustomer(data) {
    return this.post("/customers", data);
  },

  // ==================== COMMISSION ENDPOINTS ====================

  async getCommissions() {
    return this.get("/commissions");
  },

  async createCommission(data) {
    return this.post("/commissions", data);
  },

  // ==================== WITHDRAWAL ENDPOINTS ====================

  async getWithdrawals() {
    return this.get("/withdrawals");
  },

  async createWithdrawal(data) {
    return this.post("/withdrawals", data);
  },

  async approveWithdrawal(id) {
    return this.put(`/withdrawals/${id}/approve`, {});
  },

  // ==================== ANALYTICS ENDPOINTS ====================

  async getDashboardStats() {
    return this.get("/analytics/dashboard");
  },

  // ==================== HELPER METHODS ====================

  async get(endpoint) {
    return this.request(endpoint, "GET");
  },

  async post(endpoint, data) {
    return this.request(endpoint, "POST", data);
  },

  async put(endpoint, data) {
    return this.request(endpoint, "PUT", data);
  },

  async delete(endpoint) {
    return this.request(endpoint, "DELETE");
  },

  async request(endpoint, method = "GET", data = null) {
    try {
      const options = {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(this.token && { "Authorization": `Bearer ${this.token}` })
        }
      };

      if (data) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(this.baseURL + endpoint, options);

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("API Error:", error);
      AdminToast.error("API Error: " + error.message);
      throw error;
    }
  },

  // ==================== FALLBACK (Use localStorage when API unavailable) ====================

  async getFallbackVendors() {
    return AdminStore.getVendors();
  },

  async getFallbackProducts() {
    return AdminStore.getProducts();
  },

  async getFallbackOrders() {
    return AdminStore.getOrders();
  },

  async getFallbackCustomers() {
    return AdminStore.getCustomers();
  }
};

// Auto-initialize API client on page load
if (typeof AdminAPI !== "undefined") {
  AdminAPI.init();
}
