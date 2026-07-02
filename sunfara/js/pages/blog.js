/* ================================================
   blog.js — Blog Page
   Route: #/blog
   ================================================ */
const BlogPage = {
  posts: [
    { id: 1, emoji: '🌸', tag: 'Skincare', title: '5 Ayurvedic Herbs for Glowing Skin', excerpt: 'Discover the ancient herbs that Ayurveda has trusted for centuries — Kumkumadi, Manjistha, Neem, Saffron, and Turmeric — now proven by modern dermatology to transform your complexion.', date: 'Jan 15, 2024', read: '5 min read', content: 'Ayurveda — the 5,000-year-old science of life — has long used botanical herbs to maintain healthy, radiant skin. Modern science is now validating what ancient practitioners always knew. Here are 5 herbs that form the backbone of Sunfara\'s formulations...' },
    { id: 2, emoji: '🧪', tag: 'Ingredients', title: 'Why We Never Use Parabens', excerpt: 'Parabens are preservatives found in 85% of conventional beauty products. Here\'s the science behind why they disrupt hormones, accumulate in body tissue — and what we use instead.', date: 'Dec 28, 2023', read: '3 min read', content: 'Parabens (methylparaben, propylparaben, butylparaben) are synthetic preservatives used in beauty products since the 1950s. Despite their widespread use, concerning research has emerged...' },
    { id: 3, emoji: '♻️', tag: 'Wellness', title: 'Building a Sustainable Skincare Routine', excerpt: 'Going green with your skincare doesn\'t mean sacrificing results. Our step-by-step guide shows how to build a zero-waste, effective routine using natural products that work.', date: 'Dec 10, 2023', read: '7 min read', content: 'Sustainable skincare is about more than just recyclable packaging. It\'s about choosing products with minimal environmental impact throughout their entire lifecycle...' },
    { id: 4, emoji: '💆', tag: 'Haircare', title: 'The Complete Guide to Scalp Health', excerpt: 'Your scalp is the foundation of healthy hair. Learn why scalp health matters, how to identify your scalp type, and which Ayurvedic ingredients to use for each concern.', date: 'Nov 22, 2023', read: '6 min read', content: 'Most people focus on their hair strands and forget the scalp entirely. But like soil for a garden, your scalp is everything. A healthy scalp pH, microbiome and circulation are prerequisites for strong, lustrous hair...' },
    { id: 5, emoji: '🌿', tag: 'Ingredients', title: 'Decoding the INCI List: A Beginner\'s Guide', excerpt: 'INCI names are the scientific names for ingredients on product labels. We break down how to read them, what to look for, and which red flags to avoid in any beauty product.', date: 'Nov 5, 2023', read: '8 min read', content: 'INCI stands for International Nomenclature of Cosmetic Ingredients — the standardised system for naming ingredients on beauty labels. Understanding INCI names empowers you to make truly informed choices...' },
    { id: 6, emoji: '☀️', tag: 'Skincare', title: 'Sun Protection the Natural Way', excerpt: 'Mineral sunscreens with zinc oxide are the gold standard for both effective and safe sun protection. Here\'s why chemical filters raise concerns — and our guide to natural SPF.', date: 'Oct 18, 2023', read: '4 min read', content: 'The sun protection debate has shifted dramatically. Chemical UV filters like oxybenzone and octinoxate are now under scrutiny for hormone disruption and coral reef damage. Natural mineral filters tell a different story...' }
  ],

  render() {
    document.getElementById('page-content').innerHTML = `
      <div class="container section">
        <div class="blog-hero">
          <h1>Sunfara Journal</h1>
          <p style="color:var(--color-text-muted);max-width:500px;margin:var(--space-4) auto 0">Wellness wisdom, ingredient education and honest skincare science — written by our team of experts.</p>
        </div>
        <div class="blog-full-grid">
          ${this.posts.map(post => `
            <div class="blog-card reveal" onclick="BlogPage.openPost(${post.id})">
              <div class="blog-card-cover" style="background:var(--color-cream)">${post.emoji}</div>
              <div class="blog-card-body">
                <span class="blog-tag">${post.tag}</span>
                <h3 class="blog-card-title">${post.title}</h3>
                <p class="blog-card-excerpt">${post.excerpt}</p>
                <div class="blog-meta"><span>${post.date}</span><span>·</span><span>${post.read}</span><span>·</span><a style="color:var(--color-primary)">Read More →</a></div>
              </div>
            </div>`).join('')}
        </div>
      </div>`;
    setupRevealAnimations();
  },

  openPost(id) {
    const post = this.posts.find(p => p.id === id);
    if (!post) return;
    Modal.show({
      title: post.title,
      content: `
        <div style="display:flex;gap:8px;margin-bottom:16px">
          <span class="blog-tag">${post.tag}</span>
          <span style="font-size:.75rem;color:var(--color-text-muted)">${post.date} · ${post.read}</span>
        </div>
        <p style="font-size:1.5rem;margin-bottom:16px">${post.emoji}</p>
        <p>${post.excerpt}</p>
        <p style="margin-top:16px">${post.content}</p>
        <p style="margin-top:16px;color:var(--color-text-muted);font-style:italic">Full article coming soon on our blog. Subscribe to our newsletter to be notified when new articles are published.</p>`,
      showCancel: false,
      confirmText: 'Close'
    });
  }
};
