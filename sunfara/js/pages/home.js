/* ================================================
   home.js — Home Page Renderer
   Sections: Banner Slider, Categories, Deals, Trending,
             Why Sunfara, New Arrivals, Ingredient Banner,
             Blog Preview, Recently Viewed, Newsletter
   ================================================ */
const HomePage = {
  sliderInterval: null,
  currentSlide: 0,

  render() {
    const main = document.getElementById('page-content');
    main.innerHTML = `
      <div id="hero-slider-section"></div>
      <div class="container">
        <section class="section" id="categories-section"></section>
        <section class="section" id="deals-section"></section>
        <section class="section" id="trending-section"></section>
        <section class="section-sm" id="trust-section"></section>
        <section class="section" id="new-arrivals-section"></section>
        <section class="section-sm" id="ingredient-banner"></section>
        <section class="section" id="blog-section"></section>
        <section class="section" id="recently-viewed-section"></section>
      </div>`;

    this.renderSlider();
    this.renderCategories();
    this.renderDeals();
    this.renderTrending();
    this.renderTrust();
    this.renderNewArrivals();
    this.renderIngredientBanner();
    this.renderBlog();
    this.renderRecentlyViewed();
    setupRevealAnimations();
    setupBackToTop();
  },

  renderSlider() {
    const container = document.getElementById('hero-slider-section');
    const banners = Data.banners;
    container.innerHTML = `
      <div class="hero-slider">
        <div class="slider-track" id="slider-track">
          ${banners.map((b, i) => `
            <div class="slide" style="background:${b.bgColor};">
              <div class="slide-content reveal">
                <div class="slide-eyebrow">Certified Organic</div>
                <h1>${b.title}</h1>
                <p>${b.subtitle}</p>
                <a href="${b.ctaLink}" class="btn btn-primary btn-lg">${b.cta}</a>
              </div>
              <img class="slide-image" src="${b.image}" alt="${b.title}" onerror="this.style.display='none'">
            </div>`).join('')}
        </div>
        <button class="slider-arrow slider-prev" onclick="HomePage.prevSlide()" aria-label="Previous slide">‹</button>
        <button class="slider-arrow slider-next" onclick="HomePage.nextSlide()" aria-label="Next slide">›</button>
        <div class="slider-dots">
          ${banners.map((_, i) => `<div class="dot ${i===0?'active':''}" onclick="HomePage.goToSlide(${i})"></div>`).join('')}
        </div>
      </div>`;

    this.startAutoplay();
    document.querySelector('.hero-slider')?.addEventListener('mouseenter', () => clearInterval(this.sliderInterval));
    document.querySelector('.hero-slider')?.addEventListener('mouseleave', () => this.startAutoplay());
    setupRevealAnimations();
  },

  goToSlide(index) {
    this.currentSlide = index;
    document.getElementById('slider-track').style.transform = `translateX(-${index * 100}%)`;
    document.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === index));
  },
  nextSlide() { this.goToSlide((this.currentSlide + 1) % Data.banners.length); },
  prevSlide() { this.goToSlide((this.currentSlide - 1 + Data.banners.length) % Data.banners.length); },
  startAutoplay() {
    clearInterval(this.sliderInterval);
    this.sliderInterval = setInterval(() => this.nextSlide(), 4000);
  },

  renderCategories() {
    const el = document.getElementById('categories-section');
    el.innerHTML = `
      <div class="section-header">
        <div><h2 class="section-title">Shop by Category</h2><p class="section-subtitle">Find exactly what your skin and body needs</p></div>
      </div>
      <div class="category-grid">
        ${Data.categories.map(c => `
          <a class="category-card reveal" href="#/category/${c.slug}">
            <div class="category-card-img">
              <img src="${c.image}" alt="${c.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
              <div class="category-icon-fallback" style="display:none">${c.icon}</div>
              <div class="category-card-overlay"></div>
            </div>
            <div class="category-card-info">
              <div class="category-card-name">${c.icon} ${c.name}</div>
              <div class="category-card-count">${c.productCount} products</div>
            </div>
          </a>`).join('')}
      </div>`;
  },

  renderDeals() {
    const el = document.getElementById('deals-section');
    const deals = Data.getDeals().slice(0, 6);
    const endTime = Date.now() + 10 * 60 * 60 * 1000;

    el.innerHTML = `
      <div class="deals-section">
        <div class="deals-header">
          <div class="deals-title">
            <span style="font-size:1.5rem">🔥</span>
            <div><h2 style="color:white;margin:0">Today's Deals</h2><p style="color:rgba(255,255,255,0.7);font-size:0.85rem">Limited time offers — grab them fast!</p></div>
          </div>
          <div class="countdown">
            <span class="countdown-label">Ends in:</span>
            <div class="countdown-timer">
              <span class="countdown-unit" id="cd-h">10</span>
              <span class="countdown-sep">:</span>
              <span class="countdown-unit" id="cd-m">00</span>
              <span class="countdown-sep">:</span>
              <span class="countdown-unit" id="cd-s">00</span>
            </div>
          </div>
        </div>
        <div class="deals-scroll">
          <div class="deals-track">
            ${deals.map(p => this.productCard(p)).join('')}
          </div>
        </div>
      </div>`;

    this.startCountdown(endTime);
  },

  startCountdown(endTime) {
    const tick = () => {
      const diff = Math.max(0, endTime - Date.now());
      const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
      const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
      const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
      const hEl = document.getElementById('cd-h'), mEl = document.getElementById('cd-m'), sEl = document.getElementById('cd-s');
      if (hEl) hEl.textContent = h;
      if (mEl) mEl.textContent = m;
      if (sEl) sEl.textContent = s;
      if (diff > 0) setTimeout(tick, 1000);
    };
    tick();
  },

  renderTrending() {
    const el = document.getElementById('trending-section');
    const products = [...Data.getBestsellers(), ...Data.getFeaturedProducts()].filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i).slice(0, 8);
    el.innerHTML = `
      <div class="section-header">
        <div><h2 class="section-title">Trending Now</h2><p class="section-subtitle">Our bestsellers, loved by thousands</p></div>
        <a class="section-link" href="#/category/organic-skincare">View All →</a>
      </div>
      <div class="trending-grid">
        ${products.map(p => this.productCard(p, 'reveal')).join('')}
      </div>`;
  },

  renderTrust() {
    const el = document.getElementById('trust-section');
    el.innerHTML = `
      <div class="why-sunfara">
        <div class="section-header text-center" style="justify-content:center;flex-direction:column;align-items:center">
          <h2 class="section-title">Why Sunfara?</h2>
          <p style="color:var(--color-text-muted)">Every product we make is built on four unbreakable promises</p>
        </div>
        <div class="trust-grid">
          ${[
            { icon: '🌿', title: '100% Natural Ingredients', desc: 'Every ingredient is plant-derived and sustainably sourced.' },
            { icon: '🔬', title: 'Dermatologically Tested', desc: 'Clinically tested for safety and efficacy on all skin types.' },
            { icon: '♻️', title: 'Eco-Friendly Packaging', desc: 'Recyclable, minimal packaging — zero unnecessary plastic.' },
            { icon: '🏆', title: 'Certified Organic', desc: 'USDA Organic, Cruelty-Free, Vegan — every certification matters.' }
          ].map(t => `
            <div class="trust-item reveal">
              <div class="trust-icon">${t.icon}</div>
              <div class="trust-title">${t.title}</div>
              <div class="trust-desc">${t.desc}</div>
            </div>`).join('')}
        </div>
      </div>`;
  },

  renderNewArrivals() {
    const el = document.getElementById('new-arrivals-section');
    const products = Data.getNewArrivals().slice(0, 4);
    if (!products.length) { el.style.display = 'none'; return; }
    el.innerHTML = `
      <div class="section-header">
        <div><h2 class="section-title">New Arrivals</h2><p class="section-subtitle">Fresh off the formulation lab — just launched</p></div>
        <a class="section-link" href="#/search?new=true">View All New →</a>
      </div>
      <div class="grid grid-4">
        ${products.map(p => this.productCard(p, 'reveal')).join('')}
      </div>`;
  },

  renderIngredientBanner() {
    document.getElementById('ingredient-banner').innerHTML = `
      <div class="ingredient-banner reveal">
        <h2>We believe you deserve to know what's in your products</h2>
        <p>Every ingredient is listed, explained, and sourced with full transparency. No hidden chemicals, no greenwashing — just honest, pure formulas.</p>
        <a href="#/certifications" class="btn">See Our Ingredient Promise 🌿</a>
      </div>`;
  },

  renderBlog() {
    const posts = [
      { emoji: '🌸', tag: 'Skincare', title: '5 Ayurvedic Herbs for Glowing Skin', excerpt: 'Discover the ancient herbs that Ayurveda has trusted for centuries — now proven by modern science.', date: 'Jan 15, 2024', read: '5 min read' },
      { emoji: '🧪', tag: 'Ingredients', title: 'Why We Never Use Parabens', excerpt: 'Parabens disrupt hormones and accumulate in the body. Here\'s everything we use instead.', date: 'Dec 28, 2023', read: '3 min read' },
      { emoji: '♻️', tag: 'Wellness', title: 'Building a Sustainable Skincare Routine', excerpt: 'A step-by-step guide to going green with your skincare without sacrificing results.', date: 'Dec 10, 2023', read: '7 min read' }
    ];
    document.getElementById('blog-section').innerHTML = `
      <div class="section-header">
        <div><h2 class="section-title">From the Blog</h2><p class="section-subtitle">Wellness wisdom, ingredient education & skincare science</p></div>
        <a class="section-link" href="#/blog">All Articles →</a>
      </div>
      <div class="blog-grid">
        ${posts.map(post => `
          <div class="blog-card reveal" onclick="window.location.hash='#/blog'">
            <div class="blog-card-cover" style="background:var(--color-cream)">${post.emoji}</div>
            <div class="blog-card-body">
              <span class="blog-tag">${post.tag}</span>
              <h3 class="blog-card-title">${post.title}</h3>
              <p class="blog-card-excerpt">${post.excerpt}</p>
              <div class="blog-meta"><span>${post.date}</span><span>·</span><span>${post.read}</span></div>
            </div>
          </div>`).join('')}
      </div>`;
  },

  renderRecentlyViewed() {
    const el = document.getElementById('recently-viewed-section');
    if (!Store.recentlyViewed.length) { el.style.display = 'none'; return; }
    const products = Store.recentlyViewed.map(id => Data.getProductById(id)).filter(Boolean);
    el.innerHTML = `
      <div class="section-header">
        <h2 class="section-title">Recently Viewed</h2>
      </div>
      <div class="recently-viewed-scroll">
        <div class="recently-viewed-track">
          ${products.map(p => this.productCard(p)).join('')}
        </div>
      </div>`;
  },

  productCard(p, extraClass = '') {
    const wishlisted = Store.isWishlisted(p.id);
    return `
      <div class="product-card ${extraClass}" onclick="window.location.hash='#/product/${p.id}'">
        <div class="product-card-image">
          <div class="card-badges">
            ${p.isNew ? '<span class="badge badge-new">NEW</span>' : ''}
            ${p.isBestseller ? '<span class="badge badge-bestseller">BESTSELLER</span>' : ''}
            ${p.discount ? `<span class="badge badge-discount">${p.discount}% OFF</span>` : ''}
          </div>
          ${safeImg(p.image, p.name, 'product-img')}
          <button class="wishlist-btn ${wishlisted ? 'active' : ''}"
            onclick="event.stopPropagation();Store.toggleWishlist('${p.id}');this.classList.toggle('active');Toast.show(Store.isWishlisted('${p.id}')?'Added to wishlist ♥':'Removed from wishlist','${wishlisted ? 'info' : 'success'}')"
            aria-label="${wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}">♥</button>
        </div>
        <div class="product-card-body">
          <div class="product-card-brand">${escapeHtml(p.brand)}</div>
          <div class="product-card-name">${escapeHtml(p.name)}</div>
          <div class="product-card-rating"><span class="stars">${renderStars(p.rating)}</span>${p.rating} (${p.reviewCount})</div>
          <div class="product-card-price">
            <span class="price-current">${formatPrice(p.price)}</span>
            <span class="price-mrp">${formatPrice(p.mrp)}</span>
            <span class="price-discount">${p.discount}% off</span>
          </div>
          <button class="btn btn-primary btn-full btn-sm" onclick="event.stopPropagation();Store.addToCart('${p.id}','${p.variants[0].id}',1);Toast.show('${p.name.substring(0,20)}... added to cart 🛒','success');Navbar.updateBadges()">Add to Cart</button>
        </div>
      </div>`;
  }
};
