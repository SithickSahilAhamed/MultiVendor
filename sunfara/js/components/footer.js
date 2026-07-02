/* ================================================
   footer.js — Renders Site Footer
   ================================================ */
const Footer = {
  init() {
    const footer = document.getElementById('footer');
    if (!footer) return;
    footer.innerHTML = `
      <!-- Newsletter section -->
      <div class="footer-newsletter">
        <div class="container">
          <div class="newsletter-text">
            <h3>Join the Sunfara Community</h3>
            <p>Get 10% off your first order + wellness tips delivered weekly</p>
          </div>
          <form class="newsletter-form" onsubmit="Footer.subscribeNewsletter(event)">
            <input type="email" id="newsletter-email" placeholder="Enter your email address" required aria-label="Email for newsletter" />
            <button type="submit" class="btn">Subscribe 🌿</button>
          </form>
        </div>
      </div>

      <!-- Footer top grid -->
      <div class="footer-top">
        <div class="container">
          <div class="footer-grid">
            <!-- Brand column -->
            <div class="footer-brand">
              <span class="footer-logo">🌿 Sunfara</span>
              <p>Pure, natural and conscious beauty products crafted with certified organic ingredients. Formulated for you, kind to the earth.</p>
              <div class="footer-social">
                <a href="#" class="social-link" aria-label="Instagram">📸</a>
                <a href="#" class="social-link" aria-label="Facebook">👍</a>
                <a href="#" class="social-link" aria-label="YouTube">▶️</a>
                <a href="#" class="social-link" aria-label="Pinterest">📌</a>
              </div>
              <div class="footer-certifications">
                <span class="cert-badge">🏅 USDA Organic</span>
                <span class="cert-badge">🐰 Cruelty-Free</span>
                <span class="cert-badge">🌱 Vegan</span>
              </div>
            </div>

            <!-- Shop column -->
            <div class="footer-col">
              <h4>Shop</h4>
              <div class="footer-links">
                <a href="#/category/organic-skincare">Organic Skincare</a>
                <a href="#/category/herbal-haircare">Herbal Haircare</a>
                <a href="#/category/natural-soaps">Natural Soaps</a>
                <a href="#/category/essential-oils">Essential Oils</a>
                <a href="#/category/organic-cosmetics">Organic Cosmetics</a>
                <a href="#/category/wellness">Wellness</a>
                <a href="#/category/ayurvedic">Ayurvedic</a>
                <a href="#/category/eco-personal-care">Eco Personal Care</a>
              </div>
            </div>

            <!-- Help column -->
            <div class="footer-col">
              <h4>Help</h4>
              <div class="footer-links">
                <a href="#/faq">FAQ</a>
                <a href="#/contact">Contact Us</a>
                <a href="#/orders">Track Order</a>
                <a href="#" onclick="Toast.show('Return policy: 15-day easy returns on all products','info')">Return Policy</a>
                <a href="#" onclick="Toast.show('Shipping: Free above ₹599, ₹49 flat otherwise','info')">Shipping Info</a>
                <a href="#" onclick="Toast.show('All transactions are 256-bit SSL encrypted','info')">Payment Security</a>
              </div>
            </div>

            <!-- Company column -->
            <div class="footer-col">
              <h4>Company</h4>
              <div class="footer-links">
                <a href="#/about">About Sunfara</a>
                <a href="#/certifications">Our Certifications</a>
                <a href="#/blog">Blog & Wellness Tips</a>
                <a href="#" onclick="Toast.show('Press enquiries: press@sunfara.com','info')">Press & Media</a>
                <a href="#" onclick="Toast.show('Wholesale: wholesale@sunfara.com','info')">Wholesale</a>
                <a href="#" onclick="Toast.show('Careers page coming soon!','info')">Careers</a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer bottom -->
      <div class="footer-bottom">
        <div class="container">
          <p>© ${new Date().getFullYear()} Sunfara Organics Pvt. Ltd. · All rights reserved · Made with 🌿 in India</p>
          <div class="footer-payment">
            <span class="payment-icon">VISA</span>
            <span class="payment-icon">MC</span>
            <span class="payment-icon">UPI</span>
            <span class="payment-icon">🔒 SSL</span>
          </div>
        </div>
      </div>`;
  },

  subscribeNewsletter(e) {
    e.preventDefault();
    const email = document.getElementById('newsletter-email')?.value;
    if (!email) return;
    try { localStorage.setItem('sunfara_newsletter', email); } catch (_) {}
    Toast.show('Welcome to the Sunfara community! Check your email for 10% off 🌿', 'success', 4000);
    e.target.reset();
  }
};
