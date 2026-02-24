const supabase = require("../config/supabase")
// Get admin dashboard stats (admin only)
exports.getAdminStats = async (req, res) => {
    try {
        const { count: totalReports } = await supabase
            .from("reports")
            .select("*", { count: "exact", head: true })

        const { count: pending } = await supabase
            .from("reports")
            .select("*", { count: "exact", head: true })
            .eq("status", "pending")

        const { count: inProgress } = await supabase
            .from("reports")
            .select("*", { count: "exact", head: true })
            .eq("status", "in_progress")

        const { count: completed } = await supabase
            .from("reports")
            .select("*", { count: "exact", head: true })
            .eq("status", "completed")

        const { count: totalUsers } = await supabase
            .from("users")
            .select("*", { count: "exact", head: true })

        const { count: collectors } = await supabase
            .from("users")
            .select("*", { count: "exact", head: true })
            .eq("role", "collector")

        res.json({
            totalReports,
            pending,
            inProgress,
            completed,
            totalUsers,
            collectors
        })

    } catch (err) {
        res.status(500).json({ error: "Server error" })
    }
}
// Get report counts per location
exports.getReportsPerLocation = async (req, res) => {
    const { data, error } = await supabase
        .from("reports")
        .select("location")

    if (error) {
        return res.status(400).json({ error: error.message })
    }

    // Count manually
    const locationCounts = {}

    data.forEach(report => {
        locationCounts[report.location] =
            (locationCounts[report.location] || 0) + 1
    })

    res.json(locationCounts)
}
// Get collector workload (number of assigned reports)
exports.getCollectorWorkload = async (req, res) => {
    const { data, error } = await supabase
        .from("assignments")
        .select(`
            collector_id,
            users(name)
        `)
        .join("users", "users.id", "=", "assignments.collector_id")

    if (error) {
        return res.status(400).json({ error: error.message })
    }

    const workload = {}

    data.forEach(item => {
        const name = item.users.name

        workload[name] = (workload[name] || 0) + 1
    })

    res.json(workload)
}