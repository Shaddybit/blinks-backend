const dns = require('node:dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Middlewares (Increased limit for base64 images)
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB Atlas Connected Successfully"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// ================= SCHEMA & MODEL =================
const ProfileSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    businessName: { type: String, default: "" },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    designation: { type: String, default: "" },
    bio: { type: String, default: "" },
    announcement: { type: String, default: "" },

    // Contact & Social
    phone: { type: String, default: "" },
    whatsapp: { type: String, default: "" },
    facebook: { type: String, default: "" },
    instagram: { type: String, default: "" },
    tiktok: { type: String, default: "" },
    linkedin: { type: String, default: "" },

    // Payments
    easypaisa: { type: String, default: "" },
    easypaisaName: { type: String, default: "" },
    jazzcash: { type: String, default: "" },
    jazzcashName: { type: String, default: "" },
    bankName: { type: String, default: "" },
    bankTitle: { type: String, default: "" },
    accountNumber: { type: String, default: "" },
    iban: { type: String, default: "" },

    // Location & Timing
    address: { type: String, default: "" },
    googleMaps: { type: String, default: "" },
    workingHours: { type: String, default: "" },

    // Media & Docs
    profilePhoto: { type: String, default: "" },
    coverPhoto: { type: String, default: "" },
    gallery: { type: [String], default: [] },
    businessDocument: { type: [String], default: [] },
    businessDocumentTitle: { type: String, default: "Menu / Services" },

    // Products & Reviews
    catalogTitle: { type: String, default: "Featured Products & Services" },
    products: { type: Array, default: [] },
    reviews: { type: Array, default: [] },

    // Public Article / Blog
    blogTitle: { type: String, default: "" },
    blogContent: { type: String, default: "" },
    blogImage: { type: String, default: "" },
    bgPhoto: { type: String, default: "" },
    bgColor: { type: String, default: "#ffffff" },

    status: { type: String, default: "Active" },

    // Live Analytics
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

// 2. Get All Profiles (Admin)
app.get("/api/profiles", async (req, res) => {
  try {
    const profiles = await Profile.find().sort({ createdAt: -1 });
    res.json({ success: true, profiles });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. Get Single Profile by Slug (For Public QR Profile View)
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

// 4. Create Profile
app.post("/api/profiles", async (req, res) => {
  try {
    const data = req.body;
    data.slug = data.slug.toLowerCase().trim();

    const existing = await Profile.findOne({ slug: data.slug });
    if (existing) {
      return res.status(400).json({ success: false, message: "Slug already exists. Choose a unique handle." });
    }

    const newProfile = new Profile(data);
    await newProfile.save();
    res.status(201).json({ success: true, profile: newProfile });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5. Update Profile
app.put("/api/profiles/:id", async (req, res) => {
  try {
    const updated = await Profile.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, profile: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 6. Delete Profile
app.delete("/api/profiles/:id", async (req, res) => {
  try {
    await Profile.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Profile deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 7. Track QR Scan
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

// 8. Track Action / Click Event
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

// Server Start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});