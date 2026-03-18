const express = require("express")
const router = express.Router()
const authController = require("../controllers/authController")
const userController = require("../controllers/userController")
const { authenticate, authorize } = require("../middleware/authMiddleware")

/**
 * Admin-only user management routes
 */

// POST /api/admin/suspend-user - Suspend a user account
router.post("/suspend-user", authenticate, authorize(["admin"]), authController.suspendUser)

// POST /api/admin/unsuspend-user - Reactive a suspended account
router.post("/unsuspend-user", authenticate, authorize(["admin"]), authController.unsuspendUser)

// POST /api/admin/verify-user - Manually verify a user's email
router.post("/verify-user", authenticate, authorize(["admin"]), authController.verifyEmail)

// GET /api/admin/users - Get all users
router.get("/users", authenticate, authorize(["admin"]), userController.getAllUsers)

// GET /api/admin/users/:id - Get a single user by ID
router.get("/users/:id", authenticate, authorize(["admin"]), userController.getUserById)

module.exports = router
