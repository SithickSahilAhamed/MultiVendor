/* API Client — connects to the live .NET backend (Railway) or local dev backend */

const AdminAPI = {
  baseURL: (location.hostname === "localhost" || location.hostname === "127.0.0.1")
    ? "http://localhost:5187/api"
    : "https://web-production-97b5f.up.railway.app/api",
  token: null,

  init: function(token) {
    this.token = token || AdminUtils.getItem("authToken");
  },

  setToken: function(token) {
    this.token = token;
    AdminUtils.setItem("authToken", token);
  },

  // ==================== ADMIN COLLECTION CRUD ====================

  async list(collection, limit = 100) {
    return this.get(`/admin/${collection}?limit=${limit}`);
  },

  async getOne(collection, id) {
    return this.get(`/admin/${collection}/${id}`);
  },

  async create(collection, data) {
    return this.post(`/admin/${collection}`, data);
  },

  async update(collection, id, data) {
    return this.put(`/admin/${collection}/${id}`, data);
  },

  async remove(collection, id) {
    return this.delete(`/admin/${collection}/${id}`);
  },

  // ==================== VENDOR ENDPOINTS ====================

  async getVendors()            { return this.list("vendors"); },
  async getVendorById(id)       { return this.getOne("vendors", id); },
  async createVendor(data)      { return this.create("vendors", data); },
  async updateVendor(id, data)  { return this.update("vendors", id, data); },
  async deleteVendor(id)        { return this.remove("vendors", id); },
  async approveVendor(id)       { return this.update("vendors", id, { status: "active" }); },
  async rejectVendor(id)        { return this.update("vendors", id, { status: "rejected" }); },

  // ==================== PRODUCT ENDPOINTS ====================

  async getProducts()              { return this.list("products"); },
  async createProduct(data)        { return this.create("products", data); },
  async updateProduct(id, data)    { return this.update("products", id, data); },
  async deleteProduct(id)          { return this.remove("products", id); },
  async approveProduct(id)         { return this.update("products", id, { status: "active" }); },

  // ==================== ORDER ENDPOINTS ====================

  async getOrders()                { return this.list("orders", 500); },
  async getOrderById(id)           { return this.getOne("orders", id); },

  // ==================== CUSTOMER ENDPOINTS ====================

  async getCustomers()             { return this.list("customers"); },

  // ==================== FINANCE ENDPOINTS ====================

  async getCommissions()           { return this.list("commissions"); },
  async getWithdrawals()           { return this.list("withdrawals"); },
  async approveWithdrawal(id)      { return this.post(`/admin/withdrawals/${id}/approve`, {}); },
  async getRevenue()               { return this.get('/admin/revenue'); },
  async getTransactions()          { return this.list("transactions", 500); },
  async getVendorOrders()          { return this.list("vendor_orders", 500); },
  async updateOrderStatus(id, status, trackingNumber, carrier) { return this.put(`/admin/vendor-orders/${id}/status`, { status, trackingNumber, carrier }); },

  // ==================== REVIEW ENDPOINTS ====================

  async getReviews()               { return this.list("reviews"); },
  async approveReview(id)          { return this.post(`/admin/reviews/${id}/approve`, {}); },
  async rejectReview(id)           { return this.post(`/admin/reviews/${id}/reject`, {}); },

  // ==================== HTTP HELPERS ====================

  async get(endpoint)              { return this.request(endpoint, "GET"); },
  async post(endpoint, data)       { return this.request(endpoint, "POST", data); },
  async put(endpoint, data)        { return this.request(endpoint, "PUT", data); },
  async delete(endpoint)           { return this.request(endpoint, "DELETE"); },

  async request(endpoint, method = "GET", data = null) {
    try {
      const headers = { "Content-Type": "application/json" };
      if (this.token) headers["Authorization"] = `Bearer ${this.token}`;

      const options = { method, headers };
      if (data) options.body = JSON.stringify(data);

      const response = await fetch(this.baseURL + endpoint, options);

      if (response.status === 401) {
        AdminStore.logout();
        throw new Error("Session expired. Please log in again.");
      }
      if (!response.ok) {
        throw new Error(`API Error ${response.status}: ${response.statusText}`);
      }
      if (response.status === 204 || response.headers.get("content-length") === "0") return null;
      return await response.json();
    } catch (error) {
      console.error("AdminAPI Error:", error);
      if (typeof AdminToast !== "undefined") AdminToast.error(error.message);
      throw error;
    }
  }
};
