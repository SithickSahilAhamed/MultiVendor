/* Vendor Portal Configuration */

const VendorConfig = {
  sidebar: [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠', route: '#/vendor/dashboard' },
    { id: 'products', label: 'Products', icon: '📦', route: '#/vendor/products' },
    { id: 'orders', label: 'Orders', icon: '📋', route: '#/vendor/orders' },
    { id: 'earnings', label: 'Earnings & Payouts', icon: '💰', route: '#/vendor/earnings' }
  ],

  statusColors: { active: 'admin-status-active', pending: 'admin-status-pending', rejected: 'admin-status-rejected', processing: 'admin-status-processing' },
  statusLabels: {
    active: '🟢 Active', pending: '🟡 Pending', rejected: '🔴 Rejected',
    confirmed: '🔵 Confirmed', processing: '🔵 Processing', packed: '🟣 Packed',
    shipped: '🚚 Shipped', delivered: '✅ Delivered', completed: '✅ Completed', cancelled: '⚫ Cancelled'
  },

  /* Only the transitions a vendor is allowed to trigger themselves -
     mirrors OrderStateMachine on the backend, which is the real source
     of truth and will reject anything not listed here anyway.
     "pending" -> "confirmed" matters more than it looks: online-paid
     orders get auto-confirmed by Razorpay verification, but a COD order
     has no payment step to trigger that, so without this entry every COD
     order would sit at "pending" forever with no way for the vendor to
     ever move it - found by actually placing a COD order end-to-end. */
  nextVendorStatus: {
    pending: 'confirmed', confirmed: 'processing', processing: 'packed', packed: 'shipped', shipped: 'delivered'
  },
  nextVendorStatusLabel: {
    pending: 'Confirm Order', confirmed: 'Start Processing', processing: 'Mark as Packed', packed: 'Mark as Shipped', shipped: 'Mark as Delivered'
  }
};

Object.freeze(VendorConfig);
