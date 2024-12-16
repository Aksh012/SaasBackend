const express = require("express");
const authenticateToken = require("../middleware/authenticateToken");

const router = express.Router();

// Protected route
router.get("/protected", authenticateToken, (req, res) => {
  res.json({ message: "You have access to this protected route!" });
});

console.log("protected working")
module.exports = router;
