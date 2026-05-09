/* ================================================
   product-detail.js — Product Detail Page
   Route: #/product/:id
   ================================================ */
const ProductDetailPage = {
  currentProduct: null,
  selectedVariant: null,
  quantity: 1,

  render(params = {}) {
    const product = Data.getProductById(params.id);
    if (!product) { document.getElementById('page-content').innerHTML = `<div class="container section"><div class="empty-state"><div class="empty-state-icon">😕</div><h3>Product not found</h3><a href="#/" class="btn btn-primary">Back to Home</a></div></div>`; return; }

    this.currentProduct = product;
    this.selectedVariant = product.variants[0];
    this.quantity = 1;
    Store.addRecentlyViewed(product.id);

    document.getElementById('page-content').innerHTML = `
      <div class="container section">
        <div class="breadcrumb">
          <a href="#/">Home</a><span class="breadcrumb-sep">›</span>
          <a href="#/category/${product.category}">${product.category.replace(/-/g,' ')}</a>
          <span class="breadcrumb-sep">›</span><span>${truncate(product.name, 30)}</span>
        </div>
        <div class="product-detail-layout">
          <!-- Gallery -->
          <div class="product-gallery">
            <div class="gallery-main">
              <img id="gallery-main-img" src="${product.image}" alt="${product.name}" onerror="this.style.display='none';document.getElementById('gallery-fallback').style.display='flex'">
              <div class="gallery-fallback" id="gallery-fallback" style="display:none">🌿</div>
            </div>
            <div class="gallery-thumbs">
              ${product.images.map((img, i) => `
                <div class="gallery-thumb ${i===0?'active':''}" onclick="ProductDetailPage.switchImage('${img}',${i})">
                  <img src="${img}" alt="${product.name} view ${i+1}" onerror="this.style.background='var(--color-cream)'">
                </div>`).join('')}
            </div>
          </div>

          <!-- Product Info -->
          <div class="product-info">
            <a class="product-brand-link" href="#/category/${product.category}">${product.brand}</a>
            <h1 class="product-name">${product.name}</h1>
            <div class="product-rating-row">
              <div class="star-rating">${renderStars(product.rating)}</div>
              <span class="rating-score">${product.rating}</span>
              <a class="rating-count" onclick="document.getElementById('tab-reviews')?.click()">(${product.reviewCount} reviews)</a>
            </div>
            <div class="product-price-row">
              <span class="product-price-current" id="selected-price">${formatPrice(this.selectedVariant.price)}</span>
              <span class="product-price-mrp">${formatPrice(product.mrp)}</span>
              <span class="product-price-off">${product.discount}% OFF</span>
            </div>
            <p class="tax-note">Inclusive of all taxes</p>
            <hr class="product-divider">

            ${product.variants.length > 1 ? `
            <div class="variant-label">Size:</div>
            <div class="variant-options">
              ${product.variants.map(v => `
                <button class="variant-btn ${v.id===this.selectedVariant.id?'active':''}" onclick="ProductDetailPage.selectVariant('${v.id}')">${v.name} — ${formatPrice(v.price)}</button>`).join('')}
            </div>
            <hr class="product-divider">` : ''}

            <div style="display:flex;align-items:center;gap:var(--space-4);margin-bottom:var(--space-6)">
              <span style="font-size:var(--text-sm);font-weight:600">Quantity:</span>
              <div class="qty-control">
                <button class="qty-btn" onclick="ProductDetailPage.changeQty(-1)" aria-label="Decrease quantity">−</button>
                <span class="qty-value" id="qty-display">${this.quantity}</span>
                <button class="qty-btn" onclick="ProductDetailPage.changeQty(1)" aria-label="Increase quantity">+</button>
              </div>
              <span style="font-size:var(--text-xs);color:var(--color-text-muted)">${product.stock} in stock</span>
            </div>

            <div class="atc-row">
              <button class="btn btn-primary" style="flex:1;padding:var(--space-4)" onclick="ProductDetailPage.addToCart()">🛒 Add to Cart</button>
              <button class="wishlist-toggle-btn ${Store.isWishlisted(product.id)?'active':''}" id="wl-btn" onclick="ProductDetailPage.toggleWishlist()" aria-label="Toggle wishlist">♥</button>
            </div>
            <button class="buy-now-btn" onclick="ProductDetailPage.buyNow()">Buy Now</button>

            <hr class="product-divider">
            <div class="delivery-section">
              <p style="font-size:var(--text-sm);font-weight:600">📦 Check Delivery</p>
              <div class="pincode-row">
                <input class="input pincode-input" id="pincode-input" maxlength="6" placeholder="Enter 6-digit pincode" type="number">
                <button class="btn btn-outline btn-sm" onclick="ProductDetailPage.checkDelivery()">Check</button>
              </div>
              <div class="delivery-info" id="delivery-result" style="display:none">
                <div class="delivery-info-item">🚚 <span id="delivery-text"></span></div>
                <div class="delivery-info-item">🆓 Free delivery above ₹599</div>
                <div class="delivery-info-item">↩️ ${product.returnDays}-day easy returns</div>
              </div>
            </div>

            <div class="product-highlights">
              ${product.highlights.map(h => `<div class="highlight-item">${h}</div>`).join('')}
            </div>
          </div>
        </div>

        <!-- Tabs -->
        <div class="product-tabs section-sm">
          <div class="tabs">
            <button class="tab-btn active" id="tab-desc" onclick="ProductDetailPage.switchTab('desc')">Description</button>
            <button class="tab-btn" id="tab-ingredients" onclick="ProductDetailPage.switchTab('ingredients')">Key Ingredients</button>
            <button class="tab-btn" id="tab-how" onclick="ProductDetailPage.switchTab('how')">How to Use</button>
            <button class="tab-btn" id="tab-reviews" onclick="ProductDetailPage.switchTab('reviews')">Reviews (${product.reviewCount})</button>
          </div>
          <div id="tab-panel"></div>
        </div>

        <!-- Related products -->
        <div class="section-sm">
          <div class="section-header"><h2 class="section-title">Customers Also Bought</h2></div>
          <div style="overflow-x:auto;scrollbar-width:none"><div style="display:flex;gap:var(--space-4)">
            ${Data.getProductsByCategory(product.category).filter(p=>p.id!==product.id).slice(0,6).map(p=>`<div style="min-width:200px">${HomePage.productCard(p)}</div>`).join('')}
          </div></div>
        </div>
      </div>

      <!-- Sticky ATC (mobile) -->
      <div class="sticky-atc">
        <div class="sticky-atc-inner">
          <div class="sticky-atc-info">
            <div class="sticky-atc-name">${product.name}</div>
            <div class="sticky-atc-price" id="sticky-price">${formatPrice(this.selectedVariant.price)}</div>
          </div>
          <button class="btn btn-primary" onclick="ProductDetailPage.addToCart()">Add to Cart</button>
        </div>
      </div>`;

    this.switchTab('desc');
  },

  switchImage(src, idx) {
    const img = document.getElementById('gallery-main-img');
    if (img) { img.style.opacity = '0'; setTimeout(() => { img.src = src; img.style.opacity = '1'; }, 200); img.style.transition = 'opacity 0.2s'; }
    document.querySelectorAll('.gallery-thumb').forEach((t, i) => t.classList.toggle('active', i === idx));
  },

  selectVariant(variantId) {
    this.selectedVariant = this.currentProduct.variants.find(v => v.id === variantId);
    document.querySelectorAll('.variant-btn').forEach(b => b.classList.toggle('active', b.textContent.includes(this.selectedVariant.name)));
    const priceEl = document.getElementById('selected-price');
    const stickyPrice = document.getElementById('sticky-price');
    if (priceEl) priceEl.textContent = formatPrice(this.selectedVariant.price);
    if (stickyPrice) stickyPrice.textContent = formatPrice(this.selectedVariant.price);
  },

  changeQty(delta) {
    const p = this.currentProduct;
    this.quantity = clamp(this.quantity + delta, 1, p.stock);
    const el = document.getElementById('qty-display');
    if (el) el.textContent = this.quantity;
  },

  addToCart() {
    Store.addToCart(this.currentProduct.id, this.selectedVariant.id, this.quantity);
    Toast.show(`${truncate(this.currentProduct.name, 25)}... added to cart 🛒`, 'success');
    Navbar.updateBadges();
  },

  buyNow() {
    this.addToCart();
    window.location.hash = '#/checkout';
  },

  toggleWishlist() {
    Store.toggleWishlist(this.currentProduct.id);
    const btn = document.getElementById('wl-btn');
    if (btn) btn.classList.toggle('active');
    Toast.show(Store.isWishlisted(this.currentProduct.id) ? 'Added to wishlist ♥' : 'Removed from wishlist', 'success');
    Navbar.updateBadges();
  },

  checkDelivery() {
    const pin = document.getElementById('pincode-input')?.value;
    if (!pin || pin.length !== 6) { Toast.show('Please enter a valid 6-digit pincode', 'error'); return; }
    const result = document.getElementById('delivery-result');
    const text = document.getElementById('delivery-text');
    if (result && text) {
      text.textContent = `Delivers in ${this.currentProduct.deliveryDays}-${this.currentProduct.deliveryDays + 1} days to ${pin}`;
      result.style.display = 'flex';
    }
  },

  switchTab(tab) {
    ['desc', 'ingredients', 'how', 'reviews'].forEach(t => {
      document.getElementById(`tab-${t}`)?.classList.toggle('active', t === tab);
    });
    const p = this.currentProduct;
    const panel = document.getElementById('tab-panel');
    if (!panel) return;

    const contents = {
      desc: `<div class="tab-content-inner"><p>${p.description}</p></div>`,
      ingredients: `<div class="tab-content-inner">
        <div style="display:flex;flex-wrap:wrap;gap:var(--space-2);margin-bottom:var(--space-4)">
          ${p.keyIngredients.map(i=>`<span class="badge badge-organic">🌿 ${i}</span>`).join('')}
        </div>
        <p class="ingredients-list"><strong>Full Ingredient List:</strong><br>${p.ingredients}</p></div>`,
      how: `<div class="tab-content-inner">
        <div class="how-to-steps">
          ${p.howToUse.split('.').filter(s=>s.trim()).map((s, i)=>`<div class="how-to-step"><div class="step-num">${i+1}</div><p>${s.trim()}.</p></div>`).join('')}
        </div></div>`,
      reviews: `<div class="tab-content-inner">
        <div class="reviews-summary">
          <div class="reviews-score"><div class="big-score">${p.rating}</div><div>${renderStars(p.rating)}</div><div style="font-size:var(--text-xs);color:var(--color-text-muted)">${p.reviewCount} reviews</div></div>
          <div class="rating-bars">
            ${[5,4,3,2,1].map(star => `<div class="rating-bar-row"><span class="rating-bar-label">${star}★</span><div class="rating-bar-track"><div class="rating-bar-fill" style="width:${star===5?70:star===4?20:star===3?7:star===2?2:1}%"></div></div></div>`).join('')}
          </div>
        </div>
        ${this.mockReviews(p)}
        <button class="btn btn-outline" onclick="Toast.show('Review submitted! Thank you 🌿','success')">Write a Review ✏️</button>
      </div>`
    };
    panel.innerHTML = contents[tab] || '';
  },

  mockReviews(p) {
    const reviews = [
      { name: 'Priya S.', rating: 5, date: 'Jan 2024', body: `Absolutely love this product! My skin has never felt better. The texture is perfect and it absorbs quickly without any greasy residue.` },
      { name: 'Ananya R.', rating: 4, date: 'Dec 2023', body: `Great product, noticeable results in 2 weeks. The packaging is eco-friendly which is a big plus. Will definitely repurchase.` },
      { name: 'Meena K.', rating: 5, date: 'Dec 2023', body: `Best organic product I have tried. Worth every rupee. The scent is subtle and natural — not overpowering at all.` },
      { name: 'Riya T.', rating: 4, date: 'Nov 2023', body: `Good product, delivered quickly. I have been using it for a month and see a clear improvement in my skin texture.` },
      { name: 'Deepa M.', rating: 5, date: 'Nov 2023', body: `I switched to Sunfara after years of using chemical-laden products. The difference is incredible. My skin is glowing!` }
    ];
    return reviews.map(r => `
      <div class="review-card">
        <div class="review-header">
          <div><div class="review-name">${r.name}</div><div style="color:#f59e0b;font-size:0.9rem">${renderStars(r.rating)}</div></div>
          <div class="review-date">${r.date} · <span class="review-verified">✓ Verified Purchase</span></div>
        </div>
        <p class="review-body">${r.body}</p>
      </div>`).join('');
  }
};
