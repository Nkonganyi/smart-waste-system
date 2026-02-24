// routes/dashboardRoutes.js
const express = require("express")
const router = express.Router()
const dashboardController = require("../controllers/dashboardController")
const { authenticate, authorize } = require("../middleware/authMiddleware")
// Admin dashboard stats
router.get(
    "/admin",
    authenticate,
    authorize(["admin"]),
    dashboardController.getAdminStats
)
// Report counts per location
router.get(
    "/locations",
    authenticate,
    authorize(["admin"]),
    dashboardController.getReportsPerLocation
)
// Collector workload stats
router.get(
    "/collectors",
    authenticate,
    authorize(["admin"]),
    dashboardController.getCollectorWorkload
)
module.exports = router