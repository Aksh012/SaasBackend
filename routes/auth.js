const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const multer = require("multer");
const path = require("path");
const { ActiveSession } = require("../models/dashboardData");

const router = express.Router();

// Store active sessions in memory (for demonstration purposes)
let activeSessions = {};

// Middleware to authenticate user
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Extract Bearer token
  if (!token) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verify token
    req.user = decoded; // Attach user details to request object
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};

// Register User
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Check if the user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Create new user
    const user = new User({ name, email, password });
    await user.save();

    await updateStats();

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ error: "Server error" });
  }
});
// Login User
// router.post("/login", async (req, res) => {
//   const { email, password } = req.body;

//   try {
//     // Check if user exists
//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(400).json({ error: "Invalid credentials" });
//     }

//     // Validate password
//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(400).json({ error: "Invalid credentials" });
//     }

//     // Generate JWT
//     const token = jwt.sign(
//       { id: user._id, email: user.email },
//       process.env.JWT_SECRET,
//       { expiresIn: "12h" }
//     );
//     // Add session
//     activeSessions[user._id] = new Date(); // Store login time (optional)

//     res.json({ message: "Login successful", token });
//   } catch (error) {
//     console.error("Error logging in user:", error);
//     res.status(500).json({ error: "Server error" });
//   }
// });

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );

    // Create new session record
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 12);

    const session = new ActiveSession({
      userId: user._id,
      token,
      ipAddress: req.ip,
      deviceInfo: req.headers["user-agent"],
      startTime: new Date(),
      expiresAt,
      status: "active",
    });

    await session.save();

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/logout", authenticate, async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    await ActiveSession.findOneAndUpdate(
      { token, status: "active" },
      {
        status: "ended",
        endTime: new Date(),
      }
    );

    res.json({ message: "Logout successful" });
  } catch (error) {
    console.error("Error logging out:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Profile route
router.get("/profile", authenticate, async (req, res) => {
  try {
    // Fetch user by ID
    const user = await User.findById(req.user.id).select("-password"); // Exclude password
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user); // Send user data as response
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Update Profile Route
router.put("/profile", authenticate, async (req, res) => {
  const { name, email, password } = req.body; // Extract fields to update

  try {
    // Fetch user by ID
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update fields only if provided in the request body
    if (name) user.name = name;
    if (email) user.email = email;
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10); // Hash the new password
      user.password = hashedPassword;
    }

    // Save the updated user
    const updatedUser = await user.save();

    // Exclude password from the response
    const { password: _, ...userData } = updatedUser.toObject();

    // Send a success response
    res.json({ message: "Profile updated successfully", user: userData });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/profile/skills", authenticate, async (req, res) => {
  const { skill, yearsOfExperience } = req.body;

  if (!skill || typeof yearsOfExperience !== "number") {
    return res
      .status(400)
      .json({ error: "Skill and years of experience are required" });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check for duplicate skill
    const existingSkill = user.skills.find((s) => s.skill === skill);
    if (existingSkill) {
      return res.status(400).json({ error: "Skill already exists" });
    }

    // Add the skill
    user.skills.push({ skill, yearsOfExperience });
    await user.save();

    res.json({ message: "Skill added successfully", skills: user.skills });
  } catch (error) {
    console.error("Error adding skill:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Set up Multer storage engine
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Store files in the 'uploads' folder
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}${ext}`; // Use timestamp to avoid filename collision
    cb(null, filename);
  },
});

// File filter to accept only image files
const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);
  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"));
  }
};

// Initialize multer with storage settings and file filter
const upload = multer({ storage, fileFilter });

// Profile image upload route
router.put(
  "/profile/image",
  authenticate,
  upload.single("profileImage"),
  async (req, res) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Update the profile image URL in the database
      const profileImageUrl = `https://saasbackend-380j.onrender.com/uploads/${req.file.filename}`;
      user.profileImage = profileImageUrl;
      await user.save();

      res.json({
        message: "Profile image updated successfully",
        profileImage: profileImageUrl,
      });
    } catch (error) {
      console.error("Error uploading profile image:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

module.exports = router;
