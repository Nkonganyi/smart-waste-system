const supabase = require("../config/supabase")
// Get notifications for logged-in user
exports.getMyNotifications = async (req, res) => {
    const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", req.user.id)
        .order("created_at", { ascending: false })

    if (error) {
        return res.status(400).json({ error: error.message })
    }

    res.json(data)
}