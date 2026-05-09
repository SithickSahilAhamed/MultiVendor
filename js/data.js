/* ================================================
   data.js — Loads JSON files and exposes Data globally
   All data is fetched once and cached on Data object
   ================================================ */

const Data = {
  products: [],
  categories: [],
  banners: [],
  coupons: [],
  loaded: false,

  /* Load all JSON files in parallel */
  async init() {
    try {
      const [products, categories, banners, coupons] = await Promise.all([
        fetch('data/products.json').then(r => r.json()),
        fetch('data/categories.json').then(r => r.json()),
        fetch('data/banners.json').then(r => r.json()),
        fetch('data/coupons.json').then(r => r.json())
      ]);
      this.products = products;
      this.categories = categories;
      this.banners = banners;
      this.coupons = coupons;
      this.loaded = true;
    } catch (e) {
      console.error('Failed to load data:', e);
    }
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
