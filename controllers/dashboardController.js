const User = require("../models/User");
const express = require("express");
const { ActiveSession, SessionHistory } = require("../models/dashboardData");
const Stats = require("../models/Stats");

// Fetch dashboard data
const getDashboardData = async (req, res) => {
  try {
    // Get token from header
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    // Find session by token
    const currentSession = await ActiveSession.findOne({ token });
    if (!currentSession) {
      return res.status(404).json({ error: "Session not found" });
    }

    const userId = currentSession.userId;

    // Get stats from the Stats collection
    const stats = await Stats.getStats();
    
    // Get total sessions for the current user
    const userSessions = await ActiveSession.find({ userId });
    const totalSessions = userSessions.length;

    // If stats don't exist, initialize them
    if (!stats.totalUsers) {
      stats.totalUsers = await User.countDocuments();
      await stats.save();
    }

    // If revenue is not set, initialize it
    if (!stats.totalRevenue) {
      stats.totalRevenue = 4567.89; // Initial mock revenue
      await stats.save();
    }

    console.log({
      userId,
      totalUsers: stats.totalUsers,
      totalSessions,
      totalRevenue: stats.totalRevenue
    }); // Debug log

    res.json({
      totalUsers: stats.totalUsers,
      totalSessions,
      totalRevenue: stats.totalRevenue
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Update the stats when a new user registers
const updateStats = async () => {
  try {
    const stats = await Stats.getStats();
    stats.totalUsers = await User.countDocuments();
    const totalUsersCount = await User.countDocuments();
    stats.totalUsers = totalUsersCount;
    stats.lastUpdated = new Date();
    await stats.save();
  } catch (error) {
    console.error("Error updating stats:", error);
  }
};

// Fetch revenue history
const getRevenueHistory = async (req, res) => {
  try {
    const revenueHistory = [
      { date: new Date(), revenue: 1000 },
      { date: new Date(), revenue: 1500 },
      { date: new Date(), revenue: 2000 },
    ];
    res.json(revenueHistory);
  } catch (error) {
    console.error("Error fetching revenue history:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Fetch session history
const getSessionHistory = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const currentSession = await ActiveSession.findOne({ token });
    if (!currentSession) {
      return res.status(404).json({ error: "Session not found" });
    }

    const userId = currentSession.userId;

    const sessions = await ActiveSession.find({ userId })
      .populate("userId", "name email")
      .sort({ startTime: -1 })
      .limit(10);

    const formattedSessions = sessions.map((session) => {
      const duration = session.endTime
        ? Math.round(
            (new Date(session.endTime) - new Date(session.startTime)) /
              1000 /
              60
          )
        : Math.round((new Date() - new Date(session.startTime)) / 1000 / 60);

      return {
        sessionId: session._id,
        userName: session.userId.name,
        email: session.userId.email,
        startTime: session.startTime,
        endTime: session.endTime || "Active",
        duration: `${duration} minutes`,
        status: session.status,
      };
    });

    res.json(formattedSessions);
  } catch (error) {
    console.error("Error fetching session history:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  getDashboardData,
  getRevenueHistory,
  getSessionHistory,
  updateStats
};
