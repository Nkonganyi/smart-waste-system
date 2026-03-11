// admin.js - Handles admin-specific frontend logic and Chart.js integration

let charts = {}
let allReports = []
let allCollectors = []

// Require admin role on load
window.addEventListener("DOMContentLoaded", () => {
    if (!requireAuth("admin")) return
    loadTheme()
    
    // Check if redirecting from email verify link
    const params = new URLSearchParams(window.location.search)
    if (params.get("tab") === "collectors") {
        selectTab("collectors")
    } else {
        selectTab("stats")
    }
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
    
    // Update charts theme
    Object.values(charts).forEach(c => {
        c.options.plugins.legend.labels.color = newTheme === "dark" ? "#E0E0E0" : "#2E3B12"
        c.options.scales.x.ticks.color = newTheme === "dark" ? "#A5D6A7" : "#556B2F"
        c.options.scales.y.ticks.color = newTheme === "dark" ? "#A5D6A7" : "#556B2F"
        c.update()
    })
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

// Tab navigation system
function selectTab(tabId) {
    // Hide all sections, remove active class
    document.querySelectorAll(".dashboard-section").forEach(sec => sec.style.display = "none")
    document.querySelectorAll(".sidebar-link").forEach(link => link.classList.remove("active"))
    
    // Show selected section, add active class
    const section = document.getElementById(tabId)
    if (section) section.style.display = "block"
    
    const link = document.querySelector(`a[href="#${tabId}"]`)
    if (link) link.classList.add("active")
    
    // Close sidebar on mobile
    if (window.innerWidth <= 768) {
        document.querySelector(".sidebar")?.classList.remove("active")
        document.getElementById("sidebarToggle")?.classList.remove("active")
    }

    // Load data based on tab
    if (tabId === "stats") {
        loadDashboardStats()
    } else if (tabId === "analytics") {
        loadAnalytics()
    } else if (tabId === "reports") {
        loadAllData()
    } else if (tabId === "collectors") {
        loadCollectorsTab()
    }
}

// -------------------------------------------------------------
// DASHBOARD STATS (Tab 1)
// -------------------------------------------------------------
async function loadDashboardStats() {
    showLoading()
    try {
        const data = await apiRequest("/dashboard/admin")
        
        const container = document.getElementById("statsContainer")
        if (!container) return
        
        container.innerHTML = `
            <div class="card">
                <div class="card-body text-center">
                    <h3 style="font-size: 2.5rem; color: var(--primary-color); margin: 0;">${data.total_reports || 0}</h3>
                    <p style="color: var(--text-secondary); margin: 0;">Total Reports</p>
                </div>
            </div>
            <div class="card">
                <div class="card-body text-center">
                    <h3 style="font-size: 2.5rem; color: var(--warning-color); margin: 0;">${data.pending_reports || 0}</h3>
                    <p style="color: var(--text-secondary); margin: 0;">Pending Assignment</p>
                </div>
            </div>
            <div class="card">
                <div class="card-body text-center">
                    <h3 style="font-size: 2.5rem; color: var(--success-color); margin: 0;">${data.completed_reports || 0}</h3>
                    <p style="color: var(--text-secondary); margin: 0;">Completed Cleanups</p>
                </div>
            </div>
            <div class="card">
                <div class="card-body text-center">
                    <h3 style="font-size: 2.5rem; color: #4fc3f7; margin: 0;">${data.active_collectors || 0}</h3>
                    <p style="color: var(--text-secondary); margin: 0;">Active Collectors</p>
                </div>
            </div>
        `
    } catch (err) {
        console.error("Stats error:", err)
        showToast("Failed to load dashboard statistics", "error")
    }
    hideLoading()
}

// -------------------------------------------------------------
// ANALYTICS & CHARTS (Tab 2)
// -------------------------------------------------------------
async function loadAnalytics() {
    showLoading()
    try {
        // We need all reports to calculate the status & priority pie charts manually
        const reportsData = await apiRequest("/reports")
        const locationsData = await apiRequest("/dashboard/locations")
        const collectorsData = await apiRequest("/dashboard/collectors")
        
        if (Array.isArray(reportsData)) allReports = reportsData
        
        initCharts(locationsData, collectorsData)
    } catch (err) {
        console.error("Analytics error:", err)
        showToast("Failed to load analytics data", "error")
    }
    hideLoading()
}

function initCharts(locationsData, collectorsData) {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark"
    const textColor = isDark ? "#E0E0E0" : "#2E3B12"
    
    // Helper to configure charts cleanly
    const commonOptions = {
        responsive: true,
        plugins: { legend: { labels: { color: textColor } } }
    }
    
    const barOptions = {
        ...commonOptions,
        scales: {
            x: { ticks: { color: textColor } },
            y: { ticks: { color: textColor, precision: 0 } }
        }
    }

    // 1. Locations Chart
    const locCtx = document.getElementById("locationChart")
    if (locCtx) {
        if (charts.location) charts.location.destroy()
        charts.location = new Chart(locCtx, {
            type: "bar",
            data: {
                labels: locationsData.map(d => d.location.substring(0, 15)),
                datasets: [{
                    label: "Reports",
                    data: locationsData.map(d => parseInt(d.count, 10)),
                    backgroundColor: "#66BB6A",
                    borderRadius: 4
                }]
            },
            options: barOptions
        })
    }

    // 2. Collectors Workload Chart
    const colCtx = document.getElementById("collectorChart")
    if (colCtx) {
        if (charts.collector) charts.collector.destroy()
        charts.collector = new Chart(colCtx, {
            type: "bar",
            data: {
                labels: collectorsData.map(d => d.collector),
                datasets: [{
                    label: "Assigned Jobs",
                    data: collectorsData.map(d => parseInt(d.count, 10)),
                    backgroundColor: "#FFCA28",
                    borderRadius: 4
                }]
            },
            options: barOptions
        })
    }
    
    // Generate data for pie charts from allReports
    let pending = 0, in_prog = 0, comp = 0
    let high = 0, norm = 0, low = 0
    
    allReports.forEach(r => {
        if (r.status === "pending") pending++
        if (r.status === "in_progress") in_prog++
        if (r.status === "completed") comp++
        
        if (r.priority === "high") high++
        if (r.priority === "normal") norm++
        if (r.priority === "low") low++
    })

    // 3. Status Pie Chart
    const statCtx = document.getElementById("statusChart")
    if (statCtx) {
        if (charts.status) charts.status.destroy()
        charts.status = new Chart(statCtx, {
            type: "doughnut",
            data: {
                labels: ["Pending", "In Progress", "Completed"],
                datasets: [{
                    data: [pending, in_prog, comp],
                    backgroundColor: ["#FFCA28", "#4FC3F7", "#66BB6A"],
                    borderWidth: 0
                }]
            },
            options: commonOptions
        })
    }
    
    // 4. Priority Pie Chart
    const priCtx = document.getElementById("priorityChart")
    if (priCtx) {
        if (charts.priority) charts.priority.destroy()
        charts.priority = new Chart(priCtx, {
            type: "doughnut",
            data: {
                labels: ["High", "Normal", "Low"],
                datasets: [{
                    data: [high, norm, low],
                    backgroundColor: ["#EF5350", "#FFCA28", "#81C784"],
                    borderWidth: 0
                }]
            },
            options: commonOptions
        })
    }
}

// -------------------------------------------------------------
// ALL REPORTS & FILTERING (Tab 3)
// -------------------------------------------------------------
async function loadAllData() {
    showLoading()
    try {
        const [reportsRes, collectorsRes] = await Promise.all([
            apiRequest("/reports"),
            apiRequest("/reports/collectors")
        ])
        
        if (Array.isArray(reportsRes)) allReports = reportsRes
        if (Array.isArray(collectorsRes)) allCollectors = collectorsRes
        
        populateLocationFilter()
        applyFilters() // Render initially
    } catch (err) {
        console.error("Data error:", err)
        showToast("Failed to load reports data", "error")
    }
    hideLoading()
}

function populateLocationFilter() {
    const sel = document.getElementById("filterLocation")
    if (!sel) return
    
    const locs = new Set(allReports.map(r => r.location))
    
    // Keep internal options but reset others
    sel.innerHTML = '<option value="">All Locations</option>'
    
    Array.from(locs).sort().forEach(loc => {
        sel.innerHTML += \`<option value="\${loc}">\${loc}</option>\`
    })
}

function applyFilters() {
    const searchTerm = document.getElementById("filterSearch")?.value.toLowerCase() || ""
    const status = document.getElementById("filterStatus")?.value || ""
    const priority = document.getElementById("filterPriority")?.value || ""
    const location = document.getElementById("filterLocation")?.value || ""
    const dateFrom = document.getElementById("filterDateFrom")?.value
    const dateTo = document.getElementById("filterDateTo")?.value
    
    // Filter array
    const filtered = allReports.filter(r => {
        // Text Match
        if (searchTerm) {
            const matchTitle = (r.title || "").toLowerCase().includes(searchTerm)
            const matchDesc = (r.description || "").toLowerCase().includes(searchTerm)
            const matchId = (r.id || "").toLowerCase().includes(searchTerm)
            if (!matchTitle && !matchDesc && !matchId) return false
        }
        
        // Dropdown exact matches
        if (status && r.status !== status) return false
        if (priority && r.priority !== priority) return false
        if (location && r.location !== location) return false
        
        // Date range match
        if (dateFrom || dateTo) {
            const rDateStr = r.created_at.split("T")[0] // Extract "YYYY-MM-DD" reliably
            if (dateFrom && rDateStr < dateFrom) return false
            if (dateTo && rDateStr > dateTo) return false
        }
        
        return true
    })
    
    // Update stats label
    const statEl = document.getElementById("filterStats")
    if (statEl) statEl.textContent = `Showing ${filtered.length} of ${allReports.length} total reports`
    
    renderReportsList(filtered)
}

function clearFilters() {
    document.getElementById("filterSearch").value = ""
    document.getElementById("filterStatus").value = ""
    document.getElementById("filterPriority").value = ""
    document.getElementById("filterLocation").value = ""
    document.getElementById("filterDateFrom").value = ""
    document.getElementById("filterDateTo").value = ""
    applyFilters()
}

function renderReportsList(reports) {
    const container = document.getElementById("reportsList")
    if (!container) return
    
    container.innerHTML = ""
    if (reports.length === 0) {
        container.innerHTML = `<div class="card" style="grid-column: 1/-1;"><div class="card-body text-center" style="color:var(--text-secondary);">No reports match the current filters.</div></div>`
        return
    }
    
    // Render list
    reports.forEach(report => {
        const card = document.createElement("div")
        card.className = "card"
        card.style.cursor = "pointer"
        card.style.transition = "transform 0.2s"
        card.onmouseover = () => card.style.transform = "translateY(-2px)"
        card.onmouseout = () => card.style.transform = "translateY(0)"
        card.onclick = () => openReportModal(report.id)
        
        // Identify assigned collector name
        let assignedText = "Unassigned"
        if (report.assigned_to) {
            const col = allCollectors.find(c => c.id === report.assigned_to)
            if (col) assignedText = `Assigned: ${col.name}`
        }

        const dateStr = new Date(report.created_at).toLocaleDateString()
        
        card.innerHTML = `
            <div class="card-header" style="display:flex; justify-content:space-between; align-items:flex-start;">
                <h3 class="card-header-title" style="margin:0; font-size:1.1rem; flex:1;">${report.title}</h3>
                <span class="badge badge-priority ${report.priority}">${report.priority}</span>
            </div>
            <div class="card-body" style="padding-top:0.5rem;">
                <p style="color:var(--text-secondary); font-size:0.9rem; margin-bottom:1rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                    ${report.description}
                </p>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
                    <span style="font-size:0.85rem; font-weight:600;"><span style="color:var(--primary-color);">📍</span> ${report.location.substring(0, 20)}</span>
                    <span style="font-size:0.8rem; color:var(--text-tertiary);">${dateStr}</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="badge badge-status ${report.status}">${formatStatus(report.status)}</span>
                    <span style="font-size:0.8rem; color: ${report.assigned_to ? 'var(--primary-color)' : 'var(--warning-color)'}; font-weight:600;">
                        ${assignedText}
                    </span>
                </div>
            </div>
        `
        container.appendChild(card)
    })
}

function formatStatus(status) {
    if (status === "in_progress") return "In Progress"
    return status.charAt(0).toUpperCase() + status.slice(1)
}

// -------------------------------------------------------------
// MODAL LOGIC & ASSIGNMENT
// -------------------------------------------------------------
let currentModalReportId = null

function openReportModal(reportId) {
    const report = allReports.find(r => r.id === reportId)
    if (!report) return
    
    currentModalReportId = reportId
    
    document.getElementById("modalTitle").textContent = report.title
    document.getElementById("modalDescription").innerHTML = `
        <p style="color:var(--text-secondary); margin-top:0.5rem;">${report.description}</p>
        <div style="margin-top:1rem; display:flex; gap:0.5rem; flex-wrap:wrap;">
            <span class="badge badge-status ${report.status}">${formatStatus(report.status)}</span>
            <span class="badge badge-priority ${report.priority}">${report.priority} Priority</span>
        </div>
    `
    
    document.getElementById("modalImage").innerHTML = report.image_url 
        ? `<img src="${report.image_url}" style="width:100%; max-height:300px; object-fit:cover; border-radius:8px; border:1px solid var(--light-bg);">`
        : `<div style="padding:2rem; text-align:center; background:var(--light-bg); border-radius:8px; color:var(--text-tertiary);">No issue photo provided</div>`
        
    // Base details
    let detailsHtml = `
        <table style="width:100%; border-collapse:collapse; font-size:0.9rem;">
            <tr style="border-bottom:1px solid var(--light-bg);"><td style="padding:0.75rem 0; color:var(--text-tertiary); width:100px;">Report ID</td><td style="padding:0.75rem 0; font-family:monospace;">${report.id}</td></tr>
            <tr style="border-bottom:1px solid var(--light-bg);"><td style="padding:0.75rem 0; color:var(--text-tertiary);">Location</td><td style="padding:0.75rem 0; font-weight:600;">${report.location}</td></tr>
            <tr style="border-bottom:1px solid var(--light-bg);"><td style="padding:0.75rem 0; color:var(--text-tertiary);">Reported By</td><td style="padding:0.75rem 0;">${report.users?.name || 'Unknown'} (${report.users?.email || 'N/A'})</td></tr>
            <tr style="border-bottom:1px solid var(--light-bg);"><td style="padding:0.75rem 0; color:var(--text-tertiary);">Created On</td><td style="padding:0.75rem 0;">${new Date(report.created_at).toLocaleString()}</td></tr>
    `
    
    // Add assignment info or assignment dropdown
    if (report.status === "pending") {
        // Build collector dropdown
        let selectHtml = `<select id="modalCollectorSelect" class="form-control" style="max-width:250px; font-size:0.85rem; padding:0.4rem;">
            <option value="">-- Select a collector --</option>`
        allCollectors.forEach(c => {
            selectHtml += `<option value="${c.id}">${c.name} (${c.email})</option>`
        })
        selectHtml += `</select>`
        
        detailsHtml += `<tr><td style="padding:0.75rem 0; color:var(--text-tertiary);">Assign To</td><td style="padding:0.75rem 0;">${selectHtml}</td></tr>`
        
        // Setup assign button
        const btn = document.getElementById("modalActionBtn")
        btn.textContent = "Assign Collector"
        btn.style.display = "inline-block"
        btn.onclick = () => assignCollectorFromModal()
        
    } else {
        // Show assigned collector text
        const col = allCollectors.find(c => c.id === report.assigned_to)
        detailsHtml += `<tr><td style="padding:0.75rem 0; color:var(--text-tertiary);">Assigned To</td><td style="padding:0.75rem 0; font-weight:600; color:var(--primary-color);">${col ? col.name : 'Unknown'}</td></tr>`
        
        // Hide assign button
        document.getElementById("modalActionBtn").style.display = "none"
    }

    // Add completion info if completed
    if (report.status === "completed" && report.completion_image_url) {
        detailsHtml += `<tr><td style="padding:0.75rem 0; color:var(--text-tertiary);">Completed On</td><td style="padding:0.75rem 0;">${new Date(report.completed_at || new Date()).toLocaleString()}</td></tr>`
        detailsHtml += `</table>`
        
        detailsHtml += `
            <div style="margin-top:1.5rem;">
                <span class="badge badge-priority low mb-2" style="display:inline-block;">✓ Cleanup Verified</span>
                <img src="${report.completion_image_url}" style="width:100%; max-height:200px; object-fit:cover; border-radius:8px; border:2px solid var(--success-color);">
            </div>
        `
    } else {
        detailsHtml += `</table>`
    }
    
    document.getElementById("modalDetails").innerHTML = detailsHtml
    document.getElementById("modalHistory").innerHTML = "" // Removed dead history code

    const modal = document.getElementById("reportModal")
    modal.style.display = "block"
    document.body.style.overflow = "hidden"
}

// BUG FIX: Close modal on backdrop click OR explicit close button
function closeReportModal(event) {
    if (event && event.target.id !== "reportModal") return
    
    document.getElementById("reportModal").style.display = "none"
    document.body.style.overflow = "auto"
    currentModalReportId = null
}

async function assignCollectorFromModal() {
    const sel = document.getElementById("modalCollectorSelect")
    if (!sel) return
    
    const collectorId = sel.value
    if (!collectorId) {
        showToast("Please select a collector to assign", "warning")
        return
    }
    
    showLoading()
    try {
        await apiRequest("/reports/assign", "POST", { 
            report_id: currentModalReportId, 
            collector_id: collectorId 
        })
        showToast("Collector assigned successfully", "success")
        closeReportModal()
        await loadAllData() // Refresh list entirely
    } catch (err) {
        showToast("Failed to assign collector", "error")
    }
    hideLoading()
}

// -------------------------------------------------------------
// COLLECTORS MANAGEMENT (Tab 4)
// -------------------------------------------------------------
async function loadCollectorsTab() {
    showLoading()
    try {
        // Make sure we have the latest list
        const res = await apiRequest("/reports/collectors")
        if (Array.isArray(res)) allCollectors = res
        
        // Count active vs suspended
        const active = allCollectors.filter(c => !c.is_suspended).length
        const suspended = allCollectors.filter(c => c.is_suspended).length
        
        document.getElementById("collectorStats").innerHTML = `
            <div class="card">
                <div class="card-body text-center">
                    <h3 style="font-size: 2rem; color: var(--primary-color); margin: 0;">${allCollectors.length}</h3>
                    <p style="color: var(--text-secondary); margin: 0;">Total Collectors</p>
                </div>
            </div>
            <div class="card">
                <div class="card-body text-center">
                    <h3 style="font-size: 2rem; color: var(--success-color); margin: 0;">${active}</h3>
                    <p style="color: var(--text-secondary); margin: 0;">Active</p>
                </div>
            </div>
            <div class="card">
                <div class="card-body text-center">
                    <h3 style="font-size: 2rem; color: var(--warning-color); margin: 0;">${suspended}</h3>
                    <p style="color: var(--text-secondary); margin: 0;">Suspended</p>
                </div>
            </div>
        `
        
        const tbody = document.getElementById("collectorTable")
        if (!tbody) { hideLoading(); return }
        
        tbody.innerHTML = ""
        
        // Calculate fake workload details strictly for display context if the backend doesn't provide them
        // In reality, a proper admin endpoint would join users + reports to get accurate 'completed_jobs' etc.
        allCollectors.forEach(col => {
            const tr = document.createElement("tr")
            tr.style.borderBottom = "1px solid var(--light-bg)"
            
            const suspendedBadge = col.is_suspended 
                ? `<span class="badge badge-priority high">Suspended</span>`
                : `<span class="badge badge-status completed">Active</span>`
                
            const actionBtn = col.is_suspended
                ? `<button class="btn btn-secondary" style="padding:0.3rem 0.6rem; font-size:0.8rem;" onclick="toggleCollectorStatus('${col.id}', false)">Reactivate</button>`
                : `<button class="btn btn-primary" style="padding:0.3rem 0.6rem; font-size:0.8rem; background:var(--warning-color);" onclick="toggleCollectorStatus('${col.id}', true)">Suspend</button>`
            
            // Just verify-admin helper UI (for Dev)
            const verifyBtn = !col.is_verified && col.email 
                ? `<button class="btn btn-primary" style="padding:0.3rem 0.6rem; font-size:0.8rem; margin-left:0.5rem;" onclick="forceVerifyEmail('${col.id}')">Verify Email</button>`
                : ""

            tr.innerHTML = `
                <td style="padding: 1rem;"><div style="font-weight:600;">${col.name}</div><div style="font-size:0.8rem; color:var(--text-tertiary);">ID: ${col.id.substring(0,8)}</div></td>
                <td style="padding: 1rem; color:var(--text-secondary);">${col.email}</td>
                <td style="padding: 1rem; text-align:center;">${suspendedBadge}</td>
                <td style="padding: 1rem; text-align:center;">—</td>
                <td style="padding: 1rem; text-align:center;">—</td>
                <td style="padding: 1rem; text-align:center;">—</td>
                <td style="padding: 1rem; text-align:center;">${actionBtn} ${verifyBtn}</td>
            `
            tbody.appendChild(tr)
        })
        
    } catch (err) {
        console.error("Collectors tab error:", err)
        showToast("Failed to load collector table data", "error")
    }
    hideLoading()
}

async function forceVerifyEmail(userId) {
    if (!confirm("Force verification for this account?")) return
    showLoading()
    try {
        await apiRequest("/auth/verify-email-admin", "POST", { userId })
        showToast("Email verified successfully", "success")
        loadCollectorsTab() // Refresh
    } catch (err) {
        showToast("Failed to verify email", "error")
    }
    hideLoading()
}

async function toggleCollectorStatus(collectorId, suspend) {
    const action = suspend ? "suspend" : "unsuspend"
    const confirmMsg = suspend 
        ? "Suspend this collector? They will not be able to log in or receive assignments."
        : "Reactivate this collector?"
        
    if (!confirm(confirmMsg)) return
    
    showLoading()
    try {
        await apiRequest(`/auth/${action}-user`, "POST", { userId: collectorId })
        showToast(suspend ? "Collector suspended" : "Collector reactivated", "success")
        loadCollectorsTab() // refresh table
    } catch (err) {
        showToast(`Failed to ${action} collector`, "error")
    }
    hideLoading()
}
