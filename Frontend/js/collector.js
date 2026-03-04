// Global variable to control auto-refresh
let pauseAutoRefresh = false

// simple loading controls
function showLoading() {
    const spinner = document.getElementById("loading")
    if (spinner) spinner.style.display = "block"
}
function hideLoading() {
    const spinner = document.getElementById("loading")
    if (spinner) spinner.style.display = "none"
}

// Logout function
function logout() {
    localStorage.clear()
    window.location.href = "index.html"
}

// human-friendly status string
function formatStatus(status) {
    switch (status) {
        case 'pending': return 'Pending'
        case 'in_progress': return 'In Progress'
        case 'completed': return 'Completed'
        default: return status
    }
}

// Load assigned reports for collector
async function loadAssignedReports() {
    showLoading()
    const data = await apiRequest("/reports/assigned")

    const showCompleted = document.getElementById("showCompleted")?.checked || false

    data.sort((a, b) => {
        const priorityOrder = { low: 1, normal: 2, high: 3 }
        return priorityOrder[a.priority] - priorityOrder[b.priority]
    })

    // Work Summary
    const activeJobs = data.filter(r => r.status !== "completed").length
    const completedJobs = data.filter(r => r.status === "completed").length
    const totalJobs = data.length

    const summaryDiv = document.getElementById("workSummary")
    if (summaryDiv) {
        summaryDiv.innerHTML = `
            <div class="card-grid">
                <div class="card">
                    <div class="card-body">
                        <div class="text-center">
                            <div style="font-size: 2rem; font-weight: 700; color: var(--primary-color);">${activeJobs}</div>
                            <div class="text-muted">Active Jobs</div>
                        </div>
                    </div>
                </div>
                <div class="card">
                    <div class="card-body">
                        <div class="text-center">
                            <div style="font-size: 2rem; font-weight: 700; color: var(--success-color);">${completedJobs}</div>
                            <div class="text-muted">Completed Jobs</div>
                        </div>
                    </div>
                </div>
                <div class="card">
                    <div class="card-body">
                        <div class="text-center">
                            <div style="font-size: 2rem; font-weight: 700; color: var(--info-color);">${totalJobs}</div>
                            <div class="text-muted">Total Assigned</div>
                        </div>
                    </div>
                </div>
            </div>
        `
    }

    // Render reports as cards
    const container = document.getElementById("reportsList")
    container.innerHTML = ""

    data
        .filter(report => showCompleted || report.status !== "completed")
        .forEach(report => {
            const card = document.createElement("div")
            card.className = "card"

            // determine buttons depending on status
            let actionButtons = ""
            if (report.status === "pending") {
                actionButtons = `
                    <button class="btn btn-primary" onclick="startReport('${report.id}')">Start Work</button>
                    <button class="btn btn-danger" onclick="rejectAssignment('${report.id}')">Reject</button>
                `
            }
            if (report.status === "in_progress") {
                actionButtons = `
                    <input type="file" id="completion-${report.id}" onchange="pauseAutoRefresh = true" />
                    <button class="btn btn-success" onclick="completeReport('${report.id}')">Mark as Completed</button>
                `
            }
            if (report.status === "completed" && report.completed_at) {
                actionButtons = `<span class="badge badge-status completed">✔ Completed</span>`
                if (report.completed_at) {
                    const start = new Date(report.created_at)
                    const end = new Date(report.completed_at)
                    const diffMs = end - start
                    const totalMinutes = Math.floor(diffMs / (1000 * 60))
                    const hours = Math.floor(totalMinutes / 60)
                    const minutes = totalMinutes % 60
                    let timeText = hours > 0 ? `${hours} hour(s) ${minutes} min` : `${minutes} minute(s)`
                    actionButtons += `<br><small>Completed in ${timeText}</small>`
                }
                if (report.completion_image_url) {
                    actionButtons += `<br><img src="${report.completion_image_url}" class="card-img">`
                }
            }

            card.innerHTML = `
                <div class="card-header">
                    <div>
                        <h3 class="card-header-title">${report.title}</h3>
                    </div>
                </div>
                <div class="card-body">
                    <p class="mb-3">${report.description}</p>
                    <div class="card-body-item">
                        <span class="card-body-label">Location</span>
                        <span class="card-body-value">${report.location}</span>
                    </div>
                    <div class="card-body-item" style="display: flex; gap: 0.5rem;">
                        <span class="badge badge-status ${report.status}">${formatStatus(report.status)}</span>
                        <span class="badge badge-priority ${report.priority}">${report.priority.charAt(0).toUpperCase() + report.priority.slice(1)}</span>
                    </div>
                    ${report.image_url ? `<img src="${report.image_url}" class="card-img">` : ""}
                </div>
                <div class="card-footer">
                    <div class="btn-group">
                        ${actionButtons}
                    </div>
                </div>
            `
            container.appendChild(card)
        })

    hideLoading()
}

// START REPORT
async function startReport(reportId) {
    const btn = document.querySelector(`button[onclick="startReport('${reportId}')"]`)
    if (btn) btn.disabled = true
    
    showLoading()
    const data = await apiRequest("/reports/start", "PUT", {
        report_id: reportId
    })

    if (data.message) {
        showToast("Work started successfully!", "success")
    } else {
        showToast(data.error || "Error starting work", "error")
    }
    
    if (btn) btn.disabled = false
    await loadAssignedReports()
    hideLoading()
}

// COMPLETE REPORT
async function completeReport(reportId) {
    showLoading()

    const fileInput = document.getElementById(`completion-${reportId}`)
    const file = fileInput.files[0]

    // Require image
    if (!file) {
        showToast("Please upload a completion image before marking as completed", "warning")
        hideLoading()
        return
    }

    let imageUrl = null

    const formData = new FormData()
    formData.append("file", file)

    try {
        const uploadResponse = await fetch(`${API_BASE_URL}/upload`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`
            },
            body: formData
        })

        const uploadData = await uploadResponse.json()
        imageUrl = uploadData.url
    } catch (err) {
        console.error(err)
        showToast("Image upload failed. Please try again.", "error")
        hideLoading()
        return
    }

    if (!imageUrl) {
        showToast("Image upload failed. Please try again.", "error")
        hideLoading()
        return
    }

    const data = await apiRequest("/reports/complete", "PUT", {
        report_id: reportId,
        completion_image_url: imageUrl
    })

    if (data.message) {
        showToast("Report marked complete successfully!", "success")
    } else {
        showToast(data.error || "Error completing report", "error")
    }
    
    pauseAutoRefresh = false
    await loadAssignedReports()
    hideLoading()
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

    const list = document.getElementById("notificationsList")
    list.innerHTML = ""

    data.forEach(notification => {
        const li = document.createElement("li")
        li.className = "card mb-2 p-3"
        li.textContent = notification.message
        list.appendChild(li)
    })
}
// Reject report assignment
async function rejectAssignment(reportId) {
    const confirmed = confirm("Are you sure you want to reject this assignment? This action cannot be undone.")
    if (!confirmed) return

    showLoading()
    const data = await apiRequest("/reports/reject", "PUT", {
        report_id: reportId
    })

    if (data.message) {
        showToast("Assignment rejected", "success")
    } else {
        showToast(data.error || "Error rejecting assignment", "error")
    }
    
    await loadAssignedReports()
    hideLoading()
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