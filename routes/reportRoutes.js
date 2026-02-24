// routes/reportRoutes.js
const express = require("express")
const router = express.Router()
const reportController = require("../controllers/reportController")
const { authenticate, authorize } = require("../middleware/authMiddleware")
const upload = require("../middleware/uploadMiddleware")
// Create a new report (authenticated users)
router.post("/", authenticate, upload.single("image"), reportController.createReport)
// Get all reports (admin only)
router.get(
    "/",
    authenticate,
    authorize(["admin"]),
    reportController.getAllReports
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

module.exports = router