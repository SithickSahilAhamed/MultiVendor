/* ================================================
   faq.js — FAQ Page
   Route: #/faq
   ================================================ */
const FaqPage = {
  faqs: {
    'Shipping': [
      { q: 'How long does delivery take?', a: 'Standard delivery takes 3-5 business days across India. Express delivery (1-2 days) is available in metro cities at an additional charge.' },
      { q: 'What are the shipping charges?', a: 'Shipping is FREE on all orders above ₹599. For orders below ₹599, a flat ₹49 delivery fee applies.' },
      { q: 'Do you deliver to all states in India?', a: 'Yes! We deliver to 19,000+ pin codes across all 28 states and 8 union territories of India.' },
      { q: 'Can I track my order?', a: 'Absolutely. Once your order is shipped, you\'ll receive an SMS/email with a tracking link. You can also track from the My Orders section.' },
      { q: 'Do you offer international shipping?', a: 'Currently we ship only within India. International shipping is coming soon — sign up for our newsletter to be notified!' }
    ],
    'Returns': [
      { q: 'What is your return policy?', a: 'We offer a 15-day no-questions-asked return policy on all products. If you\'re not happy, we\'ll make it right.' },
      { q: 'How do I initiate a return?', a: 'Go to My Orders, click "Need Help?" on the relevant order, and select "Return Item". Our team will arrange a free pickup within 48 hours.' },
      { q: 'When will I get my refund?', a: 'Refunds are processed within 5-7 business days after we receive the returned product. UPI/card refunds are typically faster.' },
      { q: 'Can I exchange a product?', a: 'Yes! You can exchange for the same product in a different variant, or opt for store credit if you\'d prefer another product.' },
      { q: 'What if I received a damaged product?', a: 'We\'re sorry to hear that. Email us at care@sunfara.com with photos within 48 hours of delivery and we\'ll send a replacement immediately, free of charge.' }
    ],
    'Products': [
      { q: 'Are all Sunfara products truly organic?', a: 'Our "USDA Organic" certified products contain 95%+ certified organic ingredients. All Sunfara products are free from synthetic preservatives, fragrances and harmful chemicals.' },
      { q: 'Are your products suitable for sensitive skin?', a: 'Most of our products are formulated for all skin types including sensitive skin. Each product page lists skin types it is suitable for. We recommend a patch test for very reactive skin.' },
      { q: 'Do your products have expiry dates?', a: 'Yes. Every product has a manufacturing date and best-before date printed on the packaging. Most products last 12-24 months from manufacturing and 6-12 months after opening (PAO symbol).' },
      { q: 'Can I use multiple Sunfara products together?', a: 'Absolutely! Our products are designed to work synergistically. Visit our blog for routine guides, or contact us for a personalised routine recommendation.' },
      { q: 'Are your products tested for efficacy?', a: 'Yes. All our products undergo clinical testing with dermatologist oversight and consumer trials before launch. Specific test results are available on product pages.' }
    ],
    'Ingredients': [
      { q: 'Where do you source your ingredients?', a: 'We partner directly with certified organic farms across India — primarily from Kerala, Uttarakhand, and Rajasthan. Some specialty ingredients (like argan and rosehip) are sourced from Morocco and Chile.' },
      { q: 'Are your products vegan?', a: 'The vast majority of our products are fully vegan. Products that use beeswax or honey are clearly labeled. Our Vegan Society certified products are marked on the product page.' },
      { q: 'Do you use any synthetic fragrances?', a: 'Never. All Sunfara products are scented only with pure essential oils and natural botanical extracts. We do not use synthetic fragrances or phthalates.' },
      { q: 'What does "paraben-free" actually mean?', a: 'Parabens are synthetic preservatives (methylparaben, propylparaben etc.) linked to hormone disruption. None of our products contain any form of paraben — we use natural preservation systems instead.' },
      { q: 'Can I see the full ingredient list before buying?', a: 'Always! Every product page lists the complete INCI ingredient list. We also explain what each key ingredient does and why we chose it.' }
    ],
    'Orders': [
      { q: 'Can I change or cancel my order?', a: 'Orders can be cancelled or modified within 2 hours of placement. After that, the order may have been dispatched. Contact us immediately at care@sunfara.com.' },
      { q: 'I forgot to apply my coupon. Can it be applied later?', a: 'Unfortunately coupons cannot be applied after order placement. However, contact our support team — we\'ll often honour it as store credit for your next order.' },
      { q: 'Can I place a bulk/wholesale order?', a: 'Yes! For bulk orders (above 50 units), contact us at wholesale@sunfara.com for special pricing and custom packaging options.' },
      { q: 'Do you offer gift wrapping?', a: 'Yes! Add gift wrapping at checkout for ₹49. You can include a personalised message card and we\'ll use our signature eco-friendly kraft paper wrapping.' },
      { q: 'Is my payment information secure?', a: 'Absolutely. All transactions are 256-bit SSL encrypted. We do not store card information. Payments are processed by RazorPay, a PCI-DSS Level 1 certified payment gateway.' }
    ]
  },

  render() {
    const sections = Object.keys(this.faqs);
    document.getElementById('page-content').innerHTML = `
      <div class="container section">
        <div class="faq-hero">
          <h1>Frequently Asked Questions</h1>
          <p style="color:var(--color-text-muted)">Can't find an answer? <a href="#/contact" style="color:var(--color-primary)">Contact our team</a> — we reply within 24 hours.</p>
        </div>
        <div class="faq-categories">
          ${sections.map((s, i) => `<button class="faq-cat-btn ${i===0?'active':''}" onclick="FaqPage.scrollToSection('${s}',this)">${s}</button>`).join('')}
        </div>
        ${sections.map(section => `
          <div class="faq-section" id="faq-${section}">
            <h2 class="faq-section-title">${section}</h2>
            ${this.faqs[section].map((item, idx) => `
              <div class="faq-item" id="faq-item-${section}-${idx}">
                <div class="faq-question" onclick="FaqPage.toggle('${section}',${idx})">
                  <span>${item.q}</span>
                  <span class="faq-icon">+</span>
                </div>
                <div class="faq-answer"><div class="faq-answer-inner">${item.a}</div></div>
              </div>`).join('')}
          </div>`).join('')}
      </div>`;
  },

  toggle(section, idx) {
    const item = document.getElementById(`faq-item-${section}-${idx}`);
    if (!item) return;
    item.classList.toggle('open');
  },

  scrollToSection(section, btn) {
    document.querySelectorAll('.faq-cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`faq-${section}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};
