/* ================================================
   contact.js — Contact Page
   Route: #/contact
   ================================================ */
const ContactPage = {
  render() {
    document.getElementById('page-content').innerHTML = `
      <div class="container section">
        <h2 style="margin-bottom:var(--space-2)">Get in Touch</h2>
        <p style="color:var(--color-text-muted);margin-bottom:var(--space-8)">We love hearing from our community. We reply to every message within 24 hours.</p>

        <div class="contact-layout">
          <!-- Contact Form -->
          <div class="contact-form-card">
            <h3 style="margin-bottom:var(--space-6)">Send us a Message</h3>
            <div id="contact-form-area">
              <div style="display:flex;flex-direction:column;gap:var(--space-4)">
                <div class="input-row">
                  <div class="input-group"><label class="input-label">Full Name <span class="required">*</span></label><input class="input" id="ct-name" placeholder="Your name"></div>
                  <div class="input-group"><label class="input-label">Email <span class="required">*</span></label><input class="input" id="ct-email" type="email" placeholder="your@email.com"></div>
                </div>
                <div class="input-group">
                  <label class="input-label">Subject <span class="required">*</span></label>
                  <select class="input" id="ct-subject">
                    <option value="">Select a subject</option>
                    <option>Order Issue</option>
                    <option>Product Query</option>
                    <option>Return / Refund</option>
                    <option>Wholesale Enquiry</option>
                    <option>Press / Media</option>
                    <option>Feedback</option>
                    <option>Other</option>
                  </select>
                </div>
                <div class="input-group"><label class="input-label">Message <span class="required">*</span></label><textarea class="input" id="ct-message" rows="5" placeholder="Tell us how we can help..."></textarea></div>
                <button class="btn btn-primary btn-lg" onclick="ContactPage.submit()">Send Message 🌿</button>
              </div>
            </div>
            <div class="contact-success" id="contact-success">
              <div style="font-size:3rem;margin-bottom:16px">🌿</div>
              <h3>Message Received!</h3>
              <p style="opacity:.85;margin-top:8px">Thank you for reaching out. Our team will get back to you within 24 hours at your registered email.</p>
            </div>
          </div>

          <!-- Contact Info -->
          <div class="contact-info-card">
            <div class="contact-info-item">
              <div class="contact-info-icon">📧</div>
              <div><h4>Email Us</h4><p style="font-size:.9rem">care@sunfara.com<br>For returns: returns@sunfara.com</p></div>
            </div>
            <div class="contact-info-item">
              <div class="contact-info-icon">📞</div>
              <div><h4>Call Us</h4><p style="font-size:.9rem">+91 80 4567 8900<br>Mon-Sat, 10am-6pm IST</p></div>
            </div>
            <div class="contact-info-item">
              <div class="contact-info-icon">📱</div>
              <div><h4>WhatsApp</h4><p style="font-size:.9rem">+91 98765 43210<br>Quick replies, Mon-Sat</p></div>
            </div>
            <div class="contact-info-item">
              <div class="contact-info-icon">📍</div>
              <div><h4>Head Office</h4><p style="font-size:.9rem">Sunfara Organics Pvt. Ltd.<br>Koramangala, Bangalore — 560034<br>Karnataka, India</p></div>
            </div>
            <div class="contact-info-item">
              <div class="contact-info-icon">📸</div>
              <div><h4>Follow Us</h4><p style="font-size:.9rem">@sunfaraorganics on Instagram<br>Share your #SunfaraGlow</p></div>
            </div>
            <div class="map-placeholder">🗺️</div>
          </div>
        </div>
      </div>`;
  },

  submit() {
    const name = document.getElementById('ct-name')?.value.trim();
    const email = document.getElementById('ct-email')?.value.trim();
    const subject = document.getElementById('ct-subject')?.value;
    const message = document.getElementById('ct-message')?.value.trim();

    if (!name) { Toast.show('Please enter your name', 'error'); return; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { Toast.show('Please enter a valid email', 'error'); return; }
    if (!subject) { Toast.show('Please select a subject', 'error'); return; }
    if (!message || message.length < 10) { Toast.show('Please enter a message (at least 10 characters)', 'error'); return; }

    document.getElementById('contact-form-area').style.display = 'none';
    document.getElementById('contact-success').classList.add('visible');
  }
};
