// routes/reportRoutes.js
const express = require("express")
const router = express.Router()
const reportController = require("../controllers/reportController")
const { authenticate, authorize } = require("../middleware/authMiddleware")
const upload = require("../middleware/uploadMiddleware")
// Create a new report (authenticated users)
router.post("/", authenticate, upload.single("image"), reportController.createReport)
// Get collector workload stats (admin only)
router.get(
    "/collectors",
    authenticate,
    authorize(["admin"]),
    reportController.getCollectors
)
// Get assigned reports for collector
router.get(
    "/assigned",
    authenticate,
    authorize(["collector"]),
    reportController.getAssignedReports
)
// Assign collector to report (admin only)
router.post(
    "/assign",
    authenticate,
    authorize(["admin"]),
    reportController.assignCollector
)
// Update report status (collector only)
router.put(
    "/status",
    authenticate,
    authorize(["collector"]),
    reportController.updateReportStatus
)
router.get(
    "/workload",
    authenticate,
    authorize(["admin"]),
    reportController.getCollectorWorkload
)
// Get my reports (citizens and collectors)
router.get(
    "/my",
    authenticate,
    reportController.getMyReports
)
// Start working on a report (collector only)
router.put(
    "/start",
    authenticate,
    authorize(["collector"]),
    reportController.startReport
)
// Mark report as completed (collector only)
router.put(
    "/complete",
    authenticate,
    authorize(["collector"]),
    reportController.completeReport
)
// Get all reports (admin only)
router.get(
    "/",
    authenticate,
    authorize(["admin"]),
    reportController.getAllReports
)

module.exports = router