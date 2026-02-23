const supabase = require("../config/supabase")
// Create a new report (authenticated users)
exports.createReport = async (req, res) => {
    const { title, description, location } = req.body

    if (!title || !description || !location) {
        return res.status(400).json({ message: "All fields required" })
    }
// Insert report into database
    const { data, error } = await supabase
        .from("reports")
        .insert([
            {
                user_id: req.user.id,
                title,
                description,
                location
            }
        ])

    if (error) {
        return res.status(400).json({ error: error.message })
    }

    res.status(201).json({ message: "Report submitted successfully", data })
}
// Get all reports (admin only)
exports.getAllReports = async (req, res) => {
    const { data, error } = await supabase
        .from("reports")
        .select(`
            *,
            users(name, email)
        `)

    if (error) {
        return res.status(400).json({ error: error.message })
    }

    res.json(data)
}
// Assign collector to report (admin only)
exports.assignCollector = async (req, res) => {
    const { report_id, collector_id } = req.body

    const { data, error } = await supabase
        .from("assignments")
        .insert([
            {
                report_id,
                collector_id
            }
        ])

    if (error) {
        return res.status(400).json({ error: error.message })
    }

    await supabase
        .from("reports")
        .update({ status: "in_progress" })
        .eq("id", report_id)

    res.json({ message: "Collector assigned successfully" })
}
// Update report status (collector only)
exports.updateReportStatus = async (req, res) => {
    const { report_id, status } = req.body

    const { data, error } = await supabase
        .from("reports")
        .update({ status })
        .eq("id", report_id)

    if (error) {
        return res.status(400).json({ error: error.message })
    }

    res.json({ message: "Status updated successfully" })
}