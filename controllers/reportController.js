const supabase = require("../config/supabase")
// Create a new report (authenticated users)
exports.createReport = async (req, res) => {
    const { title, description, location } = req.body

    if (!title || !description || !location) {
        return res.status(400).json({ message: "All fields required" })
    }
// Handle image upload if file is provided
    let imageUrl = null

    if (req.file) {
        const fileName = `${Date.now()}-${req.file.originalname}`

        const { error: uploadError } = await supabase.storage
            .from("waste-images")
            .upload(fileName, req.file.buffer, {
                contentType: req.file.mimetype
            })

        if (uploadError) {
            return res.status(400).json({ error: uploadError.message })
        }

        const { data: publicUrl } = supabase.storage
            .from("waste-images")
            .getPublicUrl(fileName)

        imageUrl = publicUrl.publicUrl
    }
// Insert report into database
    const { data: report, error } = await supabase
        .from("reports")
        .insert([
            {
                user_id: req.user.id,
                title,
                description,
                location,
                image_url: imageUrl
            }
        ])
        .select()
        .single()

    if (error) {
        return res.status(400).json({ error: error.message })
    }

    // Find all admins
    const { data: admins } = await supabase
        .from("users")
        .select("id")
        .eq("role", "admin")

    // Create notifications for each admin
    const notifications = admins.map(admin => ({
        user_id: admin.id,
        message: `New waste report submitted: ${title}`
    }))

    await supabase.from("notifications").insert(notifications)

    res.status(201).json({ message: "Report submitted successfully" })
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

    const { error } = await supabase
        .from("assignments")
        .insert([{ report_id, collector_id }])

    if (error) {
        return res.status(400).json({ error: error.message })
    }

    await supabase
        .from("reports")
        .update({ status: "in_progress" })
        .eq("id", report_id)

    // Notify collector
    await supabase.from("notifications").insert([
        {
            user_id: collector_id,
            message: "You have been assigned a new waste report"
        }
    ])

    res.json({ message: "Collector assigned successfully" })
}
// Update report status (collector only)
exports.updateReportStatus = async (req, res) => {
    const { report_id, status } = req.body
    const collector_id = req.user.id

    // Check if collector is assigned to this report
    const { data: assignment, error: assignError } = await supabase
        .from("assignments")
        .select("*")
        .eq("report_id", report_id)
        .eq("collector_id", collector_id)
        .single()

    if (!assignment) {
        return res.status(403).json({
            error: "You are not assigned to this report"
        })
    }

    const { error } = await supabase
        .from("reports")
        .update({ status })
        .eq("id", report_id)

    if (error) {
        return res.status(400).json({ error: error.message })
    }

    res.json({ message: "Status updated successfully" })

    // Get report to find original user
const { data: report } = await supabase
    .from("reports")
    .select("user_id")
    .eq("id", report_id)
    .single()

await supabase.from("notifications").insert([
    {
        user_id: report.user_id,
        message: `Your report has been updated to: ${status}`
    }
])
}
// Get my reports (citizen only)
exports.getMyReports = async (req, res) => {
    const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("user_id", req.user.id)
        .order("created_at", { ascending: false })

    if (error) {
        return res.status(400).json({ error: error.message })
    }

    res.json(data)
}
// Get list of collectors (for admin assignment)
exports.getCollectors = async (req, res) => {
    const { data, error } = await supabase
        .from("users")
        .select("id, name")
        .eq("role", "collector")

    if (error) {
        return res.status(400).json({ error: error.message })
    }

    res.json(data)
}