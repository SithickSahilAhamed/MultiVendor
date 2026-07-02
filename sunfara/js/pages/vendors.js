const VendorsPage = {
  init() {
    if (window.location.hash === '#/vendors') {
      this.render();
    }
  },

  render() {
    const main = document.getElementById('main-content');
    const vendors = Data.vendors;
    const featuredVendors = Data.getFeaturedVendors();

    main.innerHTML = `
      <div class="page-vendors">
        <!-- Hero Section -->
        <section class="vendors-hero">
          <div class="vendors-hero-content">
            <h1>Sunfara Marketplace</h1>
            <p>Discover premium organic & wellness brands trusted by thousands</p>
            <div class="vendor-search">
              <input type="text" id="vendor-search" placeholder="Search vendors...">
            </div>
          </div>
        </section>

        <!-- Featured Vendors -->
        <section class="section featured-vendors">
          <div class="container">
            <h2>Featured Vendors</h2>
            <div class="vendors-grid">
              ${featuredVendors.map(vendor => this.vendorCard(vendor)).join('')}
            </div>
          </div>
        </section>

        <!-- All Vendors -->
        <section class="section all-vendors">
          <div class="container">
            <h2>All Vendors</h2>
            <div class="vendor-filters">
              <select id="vendor-sort">
                <option value="">Sort by: Latest</option>
                <option value="rating">Top Rated</option>
                <option value="products">Most Products</option>
                <option value="reviews">Most Reviews</option>
              </select>
            </div>
            <div class="vendors-list" id="vendors-list">
              ${vendors.map(vendor => this.vendorCard(vendor)).join('')}
            </div>
          </div>
        </section>
      </div>
    `;

    this.attachEventListeners();
  },

  vendorCard(vendor) {
    return `
      <div class="vendor-card" onclick="VendorsPage.viewVendor('${vendor.id}')">
        <div class="vendor-card-image" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);"></div>
        <div class="vendor-card-content">
          <h3>${vendor.name}</h3>
          <p class="vendor-tagline">${vendor.tagline}</p>
          <div class="vendor-meta">
            <span class="rating">⭐ ${vendor.rating}</span>
            <span class="reviews">${vendor.reviewCount} reviews</span>
            <span class="products">${vendor.productsCount} products</span>
          </div>
          <div class="vendor-certifications">
            ${vendor.certifications.slice(0, 2).map(cert => `<span class="cert-badge">${cert}</span>`).join('')}
          </div>
          <button class="btn-vendor" onclick="VendorsPage.viewVendor('${vendor.id}')">View Store</button>
        </div>
      </div>
    `;
  },

  viewVendor(vendorId) {
    window.location.hash = `#/vendor/${vendorId}`;
  },

  attachEventListeners() {
    const searchInput = document.getElementById('vendor-search');
    const sortSelect = document.getElementById('vendor-sort');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => this.filterVendors(e.target.value));
    }

    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => this.sortVendors(e.target.value));
    }
  },

  filterVendors(query) {
    const cards = document.querySelectorAll('.vendor-card');
    const q = query.toLowerCase();
    cards.forEach(card => {
      const text = card.textContent.toLowerCase();
      card.style.display = text.includes(q) ? 'block' : 'none';
    });
  },

  sortVendors(sortBy) {
    const vendors = [...Data.vendors];
    switch (sortBy) {
      case 'rating':
        vendors.sort((a, b) => b.rating - a.rating);
        break;
      case 'products':
        vendors.sort((a, b) => b.productsCount - a.productsCount);
        break;
      case 'reviews':
        vendors.sort((a, b) => b.reviewCount - a.reviewCount);
        break;
    }
    const vendorsList = document.getElementById('vendors-list');
    if (vendorsList) {
      vendorsList.innerHTML = vendors.map(v => this.vendorCard(v)).join('');
    }
  }
};

// Auto-init if page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => VendorsPage.init());
} else {
  VendorsPage.init();
}
