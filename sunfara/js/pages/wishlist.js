/* ================================================
   wishlist.js — Wishlist Page
   Route: #/wishlist
   ================================================ */
const WishlistPage = {
  render() {
    const main = document.getElementById('page-content');
    const products = Store.wishlist.map(id => Data.getProductById(id)).filter(Boolean);

    main.innerHTML = `
      <div class="container section">
        <div class="section-header">
          <div><h2 class="section-title">My Wishlist (${products.length})</h2></div>
          ${products.length ? `<button class="btn btn-outline btn-sm" onclick="WishlistPage.moveAllToCart()">Move All to Cart 🛒</button>` : ''}
        </div>
        ${products.length ? `
          <div class="wishlist-grid" id="wishlist-grid">
            ${products.map(p => this.wishlistCard(p)).join('')}
          </div>` :
        `<div class="empty-state">
            <div class="empty-state-icon">❤️</div>
            <h3>Nothing here yet</h3>
            <p>♥ products you love to save them for later</p>
            <a href="#/" class="btn btn-primary">Explore Products</a>
          </div>`}
      </div>`;
  },

  wishlistCard(p) {
    return `
      <div class="product-card wishlist-card" onclick="window.location.hash='#/product/${p.id}'">
        <button class="wishlist-remove-btn" onclick="event.stopPropagation();Store.toggleWishlist('${p.id}');WishlistPage.render();Toast.show('Removed from wishlist','info')" aria-label="Remove from wishlist">✕</button>
        <div class="product-card-image">
          <div class="card-badges">
            ${p.isNew ? '<span class="badge badge-new">NEW</span>' : ''}
            ${p.discount ? `<span class="badge badge-discount">${p.discount}% OFF</span>` : ''}
          </div>
          ${safeImg(p.image, p.name)}
        </div>
        <div class="product-card-body">
          <div class="product-card-brand">${p.brand}</div>
          <div class="product-card-name">${p.name}</div>
          <div class="product-card-rating"><span class="stars">${renderStars(p.rating)}</span> ${p.rating}</div>
          <div class="product-card-price">
            <span class="price-current">${formatPrice(p.price)}</span>
            <span class="price-mrp">${formatPrice(p.mrp)}</span>
          </div>
          <button class="wishlist-move-btn" onclick="event.stopPropagation();Store.moveToCart('${p.id}');WishlistPage.render();Toast.show('Moved to cart 🛒','success');Navbar.updateBadges()">Move to Cart →</button>
        </div>
      </div>`;
  },

  moveAllToCart() {
    Store.wishlist.forEach(id => { const p = Data.getProductById(id); if (p) Store.addToCart(id, p.variants[0].id, 1); });
    Store.wishlist = [];
    Store.save();
    Store.emit('wishlist-updated');
    Toast.show('All items moved to cart 🛒', 'success');
    Navbar.updateBadges();
    this.render();
  }
};
