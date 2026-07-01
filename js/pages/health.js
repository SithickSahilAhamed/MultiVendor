const HealthPage = {
  init() {
    const hash = window.location.hash;
    if (hash === '#/health') {
      this.renderCategories();
    } else if (hash.startsWith('#/health/')) {
      const healthId = hash.split('/')[2];
      this.renderHealthCategory(healthId);
    }
  },

  renderCategories() {
    const main = document.getElementById('main-content');
    const healthCategories = Data.healthCategories;

    main.innerHTML = `
      <div class="page-health">
        <!-- Hero Section -->
        <section class="health-hero">
          <div class="health-hero-content">
            <h1>Health & Wellness</h1>
            <p>Shop natural solutions for specific health concerns</p>
          </div>
        </section>

        <!-- Health Categories Grid -->
        <section class="section health-categories">
          <div class="container">
            <h2>Browse by Health Concern</h2>
            <div class="health-grid">
              ${healthCategories.map(h => this.healthCategoryCard(h)).join('')}
            </div>
          </div>
        </section>

        <!-- Popular Solutions -->
        <section class="section popular-health">
          <div class="container">
            <h2>Popular Health Solutions</h2>
            <p class="section-subtitle">Trusted by thousands for natural wellness</p>
            <div class="products-grid">
              ${Data.getFeaturedProducts().slice(0, 8).map(p => this.productCard(p)).join('')}
            </div>
          </div>
        </section>
      </div>
    `;
  },

  healthCategoryCard(healthCategory) {
    const productCount = Data.getProductsByHealth(healthCategory.id).length;
    return `
      <div class="health-category-card" onclick="HealthPage.viewCategory('${healthCategory.id}')">
        <div class="health-icon">${healthCategory.icon}</div>
        <h3>${healthCategory.name}</h3>
        <p>${healthCategory.description}</p>
        <span class="product-count">${productCount} products</span>
        <button class="btn-health" onclick="HealthPage.viewCategory('${healthCategory.id}')">Browse</button>
      </div>
    `;
  },

  renderHealthCategory(healthId) {
    const main = document.getElementById('main-content');
    const healthCategory = Data.getHealthCategoryById(healthId);
    if (!healthCategory) {
      main.innerHTML = '<p>Health category not found</p>';
      return;
    }

    const products = Data.getProductsByHealth(healthId);

    main.innerHTML = `
      <div class="page-health-category">
        <!-- Breadcrumb -->
        <div class="breadcrumb">
          <a href="#/health">Health & Wellness</a> › ${healthCategory.name}
        </div>

        <!-- Category Header -->
        <section class="category-header">
          <div class="category-icon">${healthCategory.icon}</div>
          <h1>${healthCategory.name}</h1>
          <p>${healthCategory.description}</p>
          <p class="product-count-large">${products.length} products available</p>
        </section>

        <!-- Filters -->
        <section class="category-filters">
          <div class="filter-group">
            <input type="text" id="health-search" placeholder="Search products..." class="filter-input">
            <select id="health-sort" class="filter-select">
              <option value="">Sort by: Relevance</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating">Top Rated</option>
              <option value="discount">Biggest Discount</option>
            </select>
          </div>
        </section>

        <!-- Products -->
        <section class="health-products">
          <div class="products-grid" id="health-products">
            ${products.length > 0 
              ? products.map(p => this.productCard(p)).join('')
              : '<p class="no-products">No products found for this category</p>'
            }
          </div>
        </section>
      </div>
    `;

    this.attachHealthEventListeners();
  },

  productCard(product) {
    return `
      <div class="product-card">
        <div class="product-image" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);"></div>
        <div class="product-badge" style="background: #e74c3c;">-${product.discount}%</div>
        <div class="product-content">
          <h3>${product.name}</h3>
          <p class="product-brand">${product.brand}</p>
          <div class="product-rating">
            <span class="stars">⭐ ${product.rating}</span>
            <span class="reviews">(${product.reviewCount})</span>
          </div>
          <div class="product-pricing">
            <span class="price">₹${product.price}</span>
            <span class="mrp">₹${product.mrp}</span>
          </div>
          <button class="btn-add-cart" onclick="Store.addToCart(${JSON.stringify({id: product.id, name: product.name, price: product.price, brand: product.brand})})">Add to Cart</button>
        </div>
      </div>
    `;
  },

  attachHealthEventListeners() {
    const searchInput = document.getElementById('health-search');
    const sortSelect = document.getElementById('health-sort');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => this.filterHealthProducts(e.target.value));
    }

    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => this.sortHealthProducts(e.target.value));
    }
  },

  filterHealthProducts(query) {
    const cards = document.querySelectorAll('.product-card');
    const q = query.toLowerCase();
    cards.forEach(card => {
      const text = card.textContent.toLowerCase();
      card.style.display = text.includes(q) ? 'block' : 'none';
    });
  },

  sortHealthProducts(sortBy) {
    const healthId = window.location.hash.split('/')[2];
    const products = Data.getProductsByHealth(healthId);

    switch (sortBy) {
      case 'price-asc':
        products.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        products.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        products.sort((a, b) => b.rating - a.rating);
        break;
      case 'discount':
        products.sort((a, b) => b.discount - a.discount);
        break;
    }

    const productsGrid = document.getElementById('health-products');
    if (productsGrid) {
      productsGrid.innerHTML = products.map(p => this.productCard(p)).join('');
    }
  },

  viewCategory(healthId) {
    window.location.hash = `#/health/${healthId}`;
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => HealthPage.init());
} else {
  HealthPage.init();
}
