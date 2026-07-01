/* ================================================
   product-list.js — Product Listing & Filter Page
   Routes: #/category/:slug and #/search?q=...
   ================================================ */
const ProductListPage = {
  filters: { minPrice: 0, maxPrice: 5000, brands: [], minRating: 0, minDiscount: 0, skinTypes: [], concerns: [], certifications: [], sortBy: 'relevance' },
  currentPage: 1,
  perPage: 12,
  category: null,
  query: null,

  render(params = {}) {
    this.category = params.slug || null;
    this.query = params.query || null;
    this.currentPage = 1;
    this.filters = { minPrice: 0, maxPrice: 5000, brands: [], minRating: 0, minDiscount: 0, skinTypes: [], concerns: [], certifications: [], sortBy: 'relevance' };

    const cat = this.category ? Data.getCategoryById(this.category) : null;
    const title = cat ? cat.name : this.query ? `Search: "${this.query}"` : 'All Products';

    document.getElementById('page-content').innerHTML = `
      <div class="container section">
        <div class="breadcrumb">
          <a href="#/">Home</a><span class="breadcrumb-sep">›</span>
          <span>${title}</span>
        </div>
        <h2 style="margin-bottom:var(--space-6)">${title}</h2>
        <div class="product-list-layout">
          <aside class="filter-sidebar" id="filter-sidebar"></aside>
          <div class="product-main">
            <div class="product-list-header">
              <div class="flex gap-2 items-center">
                <button class="mobile-filter-btn" onclick="ProductListPage.openFilterDrawer()">⚙ Filters</button>
                <div class="active-filters" id="active-filters"></div>
              </div>
              <div class="flex items-center gap-3">
                <span class="product-count" id="product-count"></span>
                <select class="sort-select" onchange="ProductListPage.setSort(this.value)">
                  <option value="relevance">Relevance</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="newest">Newest First</option>
                  <option value="rating">Best Rated</option>
                  <option value="reviews">Most Reviewed</option>
                  <option value="discount">Biggest Discount</option>
                </select>
              </div>
            </div>
            <div id="products-container"></div>
            <div id="pagination-container"></div>
          </div>
        </div>
      </div>
      <!-- Mobile filter drawer -->
      <div class="filter-drawer" id="filter-drawer">
        <div class="filter-drawer-header">
          <h3>Filters</h3>
          <button onclick="ProductListPage.closeFilterDrawer()" style="background:none;border:none;font-size:1.5rem;cursor:pointer">✕</button>
        </div>
        <div class="filter-drawer-content" id="filter-drawer-content"></div>
        <div class="filter-drawer-footer">
          <button class="btn btn-outline btn-full" onclick="ProductListPage.clearFilters()">Clear All</button>
          <button class="btn btn-primary btn-full" onclick="ProductListPage.closeFilterDrawer()">Apply</button>
        </div>
      </div>
      <div class="drawer-overlay" id="filter-overlay" onclick="ProductListPage.closeFilterDrawer()"></div>`;

    this.renderFilters();
    this.renderProducts();
  },

  getFilteredProducts() {
    return Data.filterProducts({
      category: this.category, query: this.query,
      minPrice: this.filters.minPrice, maxPrice: this.filters.maxPrice,
      brands: this.filters.brands.length ? this.filters.brands : null,
      minRating: this.filters.minRating || null,
      minDiscount: this.filters.minDiscount || null,
      skinTypes: this.filters.skinTypes.length ? this.filters.skinTypes : null,
      concerns: this.filters.concerns.length ? this.filters.concerns : null,
      certifications: this.filters.certifications.length ? this.filters.certifications : null,
      sortBy: this.filters.sortBy === 'relevance' ? null : this.filters.sortBy
    });
  },

  renderFilters() {
    const html = this.buildFilterHTML();
    const sidebar = document.getElementById('filter-sidebar');
    const drawer = document.getElementById('filter-drawer-content');
    if (sidebar) sidebar.innerHTML = html;
    if (drawer) drawer.innerHTML = html;
  },

  buildFilterHTML() {
    const allBrands = [...new Set(Data.products.map(p => p.brand))];
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-4)">
        <h3 style="font-size:var(--text-base)">Filters</h3>
        <button onclick="ProductListPage.clearFilters()" style="font-size:var(--text-xs);color:var(--color-primary);background:none;border:none;cursor:pointer">Clear All</button>
      </div>

      <div class="filter-section">
        <div class="filter-section-title">Price Range</div>
        <div class="price-range-display"><span>₹${this.filters.minPrice}</span><span>₹${this.filters.maxPrice}</span></div>
        <input type="range" class="range-slider" min="0" max="5000" step="50" value="${this.filters.maxPrice}"
          oninput="ProductListPage.filters.maxPrice=+this.value;this.previousElementSibling.lastElementChild.textContent='₹'+this.value;ProductListPage.renderProducts()">
      </div>

      <div class="filter-section">
        <div class="filter-section-title">Brand</div>
        ${allBrands.map(b => `<label class="checkbox-item"><input type="checkbox" ${this.filters.brands.includes(b)?'checked':''} onchange="ProductListPage.toggleFilter('brands','${b}')"> ${b}</label>`).join('')}
      </div>

      <div class="filter-section">
        <div class="filter-section-title">Rating</div>
        ${[4, 3].map(r => `<label class="radio-item"><input type="radio" name="rating" ${this.filters.minRating===r?'checked':''} onchange="ProductListPage.filters.minRating=${r};ProductListPage.renderProducts()"> ${r}★ & above</label>`).join('')}
        <label class="radio-item"><input type="radio" name="rating" ${!this.filters.minRating?'checked':''} onchange="ProductListPage.filters.minRating=0;ProductListPage.renderProducts()"> All ratings</label>
      </div>

      <div class="filter-section">
        <div class="filter-section-title">Discount</div>
        ${[10, 20, 30, 50].map(d => `<label class="checkbox-item"><input type="checkbox" ${this.filters.minDiscount===d?'checked':''} onchange="ProductListPage.filters.minDiscount=${d};ProductListPage.renderProducts()"> ${d}%+</label>`).join('')}
      </div>

      <div class="filter-section">
        <div class="filter-section-title">Skin Type</div>
        ${['dry', 'oily', 'combination', 'sensitive', 'normal'].map(s => `<label class="checkbox-item"><input type="checkbox" ${this.filters.skinTypes.includes(s)?'checked':''} onchange="ProductListPage.toggleFilter('skinTypes','${s}')"> ${s.charAt(0).toUpperCase()+s.slice(1)}</label>`).join('')}
      </div>

      <div class="filter-section">
        <div class="filter-section-title">Certifications</div>
        ${['USDA Organic', 'Cruelty-Free', 'Vegan', 'Ayurvedic'].map(c => `<label class="checkbox-item"><input type="checkbox" ${this.filters.certifications.includes(c)?'checked':''} onchange="ProductListPage.toggleFilter('certifications','${c}')"> ${c}</label>`).join('')}
      </div>`;
  },

  toggleFilter(key, value) {
    const arr = this.filters[key];
    const idx = arr.indexOf(value);
    if (idx > -1) arr.splice(idx, 1); else arr.push(value);
    this.renderProducts();
    this.renderActiveChips();
  },

  renderActiveChips() {
    const el = document.getElementById('active-filters');
    if (!el) return;
    const chips = [];
    this.filters.brands.forEach(b => chips.push(`<div class="chip">${b} <span class="chip-remove" onclick="ProductListPage.toggleFilter('brands','${b}')">✕</span></div>`));
    this.filters.certifications.forEach(c => chips.push(`<div class="chip">${c} <span class="chip-remove" onclick="ProductListPage.toggleFilter('certifications','${c}')">✕</span></div>`));
    if (this.filters.minRating) chips.push(`<div class="chip">${this.filters.minRating}★+ <span class="chip-remove" onclick="ProductListPage.filters.minRating=0;ProductListPage.renderProducts()">✕</span></div>`);
    if (this.filters.maxPrice < 5000) chips.push(`<div class="chip">Under ₹${this.filters.maxPrice} <span class="chip-remove" onclick="ProductListPage.filters.maxPrice=5000;ProductListPage.renderProducts()">✕</span></div>`);
    el.innerHTML = chips.join('');
  },

  setSort(val) { this.filters.sortBy = val; this.renderProducts(); },
  clearFilters() { this.filters = { minPrice: 0, maxPrice: 5000, brands: [], minRating: 0, minDiscount: 0, skinTypes: [], concerns: [], certifications: [], sortBy: 'relevance' }; this.renderFilters(); this.renderProducts(); },

  renderProducts() {
    const container = document.getElementById('products-container');
    if (!container) return;

    // Show skeletons for 600ms
    container.innerHTML = `<div class="products-grid">${Skeleton.cards(this.perPage)}</div>`;

    setTimeout(() => {
      const all = this.getFilteredProducts();
      const total = all.length;
      const start = (this.currentPage - 1) * this.perPage;
      const page = all.slice(start, start + this.perPage);

      document.getElementById('product-count').textContent = `${total} products`;
      this.renderActiveChips();

      if (!page.length) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">🌿</div>
            <h3>No products found</h3>
            <p>Try adjusting your filters or search for something different.</p>
            <button class="btn btn-primary" onclick="ProductListPage.clearFilters()">Clear All Filters</button>
          </div>`;
      } else {
        container.innerHTML = `<div class="products-grid">${page.map(p => HomePage.productCard(p, 'reveal')).join('')}</div>`;
        setupRevealAnimations();
      }
      this.renderPagination(total);
    }, 600);
  },

  renderPagination(total) {
    const pages = Math.ceil(total / this.perPage);
    const el = document.getElementById('pagination-container');
    if (!el || pages <= 1) { if (el) el.innerHTML = ''; return; }

    let html = `<div class="pagination">
      <button class="page-btn ${this.currentPage===1?'disabled':''}" onclick="ProductListPage.goPage(${this.currentPage-1})">‹</button>`;
    for (let i = 1; i <= pages; i++) {
      if (i === 1 || i === pages || Math.abs(i - this.currentPage) <= 1)
        html += `<button class="page-btn ${i===this.currentPage?'active':''}" onclick="ProductListPage.goPage(${i})">${i}</button>`;
      else if (Math.abs(i - this.currentPage) === 2)
        html += `<span class="page-btn" style="cursor:default">…</span>`;
    }
    html += `<button class="page-btn ${this.currentPage===pages?'disabled':''}" onclick="ProductListPage.goPage(${this.currentPage+1})">›</button></div>`;
    el.innerHTML = html;
  },

  goPage(page) {
    const total = this.getFilteredProducts().length;
    const pages = Math.ceil(total / this.perPage);
    if (page < 1 || page > pages) return;
    this.currentPage = page;
    this.renderProducts();
    scrollToTop();
  },

  openFilterDrawer() {
    document.getElementById('filter-drawer')?.classList.add('open');
    document.getElementById('filter-overlay')?.classList.add('visible');
    document.body.style.overflow = 'hidden';
  },

  closeFilterDrawer() {
    document.getElementById('filter-drawer')?.classList.remove('open');
    document.getElementById('filter-overlay')?.classList.remove('visible');
    document.body.style.overflow = '';
  }
};
