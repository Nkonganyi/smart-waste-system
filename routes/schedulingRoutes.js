const express = require("express")
const router = express.Router()
const schedulingController = require("../controllers/schedulingController")
const { authenticate, authorize } = require("../middleware/authMiddleware")

/**
 * Admin-only scheduling routes
 */

// GET /api/schedule/prioritized - Get prioritized reports
router.get("/prioritized", authenticate, authorize(["admin"]), schedulingController.getPrioritizedReports)

module.exports = router
