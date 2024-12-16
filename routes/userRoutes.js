const express = require("express");
const User = require("../models/User");

const router = express.Router();

// Fetch all users
router.get("/users", async (req, res) => {
  try {
    const users = await User.find({}, { password: 0 }); // Exclude password field
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});


// Fetch total number of users
router.get("/total-users", async (req, res) => {
  try {
    const totalUsers = await User.countDocuments(); // Count all users
    res.json({ totalUsers });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});


module.exports = router;
