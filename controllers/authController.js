const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const {ActiveSession} = require("../models")
const { updateStats } = require('./dashboardController');

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ error: "User already exists" });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save user
    const user = new User({ name, email, password: hashedPassword });
    await user.save();

    await updateStats();

    res.status(201).json({ message: "User registered successfully", user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// exports.login = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     // Find user
//     const user = await User.findOne({ email });
//     if (!user) return res.status(404).json({ error: "User not found" });

//     // Check password
//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

//     // Generate JWT
//     const token = jwt.sign(
//       { id: user._id, email: user.email },
//       process.env.JWT_SECRET,
//       {
//         expiresIn: "1h",
//       }
//     );

//     res.json({ message: "Login successful", token });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );

    // Save session to database
    const session = new ActiveSession({
      userId: user._id,
      token,
      ipAddress: req.ip,
      deviceInfo: req.headers["user-agent"],
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // Set expiration for 12 hours
    });
    await session.save();

    res.json({ message: "Login successful", token, session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


router.get("/active-sessions", authenticateToken, async (req, res) => {
  try {
    const sessions = await ActiveSession.find({
      userId: req.user.id,
      loggedOutAt: null, // Only fetch currently active sessions
      expiresAt: { $gt: new Date() }, // Sessions that are not expired
    });

    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

exports.logout = async (req, res) => {
  try {
    const token = req.header("Authorization").replace("Bearer ", "");

    // Mark the session as logged out
    const session = await ActiveSession.findOneAndUpdate(
      { token },
      { loggedOutAt: new Date() },
      { new: true }
    );

    if (!session) return res.status(404).json({ error: "Session not found" });

    res.json({ message: "Logout successful", session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

