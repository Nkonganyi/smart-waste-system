function logout() {
    localStorage.clear()
    window.location.href = "index.html"
}

// Load assigned reports for collector
async function loadAssignedReports() {
    const data = await apiRequest("/reports/assigned")

    const container = document.getElementById("reports")
    container.innerHTML = ""

    data.forEach(report => {
        const div = document.createElement("div")
        div.style.border = "1px solid #ccc"
        div.style.padding = "10px"
        div.style.marginBottom = "10px"

        // SMART WORKFLOW BUTTONS
        let actionButtons = ""

        if (report.status === "pending") {
            actionButtons = `
                <button onclick="startReport('${report.id}')">
                    Start Work
                </button>
            `
        }

        if (report.status === "in_progress") {
            actionButtons = `
                <button onclick="completeReport('${report.id}')">
                    Mark as Completed
                </button>
            `
        }

        if (report.status === "completed") {
            actionButtons = `<span style="color: green;">✔ Completed</span>`
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
    const data = await apiRequest("/reports/complete", "PUT", {
        report_id: reportId
    })

    alert(data.message || data.error)
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

// Initial Load
loadAssignedReports()
loadNotifications()

// Auto refresh every 10 seconds
setInterval(() => {
    loadAssignedReports()
    loadNotifications()
}, 10000)