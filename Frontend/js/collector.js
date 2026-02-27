// Global variable to control auto-refresh
let pauseAutoRefresh = false
// Logout function
function logout() {
    localStorage.clear()
    window.location.href = "index.html"
}

// Load assigned reports for collector
async function loadAssignedReports() {
    const data = await apiRequest("/reports/assigned")

    const showCompleted = document.getElementById("showCompleted")?.checked || false

    // Work Summary
    const activeJobs = data.filter(r => r.status !== "completed").length
    const completedJobs = data.filter(r => r.status === "completed").length
    const totalJobs = data.length

    const summaryDiv = document.getElementById("workSummary")
    if (summaryDiv) {
        summaryDiv.innerHTML = `
            Active Jobs: <b>${activeJobs}</b> <br>
            Completed Jobs: <b>${completedJobs}</b> <br>
            Total Assigned: <b>${totalJobs}</b>
        `
    }

    // Workload Stats (for admin view)
    const workloadStats = document.getElementById("workloadStats")
    if (workloadStats) {
        workloadStats.innerHTML = `
            Total Assigned: ${totalJobs} <br>
            Active Jobs: ${activeJobs} <br>
            Completed: ${completedJobs}
        `
    }
    // Render reports
    const container = document.getElementById("reports")
    container.innerHTML = ""

    data
        .filter(report => showCompleted || report.status !== "completed")
        .forEach(report => {

            const div = document.createElement("div")
            div.style.border = "1px solid #ccc"
            div.style.padding = "10px"
            div.style.marginBottom = "10px"

            let actionButtons = ""

            if (report.status === "pending") {
    actionButtons = `
        <button onclick="startReport('${report.id}')">
            Start Work
        </button>
        <button onclick="rejectAssignment('${report.id}')"
            style="background-color: red; color: white;">
            Reject
        </button>
    `
        }

        if (report.status === "in_progress") {
        actionButtons = `
        <input type="file" id="completion-${report.id}" 
        onchange="pauseAutoRefresh = true" />
        <button onclick="completeReport('${report.id}')">
            Mark as Completed
        </button>
       `
        }
            // Show completed status with green checkmark
            if (report.status === "completed" && report.completed_at) {
                actionButtons = `<span style="color: green;">✔ Completed</span>`
                // Show time taken if available
                if (report.status === "completed" && report.completed_at) {

                    const start = new Date(report.created_at)
                    const end = new Date(report.completed_at)

                    const diffMs = end - start

                    const totalMinutes = Math.floor(diffMs / (1000 * 60))
                    const hours = Math.floor(totalMinutes / 60)
                    const minutes = totalMinutes % 60

                    let timeText = ""

                    if (hours > 0) {
                        timeText = `${hours} hour(s) ${minutes} min`
                    } else {
                        timeText = `${minutes} minute(s)`
                    }

                    actionButtons += `<br><small>Completed in ${timeText}</small>`
                }
                if (report.completion_image_url) {
                actionButtons += `<br><img src="${report.completion_image_url}" width="200">`
              }
            }

            div.innerHTML = `
                <strong>${report.title}</strong><br>
                ${report.description}<br>
                Location: ${report.location}<br>
                Status: <b>${report.status}</b><br>
                ${report.image_url ? `<img src="${report.image_url}" width="200"><br>` : ""}
                ${actionButtons}
            `

            container.appendChild(div)
        })
}

// START REPORT
async function startReport(reportId) {
    const data = await apiRequest("/reports/start", "PUT", {
        report_id: reportId
    })

    alert(data.message || data.error)
    loadAssignedReports()
}

// COMPLETE REPORT
async function completeReport(reportId) {

    const fileInput = document.getElementById(`completion-${reportId}`)
    const file = fileInput.files[0]

    // Require image
    if (!file) {
        alert("You must upload a completion image before marking as completed.")
        return
    }

    let imageUrl = null

    const formData = new FormData()
    formData.append("file", file)

    const uploadResponse = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: formData
    })

    const uploadData = await uploadResponse.json()
    imageUrl = uploadData.url

    if (!imageUrl) {
        alert("Image upload failed. Try again.")
        return
    }

    const data = await apiRequest("/reports/complete", "PUT", {
        report_id: reportId,
        completion_image_url: imageUrl
    })

    alert(data.message || data.error)
    pauseAutoRefresh = false
    loadAssignedReports()
}

// OLD STATUS FUNCTION (Keeping it — not deleting)
async function updateStatus(reportId, status) {
    const data = await apiRequest("/reports/status", "PUT", {
        report_id: reportId,
        status: status
    })

    if (data.message) {
        alert("Status updated successfully")
        loadAssignedReports()
    } else {
        alert(data.error || "Error updating status")
    }
}

// Load notifications
async function loadNotifications() {
    const data = await apiRequest("/notifications")

    const list = document.getElementById("notifications")
    list.innerHTML = ""

    data.forEach(notification => {
        const li = document.createElement("li")
        li.textContent = notification.message
        list.appendChild(li)
    })
}
// Reject report assignment
async function rejectAssignment(reportId) {
    const confirmReject = confirm("Are you sure you want to reject this assignment?")
    if (!confirmReject) return

    const data = await apiRequest("/reports/reject", "PUT", {
        report_id: reportId
    })

    alert(data.message || data.error)
    loadAssignedReports()
}

// Initial Load
loadAssignedReports()
loadNotifications()

// Auto refresh every 10 seconds
setInterval(() => {
    if (!pauseAutoRefresh) {
        loadAssignedReports()
        loadNotifications()
    }
}, 10000)