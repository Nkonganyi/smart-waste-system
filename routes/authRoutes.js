const express = require("express")
const router = express.Router()
const authController = require("../controllers/authController")
const { authenticate, authorize } = require("../middleware/authMiddleware")

/**
 * Public authentication routes
 */
router.post("/register", authController.register)
router.post("/login", authController.login)
router.get("/verify-email", authController.verifyEmailToken)
router.post("/logout", authenticate, authController.logout)

/**
 * Admin-only user management routes
 */
router.post("/verify-email-admin", authenticate, authorize(["admin"]), authController.verifyEmail)
router.post("/suspend-user", authenticate, authorize(["admin"]), authController.suspendUser)
router.post("/unsuspend-user", authenticate, authorize(["admin"]), authController.unsuspendUser)

module.exports = router