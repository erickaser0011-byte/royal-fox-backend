// ============================================
// FILE: server.js (Updated with Routes)
// ============================================

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");



// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// ============================================
// MIDDLEWARE SETUP
// ============================================

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});



mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ MongoDB connected successfully");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

// ============================================
// IMPORT ROUTES
// ============================================

const applicationRoutes = require("./routes/applicationRoutes");

// ============================================
// API ROUTES
// ============================================

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Royal Fox Production Employment Application API",
    version: "1.0.0",
    endpoints: {
      submit: "POST /api/applications/submit",
      getAll: "GET /api/applications",
      getOne: "GET /api/applications/:applicationId",
      updateStatus: "PATCH /api/applications/:applicationId/status",
      search: "GET /api/applications/search/email?email=user@example.com",
      delete: "DELETE /api/applications/:applicationId",
      statistics: "GET /api/applications/stats/all",
      recent: "GET /api/applications/recent/list?limit=5",
    },
  });
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date() });
});

// Use application routes
app.use("/api/applications", applicationRoutes);

// ============================================
// ERROR HANDLING MIDDLEWARE
// ============================================

app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error:
      process.env.NODE_ENV === "development" ? err.message : "Unknown error",
  });
});

// ============================================
// 404 HANDLER
// ============================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found",
    path: req.path,
  });
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("\n" + "═".repeat(70));
  console.log("🚀 ROYAL FOX PRODUCTION - BACKEND SERVER");
  console.log("═".repeat(70));
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`✅ MongoDB: Connected`);
  console.log(
    `${process.env.TELEGRAM_BOT_TOKEN ? "✅" : "⚠️"} Telegram Bot: ${
      process.env.TELEGRAM_BOT_TOKEN ? "Configured" : "Not configured"
    }`
  );
  console.log(
    `${process.env.TELEGRAM_CHAT_ID ? "✅" : "⚠️"} Telegram Chat ID: ${
      process.env.TELEGRAM_CHAT_ID ? "Configured" : "Not configured"
    }`
  );
  console.log(`📍 Environment: ${process.env.NODE_ENV}`);
  console.log("═".repeat(70));
  console.log("\nAPI Endpoints:");
  console.log("  POST   /api/applications/submit");
  console.log("  GET    /api/applications");
  console.log("  GET    /api/applications/:applicationId");
  console.log("  PATCH  /api/applications/:applicationId/status");
  console.log("  GET    /api/applications/search/email?email=...");
  console.log("  DELETE /api/applications/:applicationId");
  console.log("  GET    /api/applications/stats/all");
  console.log("  GET    /api/applications/recent/list");
  console.log("═".repeat(70) + "\n");
});

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n👋 Shutting down gracefully...");
  mongoose.connection.close();
  process.exit(0);
});

module.exports = app;
