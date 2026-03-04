// simple loading controls
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

async function loadStats() {
    const data = await apiRequest("/dashboard/admin")
    
    // Calculate additional metrics
    const completionRate = data.totalReports > 0 
        ? Math.round((data.completed / data.totalReports) * 100) 
        : 0
    const assigned = (data.inProgress || 0) + (data.pending || 0)

    const statsDiv = document.getElementById("statsContainer")
    
    // Build alert for high priority if any
    const highPriorityAlert = data.highPriority > 0 
        ? `<div class="alert alert-warning mb-3">
            <strong>⚠️ ${data.highPriority} High Priority Report${data.highPriority !== 1 ? 's' : ''}</strong> 
            - Please review and assign collectors immediately
        </div>`
        : ''
    
    statsDiv.innerHTML = `
        ${highPriorityAlert}
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem;">
            <div class="card stat-card">
                <div class="card-body">
                    <div class="stat-metric">
                        <div class="stat-value" style="color: var(--primary-color);">${data.totalReports}</div>
                        <div class="stat-label">Total Reports</div>
                    </div>
                </div>
            </div>
            <div class="card stat-card">
                <div class="card-body">
                    <div class="stat-metric">
                        <div class="stat-value" style="color: var(--warning-color);">${data.pending || 0}</div>
                        <div class="stat-label">Pending</div>
                        <div class="stat-subtext">${data.pending || 0} awaiting assignment</div>
                    </div>
                </div>
            </div>
            <div class="card stat-card">
                <div class="card-body">
                    <div class="stat-metric">
                        <div class="stat-value" style="color: var(--info-color);">${assigned}</div>
                        <div class="stat-label">Assigned</div>
                        <div class="stat-subtext">Out in field</div>
                    </div>
                </div>
            </div>
            <div class="card stat-card">
                <div class="card-body">
                    <div class="stat-metric">
                        <div class="stat-value" style="color: #f59e0b;">${data.inProgress || 0}</div>
                        <div class="stat-label">In Progress</div>
                        <div class="stat-subtext">Being worked on</div>
                    </div>
                </div>
            </div>
            <div class="card stat-card">
                <div class="card-body">
                    <div class="stat-metric">
                        <div class="stat-value" style="color: var(--success-color);">${data.completed || 0}</div>
                        <div class="stat-label">Completed</div>
                        <div class="stat-subtext">${completionRate}% done</div>
                    </div>
                </div>
            </div>
            <div class="card stat-card">
                <div class="card-body">
                    <div class="stat-metric">
                        <div class="stat-value" style="color: #dc2626;">${data.highPriority || 0}</div>
                        <div class="stat-label">High Priority</div>
                        <div class="stat-subtext">Urgent items</div>
                    </div>
                </div>
            </div>
            <div class="card stat-card" style="grid-column: 1 / -1;">
                <div class="card-body">
                    <div class="stat-metric">
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <div style="flex: 1;">
                                <div class="stat-label mb-2">Overall Completion Rate</div>
                                <div style="background: var(--light-bg); border-radius: 20px; height: 24px; overflow: hidden;">
                                    <div style="background: linear-gradient(90deg, var(--success-color), #34d399); height: 100%; width: ${completionRate}%; transition: width 0.3s ease; display: flex; align-items: center; justify-content: flex-end; padding-right: 0.5rem; color: white; font-weight: 700; font-size: 0.75rem;">
                                        ${completionRate}%
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
}
// Load reports and stats on page load
let allReports = [] // Store all reports for filtering
let collectors = []

async function loadReports() {
    showLoading()
    allReports = await apiRequest("/reports")
    collectors = await apiRequest("/reports/collectors")
    hideLoading()
    renderReports(allReports)
    populateLocationFilter()
    loadCollectorStats()
    loadCollectors()
}

// Render reports with cleaner summary view
function renderReports(reports) {
    const container = document.getElementById("reportsList")
    container.innerHTML = ""

    if (reports.length === 0) {
        container.innerHTML = `<div class="card" style="grid-column: 1 / -1;"><div class="card-body"><p style="text-align: center; color: var(--text-secondary);">No reports found matching your filters.</p></div></div>`
        return
    }

    reports.forEach(report => {
        const card = document.createElement("div")
        card.className = "card"
        card.style.cursor = "pointer"
        card.onclick = () => openReportModal(report)

        const descPreview = report.description.substring(0, 80) + (report.description.length > 80 ? "..." : "")

        card.innerHTML = `
            <div class="card-header" style="padding: 0.75rem 1rem;">
                <h3 class="card-header-title" style="margin: 0; font-size: 1rem;">${report.title}</h3>
            </div>
            <div class="card-body" style="padding: 0.75rem 1rem;">
                <p style="margin: 0.5rem 0; font-size: 0.9rem; color: var(--text-secondary);">${descPreview}</p>
                <div style="display: flex; gap: 0.5rem; margin: 0.75rem 0; flex-wrap: wrap;">
                    <span class="badge badge-status ${report.status}">${report.status}</span>
                    <span class="badge badge-priority ${report.priority}">${report.priority}</span>
                    <span style="font-size: 0.85rem; color: var(--text-tertiary); align-self: center;">📍 ${report.location}</span>
                </div>
            </div>
            <div class="card-footer" style="padding: 0.75rem 1rem; font-size: 0.85rem;">
                Click to view details & assign collector
            </div>
        `

        container.appendChild(card)
    })
}

// Filter reports based on criteria
function applyFilters() {
    const search = document.getElementById("filterSearch").value.toLowerCase()
    const status = document.getElementById("filterStatus").value
    const priority = document.getElementById("filterPriority").value
    const location = document.getElementById("filterLocation").value
    const dateFrom = document.getElementById("filterDateFrom").value
    const dateTo = document.getElementById("filterDateTo").value

    const filtered = allReports.filter(report => {
        // Search filter (title + description)
        if (search && !report.title.toLowerCase().includes(search) && !report.description.toLowerCase().includes(search)) {
            return false
        }

        // Status filter
        if (status && report.status !== status) return false

        // Priority filter
        if (priority && report.priority !== priority) return false

        // Location filter
        if (location && report.location !== location) return false

        // Date range filter
        if (dateFrom || dateTo) {
            const reportDate = new Date(report.created_at || new Date()).toISOString().split('T')[0]
            if (dateFrom && reportDate < dateFrom) return false
            if (dateTo && reportDate > dateTo) return false
        }

        return true
    })

    // Update filter stats
    const statsDiv = document.getElementById("filterStats")
    const activeFilters = [search, status, priority, location, dateFrom, dateTo].filter(f => f).length
    statsDiv.textContent = `Showing ${filtered.length} of ${allReports.length} reports${activeFilters > 0 ? ` (${activeFilters} filter${activeFilters > 1 ? 's' : ''} active)` : ''}`

    renderReports(filtered)
}

// Clear all filters
function clearFilters() {
    document.getElementById("filterSearch").value = ""
    document.getElementById("filterStatus").value = ""
    document.getElementById("filterPriority").value = ""
    document.getElementById("filterLocation").value = ""
    document.getElementById("filterDateFrom").value = ""
    document.getElementById("filterDateTo").value = ""
    
    const statsDiv = document.getElementById("filterStats")
    statsDiv.textContent = `Showing all ${allReports.length} reports`
    
    renderReports(allReports)
}

// Populate location filter dynamically
function populateLocationFilter() {
    const locations = [...new Set(allReports.map(r => r.location))].sort()
    const select = document.getElementById("filterLocation")
    const currentValue = select.value
    
    select.innerHTML = '<option value="">All Locations</option>' + locations.map(loc => 
        `<option value="${loc}" ${currentValue === loc ? 'selected' : ''}>${loc}</option>`
    ).join('')
}

// Open report detail modal
function openReportModal(report) {
    const modal = document.getElementById("reportModal")
    document.getElementById("modalTitle").textContent = report.title
    
    // Description
    document.getElementById("modalDescription").innerHTML = `
        <div style="color: var(--text-secondary); line-height: 1.6; margin-bottom: 1rem;">
            ${report.description}
        </div>
    `
    
    // Image
    if (report.image_url) {
        document.getElementById("modalImage").innerHTML = `<img src="${report.image_url}" style="max-width: 100%; border-radius: 8px; height: auto;">`
    } else {
        document.getElementById("modalImage").innerHTML = ""
    }
    
    // Details
    const assignedCollector = collectors.find(c => c.id === report.assigned_to)
    const createdDate = new Date(report.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    
    document.getElementById("modalDetails").innerHTML = `
        <div style="display: grid; gap: 0.75rem;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div>
                    <span style="color: var(--text-tertiary); font-size: 0.85rem;">Status</span>
                    <div style="margin-top: 0.25rem;">
                        <span class="badge badge-status ${report.status}">${report.status}</span>
                    </div>
                </div>
                <div>
                    <span style="color: var(--text-tertiary); font-size: 0.85rem;">Priority</span>
                    <div style="margin-top: 0.25rem;">
                        <span class="badge badge-priority ${report.priority}">${report.priority}</span>
                    </div>
                </div>
                <div>
                    <span style="color: var(--text-tertiary); font-size: 0.85rem;">📍 Location</span>
                    <div style="margin-top: 0.25rem; font-weight: 500;">${report.location}</div>
                </div>
                <div>
                    <span style="color: var(--text-tertiary); font-size: 0.85rem;">👤 Assigned To</span>
                    <div style="margin-top: 0.25rem; font-weight: 500;">${assignedCollector ? assignedCollector.name : 'Unassigned'}</div>
                </div>
                <div>
                    <span style="color: var(--text-tertiary); font-size: 0.85rem;">📅 Created</span>
                    <div style="margin-top: 0.25rem; font-weight: 500;">${createdDate}</div>
                </div>
                <div>
                    <span style="color: var(--text-tertiary); font-size: 0.85rem;">⏱️ Days Elapsed</span>
                    <div style="margin-top: 0.25rem; font-weight: 500;">${Math.ceil((new Date() - new Date(report.created_at)) / (1000 * 60 * 60 * 24))} days</div>
                </div>
            </div>
            <div style="margin-top: 1rem;">
                <label style="color: var(--text-tertiary); font-size: 0.85rem;">Assign to Collector</label>
                <div style="display: grid; grid-template-columns: 1fr auto; gap: 0.5rem; margin-top: 0.5rem;">
                    <select id="modalCollectorSelect">
                        <option value="">Select Collector</option>
                        ${collectors.map(c => `<option value="${c.id}" ${c.id === report.assigned_to ? 'selected' : ''}>${c.name}</option>`).join('')}
                    </select>
                    <button class="btn btn-primary" onclick="assignCollectorFromModal('${report.id}')">Assign</button>
                </div>
            </div>
        </div>
    `
    
    // History/Timeline
    if (report.history && report.history.length > 0) {
        document.getElementById("modalHistory").innerHTML = `
            <h4 style="margin: 0 0 1rem 0; font-size: 0.95rem;">📋 Activity Timeline</h4>
            <div style="display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.9rem;">
                ${report.history.map(h => `
                    <div style="padding: 0.5rem; background: var(--light-bg); border-radius: 6px; border-left: 3px solid var(--primary-color);">
                        <div style="font-weight: 500;">${h.action}</div>
                        <div style="color: var(--text-tertiary); font-size: 0.85rem;">by ${h.performed_by} • ${new Date(h.timestamp).toLocaleDateString()}</div>
                    </div>
                `).join('')}
            </div>
        `
    } else {
        document.getElementById("modalHistory").innerHTML = ""
    }
    
    modal.style.display = "block"
}

// Close report modal
function closeReportModal(event) {
    if (event && event.target.id !== "reportModal") return
    document.getElementById("reportModal").style.display = "none"
}

// Assign collector from modal
async function assignCollectorFromModal(reportId) {
    const collectorId = document.getElementById("modalCollectorSelect").value
    
    if (!collectorId) {
        showToast("Please select a collector", "warning")
        return
    }
    
    const data = await apiRequest("/reports/assign", "POST", {
        report_id: reportId,
        collector_id: collectorId
    })
    
    if (data.message) {
        showToast("Collector assigned successfully!", "success")
        closeReportModal()
        await loadReports()
    } else {
        showToast(data.error || "Error assigning collector", "error")
    }
}

// Tab navigation
function selectTab(tabName) {
    // Prevent default link behavior
    event?.preventDefault?.()
    
    // Hide all sections except the selected one
    document.querySelectorAll('.dashboard-section').forEach(section => {
        section.style.display = section.id === tabName ? 'block' : 'none'
    })
    
    // Update sidebar active state
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.classList.remove('active')
        if (link.getAttribute('href') === '#' + tabName) {
            link.classList.add('active')
        }
    })
}

// Load and display collector stats
async function loadCollectorStats() {
    const statsContainer = document.getElementById("collectorStats")
    const data = await apiRequest("/dashboard/admin")
    
    // Calculate performance metrics
    const completedReports = allReports.filter(r => r.status === 'completed').length
    const totalReports = allReports.length
    const avgCompletionTime = calculateAvgCompletionTime()
    const highPriorityPending = allReports.filter(r => r.status !== 'completed' && r.priority === 'high').length
    
    // Find location with most reports
    const locationCounts = {}
    allReports.forEach(r => {
        locationCounts[r.location] = (locationCounts[r.location] || 0) + 1
    })
    const topLocation = Object.entries(locationCounts).sort((a, b) => b[1] - a[1])[0]
    
    statsContainer.innerHTML = `
        <div class="card stat-card">
            <div class="card-body">
                <div class="stat-metric">
                    <div class="stat-value" style="color: var(--success-color);">${avgCompletionTime}</div>
                    <div class="stat-label">Avg Completion Time</div>
                </div>
            </div>
        </div>
        <div class="card stat-card">
            <div class="card-body">
                <div class="stat-metric">
                    <div class="stat-value" style="color: var(--danger-color);">${highPriorityPending}</div>
                    <div class="stat-label">High Priority Pending</div>
                </div>
            </div>
        </div>
        <div class="card stat-card">
            <div class="card-body">
                <div class="stat-metric">
                    <div class="stat-value">📍</div>
                    <div class="stat-label">${topLocation ? topLocation[0] : 'N/A'}</div>
                    <div class="stat-subtext">${topLocation ? topLocation[1] + ' reports' : ''}</div>
                </div>
            </div>
        </div>
    `
}

// Calculate average completion time
function calculateAvgCompletionTime() {
    const completed = allReports.filter(r => r.status === 'completed' && r.completed_at)
    if (completed.length === 0) return "N/A"
    
    const totalTime = completed.reduce((sum, report) => {
        const created = new Date(report.created_at)
        const completedDate = new Date(report.completed_at)
        return sum + Math.ceil((completedDate - created) / (1000 * 60 * 60 * 24))
    }, 0)
    
    return Math.round(totalTime / completed.length) + " days"
}

// Load collectors table
async function loadCollectors() {
    const collectorTableContainer = document.getElementById("collectorTable")
    if (!collectorTableContainer) return
    
    collectorTableContainer.innerHTML = ""
    
    collectors.forEach(collector => {
        const active = allReports.filter(r => r.assigned_to === collector.id && r.status !== 'completed').length
        const completed = allReports.filter(r => r.assigned_to === collector.id && r.status === 'completed').length
        const total = allReports.filter(r => r.assigned_to === collector.id).length
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0
        
        const row = document.createElement("tr")
        row.style.borderBottom = "1px solid var(--light-bg)"
        row.innerHTML = `
            <td style="padding: 1rem;">${collector.name}</td>
            <td style="padding: 1rem;">${collector.email || 'N/A'}</td>
            <td style="padding: 1rem; text-align: center;">${active}</td>
            <td style="padding: 1rem; text-align: center;">${completed}</td>
            <td style="padding: 1rem; text-align: center;">${total}</td>
            <td style="padding: 1rem; text-align: center;">
                <div style="background: linear-gradient(90deg, var(--success-color), #34d399); max-width: 60px; height: 24px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin: 0 auto; color: white; font-weight: 600; font-size: 0.75rem;">
                    ${rate}%
                </div>
            </td>
            <td style="padding: 1rem; text-align: center;">
                <button class="btn btn-secondary" onclick="toggleCollectorStatus('${collector.id}')" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;">Deactivate</button>
            </td>
        `
        collectorTableContainer.appendChild(row)
    })
}

// Deactivate collector (placeholder - would need backend support)
async function toggleCollectorStatus(collectorId) {
    const collector = collectors.find(c => c.id === collectorId)
    showToast(`${collector.name} deactivation request sent (requires backend implementation)`, "info")
}
// Assign collector to report
async function assignCollector(reportId) {
    const select = document.getElementById(`collector-${reportId}`)
    const collectorId = select.value

    if (!collectorId) {
        showToast("Please select a collector before assigning", "warning")
        return
    }

    showLoading()
    
    const data = await apiRequest("/reports/assign", "POST", {
        report_id: reportId,
        collector_id: collectorId
    })

    if (data.message) {
        showToast("Collector assigned successfully!", "success")
        await loadReports()
    } else {
        showToast(data.error || "Error assigning collector", "error")
    }
    
    hideLoading()
}
// Get theme-aware chart colors
function getChartConfig() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
    const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--bg-secondary').trim()
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim()
    const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
    
    return {
        isDark,
        bgColor,
        textColor,
        gridColor,
        primaryColor: '#1b5e20',
        accentColor: '#ffd54f',
        successColor: '#10b981',
        warningColor: '#f59e0b',
        dangerColor: '#c62828',
        colorPalette: [
            '#1b5e20', '#2d8659', '#41b06f', '#52d686', '#68e098',
            '#ffd54f', '#ffc107', '#ffb300', '#ff9500', '#ff8500'
        ]
    }
}

// Load location chart with enhanced styling
let locationChartInstance = null

async function loadLocationChart() {
    const data = await apiRequest("/dashboard/locations")
    const config = getChartConfig()

    const labels = Object.keys(data)
    const values = Object.values(data)

    const ctx = document.getElementById("locationChart")
    if (!ctx) return

    if (locationChartInstance) {
        locationChartInstance.destroy()
    }

    locationChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                label: "Reports Per Location",
                data: values,
                backgroundColor: [
                    '#1b5e20', '#2d8659', '#41b06f', '#52d686',
                    '#ffd54f', '#ffb66f', '#ff8a4f'
                ].slice(0, labels.length),
                borderColor: config.textColor,
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: config.textColor,
                        font: { size: 12, family: 'system-ui, -apple-system, sans-serif' },
                        padding: 15,
                        usePointStyle: true
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: config.textColor,
                        font: { size: 11 }
                    },
                    grid: {
                        color: config.gridColor,
                        drawBorder: false
                    }
                },
                x: {
                    ticks: {
                        color: config.textColor,
                        font: { size: 11 }
                    },
                    grid: {
                        display: false,
                        drawBorder: false
                    }
                }
            }
        }
    })
}

// Load collector chart with enhanced styling
let collectorChartInstance = null

async function loadCollectorChart() {
    const data = await apiRequest("/reports/workload")
    const config = getChartConfig()

    const labels = data.map(item => item.collector)
    const values = data.map(item => item.count)

    const ctx = document.getElementById("collectorChart")
    if (!ctx) return

    if (collectorChartInstance) {
        collectorChartInstance.destroy()
    }

    collectorChartInstance = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: labels,
            datasets: [{
                label: "Collector Workload",
                data: values,
                backgroundColor: [
                    '#1b5e20', '#2d8659', '#41b06f', '#52d686',
                    '#68e098', '#ffd54f', '#ffb66f', '#ff8a4f'
                ].slice(0, labels.length),
                borderColor: config.bgColor,
                borderWidth: 2,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: config.textColor,
                        font: { size: 12, family: 'system-ui, -apple-system, sans-serif' },
                        padding: 15,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    titleFont: { size: 13 },
                    bodyFont: { size: 12 },
                    padding: 12,
                    backgroundColor: config.isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.7)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: config.primaryColor,
                    borderWidth: 1
                }
            }
        }
    })
}

// Load status chart
let statusChartInstance = null

async function loadStatusChart() {
    const data = await apiRequest("/dashboard/admin")
    const config = getChartConfig()

    const statuses = ['pending', 'inProgress', 'completed']
    const statusLabels = { pending: 'Pending', inProgress: 'In Progress', completed: 'Completed' }
    const statusColors = { pending: '#f59e0b', inProgress: '#3b82f6', completed: '#10b981' }
    
    const values = statuses.map(status => {
        const key = status.charAt(0).toUpperCase() + status.slice(1)
        return data[status === 'inProgress' ? 'inProgress' : (status === 'pending' ? 'pending' : 'completed')] || 0
    })

    const ctx = document.getElementById("statusChart")
    if (!ctx) return

    if (statusChartInstance) {
        statusChartInstance.destroy()
    }

    statusChartInstance = new Chart(ctx, {
        type: "polarArea",
        data: {
            labels: statuses.map(s => statusLabels[s]),
            datasets: [{
                data: values,
                backgroundColor: [
                    statusColors.pending,
                    statusColors.inProgress,
                    statusColors.completed
                ],
                borderColor: config.bgColor,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: config.textColor,
                        font: { size: 12, family: 'system-ui, -apple-system, sans-serif' },
                        padding: 15,
                        usePointStyle: true
                    }
                }
            },
            scales: {
                r: {
                    ticks: {
                        color: config.textColor,
                        font: { size: 11 }
                    },
                    grid: {
                        color: config.gridColor
                    }
                }
            }
        }
    })
}

// Load priority chart
let priorityChartInstance = null

async function loadPriorityChart() {
    const data = await apiRequest("/dashboard/admin")
    const config = getChartConfig()

    // Calculate priority breakdown from available data
    const priorityData = {
        'High': data.highPriority || 0,
        'Normal': Math.max(0, (data.totalReports || 0) - (data.highPriority || 0) - (data.lowPriority || 0)),
        'Low': data.lowPriority || 0
    }

    const labels = Object.keys(priorityData)
    const values = Object.values(priorityData)

    const ctx = document.getElementById("priorityChart")
    if (!ctx) return

    if (priorityChartInstance) {
        priorityChartInstance.destroy()
    }

    priorityChartInstance = new Chart(ctx, {
        type: "radar",
        data: {
            labels: labels,
            datasets: [{
                label: "Priority Distribution",
                data: values,
                borderColor: config.primaryColor,
                backgroundColor: 'rgba(27, 94, 32, 0.15)',
                borderWidth: 2,
                fill: true,
                pointBackgroundColor: config.primaryColor,
                pointBorderColor: config.bgColor,
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: config.textColor,
                        font: { size: 12, family: 'system-ui, -apple-system, sans-serif' },
                        padding: 15,
                        usePointStyle: true
                    }
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    ticks: {
                        color: config.textColor,
                        font: { size: 11 }
                    },
                    grid: {
                        color: config.gridColor
                    }
                }
            }
        }
    })
}

loadStats()
loadLocationChart()
loadReports()
loadCollectorChart()
loadStatusChart()
loadPriorityChart()

// Refresh charts when theme changes
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme') {
            loadLocationChart()
            loadCollectorChart()
            loadStatusChart()
            loadPriorityChart()
        }
    })
})

observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme']
})

setInterval(() => {
    loadStats()
    loadLocationChart()
    loadReports()
    loadCollectorChart()
    loadStatusChart()
    loadPriorityChart()
}, 10000) // refresh every 10 seconds

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', () => {
    // Show only stats section initially
    selectTab('stats')
    
    // Close modal when clicking outside
    document.getElementById('reportModal').addEventListener('click', (e) => {
        if (e.target.id === 'reportModal') {
            closeReportModal()
        }
    })
})