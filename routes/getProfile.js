// In your backend (Node.js/Express)
const express = require("express");
const router = express.Router();
const User = require("../models/User"); // Adjust according to your model structure

// Middleware to authenticate user (example)
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Extract Bearer token
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(token)
    req.user = decoded; // Attach user details to request
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

// Profile Route
router.get("/profile", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password"); // Exclude password
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
