const express = require("express")
const router = express.Router()
const routeController = require("../controllers/routeController")
const { authenticate, authorize } = require("../middleware/authMiddleware")

/**
 * Admin-only route optimization routes
 */

// GET /api/routes - Get optimized route
router.get("/", authenticate, authorize(["admin"]), routeController.getOptimizedRoute)

module.exports = router
