// ============================================
// FILE: models/Application.js
// ============================================

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const ApplicationSchema = new mongoose.Schema(
  {
    // Unique Application ID
    applicationId: {
      type: String,
      unique: true,
      required: true,
    },

    // ============================================
    // SECTION 1: PERSONAL INFORMATION
    // ============================================
    personalInfo: {
      firstName: {
        type: String,
        required: true,
      },
      lastName: {
        type: String,
        required: true,
      },
      middleName: {
        type: String,
        default: "",
      },
      dateOfBirth: {
        type: Date,
        required: true,
      },
      address: {
        street: {
          type: String,
          required: true,
        },
        city: {
          type: String,
          required: true,
        },
        state: {
          type: String,
          required: true,
        },
        zipCode: {
          type: String,
          required: true,
        },
      },
      phone: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
        lowercase: true,
      },
      workAuthorized: {
        type: Boolean,
        required: true,
      },
      preferredContact: {
        type: String,
        enum: ["phone", "email"],
        required: true,
      },
      ssn: {
        type: String,
        required: true,
        // Encrypted before saving
      },
      governmentId: {
        type: {
          type: String,
          enum: ["drivers-license", "state-id", "passport", "other"],
          required: true,
        },
        number: {
          type: String,
          required: true,
        },
        expiration: {
          type: Date,
          required: true,
        },
      },
      idDocuments: {
        front: String, // File name or path
        back: String, // File name or path
      },
    },

    // ============================================
    // SECTION 2: POSITION DETAILS
    // ============================================
    positionDetails: {
      positionApplied: {
        type: String,
        required: true,
      },
      employmentType: {
        type: String,
        enum: ["full-time", "part-time", "contract", "internship", "temporary"],
        required: true,
      },
      expectedSalary: {
        type: String,
        required: true,
      },
      availableStartDate: {
        type: Date,
        required: true,
      },
      preferredWorkSchedule: {
        type: String,
        required: true,
      },
      willingToOvertimeTravel: {
        type: Boolean,
        required: true,
      },
      bankDetails: {
        bankName: {
          type: String,
          required: true,
        },
        accountType: {
          type: String,
          enum: ["checking", "savings"],
          required: true,
        },
        accountHolderName: {
          type: String,
          required: true,
        },
        routingNumber: {
          type: String,
          required: true,
          // Encrypted before saving
        },
        accountNumber: {
          type: String,
          required: true,
          // Encrypted before saving
        },
        directDepositConsent: {
          type: Boolean,
          required: true,
        },
      },
    },

    // ============================================
    // SECTION 3: EDUCATION BACKGROUND
    // ============================================
    education: {
      highSchool: {
        name: {
          type: String,
          required: true,
        },
        location: {
          type: String,
          required: true,
        },
      },
      college: {
        name: String,
        location: String,
        degree: String,
      },
      licenses: String,
    },

    // ============================================
    // SECTION 4: EMPLOYMENT HISTORY
    // ============================================
    employmentHistory: [
      {
        company: {
          type: String,
          required: true,
        },
        address: String,
        jobTitle: String,
        supervisorName: String,
        dateFrom: Date,
        dateTo: Date,
        responsibilities: String,
      },
    ],

    // ============================================
    // SECTION 5: DOCUMENTS & CONSENT
    // ============================================
    documents: {
      resume: String, // File name or path
      resumeUploadedAt: Date,
    },

    consents: {
      identityVerification: {
        type: Boolean,
        required: true,
      },
      bankDetailsVerification: {
        type: Boolean,
        required: true,
      },
      consentedAt: {
        type: Date,
        default: Date.now,
      },
    },

    // ============================================
    // SECTION 6: SIGNATURE & SIGNATURE DATE
    // ============================================
    signature: {
      applicantName: {
        type: String,
        required: true,
      },
      signedDate: {
        type: Date,
        required: true,
      },
    },

    // ============================================
    // APPLICATION STATUS & METADATA
    // ============================================
    status: {
      type: String,
      enum: ["submitted", "under-review", "approved", "rejected"],
      default: "submitted",
    },

    submittedAt: {
      type: Date,
      default: Date.now,
    },

    reviewedBy: {
      type: String,
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    reviewNotes: {
      type: String,
      default: "",
    },

    rejectionReason: {
      type: String,
      default: "",
    },

    // Telegram notification status
    telegramNotified: {
      type: Boolean,
      default: false,
    },
    telegramMessageId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "applications",
  }
);

// ============================================
// MIDDLEWARE: NO ENCRYPTION (SSN STORED AS-IS)
// ============================================

// SSN is now stored without encryption for easier access
// In production, consider using database encryption at rest
ApplicationSchema.pre("save", async function (next) {
  // No pre-save encryption needed
  next();
});

// ============================================
// INDEXES FOR FASTER QUERIES
// ============================================

// Index on email for quick searches
ApplicationSchema.index({ "personalInfo.email": 1 });

// Index on application ID for quick lookups
ApplicationSchema.index({ applicationId: 1 });

// Index on status for filtering
ApplicationSchema.index({ status: 1 });

// Index on submission date for sorting
ApplicationSchema.index({ submittedAt: -1 });

// ============================================
// METHODS
// ============================================

// Get applicant's full name
ApplicationSchema.methods.getFullName = function () {
  return `${this.personalInfo.firstName} ${this.personalInfo.lastName}`;
};

// Get formatted submission date
ApplicationSchema.methods.getFormattedSubmissionDate = function () {
  return this.submittedAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Get application status emoji
ApplicationSchema.methods.getStatusEmoji = function () {
  const emojis = {
    submitted: "📝",
    "under-review": "⏳",
    approved: "✅",
    rejected: "❌",
  };
  return emojis[this.status] || "❓";
};

// Convert to object for JSON response (hide sensitive data)
ApplicationSchema.methods.toSecureJSON = function () {
  const obj = this.toObject();

  // Hide sensitive data in responses
  if (obj.personalInfo) {
    obj.personalInfo.ssn = "***-**-" + obj.personalInfo.ssn.slice(-4);
  }

  if (obj.positionDetails && obj.positionDetails.bankDetails) {
    obj.positionDetails.bankDetails.routingNumber =
      "*" + obj.positionDetails.bankDetails.routingNumber.slice(-4);
    obj.positionDetails.bankDetails.accountNumber =
      "*" + obj.positionDetails.bankDetails.accountNumber.slice(-4);
  }

  return obj;
};

// ============================================
// STATIC METHODS
// ============================================

// Find by application ID
ApplicationSchema.statics.findByApplicationId = function (appId) {
  return this.findOne({ applicationId: appId });
};

// Find by email
ApplicationSchema.statics.findByEmail = function (email) {
  return this.find({ "personalInfo.email": email });
};

// Count applications by status
ApplicationSchema.statics.countByStatus = function (status) {
  return this.countDocuments({ status: status });
};

// Get recent applications
ApplicationSchema.statics.getRecentApplications = function (limit = 10) {
  return this.find().sort({ submittedAt: -1 }).limit(limit);
};

// ============================================
// CREATE & EXPORT MODEL
// ============================================

const Application = mongoose.model("Application", ApplicationSchema);

module.exports = Application;

// ============================================
// USAGE EXAMPLES (FOR REFERENCE)
// ============================================

/*
// Creating a new application
const newApp = new Application({
  applicationId: 'RFP-1234567890-ABC',
  personalInfo: {
    firstName: 'John',
    lastName: 'Doe',
    ...
  },
  ...
});
await newApp.save();

// Finding application
const app = await Application.findByApplicationId('RFP-1234567890-ABC');

// Updating status
await Application.findByIdAndUpdate(appId, {
  status: 'approved',
  reviewedBy: 'admin@example.com',
  reviewNotes: 'Excellent candidate'
});

// Secure JSON (hides sensitive data)
const secureData = app.toSecureJSON();

// Count by status
const approvedCount = await Application.countByStatus('approved');

// Get recent
const recent = await Application.getRecentApplications(5);
*/
