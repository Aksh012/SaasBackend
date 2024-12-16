const mongoose = require("mongoose");

// Schema for DashboardData (summary of total users and active sessions)
const dashboardDataSchema = new mongoose.Schema(
  {
    totalUsers: {
      type: Number,
      required: true,
      default: 0,
    },
    activeSessions: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { timestamps: true } // Automatically add createdAt and updatedAt fields
);

// Schema for ActiveSessions (tracks active user sessions)
const activeSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    startTime: {
      type: Date,
      default: Date.now,
      required: true
    },
    endTime: {
      type: Date
    },
    status: {
      type: String,
      enum: ['active', 'ended', 'expired'],
      default: 'active'
    },
    token: {
      type: String,
      sparse: true, // This allows multiple null values
      index: true
    }
  },
  { timestamps: true }
);

// Add method to get user's session history
activeSessionSchema.statics.getUserSessionHistory = async function(userId) {
  return this.find({ userId })
    .sort({ startTime: -1 })
    .populate('userId', 'name email');
};

// Add method to get total sessions for a user
activeSessionSchema.statics.getUserTotalSessions = async function(userId) {
  return this.countDocuments({ userId });
};

// Ensure efficient querying by token
activeSessionSchema.index({ token: 1 });

// Add these methods to the activeSessionSchema before creating the model
activeSessionSchema.statics.getActiveSessionCount = async function() {
  const currentTime = new Date();
  return await this.countDocuments({
    loggedOutAt: null,
    expiresAt: { $gt: currentTime }
  });
};

activeSessionSchema.statics.getSessionStats = async function() {
  const currentTime = new Date();
  const twentyFourHoursAgo = new Date(currentTime - 24 * 60 * 60 * 1000);

  const stats = await this.aggregate([
    {
      $facet: {
        activeSessions: [
          {
            $match: {
              loggedOutAt: null,
              expiresAt: { $gt: currentTime }
            }
          },
          { $count: "count" }
        ],
        last24Hours: [
          {
            $match: {
              createdAt: { $gte: twentyFourHoursAgo }
            }
          },
          { $count: "count" }
        ],
        totalSessions: [
          { $count: "count" }
        ]
      }
    }
  ]);

  return {
    activeSessions: stats[0].activeSessions[0]?.count || 0,
    last24Hours: stats[0].last24Hours[0]?.count || 0,
    totalSessions: stats[0].totalSessions[0]?.count || 0
  };
};

// Add index for efficient querying of active sessions
activeSessionSchema.index({ expiresAt: 1, loggedOutAt: 1 });

// Add these indexes to the activeSessionSchema
activeSessionSchema.index({ token: 1 });
activeSessionSchema.index({ userId: 1, startTime: -1 });

// Add method to get user's sessions by token
activeSessionSchema.statics.getUserSessionsByToken = async function(token) {
  const session = await this.findOne({ token });
  if (!session) return null;

  return this.find({ userId: session.userId })
    .sort({ startTime: -1 })
    .populate('userId', 'name email');
};

// Add method to get user's total sessions by token
activeSessionSchema.statics.getUserTotalSessionsByToken = async function(token) {
  const session = await this.findOne({ token });
  if (!session) return 0;

  return this.countDocuments({ userId: session.userId });
};

// Schema for Revenue (stores individual revenue entries)
const revenueSchema = new mongoose.Schema(
  {
    revenue: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now, // Automatically set current date if not provided
    },
  },
  { timestamps: true } // Automatically add createdAt and updatedAt fields
);

// Schema for SessionHistory (stores details about each session)
const sessionHistorySchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true, // Ensure no duplicate sessions
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId, // Reference to a User document
      ref: "User",
      required: true,
    },
  },
  { timestamps: true } // Automatically add createdAt and updatedAt fields
);

// Create models for each schema
const DashboardData = mongoose.model("DashboardData", dashboardDataSchema);
const Revenue = mongoose.model("Revenue", revenueSchema);
const SessionHistory = mongoose.model("SessionHistory", sessionHistorySchema);
const ActiveSession = mongoose.model("ActiveSession", activeSessionSchema);

// Export models
module.exports = { DashboardData, Revenue, SessionHistory, ActiveSession };
