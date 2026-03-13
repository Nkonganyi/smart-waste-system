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

        const { count: highPriority } = await supabase
            .from("reports")
            .select("*", { count: "exact", head: true })
            .eq("priority", "high")

        const { count: lowPriority } = await supabase
            .from("reports")
            .select("*", { count: "exact", head: true })
            .eq("priority", "low")

        const { count: totalUsers } = await supabase
            .from("users")
            .select("*", { count: "exact", head: true })

        const { count: collectors } = await supabase
            .from("users")
            .select("*", { count: "exact", head: true })
            .eq("role", "collector")

        res.json({
            totalReports: totalReports || 0,
            pending: pending || 0,
            inProgress: inProgress || 0,
            completed: completed || 0,
            highPriority: highPriority || 0,
            lowPriority: lowPriority || 0,
            totalUsers: totalUsers || 0,
            collectors: collectors || 0
        })
    } catch (err) {
        console.error("getAdminStats error:", err)
        res.status(500).json({ error: "Server error" })
    }
}

// Get report counts per location
exports.getReportsPerLocation = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("reports")
            .select("location")

        if (error) {
            return res.status(400).json({ error: error.message })
        }

        const locationCounts = {}
        data.forEach(report => {
            if (report.location) {
                locationCounts[report.location] = (locationCounts[report.location] || 0) + 1
            }
        })

        // Format for Chart.js [ { location: "X", count: 5 }, ... ]
        const result = Object.keys(locationCounts).map(loc => ({
            location: loc,
            count: locationCounts[loc]
        }))

        res.json(result)
    } catch (err) {
        console.error("getReportsPerLocation error:", err)
        res.status(500).json({ error: "Server error" })
    }
}

// Get collector workload (number of assigned reports)
exports.getCollectorWorkload = async (req, res) => {
    try {
        const { data: assignments, error } = await supabase
            .from("assignments")
            .select("collector_id")

        if (error) {
            return res.status(400).json({ error: error.message })
        }

        if (!assignments || assignments.length === 0) {
            return res.json([])
        }

        const collectorIds = [...new Set(assignments.map(a => a.collector_id))]
        let collectorMap = {}

        if (collectorIds.length > 0) {
            const { data: users } = await supabase
                .from("users")
                .select("id, name")
                .in("id", collectorIds)
            
            if (users) {
                collectorMap = users.reduce((acc, u) => {
                    acc[u.id] = u.name
                    return acc
                }, {})
            }
        }

        const workload = {}
        assignments.forEach(item => {
            const name = collectorMap[item.collector_id] || "Unknown collector"
            workload[name] = (workload[name] || 0) + 1
        })

        // Format for Chart.js [ { collector: "X", count: 5 }, ... ]
        const result = Object.keys(workload).map(name => ({
            collector: name,
            count: workload[name]
        }))

        res.json(result)
    } catch (err) {
        console.error("getCollectorWorkload error:", err)
        res.status(500).json({ error: "Server error" })
    }
}
