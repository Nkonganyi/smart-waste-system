const supabase = require("../config/supabase")

// Get notifications for logged-in user
exports.getMyNotifications = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("notifications")
            .select("*")
            .eq("user_id", req.user.id)
            .order("created_at", { ascending: false })

        if (error) {
            return res.status(400).json({ error: error.message })
        }

        res.json(data || [])
    } catch (err) {
        console.error("getMyNotifications exception:", err)
        res.status(500).json({ error: "Server error" })
    }
}

// Mark a single notification as read
exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params

        const { data, error } = await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("id", id)
            .eq("user_id", req.user.id) // Only the owner can mark their own as read
            .select()
            .single()

        if (error) {
            return res.status(400).json({ error: error.message })
        }

        if (!data) {
            return res.status(404).json({ error: "Notification not found" })
        }

        res.json({ message: "Notification marked as read", notification: data })
    } catch (err) {
        console.error("markAsRead exception:", err)
        res.status(500).json({ error: "Server error" })
    }
}

// Mark all notifications as read for the current user
exports.markAllAsRead = async (req, res) => {
    try {
        const { error } = await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("user_id", req.user.id)
            .eq("is_read", false)

        if (error) {
            return res.status(400).json({ error: error.message })
        }

        res.json({ message: "All notifications marked as read" })
    } catch (err) {
        console.error("markAllAsRead exception:", err)
        res.status(500).json({ error: "Server error" })
    }
}