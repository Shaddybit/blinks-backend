const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// 🚀 1. Universal CORS Configuration (Vercel Serverless Ready)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS, PATCH"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

app.use(cors());

// Middlewares (50mb Limit for Base64 Images)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// 🚀 2. Serverless Optimized MongoDB Connection
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
    easypaisaName: { type: String, default: "" },
    easyPaisa: { type: String, default: "" },
    jazzcash: { type: String, default: "" },
    jazzcashName: { type: String, default: "" },
    jazzCash: { type: String, default: "" },
    bankName: { type: String, default: "" },
    bankTitle: { type: String, default: "" },
    bankAccountTitle: { type: String, default: "" },
    accountNumber: { type: String, default: "" },
    bankAccountNumber: { type: String, default: "" },
    bankAccount: { type: String, default: "" },
    iban: { type: String, default: "" },
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

// ================= API ROUTES =================

// 1. Health Check
app.get("/", (req, res) => {
  res.send("Blinks API is running live 🚀");
});

// 2. Admin Login
app.post("/api/auth/admin-login", (req, res) => {
  try {
    const { username, password } = req.body;
    const ADMIN_USER = process.env.ADMIN_USER || "admin@blinks.pk";
    const ADMIN_PASS = process.env.ADMIN_PASS || "admin123";

    if (username === ADMIN_USER && password === ADMIN_PASS) {
      return res.json({
        success: true,
        message: "Login successful",
        token: "admin-secret-session-token",
        user: { username: ADMIN_USER, role: "admin" },
      });
    } else {
      return res.status(401).json({
        success: false,
        message: "Invalid admin credentials",
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. 🎯 ULTRA-LIGHT GET ALL PROFILES (Images aur heavy data filter kar diya - Size: 10-20 KB)
app.get("/api/profiles", async (req, res) => {
  try {
    const profiles = await Profile.find()
      .select("name businessName slug designation phone status scans totalActions createdAt")
      .sort({ createdAt: -1 });
    res.json({ success: true, profiles });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. 🎯 GET SINGLE PROFILE BY ID OR SLUG (Sirf ek profile ka pura data aayega)
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
    res.status(500).json({ success: false, message: err.message });
  }
});

// Purana compatibility slug route
app.get("/api/profiles/slug/:slug", async (req, res) => {
  try {
    const slug = req.params.slug.toLowerCase().trim();
    const profile = await Profile.findOne({ slug });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }
    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5. Create Profile
app.post("/api/profiles", async (req, res) => {
  try {
    const data = req.body;
    data.slug = data.slug.toLowerCase().trim();

    const existing = await Profile.findOne({ slug: data.slug });
    if (existing) {
      return res.status(400).json({ success: false, message: "Slug already exists." });
    }

    const newProfile = new Profile(data);
    await newProfile.save();
    res.status(201).json({ success: true, profile: newProfile });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 6. Update Profile
app.put("/api/profiles/:id", async (req, res) => {
  try {
    const target = req.params.id;
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
    res.status(500).json({ success: false, message: err.message });
  }
});

// 7. Delete Profile
app.delete("/api/profiles/:id", async (req, res) => {
  try {
    const target = req.params.id;
    if (mongoose.Types.ObjectId.isValid(target)) {
      await Profile.findByIdAndDelete(target);
    } else {
      await Profile.findOneAndDelete({ slug: target.toLowerCase().trim() });
    }
    res.json({ success: true, message: "Profile deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 8. Analytics
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
    res.status(500).json({ success: false, message: err.message });
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
    res.status(500).json({ success: false, message: err.message });
  }
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

module.exports = app;
