const express = require("express")
const router = express.Router()
const authController = require("../controllers/authController")
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

module.exports = router
