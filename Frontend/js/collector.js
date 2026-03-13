// collector.js - Handles collector-specific frontend logic

// Require collector role on load
window.addEventListener("DOMContentLoaded", () => {
    if (!requireAuth("collector")) return
    loadTheme()
    loadAssignedReports()
    loadNotifications()
})

function loadTheme() {
    const savedTheme = localStorage.getItem("theme") || "dark"
    document.documentElement.setAttribute("data-theme", savedTheme)
    const icon = document.getElementById("theme-icon")
    if (icon) icon.textContent = savedTheme === "dark" ? "☀️" : "🌙"
}

function toggleTheme() {
    const html = document.documentElement
    const newTheme = html.getAttribute("data-theme") === "dark" ? "light" : "dark"
    html.setAttribute("data-theme", newTheme)
    localStorage.setItem("theme", newTheme)
    const icon = document.getElementById("theme-icon")
    if (icon) icon.textContent = newTheme === "dark" ? "☀️" : "🌙"
}

function toggleSidebar() {
    document.querySelector(".sidebar")?.classList.toggle("active")
    document.getElementById("sidebarToggle")?.classList.toggle("active")
}

function showLoading() {
    const spinner = document.getElementById("loading")
    if (spinner) spinner.style.display = "block"
}

function hideLoading() {
    const spinner = document.getElementById("loading")
    if (spinner) spinner.style.display = "none"
}

function logout() {
    localStorage.clear()
    window.location.href = "index.html"
}

let allAssignedReports = []

// Load assigned reports
async function loadAssignedReports() {
    showLoading()
    try {
        const data = await apiRequest("/reports/assigned")
        if (Array.isArray(data)) {
            allAssignedReports = data
            renderReports()
            updateWorkSummary()
        }
    } catch (err) {
        console.error("loadAssignedReports error:", err)
        showToast("Error loading assignments", "error")
    }
    hideLoading()
}

// Render reports
function renderReports() {
    const showCompleted = document.getElementById("showCompleted")?.checked
    const container = document.getElementById("reportsList")

    if (!container) return
    container.innerHTML = ""

    const filtered = allAssignedReports.filter(report => {
        if (!showCompleted && report.status === "completed") return false
        return true
    })

    if (filtered.length === 0) {
        container.innerHTML = `<div class="card"><div class="card-body"><p style="color:var(--text-secondary);">No assigned reports found.</p></div></div>`
        return
    }

    filtered.forEach(report => {
        const card = document.createElement("div")
        card.className = "card"

        // Determine available actions based on status
        let actionButtons = ""
        if (report.status === "pending") {
            actionButtons = `
                <button class="btn btn-primary" onclick="startJob('${report.id}')">Start Job</button>
                <button class="btn btn-secondary" onclick="rejectJob('${report.id}')">Reject</button>
            `
        } else if (report.status === "in_progress") {
            actionButtons = `
                <button class="btn btn-primary" onclick="showCompleteForm('${report.id}')">Complete</button>
            `
        }

        const completionForm = `
            <div id="complete-form-${report.id}" style="display:none; margin-top:1rem; padding-top:1rem; border-top:1px solid var(--light-bg);">
                <div class="form-group mb-2">
                    <label class="form-label" style="font-size:0.85rem;">Upload Photo of Cleaned Area *</label>
                    <input type="file" id="complete-img-${report.id}" accept="image/*" class="form-control" style="font-size:0.85rem; padding:0.25rem;">
                </div>
                <button class="btn btn-primary" style="padding:0.25rem 0.5rem; font-size:0.85rem;" onclick="submitCompletion('${report.id}')">Submit Cleanup</button>
                <button class="btn btn-secondary" style="padding:0.25rem 0.5rem; font-size:0.85rem; margin-left:0.5rem;" onclick="hideCompleteForm('${report.id}')">Cancel</button>
            </div>
        `

        card.innerHTML = `
            <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
                <h3 class="card-header-title">${report.title}</h3>
                <span style="font-size:0.8rem; color:var(--text-tertiary);">ID: ${report.id.substring(0, 8)}</span>
            </div>
            <div class="card-body">
                <p class="mb-3">${report.description}</p>
                <div class="card-body-item">
                    <span class="card-body-label">Location</span>
                    <span class="card-body-value"><strong>${report.location}</strong></span>
                </div>
                <div class="card-body-item" style="justify-content:space-between;">
                    <div>
                        <span class="badge badge-status ${report.status}">${formatStatus(report.status)}</span>
                        <span class="badge badge-priority ${report.priority}">${report.priority}</span>
                    </div>
                    <span style="font-size:0.8rem; color:var(--text-tertiary);">${new Date(report.created_at).toLocaleDateString()}</span>
                </div>
                ${report.image_url ? `<img src="${report.image_url}" class="card-img">` : ""}
                ${report.status !== "completed" ? `<div style="margin-top:1.5rem; display:flex; gap:0.5rem;">${actionButtons}</div>` : ""}
                ${report.status === "in_progress" ? completionForm : ""}
            </div>
            ${report.status === "completed" && report.completion_image_url
                ? `<div class="card-footer" style="flex-direction:column; align-items:flex-start;">
                    <span style="font-size:0.8rem; font-weight:600; margin-bottom:0.5rem; color:var(--success-color);">✓ Cleanup Verified</span>
                    <img src="${report.completion_image_url}" class="card-img" style="margin-top:0;">
                   </div>`
                : ""
            }
        `
        container.appendChild(card)
    })
}

function updateWorkSummary() {
    const summary = document.getElementById("workSummary")
    if (!summary) return

    const total = allAssignedReports.length
    const pending = allAssignedReports.filter(r => r.status === "pending").length
    const active = allAssignedReports.filter(r => r.status === "in_progress").length
    const completed = allAssignedReports.filter(r => r.status === "completed").length

    summary.innerHTML = `
        <div class="card-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
            <div class="card">
                <div class="card-body text-center">
                    <h3 style="font-size: 2rem; color: var(--primary-color); margin: 0;">${pending}</h3>
                    <p style="color: var(--text-secondary); margin: 0;">Pending Assignment</p>
                </div>
            </div>
            <div class="card">
                <div class="card-body text-center">
                    <h3 style="font-size: 2rem; color: var(--warning-color); margin: 0;">${active}</h3>
                    <p style="color: var(--text-secondary); margin: 0;">In Progress</p>
                </div>
            </div>
            <div class="card">
                <div class="card-body text-center">
                    <h3 style="font-size: 2rem; color: var(--success-color); margin: 0;">${completed}</h3>
                    <p style="color: var(--text-secondary); margin: 0;">Completed Jobs</p>
                </div>
            </div>
        </div>
    `
}

function formatStatus(status) {
    if (status === "in_progress") return "In Progress"
    return status.charAt(0).toUpperCase() + status.slice(1)
}

// Action: Start Job
async function startJob(reportId) {
    if (!confirm("Start this cleanup job now?")) return
    showLoading()
    try {
        await apiRequest("/reports/start", "PUT", { report_id: reportId })
        showToast("Job marked as In Progress", "success")
        await loadAssignedReports()
    } catch (err) {
        showToast("Failed to start job", "error")
    }
    hideLoading()
}

// Action: Reject Job
async function rejectJob(reportId) {
    if (!confirm("Are you sure you want to reject this assignment? It will go back into the unassigned queue.")) return
    showLoading()
    try {
        await apiRequest("/reports/reject", "PUT", { report_id: reportId })
        showToast("Assignment rejected", "info")
        await loadAssignedReports()
    } catch (err) {
        showToast("Failed to reject assignment", "error")
    }
    hideLoading()
}

// Show/Hide completion form logic
function showCompleteForm(reportId) {
    document.getElementById(`complete-form-${reportId}`).style.display = "block"
}

function hideCompleteForm(reportId) {
    document.getElementById(`complete-form-${reportId}`).style.display = "none"
    document.getElementById(`complete-img-${reportId}`).value = ""
}

// Action: Complete Job with evidence image
async function submitCompletion(reportId) {
    const fileInput = document.getElementById(`complete-img-${reportId}`)
    const file = fileInput.files[0]

    if (!file) {
        showToast("You must upload a photo of the completed work", "warning")
        return
    }

    showLoading()
    try {
        const formData = new FormData()
        formData.append("file", file)

        // Upload completion picture first
        const uploadRes = await fetch(`${API_BASE_URL}/upload`, {
            method: "POST",
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            body: formData
        })

        if (!uploadRes.ok) throw new Error("Image upload failed")
        
        const uploadData = await uploadRes.json()
        const imageUrl = uploadData.url

        if (!imageUrl) throw new Error("No URL returned from upload")

        // Then mark the report completed with the image URL
        await apiRequest("/reports/complete", "PUT", {
            report_id: reportId,
            completion_image_url: imageUrl
        })

        showToast("Job Completed successfully! Great work.", "success")
        await loadAssignedReports()
    } catch (err) {
        console.error("Completion error:", err)
        showToast("Failed to complete job. Ensure the image is valid and try again.", "error")
    }
    hideLoading()
}

// Load notifications
async function loadNotifications() {
    try {
        const data = await apiRequest("/notifications")
        if (!Array.isArray(data)) return

        const list = document.getElementById("notificationsList")
        if (!list) return
        list.innerHTML = ""

        if (data.length === 0) {
            list.innerHTML = `<li class="card mb-2 p-3" style="color: var(--text-secondary);">No notifications yet.</li>`
            return
        }

        data.forEach(notification => {
            const li = document.createElement("li")
            li.className = `card mb-2 p-3 ${notification.is_read ? "opacity-60" : ""}`
            li.style.opacity = notification.is_read ? "0.6" : "1"
            li.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem;">
                    <span>${notification.message}</span>
                    ${!notification.is_read
                        ? `<button class="btn btn-secondary" style="padding:0.25rem 0.6rem; font-size:0.8rem; white-space:nowrap;" onclick="markNotificationRead('${notification.id}', this)">Mark read</button>`
                        : `<span style="font-size:0.75rem; color:var(--text-tertiary);">✓ Read</span>`
                    }
                </div>
            `
            list.appendChild(li)
        })
    } catch (err) {
        console.error("loadNotifications error:", err)
    }
}

// Mark single notification read
async function markNotificationRead(id, btn) {
    if (btn) btn.disabled = true
    try {
        await apiRequest(`/notifications/${id}/read`, "PATCH")
        await loadNotifications()
    } catch (err) {
        console.error("markNotificationRead error:", err)
        if (btn) btn.disabled = false
    }
}

document.querySelectorAll(".sidebar-link").forEach(link => {
    link.addEventListener("click", () => {
        if (window.innerWidth <= 768) {
            document.querySelector(".sidebar")?.classList.remove("active")
            document.getElementById("sidebarToggle")?.classList.remove("active")
        }
    })
})