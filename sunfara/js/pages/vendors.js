/* ================================================
   vendors.js — Vendor Marketplace Listing & Storefront
   Routes: #/vendors and #/vendor/:id

   Previously broken in three ways: rendered into a container id
   ('main-content') that doesn't exist anywhere in this app (real one is
   'page-content', so this crashed on every render), router.js referenced
   a renderVendorDetail() method that was never defined (so every vendor
   store link 404'd with a JS error), and the vendor shape assumed fields
   (tagline, reviewCount, certifications) that only ever existed in the
   static demo catalog, never on a real registered vendor.
   ================================================ */
const VendorsPage = {
  render() {
    const main = document.getElementById('page-content');
    const vendors = Data.vendors;

    main.innerHTML = `
      <div class="page-vendors">
        <section class="vendors-hero">
          <div class="vendors-hero-content">
            <h1>Sunfara Marketplace</h1>
            <p>Discover premium organic & wellness brands trusted by thousands</p>
            <div class="vendor-search">
              <input type="text" id="vendor-search" placeholder="Search vendors...">
            </div>
          </div>
        </section>

        <section class="section all-vendors">
          <div class="container">
            <div class="section-header">
              <h2 class="section-title">All Vendors</h2>
              <select id="vendor-sort" class="sort-select">
                <option value="">Sort by: Latest</option>
                <option value="rating">Top Rated</option>
                <option value="products">Most Products</option>
              </select>
            </div>
            <div class="vendors-list" id="vendors-list">
              ${vendors.length ? vendors.map(v => this.vendorCard(v)).join('') : `
                <div class="empty-state"><div class="empty-state-icon">🏪</div><h3>No vendors yet</h3><p>Check back soon — new sellers are joining the marketplace.</p></div>`}
            </div>
          </div>
        </section>
      </div>`;

    this.attachEventListeners();
  },

  vendorCard(vendor) {
    return `
      <div class="vendor-card" onclick="VendorsPage.viewVendor('${vendor.id}')">
        <div class="vendor-card-image" style="background-image:url('${vendor.banner}');background-size:cover;background-position:center"></div>
        <div class="vendor-card-content">
          <h3>${escapeHtml(vendor.name)} ${vendor.verified ? '✅' : ''}</h3>
          <p class="vendor-tagline">${escapeHtml(vendor.tagline)}</p>
          <div class="vendor-meta">
            <span class="rating">⭐ ${vendor.rating || 'New'}</span>
            <span class="reviews">${vendor.reviewCount} reviews</span>
            <span class="products">${vendor.productsCount} products</span>
          </div>
          ${vendor.certifications.length ? `<div class="vendor-certifications">${vendor.certifications.slice(0, 2).map(c => `<span class="cert-badge">${c}</span>`).join('')}</div>` : ''}
          <button class="btn-vendor" onclick="event.stopPropagation();VendorsPage.viewVendor('${vendor.id}')">View Store</button>
        </div>
      </div>`;
  },

  viewVendor(vendorId) {
    window.location.hash = `#/vendor/${vendorId}`;
  },

  attachEventListeners() {
    document.getElementById('vendor-search')?.addEventListener('input', (e) => this.filterVendors(e.target.value));
    document.getElementById('vendor-sort')?.addEventListener('change', (e) => this.sortVendors(e.target.value));
  },

  filterVendors(query) {
    const q = query.toLowerCase();
    document.querySelectorAll('.vendor-card').forEach(card => {
      card.style.display = card.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  },

  sortVendors(sortBy) {
    const vendors = [...Data.vendors];
    if (sortBy === 'rating') vendors.sort((a, b) => b.rating - a.rating);
    else if (sortBy === 'products') vendors.sort((a, b) => b.productsCount - a.productsCount);
    const list = document.getElementById('vendors-list');
    if (list) list.innerHTML = vendors.map(v => this.vendorCard(v)).join('');
  },

  renderVendorDetail(params) {
    const vendor = Data.getVendorById(params.id);
    const main = document.getElementById('page-content');
    if (!vendor) {
      main.innerHTML = `<div class="container section"><div class="empty-state"><div class="empty-state-icon">🏪</div><h3>Seller not found</h3><p>This store may no longer be active.</p><a href="#/vendors" class="btn btn-primary">Browse All Vendors</a></div></div>`;
      return;
    }

    const products = Data.products.filter(p => p.vendorId === vendor.id);

    main.innerHTML = `
      <div class="vendor-storefront">
        <div class="vendor-banner" style="background-image:url('${vendor.banner}');background-size:cover;background-position:center">
          <div class="vendor-banner-overlay"></div>
        </div>
        <div class="container">
          <div class="vendor-storefront-header">
            <img class="vendor-logo" src="${vendor.logo}" alt="${escapeHtml(vendor.name)}" onerror="this.style.display='none'">
            <div class="vendor-storefront-info">
              <h1>${escapeHtml(vendor.name)} ${vendor.verified ? '<span title="Verified Seller">✅</span>' : ''}</h1>
              <p class="vendor-tagline">${escapeHtml(vendor.tagline)}</p>
              <div class="vendor-meta">
                <span class="rating">⭐ ${vendor.rating || 'New seller'}</span>
                <span class="reviews">${vendor.reviewCount} reviews</span>
                <span class="products">${products.length} products</span>
              </div>
              ${vendor.certifications.length ? `<div class="vendor-certifications">${vendor.certifications.map(c => `<span class="cert-badge">${c}</span>`).join('')}</div>` : ''}
            </div>
          </div>

          <div class="vendor-storefront-tabs">
            <button class="tab-btn active" onclick="VendorsPage.switchTab('products')" id="tab-btn-products">Products (${products.length})</button>
            <button class="tab-btn" onclick="VendorsPage.switchTab('about')" id="tab-btn-about">About & Policies</button>
          </div>

          <div id="vendor-tab-products" class="vendor-tab-panel active">
            ${products.length === 0
              ? `<div class="empty-state"><div class="empty-state-icon">📦</div><h3>No products listed yet</h3></div>`
              : `<div class="products-grid">${products.map(p => HomePage.productCard(p, 'reveal')).join('')}</div>`}
          </div>

          <div id="vendor-tab-about" class="vendor-tab-panel">
            <div class="vendor-about-section">
              <h3>About ${escapeHtml(vendor.name)}</h3>
              <p>${escapeHtml(vendor.description)}</p>
              ${vendor.address ? `<p><strong>Location:</strong> ${escapeHtml(vendor.address)}</p>` : ''}
              <h3 style="margin-top:var(--space-6)">Store Policies</h3>
              <ul class="vendor-policies-list">
                <li>🚚 Standard delivery in 4-7 business days</li>
                <li>↩️ 7-day easy returns on eligible items</li>
                <li>🔒 100% secure payments via Razorpay</li>
                <li>💬 Seller responds to queries within 24 hours</li>
              </ul>
            </div>
          </div>
        </div>
      </div>`;

    setupRevealAnimations();
  },

  switchTab(tab) {
    ['products', 'about'].forEach(t => {
      document.getElementById(`tab-btn-${t}`)?.classList.toggle('active', t === tab);
      document.getElementById(`vendor-tab-${t}`)?.classList.toggle('active', t === tab);
    });
  }
};
