function logout() {
    localStorage.clear()
    window.location.href = "index.html"
}

async function loadStats() {
    const data = await apiRequest("/dashboard/admin")

    const statsDiv = document.getElementById("stats")

    statsDiv.innerHTML = `
        Total Reports: ${data.totalReports} <br>
        Pending: ${data.pending} <br>
        In Progress: ${data.inProgress} <br>
        Completed: ${data.completed} <br>
        Total Users: ${data.totalUsers} <br>
        Collectors: ${data.collectors}
    `
}
// Load reports and stats on page load
async function loadReports() {
    const reports = await apiRequest("/reports")
    const collectors = await apiRequest("/reports/collectors")

    const container = document.getElementById("reports")
    container.innerHTML = ""

    reports.forEach(report => {
        const div = document.createElement("div")
        div.style.border = "1px solid #ccc"
        div.style.padding = "10px"
        div.style.marginBottom = "10px"

        let collectorOptions = collectors.map(c =>
            `<option value="${c.id}">${c.name}</option>`
        ).join("")

        div.innerHTML = `
            <strong>${report.title}</strong><br>
            ${report.description}<br>
            Location: ${report.location}<br>
            Status: <b>${report.status}</b><br>
            ${report.image_url ? `<img src="${report.image_url}" width="200"><br>` : ""}

            <select id="collector-${report.id}">
                <option value="">Select Collector</option>
                ${collectorOptions}
            </select>
            <button onclick="assignCollector('${report.id}')">
                Assign
            </button>
        `

        container.appendChild(div)
    })
}
// Assign collector to report
async function assignCollector(reportId) {
    const select = document.getElementById(`collector-${reportId}`)
    const collectorId = select.value

    if (!collectorId) {
        alert("Please select a collector")
        return
    }

    const data = await apiRequest("/reports/assign", "POST", {
        report_id: reportId,
        collector_id: collectorId
    })

    if (data.message) {
        alert("Collector assigned successfully")
        loadReports()
    } else {
        alert(data.error || "Error assigning collector")
    }
}

loadStats()
loadReports()

setInterval(() => {
    loadStats()
    loadReports()
}, 10000) // refresh every 10 seconds