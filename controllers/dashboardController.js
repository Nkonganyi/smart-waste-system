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

// Get report trends over time (admin only)
exports.getReportTrends = async (req, res) => {
    try {
        const daysParam = parseInt(req.query.days, 10)
        const periodDays = Number.isFinite(daysParam) && daysParam > 0 ? daysParam : 30

        const now = new Date()
        const startDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000)

        const { data: reports, error } = await supabase
            .from("reports")
            .select("created_at, status")
            .gte("created_at", startDate.toISOString())

        if (error) {
            return res.status(400).json({ error: error.message })
        }

        const dailyMap = {}
        const statusBreakdown = {
            pending: 0,
            approved: 0,
            in_progress: 0,
            completed: 0,
            rejected: 0
        }

        ;(reports || []).forEach(report => {
            if (report.created_at) {
                const dateKey = new Date(report.created_at).toISOString().slice(0, 10)
                dailyMap[dateKey] = (dailyMap[dateKey] || 0) + 1
            }
            if (report.status && statusBreakdown.hasOwnProperty(report.status)) {
                statusBreakdown[report.status] += 1
            }
        })

        const dailyCounts = Object.keys(dailyMap)
            .sort()
            .map(date => ({
                date,
                count: dailyMap[date]
            }))

        res.json({
            daily_counts: dailyCounts,
            status_breakdown: statusBreakdown,
            period_days: periodDays
        })
    } catch (err) {
        console.error("getReportTrends error:", err)
        res.status(500).json({ error: "Server error" })
    }
}

// Get collector performance stats (admin only)
exports.getCollectorPerformance = async (req, res) => {
    try {
        const { data: assignments, error } = await supabase
            .from("assignments")
            .select("collector_id, assigned_at, reports(status, completed_at)")

        if (error) {
            return res.status(400).json({ error: error.message })
        }

        if (!assignments || assignments.length === 0) {
            return res.json([])
        }

        const collectorIds = [...new Set(assignments.map(a => a.collector_id).filter(Boolean))]
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

        const stats = {}

        assignments.forEach(item => {
            const collectorId = item.collector_id
            if (!collectorId) return

            if (!stats[collectorId]) {
                stats[collectorId] = {
                    collector_id: collectorId,
                    name: collectorMap[collectorId] || "Unknown collector",
                    total_assigned: 0,
                    total_completed: 0,
                    completion_hours_sum: 0,
                    completion_hours_count: 0
                }
            }

            stats[collectorId].total_assigned += 1

            const report = item.reports
            if (report && report.status === "completed") {
                stats[collectorId].total_completed += 1
            }

            if (report && report.completed_at && item.assigned_at) {
                const assignedAt = new Date(item.assigned_at).getTime()
                const completedAt = new Date(report.completed_at).getTime()
                if (Number.isFinite(assignedAt) && Number.isFinite(completedAt) && completedAt >= assignedAt) {
                    const hours = (completedAt - assignedAt) / (1000 * 60 * 60)
                    stats[collectorId].completion_hours_sum += hours
                    stats[collectorId].completion_hours_count += 1
                }
            }
        })

        const result = Object.values(stats).map(item => {
            const avgHours =
                item.completion_hours_count > 0
                    ? Number((item.completion_hours_sum / item.completion_hours_count).toFixed(2))
                    : null
            return {
                collector_id: item.collector_id,
                name: item.name,
                total_assigned: item.total_assigned,
                total_completed: item.total_completed,
                avg_completion_hours: avgHours
            }
        })

        res.json(result)
    } catch (err) {
        console.error("getCollectorPerformance error:", err)
        res.status(500).json({ error: "Server error" })
    }
}
