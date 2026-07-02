# 🌿 Sunfara — Premium Organic & Wellness Marketplace

A complete ecommerce platform and enterprise admin dashboard for organic, natural, and wellness products. Built with vanilla HTML, CSS, and JavaScript.

**Live Demo**: [Sunfara on Netlify](#deployment)  
**Admin Panel**: `/admin.html` (Demo: `admin@sunfara.com` / `admin123`)

---

## 📋 Features

### 🛍️ Customer Storefront

- **Product Catalog**: 60+ products across 11 categories
- **Advanced Filtering**: Search, category filter, price range, ratings
- **Product Pages**: Detailed specs, customer reviews, certifications, ingredients
- **Smart Cart**: Real-time updates, quantity adjustments, coupon codes
- **Checkout Flow**: Multi-step process with address & payment options
- **User Accounts**: Login/signup, order history, wishlist, profile management
- **Responsive Design**: Mobile-first, optimized for all devices
- **Dark Mode**: Automatic theme switching based on system preference
- **Loyalty System**: 3-tier membership plans (Basic/Premium/Elite)

### 🏢 Enterprise Admin Dashboard

- **Vendor Management**: Onboarding, KYC verification, performance tracking
- **Product Moderation**: Approval workflow, bulk operations, stock management
- **Order Management**: Status tracking, refund processing, customer support
- **Financial Operations**: Commission calculation, vendor payouts, withdrawal requests
- **Analytics & Reports**: Revenue trends, category performance, customer insights
- **Support System**: Ticket triage, priority routing, activity logging
- **Access Control**: Role-based permissions (Super Admin, Moderator, Vendor, Customer)
- **Content Management**: Announcements, media library, membership plans
- **System Settings**: Store configuration, branding, security options

---

## 🏗️ Architecture

### Frontend Stack
- **Framework**: Vanilla JavaScript (no build tools)
- **Routing**: Hash-based SPA (#/page-name)
- **State Management**: localStorage-based Store
- **Design System**: CSS custom properties + responsive grid
- **Data**: JSON files + localStorage

### Admin Stack
- **UI**: Enterprise-grade vanilla HTML/CSS
- **Charts**: Chart.js (CDN)
- **Theme**: Light/dark mode with CSS variables
- **Responsive**: Mobile-friendly with collapsible sidebar

### Data Files
- `data/products.json` - 60 products with full schema
- `data/categories.json` - 11 product categories
- `data/banners.json` - Hero banners for homepage
- `data/coupons.json` - Discount codes (5 active)

---

## 🚀 Quick Start

### Installation
```bash
# Clone the repository
git clone <repo-url>
cd sunfara

# No build step needed! Just serve the files
# Option 1: Using Python
python -m http.server 8000

# Option 2: Using Node.js (http-server)
npx http-server

# Option 3: Using VS Code Live Server extension
# Right-click index.html → "Open with Live Server"
```

Visit `http://localhost:8000` in your browser.

### Access Admin Dashboard
1. Navigate to `http://localhost:8000/admin.html`
2. Login with demo credentials:
   - Email: `admin@sunfara.com`
   - Password: `admin123`

---

## 📁 Project Structure

```
sunfara/
├── index.html                 # Frontend entry point
├── admin.html                 # Admin dashboard entry point
├── netlify.toml              # Deployment config
├── data/
│   ├── products.json         # 60 products
│   ├── categories.json       # 11 categories
│   ├── banners.json          # Hero banners
│   └── coupons.json          # Coupon codes
├── css/
│   ├── variables.css         # Design tokens (colors, spacing, etc)
│   ├── reset.css             # Normalize styles
│   ├── typography.css        # Font scales and styles
│   ├── layout.css            # Grid, flexbox, layout
│   ├── components.css        # Buttons, cards, badges
│   ├── animations.css        # Transitions and keyframes
│   ├── navbar.css            # Navigation bar
│   ├── footer.css            # Footer
│   ├── home.css              # Homepage specific
│   ├── product-list.css      # Product listing
│   ├── product-detail.css    # Product detail page
│   ├── cart.css              # Shopping cart
│   ├── checkout.css          # Checkout flow
│   ├── auth.css              # Auth forms
│   ├── orders.css            # Order pages
│   ├── profile.css           # User profile
│   ├── wishlist.css          # Wishlist
│   ├── pages.css             # Other pages (about, blog, faq, contact)
│   ├── responsive.css        # Mobile breakpoints
│   └── admin.css             # Admin dashboard (600+ lines)
├── js/
│   ├── utils.js              # Helper functions (format, generate, etc)
│   ├── store.js              # State management (cart, wishlist, user, orders)
│   ├── data.js               # Data loading and caching
│   ├── router.js             # SPA routing
│   ├── firebase-config.js    # Firebase setup (optional)
│   ├── admin.js              # Admin logic (1200+ lines, all sections)
│   ├── components/
│   │   ├── navbar.js         # Navigation component
│   │   ├── footer.js         # Footer component
│   │   ├── toast.js          # Notifications
│   │   ├── modal.js          # Modal dialogs
│   │   ├── skeleton.js       # Loading skeletons
│   │   └── search.js         # Search dropdown
│   └── pages/
│       ├── home.js           # Homepage (10 sections)
│       ├── product-list.js   # Product listing with filters
│       ├── product-detail.js # Product detail
│       ├── cart.js           # Shopping cart
│       ├── checkout.js       # Multi-step checkout
│       ├── auth.js           # Login/signup
│       ├── orders.js         # Order history
│       ├── profile.js        # User profile
│       ├── wishlist.js       # Wishlist
│       ├── about.js          # About page
│       ├── certifications.js # Certifications
│       ├── blog.js           # Blog listing
│       ├── faq.js            # FAQ
│       └── contact.js        # Contact form
└── assets/
    ├── images/               # Category and product images
    ├── icons/                # Icon assets
    └── fonts/                # Custom fonts (if any)
```

---

## 🎨 Design System

### Colors
- **Primary**: `#4a7c59` (Forest Green)
- **Secondary**: `#c17f3b` (Warm Gold)
- **Accent**: `#e8c99a` (Cream)
- **Success**: `#4a7c59` (Green)
- **Error**: `#c0392b` (Red)
- **Warning**: `#e67e22` (Orange)
- **Info**: `#2980b9` (Blue)

### Typography
- **Display**: Playfair Display (serif)
- **Body**: DM Sans (sans-serif)
- **Sizes**: 12px (xs) to 36px (3xl)

### Responsive Breakpoints
- **Mobile**: 480px
- **Tablet**: 768px
- **Desktop**: 1024px
- **Large**: 1200px

### Components
- Buttons: primary, secondary, danger, ghost
- Cards: product, stat, testimonial, vendor
- Badges: 7 status types (active, pending, error, warning, etc)
- Tables: sortable, filterable, paginated
- Forms: inputs, selects, textareas, checkboxes
- Modals: centered, with header and footer
- Toasts: position sticky, auto-dismiss

---

## 🔧 Development

### Adding a New Page
1. Create `js/pages/newpage.js`
2. Define render function that sets `document.getElementById('page-content').innerHTML`
3. Add route to `js/router.js`
4. Add navigation link to navbar

### Adding a New Product Category
1. Edit `data/categories.json`
2. Add category object with id, name, slug, icon, image, description
3. Update products in `data/products.json` with new category id

### Modifying Admin Sections
All admin sections are in `js/admin.js`:
- Dashboard: `renderDashboard()`
- Products: `renderProducts()`
- Orders: `renderOrders()`
- Vendors: `renderVendors()`
- Commissions: `renderCommissions()`
- And 13 more sections...

Each renderer has mock data built in for demo purposes.

---

## 🚢 Deployment

### Deploy to Netlify

**Option 1: Drag & Drop**
1. Go to [netlify.com](https://netlify.com)
2. Drag the `sunfara` folder to Netlify
3. Your site is live!

**Option 2: Git Integration**
1. Push code to GitHub/GitLab
2. Connect repo to Netlify
3. Netlify auto-deploys on push

**Option 3: Netlify CLI**
```bash
npm install -g netlify-cli
netlify deploy --prod --dir .
```

The `netlify.toml` config handles:
- SPA routing (redirects to index.html)
- Security headers
- Cache-busting for assets
- Admin dashboard routing

---

## 📱 Browser Support

- Chrome/Edge: Latest
- Firefox: Latest
- Safari: Latest (iOS 13+)
- Mobile: iOS 12+, Android 6+

---

## 🔐 Security

- No sensitive data in localStorage beyond user session
- Password fields use proper input type
- CSRF protection via form tokens (add if using backend)
- XSS prevention via textContent (not innerHTML)
- Security headers configured in netlify.toml

---

## 📊 Admin Features Deep Dive

### Dashboard
- 4 KPI cards (Revenue, Orders, Vendors, Avg Value)
- Weekly sales bar chart
- Recent orders table
- Top vendors leaderboard
- Category performance breakdown

### Vendors
- Vendor listing with search/filter
- KYC status tracking (Verified/Pending/Rejected)
- Monthly earnings calculation
- Commission history per vendor
- Vendor detail modal

### Products
- Full CRUD operations
- Category filtering
- Stock level alerts (red <20, orange <50)
- Bulk actions support
- Search across name and brand

### Orders
- Status filtering (Processing, Shipped, Delivered, Cancelled)
- Customer details and email
- Order date and payment method
- Real-time status updates
- Refund linkage

### Commissions
- Monthly commission tracking
- Per-vendor breakdown
- Commission rate display
- Pending vs. paid status
- Automatic calculations

### Withdrawals
- Withdrawal request management
- Bank account masking
- Processing status tracking
- Approval workflow
- Date and amount logging

### Support Tickets
- Ticket priority (High/Medium/Low)
- Status workflow (Open → In Progress → Resolved)
- Customer assignment
- Activity timeline

### Analytics
- Revenue trends (7-day chart)
- Category-wise sales breakdown
- Traffic source attribution
- Conversion metrics
- Customer retention KPIs

---

## 🧪 Testing

### Manual Testing Checklist
- [ ] Test login with demo credentials
- [ ] Add product to cart
- [ ] Apply coupon code (e.g., SUMMER20)
- [ ] Complete checkout flow
- [ ] View order history
- [ ] Add to wishlist
- [ ] Toggle dark mode
- [ ] Test responsive design at 480px/768px/1024px
- [ ] Check admin dashboard sections load
- [ ] Update order status in admin
- [ ] Filter vendors by KYC status
- [ ] View commission details

### Browser DevTools
- Check console for errors
- Verify localStorage size
- Monitor network requests
- Test mobile emulation
- Profile performance

---

## 📝 License

This project is built as a demonstration marketplace platform for educational purposes.

---

## 🤝 Contributing

This is a complete marketplace platform. For improvements:
1. Test thoroughly before committing
2. Maintain responsive design
3. Keep state management centralized
4. Use semantic HTML
5. Follow existing code patterns

---

## 📞 Support

For issues or questions:
- Check the admin dashboard demo at `/admin.html`
- Review data files in `data/` folder
- Inspect CSS variables in `css/variables.css`
- Check router logic in `js/router.js`

---

**Built with ❤️ for Sunfara — Organic Beauty & Wellness**
