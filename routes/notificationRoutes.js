const express = require("express")
const router = express.Router()
const notificationController = require("../controllers/notificationController")
const { authenticate } = require("../middleware/authMiddleware")

// Get all notifications for current user
router.get("/", authenticate, notificationController.getMyNotifications)

// Mark a single notification as read
router.patch("/:id/read", authenticate, notificationController.markAsRead)

// Mark all notifications as read
router.patch("/read-all", authenticate, notificationController.markAllAsRead)

module.exports = router