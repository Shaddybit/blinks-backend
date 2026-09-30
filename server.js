const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const app = express();

// 🛡️ 1. SECURITY HEADERS MIDDLEWARE
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload"
  );
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://res.cloudinary.com; connect-src 'self' https://blinks-backend-five.vercel.app; frame-ancestors 'none';"
  );
  next();
});

// 🛡️ 2. SECURE CORS CONFIGURATION
const allowedOrigins = [
  "https://blinkspk.com",
  "https://www.blinkspk.com",
  "http://localhost:5173",
  "http://localhost:3000"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS policy does not allow access from this origin."));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "Cache-Control", "X-Requested-With"]
  })
);

// Middlewares
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// 🛡️ 3. RATE LIMITING MIDDLEWARES
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 attempts per IP
  message: {
    success: false,
    message: "Bohot zyada login attempts hue hain. 15 minute baad dobara koshish karein."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300, // Max 300 requests per IP
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", generalApiLimiter);

// 🚀 4. Serverless Optimized MongoDB Connection
const MONGO_URI = process.env.MONGO_URI;
let cachedDb = null;

const connectDB = async () => {
  if (cachedDb && mongoose.connection.readyState === 1) {
    return cachedDb;
  }
  try {
    cachedDb = await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("✅ MongoDB Atlas Connected Successfully");
    return cachedDb;
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err);
    throw err;
  }
};

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error.message,
    });
  }
});

// ================= SCHEMA & MODEL =================
const ProfileSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    businessName: { type: String, default: "" },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    businessCategory: { type: String, default: "food", trim: true, lowercase: true },
    designation: { type: String, default: "" },
    bio: { type: String, default: "" },
    announcement: { type: String, default: "" },

    phone: { type: String, default: "" },
    whatsapp: { type: String, default: "" },
    email: { type: String, default: "" },
    facebook: { type: String, default: "" },
    instagram: { type: String, default: "" },
    tiktok: { type: String, default: "" },
    linkedin: { type: String, default: "" },

    easypaisa: { type: String, default: "" },
    easyPaisa: { type: String, default: "" },
    jazzcash: { type: String, default: "" },
    jazzCash: { type: String, default: "" },
    bankName: { type: String, default: "" },
    bankAccountTitle: { type: String, default: "" },
    bankAccountNumber: { type: String, default: "" },
    bankAccount: { type: String, default: "" },
    showPayment: { type: Boolean, default: false },

    address: { type: String, default: "" },
    googleMaps: { type: String, default: "" },
    workingHours: { type: String, default: "" },

    googleReviewLink: { type: String, default: "" },
    googleReviewUrl: { type: String, default: "" },
    googleReview: { type: String, default: "" },

    profilePhoto: { type: String, default: "" },
    coverPhoto: { type: String, default: "" },
    gallery: { type: [String], default: [] },
    businessDocument: { type: [String], default: [] },
    businessDocumentTitle: { type: String, default: "Menu / Services" },

    catalogTitle: { type: String, default: "Featured Products & Services" },
    products: { type: Array, default: [] },
    reviews: { type: Array, default: [] },

    blogTitle: { type: String, default: "" },
    blogContent: { type: String, default: "" },
    blogImage: { type: String, default: "" },
    bgPhoto: { type: String, default: "" },
    bgColor: { type: String, default: "#ffffff" },

    headingFont: { type: String, default: "sans-serif" },
    bodyFont: { type: String, default: "sans-serif" },
    headingColor: { type: String, default: "#0f172a" },
    bodyTextColor: { type: String, default: "#334155" },

    status: { type: String, default: "Active" },
    scans: { type: Number, default: 0 },
    totalActions: { type: Number, default: 0 },
    eventAnalytics: { type: Object, default: {} },
  },
  { timestamps: true }
);

const Profile = mongoose.model("Profile", ProfileSchema);

// 🛡️ 5. JWT & FALLBACK SECRET AUTH MIDDLEWARE
const verifyAdminAuth = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const clientToken = authHeader && authHeader.split(" ")[1];

  if (!clientToken) {
    return res.status(401).json({
      success: false,
      message: "Access Denied: Authentication token missing.",
    });
  }

  const JWT_SECRET = process.env.JWT_SECRET || "blinks_jwt_secure_secret_key_2026";
  const FALLBACK_SECRET = process.env.API_SECRET_KEY || "blinks-secure-key-2026";

  // Check 1: Dynamic JWT Token verify
  jwt.verify(clientToken, JWT_SECRET, (err, decoded) => {
    if (!err && decoded) {
      req.adminUser = decoded;
      return next();
    }

    // Check 2: Pre-shared API Secret Token fallback
    if (clientToken === FALLBACK_SECRET) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: "Access Denied: Invalid or expired token.",
    });
  });
};

// ================= API ROUTES =================

// 1. Health Check
app.get("/", (req, res) => {
  res.send("Blinks API is running securely 🚀");
});

// 2. Admin Login (Rate-limited + Bcrypt Hash + Dynamic JWT)
app.post("/api/auth/admin-login", loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    const ADMIN_USER = process.env.ADMIN_USER || "admin@blinks.pk";
    const ADMIN_PASS = process.env.ADMIN_PASS || "admin123";
    const ADMIN_HASH = process.env.ADMIN_PASSWORD_HASH;
    const JWT_SECRET = process.env.JWT_SECRET || "blinks_jwt_secure_secret_key_2026";

    let isValid = false;

    if (username === ADMIN_USER) {
      if (ADMIN_HASH) {
        // Bcrypt verification
        isValid = await bcrypt.compare(password, ADMIN_HASH);
      } else {
        // Fallback agar hash env me na set ho
        isValid = (password === ADMIN_PASS);
      }
    }

    if (isValid) {
      const token = jwt.sign(
        { username: ADMIN_USER, role: "admin" },
        JWT_SECRET,
        { expiresIn: "8h" }
      );

      return res.json({
        success: true,
        message: "Login successful",
        token,
        user: { username: ADMIN_USER, role: "admin" },
      });
    } else {
      return res.status(401).json({
        success: false,
        message: "Invalid admin credentials",
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: "Authentication process failed." });
  }
});

// 3. GET ALL PROFILES (Sanitized: sensitive fields leak nahi honge)
app.get("/api/profiles", async (req, res) => {
  try {
    const profiles = await Profile.find()
      .select("name businessName slug designation profilePhoto status scans totalActions businessCategory createdAt")
      .sort({ createdAt: -1 });
    res.json({ success: true, profiles });
  } catch (err) {
    res.status(500).json({ success: false, message: "Profiles fetch failed." });
  }
});

// 4. GET SINGLE PROFILE BY ID OR SLUG
app.get("/api/profiles/single/:identifier", async (req, res) => {
  try {
    const target = req.params.identifier.trim();
    let profile = null;

    if (mongoose.Types.ObjectId.isValid(target)) {
      profile = await Profile.findById(target);
    }
    if (!profile) {
      profile = await Profile.findOne({ slug: target.toLowerCase() });
    }

    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }
    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ success: false, message: "Query failed." });
  }
});

app.get("/api/profiles/slug/:slug", async (req, res) => {
  try {
    const slug = req.params.slug.toLowerCase().trim();
    const profile = await Profile.findOne({ slug });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }
    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ success: false, message: "Query failed." });
  }
});

// 5. Create Profile (Protected)
app.post("/api/profiles", verifyAdminAuth, async (req, res) => {
  try {
    const data = req.body;
    data.slug = data.slug.toLowerCase().trim();
    data.businessCategory = String(data.businessCategory || "food").toLowerCase().trim();

    const existing = await Profile.findOne({ slug: data.slug });
    if (existing) {
      return res.status(400).json({ success: false, message: "Slug already exists." });
    }

    const newProfile = new Profile(data);
    await newProfile.save();
    res.status(201).json({ success: true, profile: newProfile });
  } catch (err) {
    res.status(500).json({ success: false, message: "Creation failed." });
  }
});

// 6. Update Profile (Protected)
app.put("/api/profiles/:id", verifyAdminAuth, async (req, res) => {
  try {
    const target = req.params.id;
    if (req.body.businessCategory) {
      req.body.businessCategory = String(req.body.businessCategory).toLowerCase().trim();
    }

    let updated = null;
    if (mongoose.Types.ObjectId.isValid(target)) {
      updated = await Profile.findByIdAndUpdate(
        target,
        { $set: req.body },
        { new: true, runValidators: false }
      );
    }

    if (!updated) {
      updated = await Profile.findOneAndUpdate(
        { slug: target.toLowerCase().trim() },
        { $set: req.body },
        { new: true, runValidators: false }
      );
    }

    if (!updated) {
      return res.status(404).json({ success: false, message: "Profile not found to update" });
    }

    res.json({ success: true, profile: updated });
  } catch (err) {
    console.error("Update Error:", err);
    res.status(500).json({ success: false, message: "Update failed." });
  }
});

// 7. Delete Profile (Protected)
app.delete("/api/profiles/:id", verifyAdminAuth, async (req, res) => {
  try {
    const target = req.params.id;
    if (mongoose.Types.ObjectId.isValid(target)) {
      await Profile.findByIdAndDelete(target);
    } else {
      await Profile.findOneAndDelete({ slug: target.toLowerCase().trim() });
    }
    res.json({ success: true, message: "Profile deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Delete failed." });
  }
});

// 8. Public Analytics (General rate-limiter applied)
app.post("/api/analytics/scan", async (req, res) => {
  try {
    const { slug } = req.body;
    if (!slug) return res.status(400).json({ success: false });

    await Profile.findOneAndUpdate(
      { slug: slug.toLowerCase().trim() },
      { $inc: { scans: 1 } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

app.post("/api/analytics/event", async (req, res) => {
  try {
    const { slug, eventType } = req.body;
    if (!slug || !eventType) return res.status(400).json({ success: false });

    const key = `eventAnalytics.${eventType}`;
    await Profile.findOneAndUpdate(
      { slug: slug.toLowerCase().trim() },
      {
        $inc: {
          totalActions: 1,
          [key]: 1,
        },
      }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

module.exports = app;
