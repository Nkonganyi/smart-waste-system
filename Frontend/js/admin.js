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
}

// Render reports with collector assignment options
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

        const collectorOptions = collectors.map(c =>
            `<option value="${c.id}">${c.name}</option>`
        ).join("")

        card.innerHTML = `
            <div class="card-header">
                <h3 class="card-header-title">${report.title}</h3>
            </div>
            <div class="card-body">
                <p class="mb-3">${report.description}</p>
                <div class="card-body-item">
                    <span class="card-body-label">Location</span>
                    <span class="card-body-value">${report.location}</span>
                </div>
                <div class="card-body-item" style="display: flex; gap: 0.5rem;">
                    <span class="badge badge-status ${report.status}">${report.status}</span>
                    <span class="badge badge-priority ${report.priority}">${report.priority}</span>
                </div>
                ${report.image_url ? `<img src="${report.image_url}" class="card-img">` : ""}
                <div class="form-group mt-3">
                    <label class="form-label">Assign to Collector</label>
                    <select id="collector-${report.id}">
                        <option value="">Select Collector</option>
                        ${collectorOptions}
                    </select>
                </div>
            </div>
            <div class="card-footer">
                <button class="btn btn-primary" onclick="assignCollector('${report.id}')">Assign Collector</button>
            </div>
        `

        container.appendChild(card)
    })
}

// Filter reports based on criteria
function applyFilters() {
    const status = document.getElementById("filterStatus").value
    const priority = document.getElementById("filterPriority").value
    const location = document.getElementById("filterLocation").value.toLowerCase()
    const dateFrom = document.getElementById("filterDateFrom").value
    const dateTo = document.getElementById("filterDateTo").value

    const filtered = allReports.filter(report => {
        // Status filter
        if (status && report.status !== status) return false

        // Priority filter
        if (priority && report.priority !== priority) return false

        // Location filter (partial match)
        if (location && !report.location.toLowerCase().includes(location)) return false

        // Date range filter (if backend provides created_at)
        if (dateFrom || dateTo) {
            const reportDate = new Date(report.created_at || new Date()).toISOString().split('T')[0]
            if (dateFrom && reportDate < dateFrom) return false
            if (dateTo && reportDate > dateTo) return false
        }

        return true
    })

    // Update filter stats
    const statsDiv = document.getElementById("filterStats")
    const activeFilters = [status, priority, location, dateFrom, dateTo].filter(f => f).length
    statsDiv.textContent = `Showing ${filtered.length} of ${allReports.length} reports${activeFilters > 0 ? ` (${activeFilters} filter${activeFilters > 1 ? 's' : ''} active)` : ''}`

    renderReports(filtered)
}

// Clear all filters
function clearFilters() {
    document.getElementById("filterStatus").value = ""
    document.getElementById("filterPriority").value = ""
    document.getElementById("filterLocation").value = ""
    document.getElementById("filterDateFrom").value = ""
    document.getElementById("filterDateTo").value = ""
    
    const statsDiv = document.getElementById("filterStats")
    statsDiv.textContent = `Showing all ${allReports.length} reports`
    
    renderReports(allReports)
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