// const { ActiveSession } = require("../models");

const authenticateToken = async (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access denied, no token provided." });
  }

  try {
    // Verify JWT
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;

    // Check if the session is active
    const session = await ActiveSession.findOne({
      token,
      loggedOutAt: null,
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }

    next();
  } catch (err) {
    res.status(400).json({ error: "Invalid token" });
  }
};

module.exports = authenticateToken;
