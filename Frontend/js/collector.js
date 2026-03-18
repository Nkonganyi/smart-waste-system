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
let collectorMap = null
let routeLayer = null
let markersGroup = null

// Initialize Map
function initMap() {
    if (collectorMap) return
    
    // Buea, Cameroon coordinates
    const bueaLat = 4.155
    const bueaLng = 9.231
    
    collectorMap = L.map('collectorMap').setView([bueaLat, bueaLng], 13)
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(collectorMap)
    
    routeLayer = L.layerGroup().addTo(collectorMap)
    markersGroup = L.layerGroup().addTo(collectorMap)
}

// Load assigned reports
async function loadAssignedReports() {
    showLoading()
    try {
        initMap()
        const data = await apiRequest("/reports/assigned")
        if (Array.isArray(data)) {
            allAssignedReports = data
            renderReports()
            updateWorkSummary()
            updateRoute() // Update map route
        }
    } catch (err) {
        console.error("loadAssignedReports error:", err)
        showToast("Error loading assignments", "error")
    }
    hideLoading()
}

// Update Route using backend optimization API
async function updateRoute() {
    if (!collectorMap) return
    
    // Filter non-completed reports with valid coordinates
    const reportsToVisit = allAssignedReports.filter(r => 
        r.status !== "completed" && r.latitude && r.longitude
    )

    // Clear existing layers
    routeLayer.clearLayers()
    markersGroup.clearLayers()

    const routeHint = document.getElementById("routeHint")
    if (routeHint) routeHint.textContent = ""
    
    if (reportsToVisit.length === 0) return
    
    try {
        const data = await apiRequest("/reports/assigned/route")
        const ordered = Array.isArray(data?.route) ? data.route : []
        const orderedReports = ordered.length > 0 ? ordered : reportsToVisit

        drawOptimizedRoute(orderedReports, data?.geometry)
        if (routeHint) {
            if (orderedReports.length < 2) {
                routeHint.textContent = "Add at least two assigned reports with coordinates to draw a route line."
            } else if (data?.geometry_fallback) {
                routeHint.textContent = "Route line fallback: showing straight lines (road geometry unavailable)."
            }
        }
    } catch (err) {
        console.error("updateRoute error:", err)
        drawOptimizedRoute(reportsToVisit)
        if (routeHint) {
            routeHint.textContent = "Route line could not be generated. Showing simple order instead."
        }
    }
}

// Draw route line and numbered markers
function drawOptimizedRoute(reports, geometry) {
    const latlngs = reports.map(r => [r.latitude, r.longitude])
    if (reports.length === 1) {
        const r = reports[0]
        L.marker([r.latitude, r.longitude], {
            icon: L.divIcon({
                className: 'custom-div-icon',
                html: `<div class="route-marker">1</div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            })
        })
        .bindPopup(`
            <div style="font-family:inherit;">
                <strong style="color:var(--primary-color);">Stop 1:</strong> ${r.title}<br>
                <small style="color:var(--text-secondary);">${r.location || ""}</small><br>
                <button class="btn btn-primary btn-sm btn-block" style="margin-top:8px; padding:4px 8px; font-size:0.8rem;" onclick="focusReportCard('${r.id}')">View Details</button>
            </div>
        `)
        .addTo(markersGroup)
        collectorMap.setView([r.latitude, r.longitude], 15)
        return
    }
    if (geometry && geometry.features && geometry.features[0]) {
        L.geoJSON(geometry, {
            style: { color: "var(--primary-color)", weight: 5, opacity: 0.7, lineJoin: 'round' }
        }).addTo(routeLayer)
    } else {
        L.polyline(latlngs, { color: "var(--primary-color)", weight: 5, opacity: 0.7, lineJoin: 'round' }).addTo(routeLayer)
    }
    
    reports.forEach((r, i) => {
        L.marker([r.latitude, r.longitude], {
            icon: L.divIcon({
                className: 'custom-div-icon',
                html: `<div class="route-marker" style="background-color:var(--text-tertiary);">${i + 1}</div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            })
        })
        .bindPopup(`
            <div style="font-family:inherit;">
                <strong style="color:var(--primary-color);">Stop ${i + 1}:</strong> ${r.title}<br>
                <small style="color:var(--text-secondary);">${r.location || ""}</small><br>
                <button class="btn btn-primary btn-sm btn-block" style="margin-top:8px; padding:4px 8px; font-size:0.8rem;" onclick="focusReportCard('${r.id}')">View Details</button>
            </div>
        `)
        .addTo(markersGroup)
    })
    
    if (latlngs.length > 0) {
        if (geometry && geometry.features && geometry.features[0]) {
            collectorMap.fitBounds(L.geoJSON(geometry).getBounds(), { padding: [50, 50] })
        } else {
            collectorMap.fitBounds(L.polyline(latlngs).getBounds())
        }
    }
}

// Function to scroll to report card
function focusReportCard(reportId) {
    const card = document.getElementById(`report-card-${reportId}`)
    if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' })
        card.style.boxShadow = "0 0 15px var(--primary-color)"
        setTimeout(() => card.style.boxShadow = "", 2000)
    }
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
        card.id = `report-card-${report.id}`

        // Determine available actions based on status
        let actionButtons = ""
        if (report.status === "pending" || report.status === "approved") {
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
    const pending = allAssignedReports.filter(r => r.status === "pending" || r.status === "approved").length
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
