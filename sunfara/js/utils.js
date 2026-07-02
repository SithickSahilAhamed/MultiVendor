/* ================================================
   utils.js — Helper Functions for Sunfara
   Exports: formatPrice, formatDate, generateId,
            debounce, renderStars, slugify, clamp
   ================================================ */

/* Format price in Indian Rupee format */
function formatPrice(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN');
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
