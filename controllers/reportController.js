const supabase = require("../config/supabase")
const { geocode, getLocationSuggestions } = require("../utils/geocodingService")

// Helper: Calculate distance between two points in meters (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
}

// Create a new report (authenticated users)
exports.createReport = async (req, res) => {
    try {
        const { title, description, location, priority } = req.body

        if (!title || !description || !location || !priority) {
            return res.status(400).json({ message: "All fields required" })
        }

        // Validation Rule 2: At least 3 characters
        if (typeof location !== "string" || location.trim().length < 3) {
            return res.status(400).json({ 
                error: "Please provide a valid location or landmark." 
            })
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

        // Geocode location (Graceful failure)
        let coords = null
        try {
            coords = await geocode(location)
            if (coords) {
                console.log(`Geocoded "${location}" to:`, coords)
            } else {
                console.warn(`Could not geocode "${location}". Storing with NULL coordinates.`)
            }
        } catch (geoError) {
            console.error(`Geocoding failed for "${location}":`, geoError.message)
            // Continue without coordinates
        }

        // Duplicate Detection Logic
        let parentReportId = null
        
        // 1. Proximity Check (if coordinates exist)
        if (coords) {
            const { data: existingReports } = await supabase
                .from("reports")
                .select("id, latitude, longitude")
                .neq("status", "completed")
                .not("latitude", "is", null)
                .not("longitude", "is", null)

            if (existingReports) {
                for (const report of existingReports) {
                    const distance = calculateDistance(
                        coords.latitude, coords.longitude,
                        report.latitude, report.longitude
                    )
                    
                    if (distance <= 50) { // 50 meters threshold
                        parentReportId = report.id
                        console.log(`Duplicate detected via proximity! Linking to report ${report.id}`)
                        break
                    }
                }
            }
        }

        // 2. Text Search Fallback (if no proximity match found)
        if (!parentReportId) {
            const { data: textMatch } = await supabase
                .from("reports")
                .select("id")
                .neq("status", "completed")
                .ilike("location", location) // Case-insensitive exact match
                .is("parent_report_id", null) // Link to the "main" report
                .limit(1)
                .single()

            if (textMatch) {
                parentReportId = textMatch.id
                console.log(`Duplicate detected via location text! Linking to report ${textMatch.id}`)
            }
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
                    priority: priority || "normal",
                    image_url: imageUrl,
                    latitude: coords ? coords.latitude : null,
                    longitude: coords ? coords.longitude : null,
                    parent_report_id: parentReportId
                }
            ])
            .select()
            .single()

        if (error) {
            return res.status(400).json({ error: error.message })
        }

        // Find all admins and notify them
        const { data: admins } = await supabase
            .from("users")
            .select("id")
            .eq("role", "admin")

        if (admins && admins.length > 0) {
            const notifications = admins.map(admin => ({
                user_id: admin.id,
                message: `New waste report submitted: ${title}`,
                is_read: false
            }))
            await supabase.from("notifications").insert(notifications)
        }

        res.status(201).json({ message: "Report submitted successfully" })
    } catch (err) {
        console.error("createReport exception:", err)
        res.status(500).json({ error: "Server error" })
    }
}

// Get all reports (admin only)
exports.getAllReports = async (req, res) => {
    try {
        // Fetch reports without direct join to avoid "relationship not found" errors
        const { data: reports, error: reportError } = await supabase
            .from("reports")
            .select("*")
            .order("created_at", { ascending: false })

        if (reportError) {
            return res.status(400).json({ error: reportError.message })
        }

        if (!reports || reports.length === 0) {
            return res.json([])
        }

        // Fetch users manually to link them
        const userIds = [...new Set(reports.map(r => r.user_id).filter(id => id))]
        let userMap = {}

        if (userIds.length > 0) {
            const { data: users } = await supabase
                .from("users")
                .select("id, name, email")
                .in("id", userIds)
            
            if (users) {
                userMap = users.reduce((acc, u) => {
                    acc[u.id] = { name: u.name, email: u.email }
                    return acc
                }, {})
            }
        }

        // Fetch assignments
        const reportIds = reports.map(report => report.id)
        let assignmentMap = {}

        const { data: assignments } = await supabase
            .from("assignments")
            .select("report_id, collector_id")
            .in("report_id", reportIds)

        if (assignments) {
            assignmentMap = assignments.reduce((acc, a) => {
                acc[a.report_id] = a.collector_id
                return acc
            }, {})
        }

        // Fetch duplicate counts for main reports
        const { data: duplicateCounts } = await supabase
            .from("reports")
            .select("parent_report_id")
            .not("parent_report_id", "is", null)

        const countMap = {}
        if (duplicateCounts) {
            duplicateCounts.forEach(d => {
                countMap[d.parent_report_id] = (countMap[d.parent_report_id] || 0) + 1
            })
        }

        // Enrich reports with user, assignment, and duplicate data
        const enriched = reports.map(report => ({
            ...report,
            users: userMap[report.user_id] || { name: "Unknown", email: "N/A" },
            assigned_to: assignmentMap[report.id] || null,
            duplicate_count: countMap[report.id] || 0
        }))

        res.json(enriched)
    } catch (err) {
        console.error("getAllReports exception:", err)
        res.status(500).json({ error: "Server error" })
    }
}

// Approve report (admin only)
exports.approveReport = async (req, res) => {
    try {
        const { report_id } = req.body

        if (!report_id) {
            return res.status(400).json({ error: "report_id is required" })
        }

        const { data: report, error: reportError } = await supabase
            .from("reports")
            .select("id, status, user_id, title")
            .eq("id", report_id)
            .single()

        if (reportError || !report) {
            return res.status(404).json({ error: "Report not found" })
        }

        if (report.status !== "pending") {
            return res.status(400).json({ error: "Only pending reports can be approved" })
        }

        const { error: updateError } = await supabase
            .from("reports")
            .update({ status: "approved" })
            .eq("id", report_id)

        if (updateError) {
            return res.status(400).json({ error: updateError.message })
        }

        if (report.user_id) {
            await supabase.from("notifications").insert([
                {
                    user_id: report.user_id,
                    message: `Your report "${report.title}" has been approved.`,
                    is_read: false
                }
            ])
        }

        res.json({ message: "Report approved successfully" })
    } catch (err) {
        console.error("approveReport exception:", err)
        res.status(500).json({ error: "Server error" })
    }
}

// Reject report (admin only)
exports.rejectReport = async (req, res) => {
    try {
        const { report_id, reason } = req.body

        if (!report_id) {
            return res.status(400).json({ error: "report_id is required" })
        }

        const { data: report, error: reportError } = await supabase
            .from("reports")
            .select("id, status, user_id, title")
            .eq("id", report_id)
            .single()

        if (reportError || !report) {
            return res.status(404).json({ error: "Report not found" })
        }

        if (!["pending", "approved"].includes(report.status)) {
            return res.status(400).json({ error: `Cannot reject a report with status "${report.status}"` })
        }

        const { error: updateError } = await supabase
            .from("reports")
            .update({ status: "rejected" })
            .eq("id", report_id)

        if (updateError) {
            return res.status(400).json({ error: updateError.message })
        }

        if (report.user_id) {
            const reasonText = typeof reason === "string" && reason.trim().length > 0
                ? ` Reason: ${reason.trim()}`
                : ""

            await supabase.from("notifications").insert([
                {
                    user_id: report.user_id,
                    message: `Your report "${report.title}" was rejected.${reasonText}`,
                    is_read: false
                }
            ])
        }

        res.json({ message: "Report rejected successfully" })
    } catch (err) {
        console.error("rejectReport exception:", err)
        res.status(500).json({ error: "Server error" })
    }
}

// Assign collector to report (admin only)
exports.assignCollector = async (req, res) => {
    try {
        const { report_id, collector_id } = req.body

        if (!report_id || !collector_id) {
            return res.status(400).json({ error: "report_id and collector_id are required" })
        }
        const { data: report, error: reportError } = await supabase
            .from("reports")
            .select("status")
            .eq("id", report_id)
            .single()

        if (reportError || !report) {
            return res.status(404).json({ error: "Report not found" })
        }

        if (report.status !== "approved") {
            return res.status(400).json({ error: "Report must be approved before assigning a collector" })
        }

        const { error: deleteError } = await supabase
            .from("assignments")
            .delete()
            .eq("report_id", report_id)

        if (deleteError) {
            return res.status(400).json({ error: deleteError.message })
        }

        const { error } = await supabase
            .from("assignments")
            .insert([{ report_id, collector_id }])

        if (error) {
            return res.status(400).json({ error: error.message })
        }

        // Notify collector
        await supabase.from("notifications").insert([
            {
                user_id: collector_id,
                message: "You have been assigned a new waste report",
                is_read: false
            }
        ])

        res.json({ message: "Collector assigned successfully" })
    } catch (err) {
        console.error("assignCollector exception:", err)
        res.status(500).json({ error: "Server error" })
    }
}

// Update report status (collector only)
exports.updateReportStatus = async (req, res) => {
    try {
        const { report_id, status } = req.body
        const collector_id = req.user.id

        // Check if collector is assigned to this report
        const { data: assignment } = await supabase
            .from("assignments")
            .select("*")
            .eq("report_id", report_id)
            .eq("collector_id", collector_id)
            .single()

        if (!assignment) {
            return res.status(403).json({ error: "You are not assigned to this report" })
        }

        const { error } = await supabase
            .from("reports")
            .update({ status })
            .eq("id", report_id)

        if (error) {
            return res.status(400).json({ error: error.message })
        }

        // Notify report owner (best effort)
        const { data: report } = await supabase
            .from("reports")
            .select("user_id")
            .eq("id", report_id)
            .single()

        if (report?.user_id) {
            await supabase.from("notifications").insert([
                {
                    user_id: report.user_id,
                    message: `Your report has been updated to: ${status}`,
                    is_read: false
                }
            ])
        }

        res.json({ message: "Status updated successfully" })
    } catch (err) {
        console.error("updateReportStatus exception:", err)
        res.status(500).json({ error: "Server error" })
    }
}

// Get my reports (citizens get submitted reports, collectors get assigned reports)
exports.getMyReports = async (req, res) => {
    try {
        if (req.user.role === "collector") {
            const { data, error } = await supabase
                .from("assignments")
                .select(`report_id, reports(*)`)
                .eq("collector_id", req.user.id)

            if (error) {
                return res.status(400).json({ error: error.message })
            }

            const reports = data.map(item => ({
                ...item.reports,
                assigned_to: req.user.id
            }))

            return res.json(reports)
        }

        const { data, error } = await supabase
            .from("reports")
            .select("*")
            .eq("user_id", req.user.id)
            .order("created_at", { ascending: false })

        if (error) {
            return res.status(400).json({ error: error.message })
        }

        res.json(data)
    } catch (err) {
        console.error("getMyReports exception:", err)
        res.status(500).json({ error: "Server error" })
    }
}

// Get list of collectors (for admin assignment)
exports.getCollectors = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("users")
            .select("id, name, email, is_suspended")
            .eq("role", "collector")

        if (error) {
            return res.status(400).json({ error: error.message })
        }

        res.json(data)
    } catch (err) {
        console.error("getCollectors exception:", err)
        res.status(500).json({ error: "Server error" })
    }
}

// Get assigned reports for collector
exports.getAssignedReports = async (req, res) => {
    try {
        const collectorId = req.user.id

        const { data, error } = await supabase
            .from("assignments")
            .select(`report_id, reports(*)`)
            .eq("collector_id", collectorId)

        if (error) {
            return res.status(400).json({ error: error.message })
        }

        const reports = data.map(item => ({
            ...item.reports,
            assigned_to: collectorId
        }))

        res.json(reports)
    } catch (err) {
        console.error("getAssignedReports exception:", err)
        res.status(500).json({ error: "Server error" })
    }
}

// Get collector workload (number of assigned reports)
exports.getCollectorWorkload = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("assignments")
            .select(`collector_id, users!assignments_collector_id_fkey(name)`)

        if (error) {
            return res.status(400).json({ error: error.message })
        }

        const workload = {}

        data.forEach(item => {
            const name = item.users?.name
            if (!workload[name]) workload[name] = 0
            workload[name]++
        })

        const result = Object.keys(workload).map(name => ({
            collector: name,
            count: workload[name]
        }))

        res.json(result)
    } catch (err) {
        console.error("getCollectorWorkload exception:", err)
        res.status(500).json({ error: "Server error" })
    }
}

// Mark report as in progress
exports.startReport = async (req, res) => {
    try {
        const { report_id } = req.body
        const collectorId = req.user.id

        const { data: assignment, error: assignError } = await supabase
            .from("assignments")
            .select("id")
            .eq("report_id", report_id)
            .eq("collector_id", collectorId)
            .single()

        if (assignError || !assignment) {
            return res.status(403).json({ error: "You are not assigned to this report" })
        }

        const { error } = await supabase
            .from("reports")
            .update({ status: "in_progress" })
            .eq("id", report_id)

        if (error) {
            return res.status(400).json({ error: error.message })
        }

        res.json({ message: "Report marked as In Progress" })
    } catch (err) {
        console.error("startReport exception:", err)
        res.status(500).json({ error: "Server error" })
    }
}

// Mark report as completed
exports.completeReport = async (req, res) => {
    try {
        const { report_id, completion_image_url } = req.body
        const collectorId = req.user.id

        if (!completion_image_url) {
            return res.status(400).json({ error: "Completion image is required." })
        }

        const { data: assignment, error: assignError } = await supabase
            .from("assignments")
            .select("id")
            .eq("report_id", report_id)
            .eq("collector_id", collectorId)
            .single()

        if (assignError || !assignment) {
            return res.status(403).json({ error: "You are not assigned to this report" })
        }

        const { error } = await supabase
            .from("reports")
            .update({
                status: "completed",
                completed_at: new Date(),
                completion_image_url
            })
            .eq("id", report_id)

        if (error) {
            return res.status(400).json({ error: error.message })
        }

        // Notify the citizen who filed the report
        const { data: report } = await supabase
            .from("reports")
            .select("user_id, title")
            .eq("id", report_id)
            .single()

        if (report?.user_id) {
            await supabase.from("notifications").insert([
                {
                    user_id: report.user_id,
                    message: `Your report "${report.title}" has been completed!`,
                    is_read: false
                }
            ])
        }

        res.json({ message: "Report completed successfully" })
    } catch (err) {
        console.error("completeReport exception:", err)
        res.status(500).json({ error: "Server error" })
    }
}

// Reject report assignment
exports.rejectAssignment = async (req, res) => {
    try {
        const { report_id } = req.body
        const collectorId = req.user.id

        const { error: deleteError } = await supabase
            .from("assignments")
            .delete()
            .eq("report_id", report_id)
            .eq("collector_id", collectorId)

        if (deleteError) {
            return res.status(400).json({ error: deleteError.message })
        }

        const { error: updateError } = await supabase
            .from("reports")
            .update({ status: "pending" })
            .eq("id", report_id)

        if (updateError) {
            return res.status(400).json({ error: updateError.message })
        }

        res.json({ message: "Assignment rejected successfully" })
    } catch (err) {
        console.error("rejectAssignment exception:", err)
        res.status(500).json({ error: "Server error" })
    }
}

// Get location suggestions for autocomplete
exports.getLocationSuggestions = async (req, res) => {
    try {
        const { q } = req.query
        if (!q || q.length < 2) {
            return res.json([])
        }

        const suggestions = await getLocationSuggestions(q)
        res.json(suggestions)
    } catch (err) {
        console.error("getLocationSuggestions exception:", err)
        res.status(500).json({ error: "Server error" })
    }
}



