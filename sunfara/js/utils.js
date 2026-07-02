/* ================================================
   utils.js — Helper Functions for Sunfara
   Exports: formatPrice, formatDate, generateId,
            debounce, renderStars, slugify, clamp
   ================================================ */

/* Format price in Indian Rupee format */
function formatPrice(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN');
}

/* Fills in every field the catalog UI assumes exists - not just card fields
   (variants, image, mrp, discount, brand, rating) but also the product
   detail page's fields (highlights, keyIngredients, ingredients, howToUse,
   description, delivery/return days). A minimally-created product (e.g.
   from the vendor/admin "Add Product" form, which only collects
   name/category/price/stock) has none of the description-page fields the
   demo catalog always had - without these defaults, opening that product's
   detail page throws on `undefined.map()` and the whole page fails to
   render, not just looks incomplete. */
function normalizeProduct(p) {
  const price = Number(p.price) || 0;
  const mrp = p.mrp != null ? Number(p.mrp) : price;
  const discount = p.discount != null ? Number(p.discount) : (mrp > price ? Math.round((mrp - price) / mrp * 100) : 0);
  const image = p.image || `https://placehold.co/500x500/4a7c59/ffffff.png?text=${encodeURIComponent((p.name || 'Product').slice(0, 26))}&font=montserrat`;
  return {
    ...p,
    brand: p.brand || p.vendorName || 'Sunfara',
    image,
    images: (p.images && p.images.length) ? p.images : [image],
    mrp, discount,
    rating: Number(p.rating) || 0,
    reviewCount: Number(p.reviewCount) || 0,
    stock: Number(p.stock) || 0,
    tags: p.tags || [],
    isNew: !!p.isNew, isBestseller: !!p.isBestseller, isFeatured: !!p.isFeatured,
    variants: (p.variants && p.variants.length) ? p.variants : [{ id: 'default', name: 'Standard', price }],
    category: p.category || 'general',
    description: p.description || 'No description provided yet.',
    ingredients: p.ingredients || 'Ingredient list not provided.',
    howToUse: p.howToUse || 'Usage instructions not provided.',
    highlights: p.highlights || [],
    keyIngredients: p.keyIngredients || [],
    certifications: p.certifications || [],
    deliveryDays: p.deliveryDays ?? 4,
    returnDays: p.returnDays ?? 7
  };
}

/* Same idea as normalizeProduct but for vendor storefronts: a
   self-registered vendor doc only has name/email/phone/status/commission -
   none of the storefront fields (tagline, logo, certifications,
   description) the vendor listing/detail pages assume exist. */
function normalizeVendor(v) {
  const name = v.name || 'Seller';
  return {
    ...v,
    tagline: v.tagline || 'Quality products, direct from the source.',
    logo: v.logo || `https://placehold.co/300x300/4a7c59/ffffff.png?text=${encodeURIComponent(name.slice(0, 2).toUpperCase())}&font=montserrat`,
    banner: v.banner || `https://placehold.co/1200x300/2e5c3a/ffffff.png?text=${encodeURIComponent(name)}&font=montserrat`,
    rating: Number(v.rating) || 0,
    reviewCount: Number(v.reviews ?? v.reviewCount) || 0,
    productsCount: Number(v.products ?? v.productsCount) || 0,
    certifications: v.certifications || [],
    description: v.description || `${name} is a seller on Sunfara's marketplace.`,
    address: v.address || '',
    verified: !!v.verified,
    joinedDate: v.joinedDate || v.createdAt || ''
  };
}

/* Format date to readable string */
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* Add N days to today and return formatted date string */
function addDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });
}

/* Generate a random order ID like SUN-2024-A7K9P2 */
function generateOrderId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const rand = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `SUN-${new Date().getFullYear()}-${rand}`;
}

/* Debounce: delays fn call until after `delay` ms of inactivity */
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/* Render HTML star rating (filled/empty) */
function renderStars(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  let html = '';
  for (let i = 1; i <= 5; i++) {
    if (i <= full) html += '<span class="star filled">★</span>';
    else if (i === full + 1 && half) html += '<span class="star filled">★</span>';
    else html += '<span class="star">★</span>';
  }
  return html;
}

/* Convert text to URL-friendly slug */
function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/* Clamp a number between min and max */
function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

/* Truncate text to maxLength chars */
function truncate(str, maxLength) {
  if (!str) return '';
  return str.length > maxLength ? str.slice(0, maxLength) + '...' : str;
}

/* Get image with fallback — returns img element HTML */
function imgWithFallback(src, alt, cls = '') {
  return `<img src="${src}" alt="${alt}" class="${cls}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" loading="lazy">
          <div class="gallery-fallback" style="display:none">🌿</div>`;
}

/* Simple img tag with fallback (no sibling div) */
function safeImg(src, alt, cls = '') {
  return `<img src="${src}" alt="${alt}" class="${cls}" onerror="this.src='';this.style.background='linear-gradient(135deg,#6a9e78,#4a7c59)'" loading="lazy">`;
}

/* Scroll page to top smoothly */
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* Setup IntersectionObserver for scroll-reveal animations */
function setupRevealAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target); // fire only once
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

/* Back-to-top button show/hide on scroll */
function setupBackToTop() {
  const btn = document.getElementById('back-to-top');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });
  btn.addEventListener('click', scrollToTop);
}
