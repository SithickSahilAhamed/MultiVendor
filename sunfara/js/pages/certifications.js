/* ================================================
   certifications.js — Certifications & Ingredients Page
   Route: #/certifications
   ================================================ */
const CertificationsPage = {
  render() {
    document.getElementById('page-content').innerHTML = `
      <div class="container section">
        <div class="cert-hero">
          <h1>Ingredient Transparency</h1>
          <p>You deserve to know exactly what's in every product you put on your skin. No greenwashing, no hidden chemicals — just complete honesty.</p>
        </div>

        <section class="section-sm">
          <h2 style="text-align:center;margin-bottom:var(--space-8)">Our Certifications</h2>
          <div class="certifications-grid">
            ${[
              { icon: '🏅', name: 'USDA Organic', desc: 'Verifies that at least 95% of ingredients are certified organic, free from synthetic pesticides and GMOs.', benefit: 'What it means for you: the purest possible ingredients on your skin' },
              { icon: '🐰', name: 'Leaping Bunny (Cruelty-Free)', desc: 'Internationally recognised certification confirming no animal testing at any stage of production.', benefit: 'What it means for you: no animals harmed in making your products' },
              { icon: '🌱', name: 'Vegan Society Certified', desc: 'Confirms no animal-derived ingredients or byproducts — no beeswax, lanolin, or carmine in any product.', benefit: 'What it means for you: 100% plant-based formulations' },
              { icon: '✅', name: 'EWG Verified', desc: 'Environmental Working Group verification means every ingredient meets strict safety and transparency standards.', benefit: 'What it means for you: independently verified safety for all skin types' },
              { icon: '🔬', name: 'ISO 22716 (GMP)', desc: 'Good Manufacturing Practice certification ensures our production facility meets international hygiene and quality standards.', benefit: 'What it means for you: consistent, contamination-free products' },
              { icon: '🌾', name: 'Ayurvedic Certified', desc: 'Approved by the Ministry of AYUSH, India — confirming authentic Ayurvedic formulations following classical texts.', benefit: 'What it means for you: genuine ancient wisdom, modernly validated' }
            ].map(c => `
              <div class="cert-card reveal">
                <div class="cert-card-icon">${c.icon}</div>
                <h3>${c.name}</h3>
                <p>${c.desc}</p>
                <div class="customer-benefit">✓ ${c.benefit}</div>
              </div>`).join('')}
          </div>
        </section>

        <section class="section-sm">
          <div class="never-use-section">
            <h2 style="color:#c0392b;text-align:center">Ingredients We NEVER Use</h2>
            <p style="text-align:center;color:#555;margin-top:var(--space-2)">These 24 ingredients are permanently banned from every Sunfara formulation — no exceptions.</p>
            <div class="never-use-grid">
              ${['Parabens (all types)', 'Sulfates (SLS/SLES)', 'Phthalates', 'Mineral Oil', 'Formaldehyde & releasers', 'Artificial fragrances', 'Synthetic dyes (FD&C)', 'BHA & BHT', 'Petrolatum', 'Silicones (cyclic)', 'Oxybenzone', 'Triclosan', 'Hydroquinone', 'Mercury & mercury compounds', 'Talc (cosmetic grade)', 'Coal tar & derivatives', 'Lead & heavy metals', 'Ethanolamines (DEA/MEA/TEA)', 'Styrene', 'Toluene', 'PEG compounds', 'Propylene glycol (synthetic)', 'Quaternium-15', 'Resorcinol'].map(i => `<div class="never-item">✕ ${i}</div>`).join('')}
            </div>
          </div>
        </section>

        <section class="section-sm">
          <h2 style="text-align:center;margin-bottom:var(--space-8)">How We Source</h2>
          <div class="grid grid-3">
            ${[
              { icon: '🌾', title: 'Direct Farm Partnerships', desc: 'We partner directly with certified organic farms across India, paying above-market rates for the finest quality raw materials.' },
              { icon: '🔬', title: 'Third-Party Lab Testing', desc: 'Every batch is tested for purity, potency and contamination by independent ISO-certified laboratories before bottling.' },
              { icon: '📋', title: 'Full Traceability', desc: 'Every ingredient can be traced back to its exact farm of origin. Batch codes on every product link to full supply chain records.' },
              { icon: '🌍', title: 'Sustainable Harvesting', desc: 'We only source from farms that use sustainable agricultural practices — no water depletion, no soil degradation.' },
              { icon: '🤝', title: 'Fair Trade Commitment', desc: 'All our ingredient partners are paid fair trade prices, with additional premiums for women-led farms and cooperatives.' },
              { icon: '♻️', title: 'Minimal Processing', desc: 'We use cold-press extraction, steam distillation and gentle processing to preserve the full potency of natural ingredients.' }
            ].map(s => `
              <div class="cert-card reveal">
                <div class="cert-card-icon">${s.icon}</div>
                <h3>${s.title}</h3>
                <p>${s.desc}</p>
              </div>`).join('')}
          </div>
        </section>
      </div>`;
    setupRevealAnimations();
  }
};
