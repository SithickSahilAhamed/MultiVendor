// server.js - Sunfara Express Backend with Firebase Integration
// Complete Multi-Vendor Marketplace with Reviews, Commissions, Inventory

const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
require("dotenv").config();

// Initialize Express
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));

// Initialize Firebase Admin SDK
const serviceAccount = require("./firebase-service-key.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

const db = admin.firestore();
const auth = admin.auth();

// ==================== HELPER FUNCTIONS ====================

// Simple authentication middleware (using userId from header)
const authenticate = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  const token = req.headers['authorization'];

  if (!userId && !token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.userId = userId || token;
  next();
};

// Verify vendor ownership
const verifyVendor = async (req, res, next) => {
  try {
    const vendor = await db.collection('vendors').doc(req.userId).get();
    if (!vendor.exists || vendor.data().status !== 'active') {
      return res.status(403).json({ error: 'Vendor access required' });
    }
    req.vendor = { id: vendor.id, ...vendor.data() };
    next();
  } catch (error) {
    res.status(403).json({ error: 'Forbidden' });
  }
};

// Get average rating for product
async function getProductRating(productId) {
  const reviews = await db.collection('reviews')
    .where('productId', '==', productId)
    .where('status', '==', 'approved')
    .get();

  if (reviews.empty) return 0;

  let total = 0;
  reviews.forEach(doc => {
    total += doc.data().rating;
  });
  return (total / reviews.size).toFixed(1);
}

// Calculate commission
function calculateCommission(amount, vendorId, commissionRate = 10) {
  const commission = (amount * commissionRate) / 100;
  return {
    total: amount,
    commission,
    net_to_vendor: amount - commission,
    commission_rate: commissionRate
  };
}

// Reserve inventory
async function reserveInventory(productId, quantity) {
  const product = await db.collection('products').doc(productId).get();
  if (!product.exists) throw new Error('Product not found');

  const inventory = product.data().inventory || { stock: 0, reserved: 0 };
  if (inventory.stock - inventory.reserved < quantity) {
    throw new Error('Insufficient stock');
  }

  await db.collection('products').doc(productId).update({
    'inventory.reserved': (inventory.reserved || 0) + quantity
  });
}

// Confirm inventory (move from reserved to sold)
async function confirmInventory(productId, quantity) {
  const product = await db.collection('products').doc(productId).get();
  const inventory = product.data().inventory || { stock: 0, reserved: 0 };

  await db.collection('products').doc(productId).update({
    'inventory.stock': inventory.stock - quantity,
    'inventory.reserved': Math.max(0, (inventory.reserved || 0) - quantity)
  });
}

// ==================== VENDOR ENDPOINTS ====================

// GET all vendors
app.get("/api/vendors", async (req, res) => {
  try {
    const snapshot = await db.collection("vendors").get();
    const vendors = [];
    snapshot.forEach(doc => {
      vendors.push({ id: doc.id, ...doc.data() });
    });
    res.json(vendors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET vendor by ID
app.get("/api/vendors/:id", async (req, res) => {
  try {
    const doc = await db.collection("vendors").doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Vendor not found" });
    }
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create vendor
app.post("/api/vendors", async (req, res) => {
  try {
    const { name, email, phone, status, commission } = req.body;
    const vendor = {
      name,
      email,
      phone,
      status: status || "pending",
      commission: commission || 8,
      products: 0,
      revenue: 0,
      rating: 0,
      reviews: 0,
      kycStatus: "pending",
      verified: false,
      createdAt: new Date().toISOString()
    };
    
    const docRef = await db.collection("vendors").add(vendor);
    res.status(201).json({ id: docRef.id, ...vendor });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update vendor
app.put("/api/vendors/:id", async (req, res) => {
  try {
    await db.collection("vendors").doc(req.params.id).update(req.body);
    const doc = await db.collection("vendors").doc(req.params.id).get();
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE vendor
app.delete("/api/vendors/:id", async (req, res) => {
  try {
    await db.collection("vendors").doc(req.params.id).delete();
    res.json({ message: "Vendor deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== PRODUCT ENDPOINTS ====================

// GET all products
app.get("/api/products", async (req, res) => {
  try {
    const snapshot = await db.collection("products").get();
    const products = [];
    snapshot.forEach(doc => {
      products.push({ id: doc.id, ...doc.data() });
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create product
app.post("/api/products", async (req, res) => {
  try {
    const product = {
      ...req.body,
      createdAt: new Date().toISOString(),
      status: req.body.status || "pending"
    };
    const docRef = await db.collection("products").add(product);
    res.status(201).json({ id: docRef.id, ...product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update product
app.put("/api/products/:id", async (req, res) => {
  try {
    await db.collection("products").doc(req.params.id).update(req.body);
    const doc = await db.collection("products").doc(req.params.id).get();
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ORDER ENDPOINTS ====================

// GET all orders
app.get("/api/orders", async (req, res) => {
  try {
    const snapshot = await db.collection("orders").get();
    const orders = [];
    snapshot.forEach(doc => {
      orders.push({ id: doc.id, ...doc.data() });
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET order by ID
app.get("/api/orders/:id", async (req, res) => {
  try {
    const doc = await db.collection("orders").doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create order
app.post("/api/orders", async (req, res) => {
  try {
    const order = {
      ...req.body,
      createdAt: new Date().toISOString(),
      status: "pending"
    };
    const docRef = await db.collection("orders").add(order);
    res.status(201).json({ id: docRef.id, ...order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update order status
app.put("/api/orders/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    await db.collection("orders").doc(req.params.id).update({
      status,
      updatedAt: new Date().toISOString()
    });
    const doc = await db.collection("orders").doc(req.params.id).get();
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== CUSTOMER ENDPOINTS ====================

// GET all customers
app.get("/api/customers", async (req, res) => {
  try {
    const snapshot = await db.collection("customers").get();
    const customers = [];
    snapshot.forEach(doc => {
      customers.push({ id: doc.id, ...doc.data() });
    });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create customer
app.post("/api/customers", async (req, res) => {
  try {
    const customer = {
      ...req.body,
      createdAt: new Date().toISOString()
    };
    const docRef = await db.collection("customers").add(customer);
    res.status(201).json({ id: docRef.id, ...customer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== COMMISSION ENDPOINTS ====================

// GET commissions
app.get("/api/commissions", async (req, res) => {
  try {
    const snapshot = await db.collection("commissions").get();
    const commissions = [];
    snapshot.forEach(doc => {
      commissions.push({ id: doc.id, ...doc.data() });
    });
    res.json(commissions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create commission
app.post("/api/commissions", async (req, res) => {
  try {
    const commission = {
      ...req.body,
      createdAt: new Date().toISOString()
    };
    const docRef = await db.collection("commissions").add(commission);
    res.status(201).json({ id: docRef.id, ...commission });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== WITHDRAWAL ENDPOINTS ====================

// GET withdrawals
app.get("/api/withdrawals", async (req, res) => {
  try {
    const snapshot = await db.collection("withdrawals").get();
    const withdrawals = [];
    snapshot.forEach(doc => {
      withdrawals.push({ id: doc.id, ...doc.data() });
    });
    res.json(withdrawals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create withdrawal request
app.post("/api/withdrawals", async (req, res) => {
  try {
    const withdrawal = {
      ...req.body,
      createdAt: new Date().toISOString(),
      status: "pending"
    };
    const docRef = await db.collection("withdrawals").add(withdrawal);
    res.status(201).json({ id: docRef.id, ...withdrawal });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT approve withdrawal
app.put("/api/withdrawals/:id/approve", async (req, res) => {
  try {
    await db.collection("withdrawals").doc(req.params.id).update({
      status: "approved",
      approvedAt: new Date().toISOString()
    });
    const doc = await db.collection("withdrawals").doc(req.params.id).get();
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ANALYTICS ENDPOINTS ====================

// GET dashboard stats
app.get("/api/analytics/dashboard", async (req, res) => {
  try {
    const ordersSnapshot = await db.collection("orders").get();
    const vendorsSnapshot = await db.collection("vendors").get();
    const customersSnapshot = await db.collection("customers").get();

    const stats = {
      totalOrders: ordersSnapshot.size,
      activeVendors: vendorsSnapshot.docs.filter(d => d.data().status === "active").length,
      totalCustomers: customersSnapshot.size,
      totalRevenue: 0
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== REVIEWS & RATINGS ====================

// Get all reviews for a product
app.get("/api/products/:productId/reviews", async (req, res) => {
  try {
    const { limit = 10, offset = 0 } = req.query;
    const reviews = await db.collection('reviews')
      .where('productId', '==', req.params.productId)
      .where('status', '==', 'approved')
      .orderBy('created_at', 'desc')
      .limit(parseInt(limit))
      .offset(parseInt(offset))
      .get();

    const data = [];
    reviews.forEach(doc => {
      data.push({ id: doc.id, ...doc.data() });
    });

    // Get rating stats
    const allReviews = await db.collection('reviews')
      .where('productId', '==', req.params.productId)
      .where('status', '==', 'approved')
      .get();

    const ratingStats = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0, total: 0, average: 0 };
    let totalRating = 0;

    allReviews.forEach(doc => {
      const rating = doc.data().rating;
      ratingStats[rating]++;
      ratingStats.total++;
      totalRating += rating;
    });

    if (ratingStats.total > 0) {
      ratingStats.average = (totalRating / ratingStats.total).toFixed(1);
    }

    res.json({ reviews: data, stats: ratingStats, total: allReviews.size });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a review (customer)
app.post("/api/reviews", authenticate, async (req, res) => {
  try {
    const { productId, orderId, rating, title, comment, images } = req.body;

    // Verify purchase
    const order = await db.collection('orders').doc(orderId).get();
    if (!order.exists || order.data().customerId !== req.userId) {
      return res.status(403).json({ error: 'Verified purchase required' });
    }

    // Check if already reviewed
    const existingReview = await db.collection('reviews')
      .where('productId', '==', productId)
      .where('customerId', '==', req.userId)
      .get();

    if (!existingReview.empty) {
      return res.status(400).json({ error: 'You have already reviewed this product' });
    }

    const review = {
      productId,
      orderId,
      customerId: req.userId,
      rating: parseInt(rating),
      title,
      comment,
      images: images || [],
      verified_purchase: true,
      status: 'pending',
      helpful_count: 0,
      unhelpful_count: 0,
      created_at: new Date()
    };

    const docRef = await db.collection('reviews').add(review);
    res.status(201).json({ id: docRef.id, ...review });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get pending reviews (admin)
app.get("/api/admin/reviews/pending", authenticate, async (req, res) => {
  try {
    const reviews = await db.collection('reviews')
      .where('status', '==', 'pending')
      .orderBy('created_at', 'asc')
      .get();

    const data = [];
    reviews.forEach(doc => {
      data.push({ id: doc.id, ...doc.data() });
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve/Reject review (admin)
app.post("/api/admin/reviews/:reviewId/:action", authenticate, async (req, res) => {
  try {
    const { reviewId, action } = req.params;
    const { comment } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    await db.collection('reviews').doc(reviewId).update({
      status: action === 'approve' ? 'approved' : 'rejected',
      moderator_comment: comment || null,
      updated_at: new Date()
    });

    const doc = await db.collection('reviews').doc(reviewId).get();
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Vendor reply to review
app.post("/api/reviews/:reviewId/reply", authenticate, verifyVendor, async (req, res) => {
  try {
    const { reply } = req.body;
    const review = await db.collection('reviews').doc(req.params.reviewId).get();

    if (!review.exists) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Verify vendor owns the product
    const product = await db.collection('products').doc(review.data().productId).get();
    if (product.data().vendorId !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await db.collection('reviews').doc(req.params.reviewId).update({
      vendor_reply: reply,
      vendor_replied_at: new Date()
    });

    res.json({ message: 'Reply added successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== COMMISSION ENDPOINTS ====================

// Get vendor commissions
app.get("/api/vendor/commissions", authenticate, verifyVendor, async (req, res) => {
  try {
    const commissions = await db.collection('commissions')
      .where('vendorId', '==', req.userId)
      .orderBy('created_at', 'desc')
      .get();

    const data = [];
    commissions.forEach(doc => {
      data.push({ id: doc.id, ...doc.data() });
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get vendor earnings summary
app.get("/api/vendor/earnings", authenticate, verifyVendor, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = new Date(startDate);
    const end = new Date(endDate);

    const commissions = await db.collection('commissions')
      .where('vendorId', '==', req.userId)
      .where('created_at', '>=', start)
      .where('created_at', '<=', end)
      .get();

    let totalEarnings = 0;
    let totalCommissions = 0;
    let totalFees = 0;
    let totalOrders = 0;

    commissions.forEach(doc => {
      const comm = doc.data();
      totalEarnings += comm.net_to_vendor || 0;
      totalCommissions += comm.commission?.amount || 0;
      totalFees += (comm.platformFee || 0) + (comm.paymentGatewayFee || 0);
      totalOrders++;
    });

    res.json({
      totalEarnings: totalEarnings.toFixed(2),
      totalCommissions: totalCommissions.toFixed(2),
      totalFees: totalFees.toFixed(2),
      totalOrders,
      period: { start: start.toISOString(), end: end.toISOString() }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create commission when order is placed
app.post("/api/commissions/order/:orderId", async (req, res) => {
  try {
    const order = await db.collection('orders').doc(req.params.orderId).get();
    if (!order.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const items = order.data().items || [];
    let createdCommissions = [];

    for (const item of items) {
      const product = await db.collection('products').doc(item.productId).get();
      if (!product.exists) continue;

      const vendor = product.data().vendorId;
      const vendorSettings = await db.collection('vendors').doc(vendor).get();
      const commissionRate = vendorSettings.data()?.commission || 10;

      const commCalc = calculateCommission(item.price * item.quantity, vendor, commissionRate);

      const commission = {
        vendorId: vendor,
        orderId: req.params.orderId,
        productId: item.productId,
        amount: item.price * item.quantity,
        commission_rate: commissionRate,
        commission_amount: commCalc.commission,
        net_to_vendor: commCalc.net_to_vendor,
        status: 'pending',
        created_at: new Date()
      };

      const docRef = await db.collection('commissions').add(commission);
      createdCommissions.push({ id: docRef.id, ...commission });
    }

    res.json({ created: createdCommissions.length, commissions: createdCommissions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Request withdrawal
app.post("/api/vendor/withdrawal", authenticate, verifyVendor, async (req, res) => {
  try {
    const { amount, bankDetails } = req.body;

    // Validate amount against pending commissions
    const commissions = await db.collection('commissions')
      .where('vendorId', '==', req.userId)
      .where('status', '==', 'pending')
      .get();

    let totalAvailable = 0;
    commissions.forEach(doc => {
      totalAvailable += doc.data().net_to_vendor || 0;
    });

    if (amount > totalAvailable) {
      return res.status(400).json({ error: `Insufficient balance. Available: ₹${totalAvailable.toFixed(2)}` });
    }

    const withdrawal = {
      vendorId: req.userId,
      amount: parseFloat(amount),
      bank_details: bankDetails,
      status: 'pending',
      created_at: new Date()
    };

    const docRef = await db.collection('withdrawals').add(withdrawal);

    // Mark commissions as in withdrawal
    let selected = 0;
    let accumulated = 0;
    for (const doc of commissions.docs) {
      if (accumulated >= amount) break;
      accumulated += doc.data().net_to_vendor;
      await doc.ref.update({ status: 'withdrawal_pending' });
      selected++;
    }

    res.status(201).json({
      id: docRef.id,
      ...withdrawal,
      commissionsIncluded: selected
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get withdrawal requests (admin)
app.get("/api/admin/withdrawals", authenticate, async (req, res) => {
  try {
    const withdrawals = await db.collection('withdrawals')
      .where('status', 'in', ['pending', 'approved'])
      .orderBy('created_at', 'asc')
      .get();

    const data = [];
    withdrawals.forEach(doc => {
      data.push({ id: doc.id, ...doc.data() });
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve withdrawal (admin)
app.post("/api/admin/withdrawals/:withdrawalId/approve", authenticate, async (req, res) => {
  try {
    const withdrawal = await db.collection('withdrawals').doc(req.params.withdrawalId).get();
    if (!withdrawal.exists) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    await db.collection('withdrawals').doc(req.params.withdrawalId).update({
      status: 'approved',
      approval_date: new Date()
    });

    // Update related commissions
    const commissions = await db.collection('commissions')
      .where('vendorId', '==', withdrawal.data().vendorId)
      .where('status', '==', 'withdrawal_pending')
      .get();

    commissions.forEach(doc => {
      doc.ref.update({ status: 'settled' });
    });

    res.json({ message: 'Withdrawal approved and commissions settled' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== INVENTORY ENDPOINTS ====================

// Get product inventory
app.get("/api/products/:productId/inventory", async (req, res) => {
  try {
    const product = await db.collection('products').doc(req.params.productId).get();
    if (!product.exists) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const inventory = product.data().inventory || { stock: 0, reserved: 0 };
    res.json({
      productId: req.params.productId,
      stock: inventory.stock,
      reserved: inventory.reserved,
      available: inventory.stock - (inventory.reserved || 0),
      low_stock_threshold: inventory.low_stock_threshold || 25
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reserve inventory (when order is placed)
app.post("/api/inventory/reserve", async (req, res) => {
  try {
    const { productId, quantity, orderId } = req.body;

    await reserveInventory(productId, quantity);

    // Log transaction
    await db.collection('inventory_transactions').add({
      productId,
      type: 'reserved',
      quantity,
      reference: { type: 'order', id: orderId },
      created_at: new Date()
    });

    res.json({ message: 'Inventory reserved' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Confirm inventory (when order is shipped)
app.post("/api/inventory/confirm", async (req, res) => {
  try {
    const { productId, quantity, orderId } = req.body;

    await confirmInventory(productId, quantity);

    // Log transaction
    await db.collection('inventory_transactions').add({
      productId,
      type: 'sale',
      quantity,
      reference: { type: 'order', id: orderId },
      created_at: new Date()
    });

    res.json({ message: 'Inventory confirmed' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Restore inventory (on return/cancellation)
app.post("/api/inventory/restore", async (req, res) => {
  try {
    const { productId, quantity, orderId } = req.body;

    const product = await db.collection('products').doc(productId).get();
    const inventory = product.data().inventory || { stock: 0, reserved: 0 };

    await db.collection('products').doc(productId).update({
      'inventory.stock': inventory.stock + quantity,
      'inventory.reserved': Math.max(0, (inventory.reserved || 0) - quantity)
    });

    // Log transaction
    await db.collection('inventory_transactions').add({
      productId,
      type: 'return',
      quantity,
      reference: { type: 'order', id: orderId },
      created_at: new Date()
    });

    res.json({ message: 'Inventory restored' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get low stock products (admin)
app.get("/api/admin/inventory/low-stock", authenticate, async (req, res) => {
  try {
    const products = await db.collection('products').get();
    const lowStock = [];

    products.forEach(doc => {
      const inventory = doc.data().inventory || { stock: 0 };
      const threshold = inventory.low_stock_threshold || 25;

      if (inventory.stock <= threshold) {
        lowStock.push({
          id: doc.id,
          name: doc.data().name,
          stock: inventory.stock,
          threshold
        });
      }
    });

    res.json(lowStock);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== BULK IMPORT ====================

app.post("/api/vendor/import-products", authenticate, verifyVendor, async (req, res) => {
  try {
    const { products } = req.body;

    if (!Array.isArray(products)) {
      return res.status(400).json({ error: 'Products must be an array' });
    }

    let imported = 0;
    let errors = [];

    for (const product of products) {
      try {
        const newProduct = {
          ...product,
          vendorId: req.userId,
          status: 'pending',
          rating: 0,
          reviews: 0,
          inventory: {
            stock: product.stock || 0,
            reserved: 0,
            low_stock_threshold: 25
          },
          createdAt: new Date()
        };

        await db.collection('products').add(newProduct);
        imported++;
      } catch (err) {
        errors.push({ sku: product.sku, error: err.message });
      }
    }

    res.json({
      imported,
      failed: errors.length,
      errors,
      message: `Successfully imported ${imported} products`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== PRODUCT ENDPOINTS ENHANCED ====================

// Update product with inventory
app.put("/api/products/:id/inventory", authenticate, verifyVendor, async (req, res) => {
  try {
    const { stock, low_stock_threshold } = req.body;

    const product = await db.collection('products').doc(req.params.id).get();
    if (product.data().vendorId !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await db.collection('products').doc(req.params.id).update({
      'inventory.stock': parseInt(stock),
      'inventory.low_stock_threshold': low_stock_threshold || 25,
      updatedAt: new Date()
    });

    const updated = await db.collection('products').doc(req.params.id).get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== HEALTH CHECK ====================

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// ==================== START SERVER ====================

app.listen(PORT, () => {
  console.log(`🚀 Sunfara Backend Server running on http://localhost:${PORT}`);
  console.log(`📊 Features: Reviews, Commissions, Inventory, Withdrawals`);
  console.log(`🔗 Test: http://localhost:${PORT}/api/health`);
});

module.exports = app;
