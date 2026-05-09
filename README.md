# 🌿 Sunfara - Beauty & Natural Products Marketplace

**Sunfara** is a modern, full-stack e-commerce platform for selling organic and natural beauty products, herbal care, and wellness items. This is an upgraded version of IQRAL with enhanced features, better UX, and modern technology stack.

## 🎯 About Sunfara

Sunfara is the **Hub of Beauty and Natural Products**, offering:
- **2100+ brands** with **1.3L+ products**
- **Organic & certified** beauty and wellness products
- **Multi-vendor** marketplace model
- **Premium** organic skincare, herbal haircare, baby foods, and more

### ✨ Key Features

**For Customers:**
- ✅ **Free Shipping** on orders above ₹499
- ✅ **Easy 15-Day Returns** - hassle-free return policy
- ✅ **100% Authentic Products** - guaranteed authenticity
- ✅ **2100+ Brands** - massive product catalog
- 🛒 Shopping cart with wishlist
- 👤 User authentication and profiles
- 📦 Order tracking and history
- 💳 Secure checkout with multiple payment options
- 🔍 Advanced search and filtering
- ⭐ Product ratings and reviews
- 🏪 Multi-vendor support

**For Admins:**
- 📊 Dashboard with analytics
- 📦 Product management (add, edit, delete)
- 👥 Customer management
- 🛒 Order management
- 🏷️ Coupon/discount management
- 📈 Sales analytics
- ⚙️ Store settings

## 🚀 Tech Stack

### Storefront
- **Hash-based SPA routing** — 16+ routes with dynamic params (`/product/:id`, `/category/:slug`)
- **Live search** — debounced 300ms, keyboard navigation (↑↓ / Enter / Escape), 6 results max
- **Product catalog** — 60 products across 8 categories with ratings, badges, variants
- **Filter & sort** — sidebar filters (category, price range, rating, certifications, skin type), mobile filter drawer
- **Product detail** — image gallery, variant selection, pincode delivery check, tab system (description/ingredients/how-to-use/reviews), "Customers Also Bought"
- **Cart** — quantity controls, delivery progress bar, persistent across sessions
- **Wishlist** — add/remove, move to cart, move all to cart, persistent
- **Coupon system** — 5 codes (percentage, flat, free shipping)
- **Multi-step checkout** — address → payment → success with animated checkmark
- **Order management** — order history, reorder, status tracking
- **User profile** — edit profile, address book, notification preferences
- **Auth** — login / signup with full validation, password toggle

### Pages
| Route | Page |
|---|---|
| `#/` | Home — hero slider, categories, deals countdown, trending, blog |
| `#/category/:slug` | Product list with filters |
| `#/product/:id` | Product detail |
| `#/cart` | Cart |
| `#/checkout` | Multi-step checkout |
| `#/orders` | Order history |
| `#/login` | Login / Signup |
| `#/wishlist` | Wishlist |
| `#/profile` | Profile |
| `#/about` | About us |
| `#/blog` | Blog |
| `#/faq` | FAQ accordion |
| `#/contact` | Contact form |
| `#/certifications` | Certifications & ingredients |

### Admin Dashboard (`/admin.html`)
- **Login** — `admin@sunfara.com` / `admin123`
- **Dashboard** — stat cards, weekly revenue bar chart, recent orders, top products
- **Products** — searchable table, add/edit modal with full form
- **Orders** — filter by status, update order status inline
- **Customers** — customer list with spend/order stats
- **Categories** — category management
- **Coupons** — coupon table, add new
- **Analytics** — revenue & traffic charts
- **Settings** — store settings, branding, admin account

### UX & Performance
- Skeleton loading shimmer (600ms delay before real content)
- Scroll-triggered reveal animations (IntersectionObserver)
- Toast notifications (stacked, auto-dismiss, 3 types)
- Modal system (confirm/alert)
- Back-to-top button
- Recently viewed products strip
- Mobile bottom tab bar + hamburger drawer
- Fully responsive (480px / 768px / 1024px breakpoints)
- localStorage persistence (cart, wishlist, user, orders)

---

## Folder Structure

```
sunfara/
├── index.html              # Main SPA shell
├── admin.html              # Admin dashboard shell
├── netlify.toml            # Netlify deployment config
│
├── css/
│   ├── variables.css       # Design tokens (colors, fonts, spacing)
│   ├── reset.css           # CSS reset
│   ├── typography.css      # Font imports + heading styles
│   ├── layout.css          # Grid/flex utilities
│   ├── components.css      # Buttons, cards, inputs, drawers, modal
│   ├── animations.css      # Keyframes + skeleton + reveal
│   ├── navbar.css          # 3-row navbar + mobile drawer + bottom tabs
│   ├── footer.css          # Newsletter + 4-col footer
│   ├── home.css            # Hero, categories, deals, trending sections
│   ├── product-list.css    # Filter sidebar + product grid
│   ├── product-detail.css  # Gallery, variants, tabs, reviews
│   ├── cart.css            # Cart layout + drawer
│   ├── checkout.css        # Step indicator + address/payment/success
│   ├── auth.css            # Login/signup card
│   ├── orders.css          # Order cards + accordion
│   ├── profile.css         # Profile sidebar + sections
│   ├── wishlist.css        # Wishlist grid + drawer
│   ├── pages.css           # About, blog, FAQ, contact, certifications
│   ├── responsive.css      # Breakpoint overrides (1024/768/480px)
│   └── admin.css           # All admin dashboard styles
│
├── data/
│   ├── products.json       # 60 products with full schema
│   ├── categories.json     # 8 categories
│   ├── banners.json        # 3 hero banners
│   └── coupons.json        # 5 coupon codes
│
└── js/
    ├── utils.js            # formatPrice, debounce, renderStars, etc.
    ├── store.js            # Cart, wishlist, user, orders, coupons (localStorage)
    ├── data.js             # Data fetching + filtering + search
    ├── router.js           # Hash router + initApp()
    ├── admin.js            # Admin dashboard logic
    │
    ├── components/
    │   ├── toast.js        # Toast notifications
    │   ├── modal.js        # Confirm/alert modal
    │   ├── skeleton.js     # Skeleton loading cards
    │   ├── search.js       # Live search dropdown
    │   ├── navbar.js       # Navbar render + cart/wishlist drawers
    │   └── footer.js       # Footer render
    │
    └── pages/
        ├── home.js         # Home page sections
        ├── product-list.js # Product list + filters + pagination
        ├── product-detail.js
        ├── cart.js
        ├── checkout.js
        ├── auth.js
        ├── orders.js
        ├── profile.js
        ├── wishlist.js
        ├── about.js
        ├── certifications.js
        ├── blog.js
        ├── faq.js
        └── contact.js
```

---

## Running Locally

No build step required. Open with any static file server:

**Option 1 — VS Code Live Server:**
1. Install the "Live Server" extension
2. Right-click `index.html` → "Open with Live Server"

**Option 2 — Python:**
```bash
cd sunfara
python -m http.server 8000
# Open http://localhost:8000
```

**Option 3 — Node (npx):**
```bash
npx serve sunfara
```

**Admin dashboard:** Navigate to `admin.html` in the same server (e.g., `http://localhost:8000/admin.html`)

---

## Deploying to Netlify

### Drag & Drop (fastest)
1. Go to [netlify.com](https://netlify.com) and sign in
2. Drag the entire `sunfara/` folder onto the deploy zone
3. Done — live in ~30 seconds

### Git + Netlify (recommended for ongoing updates)
1. Push your project to a GitHub repository
2. In Netlify: "Add new site" → "Import an existing project" → connect GitHub
3. Build settings:
   - **Base directory:** `sunfara` (or leave blank if the folder is the repo root)
   - **Build command:** *(leave empty)*
   - **Publish directory:** `.` (or `sunfara`)
4. Deploy — the `netlify.toml` handles all SPA redirects automatically

---

## Editing Content

### Add or Edit Products
Open `data/products.json`. Each product follows this schema:

```json
{
  "id": "SKN011",
  "name": "Product Name",
  "brand": "Brand Name",
  "category": "skincare",
  "subcategory": "moisturizers",
  "price": 899,
  "mrp": 1199,
  "discount": 25,
  "rating": 4.5,
  "reviewCount": 128,
  "stock": 50,
  "isNew": false,
  "isBestseller": true,
  "isFeatured": false,
  "tags": ["hydrating", "natural"],
  "certifications": ["Organic", "Cruelty-Free"],
  "skinTypes": ["dry", "normal"],
  "concerns": ["dryness", "dullness"],
  "keyIngredients": ["Hyaluronic Acid", "Aloe Vera"],
  "image": "images/products/skn011.jpg",
  "images": ["images/products/skn011.jpg"],
  "variants": [
    { "label": "50ml", "price": 899, "mrp": 1199 },
    { "label": "100ml", "price": 1499, "mrp": 1999 }
  ],
  "description": "Product description...",
  "ingredients": "Full ingredients list...",
  "howToUse": "Application instructions...",
  "highlights": ["Key benefit 1", "Key benefit 2"],
  "deliveryDays": 3,
  "returnDays": 7
}
```

### Add or Edit Coupons
Open `data/coupons.json`:

```json
{
  "code": "SAVE20",
  "type": "percentage",
  "value": 20,
  "minOrder": 500,
  "description": "20% off on orders above ₹500",
  "expiry": "2025-12-31",
  "usageLimit": 100
}
```

`type` can be `"percentage"`, `"flat"`, or `"freeship"`.

### Change Colors
Open `css/variables.css` and update the color tokens:

```css
--color-primary:       #4a7c59;   /* Main brand green */
--color-primary-dark:  #2d5a3d;   /* Darker green */
--color-primary-light: #e8f2eb;   /* Light green tint */
--color-accent:        #c4956a;   /* Warm earth accent */
```

### Change Fonts
Open `css/typography.css`. The Google Fonts import is at the top. Replace `Playfair+Display` and `DM+Sans` with your preferred fonts, then update the CSS variables in `variables.css`:

```css
--font-display: 'Playfair Display', Georgia, serif;
--font-body:    'DM Sans', system-ui, sans-serif;
```

### Add Product Images
Place images in `images/products/` and reference them in `products.json` as `"image": "images/products/filename.jpg"`. Recommended size: **600×600px** (square).

---

## Coupon Codes

| Code | Type | Value | Min Order |
|---|---|---|---|
| `WELCOME10` | 10% off | 10% | ₹299 |
| `ORGANIC15` | 15% off | 15% | ₹499 |
| `SUMMERCARE` | Flat ₹100 off | ₹100 | ₹599 |
| `FREESHIP` | Free shipping | — | ₹199 |
| `SUNFARA20` | 20% off | 20% | ₹799 |

---

## Admin Access

URL: `/admin.html`
- **Email:** `admin@sunfara.com`
- **Password:** `admin123`

To change credentials, edit the `AdminAuth.credentials` object in `js/admin.js`.

---

## Browser Compatibility

Tested and working in:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile Safari (iOS 14+)
- Chrome for Android

Requires: CSS Custom Properties, CSS Grid, Fetch API, IntersectionObserver, localStorage — all supported in any modern browser.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Markup | HTML5 |
| Styles | CSS3 (custom properties, grid, flexbox, animations) |
| Logic | Vanilla JavaScript (ES2020) |
| Fonts | Google Fonts (Playfair Display + DM Sans) |
| Data | JSON files fetched via Fetch API |
| Persistence | localStorage |
| Routing | Hash-based SPA (`window.location.hash`) |
| Deployment | Netlify (static hosting) |
| Dependencies | **None** |
