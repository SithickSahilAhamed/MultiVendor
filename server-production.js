// server.js - Sunfara Express Backend with Firebase Integration
// Production-Ready with Security Hardening
// ============================================

const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
require("dotenv").config();
const rateLimit = require("express-rate-limit");

// Initialize Express
const app = express();
const PORT = process.env.PORT || 5000;

// ==================== MIDDLEWARE SETUP ====================

// CORS Configuration - Whitelist specific origins
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5000").split(",");
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS not allowed"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-user-id"]
}));

// HTTPS Redirect (for production)
if (process.env.NODE_ENV === "production") {
  app.use((req, res, next) => {
    if (req.header("x-forwarded-proto") !== "https" && req.hostname !== "localhost") {
      res.redirect(`https://${req.header("host")}${req.url}`);
    } else {
      next();
    }
  });
}

// Body parser middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Rate Limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || 100),
  message: "Too many requests, please try again later",
  standardHeaders: true,
  legacyHeaders: false
});
app.use("/api/", limiter);

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);

  // Log response
  const originalSend = res.send;
  res.send = function (data) {
    console.log(`[${timestamp}] Response: ${res.statusCode}`);
    return originalSend.call(this, data);
  };

  next();
});

// ==================== FIREBASE INITIALIZATION ====================

let db, auth;

try {
  const serviceAccount = require("./firebase-service-key.json");
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });

  db = admin.firestore();
  auth = admin.auth();
  console.log("✅ Firebase initialized successfully");
} catch (error) {
  if (error.code === "MODULE_NOT_FOUND" || error.message.includes("firebase-service-key")) {
    console.error("❌ CRITICAL: firebase-service-key.json not found!");
    console.error("   Instructions:");
    console.error("   1. Go to: https://console.firebase.google.com");
    console.error("   2. Select project: sunfara-500b0");
    console.error("   3. Settings → Service Accounts → Generate New Private Key");
    console.error("   4. Save as: ./firebase-service-key.json");
    console.error("\n   Exiting...");
    process.exit(1);
  }
  console.error("Firebase initialization error:", error.message);
  process.exit(1);
}

// ==================== INPUT VALIDATION ====================

// Validation helper
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateRating = (rating) => {
  return !isNaN(rating) && rating >= 1 && rating <= 5;
};

const sanitizeString = (str) => {
  if (typeof str !== "string") return "";
  return str.trim().substring(0, 1000);
};

const validateProductData = (data) => {
  const errors = [];

  if (!data.name || typeof data.name !== "string") errors.push("Invalid product name");
  if (data.price && (isNaN(data.price) || data.price < 0)) errors.push("Invalid price");
  if (data.inventory?.stock && (isNaN(data.inventory.stock) || data.inventory.stock < 0)) {
    errors.push("Invalid stock quantity");
  }

  return errors;
};

// ==================== AUTHENTICATION ====================

// Enhanced authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers["authorization"]?.replace("Bearer ", "");
    const userId = req.headers["x-user-id"];

    if (!token && !userId) {
      return res.status(401).json({ error: "Missing authentication credentials" });
    }

    if (token) {
      try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.userId = decodedToken.uid;
        req.userEmail = decodedToken.email;
        return next();
      } catch (tokenError) {
        // If token fails, try userId fallback (for development)
        if (!userId) {
          return res.status(401).json({ error: "Invalid token" });
        }
      }
    }

    // Fallback to x-user-id (development only)
    if (process.env.NODE_ENV !== "production" && userId) {
      req.userId = userId;
      return next();
    }

    return res.status(401).json({ error: "Authentication required" });
  } catch (error) {
    res.status(401).json({ error: "Authentication failed" });
  }
};

// Verify vendor ownership
const verifyVendor = async (req, res, next) => {
  try {
    const vendor = await db.collection("vendors").doc(req.userId).get();
    if (!vendor.exists) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    const vendorData = vendor.data();
    if (vendorData.status !== "active") {
      return res.status(403).json({ error: "Vendor account is not active" });
    }

    req.vendor = { id: vendor.id, ...vendorData };
    next();
  } catch (error) {
    console.error("Vendor verification error:", error);
    res.status(403).json({ error: "Vendor verification failed" });
  }
};

// ==================== HELPER FUNCTIONS ====================

// Get average rating for product
async function getProductRating(productId) {
  try {
    const reviews = await db.collection("reviews")
      .where("productId", "==", productId)
      .where("status", "==", "approved")
      .get();

    if (reviews.empty) return 0;

    let total = 0;
    reviews.forEach(doc => {
      total += doc.data().rating;
    });
    return (total / reviews.size).toFixed(1);
  } catch (error) {
    console.error("Error getting product rating:", error);
    return 0;
  }
}

// Calculate commission safely
function calculateCommission(amount, vendorId, commissionRate = 10) {
  const numAmount = parseFloat(amount);
  const numRate = parseFloat(commissionRate);

  if (isNaN(numAmount) || isNaN(numRate) || numAmount < 0 || numRate < 0 || numRate > 100) {
    throw new Error("Invalid commission parameters");
  }

  const commission = (numAmount * numRate) / 100;
  return {
    total: numAmount,
    commission: parseFloat(commission.toFixed(2)),
    net_to_vendor: parseFloat((numAmount - commission).toFixed(2)),
    commission_rate: numRate
  };
}

// Reserve inventory
async function reserveInventory(productId, quantity) {
  const numQuantity = parseInt(quantity);
  if (isNaN(numQuantity) || numQuantity <= 0) {
    throw new Error("Invalid quantity");
  }

  const product = await db.collection("products").doc(productId).get();
  if (!product.exists) throw new Error("Product not found");

  const inventory = product.data().inventory || { stock: 0, reserved: 0 };
  if ((inventory.stock - inventory.reserved) < numQuantity) {
    throw new Error("Insufficient stock");
  }

  await db.collection("products").doc(productId).update({
    "inventory.reserved": (inventory.reserved || 0) + numQuantity
  });
}

// Confirm inventory (move from reserved to sold)
async function confirmInventory(productId, quantity) {
  const numQuantity = parseInt(quantity);
  if (isNaN(numQuantity) || numQuantity <= 0) {
    throw new Error("Invalid quantity");
  }

  const product = await db.collection("products").doc(productId).get();
  const inventory = product.data().inventory || { stock: 0, reserved: 0 };

  await db.collection("products").doc(productId).update({
    "inventory.stock": Math.max(0, inventory.stock - numQuantity),
    "inventory.reserved": Math.max(0, (inventory.reserved || 0) - numQuantity)
  });
}

// ==================== ROUTES ====================

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    uptime: process.uptime()
  });
});

// ==================== VENDOR ROUTES ====================

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
    console.error("Error fetching vendors:", error);
    res.status(500).json({ error: "Failed to fetch vendors" });
  }
});

// POST create vendor
app.post("/api/vendors", async (req, res) => {
  try {
    const { name, email, phone, status, commission } = req.body;

    // Validation
    if (!name || !email || !phone) {
      return res.status(400).json({ error: "Missing required fields: name, email, phone" });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const vendor = {
      name: sanitizeString(name),
      email: email.toLowerCase(),
      phone: sanitizeString(phone),
      status: status || "pending",
      commission: Math.min(Math.max(commission || 10, 0), 100), // Clamp between 0-100
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
    console.error("Error creating vendor:", error);
    res.status(500).json({ error: "Failed to create vendor" });
  }
});

// ==================== PRODUCT ROUTES ====================

// GET all products
app.get("/api/products", async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const numLimit = Math.min(parseInt(limit) || 50, 1000);
    const numOffset = Math.max(parseInt(offset) || 0, 0);

    const snapshot = await db.collection("products")
      .limit(numLimit)
      .offset(numOffset)
      .get();

    const products = [];
    snapshot.forEach(doc => {
      products.push({ id: doc.id, ...doc.data() });
    });

    res.json({
      products,
      total: products.length,
      limit: numLimit,
      offset: numOffset
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// POST create product
app.post("/api/products", authenticate, verifyVendor, async (req, res) => {
  try {
    const { name, sku, price, inventory, description } = req.body;

    // Validation
    const errors = validateProductData({ name, price, inventory });
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const product = {
      vendorId: req.userId,
      name: sanitizeString(name),
      sku: sanitizeString(sku),
      price: parseFloat(price),
      inventory: {
        stock: parseInt(inventory?.stock) || 0,
        reserved: 0,
        low_stock_threshold: parseInt(inventory?.low_stock_threshold) || 25
      },
      description: sanitizeString(description),
      rating: 0,
      reviews: 0,
      status: "pending",
      createdAt: new Date().toISOString()
    };

    const docRef = await db.collection("products").add(product);
    res.status(201).json({ id: docRef.id, ...product });
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ error: "Failed to create product" });
  }
});

// ==================== REVIEW ROUTES ====================

// GET product reviews
app.get("/api/products/:productId/reviews", async (req, res) => {
  try {
    const { limit = 10, offset = 0 } = req.query;
    const numLimit = Math.min(parseInt(limit) || 10, 100);
    const numOffset = Math.max(parseInt(offset) || 0, 0);

    const reviews = await db.collection("reviews")
      .where("productId", "==", req.params.productId)
      .where("status", "==", "approved")
      .orderBy("created_at", "desc")
      .limit(numLimit + 1)
      .offset(numOffset)
      .get();

    const data = [];
    reviews.forEach(doc => {
      data.push({ id: doc.id, ...doc.data() });
    });

    res.json({ reviews: data, total: data.length });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

// POST create review
app.post("/api/reviews", authenticate, async (req, res) => {
  try {
    const { productId, orderId, rating, title, comment } = req.body;

    // Validation
    if (!productId || !orderId || !rating || !title || !comment) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!validateRating(rating)) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    // Verify purchase
    const order = await db.collection("orders").doc(orderId).get();
    if (!order.exists || order.data().customerId !== req.userId) {
      return res.status(403).json({ error: "Verified purchase required" });
    }

    // Check duplicate
    const existing = await db.collection("reviews")
      .where("productId", "==", productId)
      .where("customerId", "==", req.userId)
      .limit(1)
      .get();

    if (!existing.empty) {
      return res.status(400).json({ error: "You have already reviewed this product" });
    }

    const review = {
      productId,
      orderId,
      customerId: req.userId,
      rating: parseInt(rating),
      title: sanitizeString(title),
      comment: sanitizeString(comment),
      images: [],
      verified_purchase: true,
      status: "pending",
      helpful_count: 0,
      unhelpful_count: 0,
      created_at: new Date()
    };

    const docRef = await db.collection("reviews").add(review);
    res.status(201).json({ id: docRef.id, ...review });
  } catch (error) {
    console.error("Error creating review:", error);
    res.status(500).json({ error: "Failed to create review" });
  }
});

// ==================== INVENTORY ROUTES ====================

// GET inventory
app.get("/api/products/:productId/inventory", async (req, res) => {
  try {
    const product = await db.collection("products").doc(req.params.productId).get();
    if (!product.exists) {
      return res.status(404).json({ error: "Product not found" });
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
    console.error("Error fetching inventory:", error);
    res.status(500).json({ error: "Failed to fetch inventory" });
  }
});

// POST reserve inventory
app.post("/api/inventory/reserve", async (req, res) => {
  try {
    const { productId, quantity, orderId } = req.body;

    if (!productId || !quantity || !orderId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    await reserveInventory(productId, quantity);

    await db.collection("inventory_transactions").add({
      productId,
      type: "reserved",
      quantity: parseInt(quantity),
      reference: { type: "order", id: orderId },
      created_at: new Date()
    });

    res.json({ message: "Inventory reserved successfully" });
  } catch (error) {
    console.error("Error reserving inventory:", error);
    res.status(400).json({ error: error.message });
  }
});

// ==================== GLOBAL ERROR HANDLER ====================

app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);

  // Don't expose internal error details in production
  const message = process.env.NODE_ENV === "production"
    ? "Internal server error"
    : err.message;

  res.status(err.status || 500).json({
    error: message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// ==================== START SERVER ====================

const server = app.listen(PORT, process.env.HOST || "0.0.0.0", () => {
  console.log(`
╔════════════════════════════════════════════════╗
║   🚀 Sunfara Backend Server                    ║
║   Running on http://0.0.0.0:${PORT}               ║
║   Environment: ${process.env.NODE_ENV || "development"}                  ║
║   Status: ✅ Ready to handle requests          ║
╚════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
  });
});

module.exports = app;
