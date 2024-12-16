require("dotenv").config();
const express = require("express");
const userRoutes = require("./routes/userRoutes");
const cors = require("cors");
const bodyParser = require("body-parser");
const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");
const protectedRoutes = require("./routes/protected");
const logout = require("./routes/auth");
const getProfile = require("./routes/auth");
const addSkills = require("./routes/auth");
const updateProfile = require("./routes/auth");
const uploadImg = require("./routes/auth");
const dashboardRoutes = require("./routes/dashboardRoutes");
const totalUsers = require("./routes/userRoutes");
const activeSessions = require("./routes/auth");

const app = express();

// Connect to database
connectDB();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api", protectedRoutes);
app.use("/api", userRoutes);
app.use("/api", logout);
app.use("/api", getProfile);
app.use("/api", addSkills);
app.use("/api", updateProfile);
app.use("/api", uploadImg);
app.use("/uploads", express.static("uploads"));
app.use("/api/dashboard", dashboardRoutes);
app.use("/api", totalUsers);
app.use("api", activeSessions);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
