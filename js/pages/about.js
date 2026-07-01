/* ================================================
   about.js — About Page
   Route: #/about
   ================================================ */
const AboutPage = {
  render() {
    document.getElementById('page-content').innerHTML = `
      <div class="container section">
        <div class="about-hero">
          <h1>Our Story — From Nature, With Love</h1>
          <p>Founded in 2019, Sunfara was born from a simple belief: that what you put on your body matters as much as what you put in it. We set out to prove that effective skincare and clean, transparent formulas can coexist.</p>
        </div>

        <section class="section-sm">
          <div style="max-width:700px;margin:0 auto;text-align:center">
            <h2 style="margin-bottom:var(--space-4)">A Message from Our Founders</h2>
            <div style="background:var(--color-cream);border-radius:var(--radius-xl);padding:var(--space-8);font-style:italic;font-size:var(--text-lg);color:var(--color-text-secondary);line-height:1.8">
              "We started Sunfara after years of struggling to find beauty products that were both truly natural and genuinely effective. We refused to accept 'greenwashing' — the practice of making products sound natural while hiding harmful ingredients in fine print. Sunfara is our answer to that problem: 100% ingredient transparency, certified organic formulations, and packaging designed to leave the smallest possible footprint on the earth."
              <div style="margin-top:var(--space-4);font-style:normal;font-weight:600;color:var(--color-primary)">— Aanya & Vikram, Co-Founders</div>
            </div>
          </div>
        </section>

        <section class="section-sm">
          <h2 style="text-align:center;margin-bottom:var(--space-8)">Our Four Pillars</h2>
          <div class="brand-values-grid">
            ${[
              { icon: '🌿', title: 'Pure Ingredients', desc: 'Every ingredient we use is plant-derived, sustainably sourced and free from synthetic toxins. We never compromise on purity.' },
              { icon: '♻️', title: 'Sustainable Practices', desc: 'From farm to bottle, we minimise our environmental footprint. Recyclable packaging, carbon-neutral shipping, and zero plastic waste.' },
              { icon: '🔬', title: 'Transparent Formulas', desc: 'Every ingredient is listed clearly on our website with full explanations. No hidden chemicals, no marketing jargon — just honesty.' },
              { icon: '🤝', title: 'Community First', desc: 'We partner with small organic farms across India, paying fair prices and reinvesting 2% of profits into women-led agricultural cooperatives.' }
            ].map(v => `<div class="value-card reveal"><div class="value-icon">${v.icon}</div><h3>${v.title}</h3><p>${v.desc}</p></div>`).join('')}
          </div>
        </section>

        <section class="section-sm">
          <h2 style="text-align:center;margin-bottom:var(--space-8)">Our Journey</h2>
          <div class="timeline">
            ${[
              { year: '2019', title: 'Founded', desc: 'Aanya and Vikram quit their corporate jobs and launched Sunfara from their kitchen in Bangalore with 5 products.' },
              { year: '2020', title: 'First Products Launched', desc: 'Our Rose Hip Serum and Bhringraj Hair Oil became overnight bestsellers, with 500+ orders in the first month.' },
              { year: '2021', title: 'Organic Certification', desc: 'Received USDA Organic, Cruelty-Free (Leaping Bunny) and Vegan Society certifications — a milestone that took 2 years of work.' },
              { year: '2022', title: '10,000 Happy Customers', desc: 'Crossed 10,000 customers and launched our Ayurvedic collection in partnership with traditional vaidyas from Kerala.' },
              { year: '2023', title: 'Eco Packaging Overhaul', desc: 'Switched to 100% recyclable and biodegradable packaging, eliminating 15 tonnes of single-use plastic annually.' },
              { year: '2024', title: 'Pan-India Delivery', desc: 'Now delivering to 19,000+ pin codes across India with same-day dispatch from our Bangalore and Mumbai fulfillment centres.' }
            ].map(t => `
              <div class="timeline-item">
                <div class="timeline-content reveal">
                  <div class="timeline-year">${t.year}</div>
                  <h3>${t.title}</h3>
                  <p>${t.desc}</p>
                </div>
                <div class="timeline-dot"></div>
                <div style="flex:1"></div>
              </div>`).join('')}
          </div>
        </section>

        <section class="section-sm">
          <h2 style="text-align:center;margin-bottom:var(--space-8)">Meet the Team</h2>
          <div class="team-grid">
            ${[
              { initial: 'A', name: 'Aanya Sharma', role: 'Co-Founder & CEO', bio: 'Former biotech researcher with a passion for clean beauty. Leads product development and ingredient sourcing.' },
              { initial: 'V', name: 'Vikram Nair', role: 'Co-Founder & COO', bio: 'Supply chain expert who ensures every ingredient is ethically sourced and every delivery is on time.' },
              { initial: 'P', name: 'Priya Menon', role: 'Head of Formulation', bio: 'Cosmetic chemist with 12 years experience, dedicated to creating formulas that are both gentle and effective.' },
              { initial: 'R', name: 'Rahul Desai', role: 'Head of Community', bio: 'Wellness advocate who writes our blog, manages partnerships, and keeps our customer community thriving.' }
            ].map(m => `
              <div class="team-card reveal">
                <div class="team-avatar">${m.initial}</div>
                <div class="team-name">${m.name}</div>
                <div class="team-role">${m.role}</div>
                <p class="team-bio">${m.bio}</p>
              </div>`).join('')}
          </div>
        </section>

        <section class="section-sm" style="text-align:center">
          <h2 style="margin-bottom:var(--space-4)">Our Certifications</h2>
          <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:var(--space-6)">
            ${['🏅 USDA Organic', '🐰 Leaping Bunny', '🌱 Vegan Society', '🔬 Dermatologically Tested', '♻️ Eco-Certified'].map(c => `<div style="background:var(--color-cream);padding:var(--space-4) var(--space-6);border-radius:var(--radius-lg);font-weight:600">${c}</div>`).join('')}
          </div>
          <a href="#/certifications" class="btn btn-primary" style="margin-top:var(--space-6)">Learn About Our Certifications</a>
        </section>
      </div>`;
    setupRevealAnimations();
  }
};
