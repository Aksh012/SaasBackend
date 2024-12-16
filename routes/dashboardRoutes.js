const express = require("express");
const {
  getDashboardData,
  getRevenueHistory,
  getSessionHistory,
} = require("../controllers/dashboardController");

const router = express.Router();

// Define routes for dashboard endpoints
router.get("/data", getDashboardData); // Fetch dashboard data

router.get("/revenue-history", getRevenueHistory); // Fetch revenue history
router.get("/session-history", getSessionHistory); // Fetch session history

module.exports = router;
