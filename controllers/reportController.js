const supabase = require("../config/supabase")

// Create a new report (authenticated users)
exports.createReport = async (req, res) => {
    try {
        const { title, description, location, priority } = req.body

        if (!title || !description || !location || !priority) {
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
                    priority: priority || "normal",
                    image_url: imageUrl
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
        const { data, error } = await supabase
            .from("reports")
            .select(`*, users(name, email)`)

        if (error) {
            return res.status(400).json({ error: error.message })
        }

        const reports = data || []
        const reportIds = reports.map(report => report.id)
        let assignmentMap = {}

        if (reportIds.length > 0) {
            const { data: assignments, error: assignmentError } = await supabase
                .from("assignments")
                .select("report_id, collector_id")
                .in("report_id", reportIds)

            if (assignmentError) {
                return res.status(400).json({ error: assignmentError.message })
            }

            assignmentMap = assignments.reduce((acc, assignment) => {
                acc[assignment.report_id] = assignment.collector_id
                return acc
            }, {})
        }

        const enriched = reports.map(report => ({
            ...report,
            assigned_to: assignmentMap[report.id] || null
        }))

        res.json(enriched)
    } catch (err) {
        console.error("getAllReports exception:", err)
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
