/* ================================================
   data.js — Loads catalog from API (SoT) with CAT-002 policy
   Policy (documented):
     - Successful API response (including []) → use API data; never mix demo JSON
     - Transport / HTTP failure → optional static JSON fallback for resilience
   ================================================ */

const Data = {
  products: [],
  categories: [],
  banners: [],
  coupons: [],
  vendors: [],
  bundles: [],
  healthCategories: [],
  recommendations: [],
  loaded: false,
  /** @type {'api'|'api-empty'|'json-fallback'|'api-error-empty'|'mixed'|null} */
  catalogSource: null,
  catalogError: null,

  /* Load commerce collections from API; CMS JSON stays static until CMS-001 */
  async init() {
    this.catalogError = null;
    try {
      const policy = globalThis.CatalogLoadPolicy;
      const apiGet = (path) => SunfaraAPI.get(path);

      const [productsAttempt, categoriesAttempt, vendorsAttempt, banners, coupons, bundles, healthCategories, recommendations] =
        await Promise.all([
          policy.tryApiGet(apiGet, '/products'),
          policy.tryApiGet(apiGet, '/categories'),
          policy.tryApiGet(apiGet, '/vendors'),
          fetch('data/banners.json').then(r => r.json()).catch(() => []),
          fetch('data/coupons.json').then(r => r.json()).catch(() => []),
          fetch('data/bundles.json').then(r => r.json()).catch(() => []),
          fetch('data/health-categories.json').then(r => r.json()).catch(() => []),
          fetch('data/recommendations.json').then(r => r.json()).catch(() => [])
        ]);

      const loadJson = (path) => fetch(path).then(r => r.json()).catch(() => []);

      let productFallback = [];
      let categoryFallback = [];
      let vendorFallback = [];
      if (policy.shouldUseJsonFallback(policy.classifyApiResult(productsAttempt))) {
        productFallback = await loadJson('data/products.json');
      }
      if (policy.shouldUseJsonFallback(policy.classifyApiResult(categoriesAttempt))) {
        categoryFallback = await loadJson('data/categories.json');
      }
      if (policy.shouldUseJsonFallback(policy.classifyApiResult(vendorsAttempt))) {
        vendorFallback = await loadJson('data/vendors.json');
      }

      const productsResolved = policy.resolveCollection(productsAttempt, productFallback);
      const categoriesResolved = policy.resolveCollection(categoriesAttempt, categoryFallback);
      const vendorsResolved = policy.resolveCollection(vendorsAttempt, vendorFallback);

      this.products = productsResolved.items.map(normalizeProduct);
      this.categories = categoriesResolved.items;
      this.vendors = vendorsResolved.items.map(normalizeVendor);
      this.banners = banners;
      this.coupons = coupons;
      this.bundles = bundles;
      this.healthCategories = healthCategories;
      this.recommendations = recommendations;
      this.loaded = true;

      const sources = [productsResolved.source, categoriesResolved.source, vendorsResolved.source];
      if (sources.every(s => s === 'api')) this.catalogSource = 'api';
      else if (sources.every(s => s === 'api-empty' || s === 'api')) {
        this.catalogSource = sources.some(s => s === 'api-empty') ? 'api-empty' : 'api';
      } else if (sources.some(s => s === 'json-fallback')) {
        this.catalogSource = sources.every(s => s === 'json-fallback' || s === 'api-error-empty')
          ? 'json-fallback'
          : 'mixed';
      } else {
        this.catalogSource = 'api-empty';
      }

      if (!productsAttempt.ok || !categoriesAttempt.ok || !vendorsAttempt.ok) {
        this.catalogError = 'One or more catalog API requests failed; JSON fallback used only for failed collections.';
      }
    } catch (e) {
      console.error('Failed to load data:', e);
      this.catalogError = e.message || String(e);
      this.catalogSource = 'api-error-empty';
      this.loaded = true;
    }
  },

  isCatalogEmpty() {
    return this.loaded && (!this.products || this.products.length === 0);
  },

  getProductById(id) {
    return this.products.find(p => p.id === id) || null;
  },

  getProductsByCategory(slug) {
    return this.products.filter(p => p.category === slug);
  },

  getFeaturedProducts() {
    return this.products.filter(p => p.isFeatured);
  },

  getBestsellers() {
    return this.products.filter(p => p.isBestseller);
  },

  getNewArrivals() {
    return this.products.filter(p => p.isNew);
  },

  getDeals() {
    return [...this.products].sort((a, b) => b.discount - a.discount).slice(0, 8);
  },

  getCategoryById(id) {
    return this.categories.find(c => c.id === id) || null;
  },

  getVendorById(id) {
    return this.vendors.find(v => v.id === id) || null;
  },

  getFeaturedVendors() {
    return this.vendors.filter(v => v.isFeatured && v.isActive);
  },

  getBundleById(id) {
    return this.bundles.find(b => b.id === id) || null;
  },

  getFeaturedBundles() {
    return this.bundles.filter(b => b.isFeatured);
  },

  getBestsellerBundles() {
    return this.bundles.filter(b => b.isBestseller);
  },

  getHealthCategoryById(id) {
    return this.healthCategories.find(h => h.id === id) || null;
  },

  getProductsByHealth(healthCategoryId) {
    const healthCat = this.getHealthCategoryById(healthCategoryId);
    if (!healthCat) return [];
    return this.products.filter(p =>
      (p.concerns && p.concerns.some(c => healthCat.id.includes(c))) ||
      (p.tags && p.tags.some(t => healthCat.slug.includes(t)))
    );
  },

  getProductsByVendor(vendorId) {
    return this.products.filter(p => p.vendor === vendorId);
  },

  getBundleProducts(bundleId) {
    const bundle = this.getBundleById(bundleId);
    if (!bundle) return [];
    return bundle.productIds.map(id => this.getProductById(id)).filter(p => p);
  },

  getRecommendationById(id) {
    return this.recommendations.find(r => r.id === id) || null;
  },

  getRecommendedProducts(recId) {
    const rec = this.getRecommendationById(recId);
    if (!rec || !rec.productIds) return [];
    return rec.productIds.map(id => this.getProductById(id)).filter(p => p);
  },

  /* Search products by name, brand, tags, keyIngredients, concerns */
  search(query) {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return this.products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      (p.tags && p.tags.some(t => t.includes(q))) ||
      (p.keyIngredients && p.keyIngredients.some(i => i.toLowerCase().includes(q))) ||
      (p.concerns && p.concerns.some(c => c.includes(q)))
    );
  },

  /* Filter products with multiple criteria */
  filterProducts({ category, query, minPrice, maxPrice, brands, minRating, minDiscount, skinTypes, concerns, certifications, sortBy }) {
    let results = [...this.products];

    if (category) results = results.filter(p => p.category === category);
    if (query) {
      const q = query.toLowerCase();
      results = results.filter(p =>
        p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) ||
        (p.tags && p.tags.some(t => t.includes(q))) ||
        (p.keyIngredients && p.keyIngredients.some(i => i.toLowerCase().includes(q)))
      );
    }
    if (minPrice !== undefined) results = results.filter(p => p.price >= minPrice);
    if (maxPrice !== undefined) results = results.filter(p => p.price <= maxPrice);
    if (brands && brands.length) results = results.filter(p => brands.includes(p.brand));
    if (minRating) results = results.filter(p => p.rating >= minRating);
    if (minDiscount) results = results.filter(p => p.discount >= minDiscount);
    if (skinTypes && skinTypes.length) results = results.filter(p => skinTypes.some(s => p.skinTypes && p.skinTypes.includes(s)));
    if (concerns && concerns.length) results = results.filter(p => concerns.some(c => p.concerns && p.concerns.includes(c)));
    if (certifications && certifications.length) results = results.filter(p => certifications.some(c => p.certifications && p.certifications.includes(c)));

    switch (sortBy) {
      case 'price-asc': results.sort((a, b) => a.price - b.price); break;
      case 'price-desc': results.sort((a, b) => b.price - a.price); break;
      case 'newest': results.sort((a, b) => b.isNew - a.isNew); break;
      case 'rating': results.sort((a, b) => b.rating - a.rating); break;
      case 'reviews': results.sort((a, b) => b.reviewCount - a.reviewCount); break;
      case 'discount': results.sort((a, b) => b.discount - a.discount); break;
    }
    return results;
  }
};
