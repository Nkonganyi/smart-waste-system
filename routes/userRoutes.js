const express = require("express");
const router = express.Router();
console.log("DEBUG: UserRoutes.js loaded");
const userController = require("../controllers/userController");
const { authenticate } = require("../middleware/authMiddleware");
const { validateProfileUpdate } = require("../middleware/profileValidator");

/**
 * User Profile Routes
 * All routes are protected by JWT authentication
 */

// GET /api/users/profile - Get current user profile
router.get("/profile", authenticate, userController.getProfile);

// Test route without authentication
router.get("/test", (req, res) => res.json({ message: "User router is working" }));

// PUT /api/users/profile - Update current user profile
router.put("/profile", authenticate, validateProfileUpdate, userController.updateProfile);

module.exports = router;
