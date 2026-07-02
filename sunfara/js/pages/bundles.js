const BundlesPage = {
  init() {
    if (window.location.hash === '#/bundles') {
      this.render();
    }
  },

  render() {
    const main = document.getElementById('main-content');
    const bundles = Data.bundles;
    const featuredBundles = Data.getFeaturedBundles();

    main.innerHTML = `
      <div class="page-bundles">
        <!-- Hero Section -->
        <section class="bundles-hero">
          <div class="bundles-hero-content">
            <h1>Combo Offers & Bundles</h1>
            <p>Save up to 33% with curated wellness bundles</p>
          </div>
        </section>

        <!-- Featured Bundles -->
        <section class="section featured-bundles">
          <div class="container">
            <h2>Trending Bundles</h2>
            <div class="bundles-grid">
              ${featuredBundles.map(bundle => this.bundleCard(bundle)).join('')}
            </div>
          </div>
        </section>

        <!-- All Bundles -->
        <section class="section all-bundles">
          <div class="container">
            <h2>All Bundles</h2>
            <div class="bundle-filters">
              <input type="text" id="bundle-search" placeholder="Search bundles..." class="filter-input">
              <select id="bundle-sort" class="filter-select">
                <option value="">Sort by: Popular</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating">Top Rated</option>
                <option value="discount">Biggest Discount</option>
              </select>
            </div>
            <div class="bundles-list" id="bundles-list">
              ${bundles.map(bundle => this.bundleCard(bundle)).join('')}
            </div>
          </div>
        </section>
      </div>
    `;

    this.attachEventListeners();
  },

  bundleCard(bundle) {
    const products = Data.getBundleProducts(bundle.id);
    return `
      <div class="bundle-card" data-price="${bundle.bundlePrice}" data-rating="${bundle.rating}" data-discount="${bundle.discount}">
        <div class="bundle-image" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);"></div>
        <div class="bundle-badge discount">Save ${bundle.discount}%</div>
        <div class="bundle-content">
          <h3>${bundle.name}</h3>
          <p class="bundle-desc">${bundle.description}</p>
          
          <div class="bundle-products">
            <p class="products-label">Includes:</p>
            <ul class="products-list">
              ${products.map(p => `<li>✓ ${p.name}</li>`).join('')}
            </ul>
          </div>

          <div class="bundle-benefits">
            ${bundle.benefits.map(b => `<span class="benefit">${b}</span>`).join('')}
          </div>

          <div class="bundle-pricing">
            <span class="regular">₹${bundle.regularPrice}</span>
            <span class="bundle-price">₹${bundle.bundlePrice}</span>
          </div>

          <div class="bundle-rating">
            <span class="stars">⭐ ${bundle.rating}</span>
            <span class="reviews">(${bundle.reviewCount} reviews)</span>
          </div>

          <button class="btn-bundle" onclick="Store.addToCart({id: '${bundle.id}', name: '${bundle.name}', price: ${bundle.bundlePrice}, type: 'bundle'})">Add to Cart</button>
        </div>
      </div>
    `;
  },

  attachEventListeners() {
    const searchInput = document.getElementById('bundle-search');
    const sortSelect = document.getElementById('bundle-sort');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => this.filterBundles(e.target.value));
    }

    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => this.sortBundles(e.target.value));
    }
  },

  filterBundles(query) {
    const cards = document.querySelectorAll('.bundle-card');
    const q = query.toLowerCase();
    cards.forEach(card => {
      const text = card.textContent.toLowerCase();
      card.style.display = text.includes(q) ? 'block' : 'none';
    });
  },

  sortBundles(sortBy) {
    const bundles = [...Data.bundles];
    switch (sortBy) {
      case 'price-asc':
        bundles.sort((a, b) => a.bundlePrice - b.bundlePrice);
        break;
      case 'price-desc':
        bundles.sort((a, b) => b.bundlePrice - a.bundlePrice);
        break;
      case 'rating':
        bundles.sort((a, b) => b.rating - a.rating);
        break;
      case 'discount':
        bundles.sort((a, b) => b.discount - a.discount);
        break;
    }
    const bundlesList = document.getElementById('bundles-list');
    if (bundlesList) {
      bundlesList.innerHTML = bundles.map(b => this.bundleCard(b)).join('');
    }
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => BundlesPage.init());
} else {
  BundlesPage.init();
}
