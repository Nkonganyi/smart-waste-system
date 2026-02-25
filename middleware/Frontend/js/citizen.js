// citizen.js - Handles citizen-specific frontend logic
function logout() {
    localStorage.clear()
    window.location.href = "index.html"
}
// Submit new report
async function submitReport() {
    const title = document.getElementById("title").value
    const description = document.getElementById("description").value
    const location = document.getElementById("location").value
    const image = document.getElementById("image").files[0]

    const formData = new FormData()
    formData.append("title", title)
    formData.append("description", description)
    formData.append("location", location)

    if (image) {
        formData.append("image", image)
    }

    const response = await fetch("http://localhost:5000/api/reports", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: formData
    })

    const data = await response.json()

    if (data.message) {
        alert("Report submitted successfully!")
        loadMyReports() // Refresh my reports
    } else {
        alert(data.error || "Error submitting report")
    }
}
// Load notifications and my reports on page load
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
// Load my reports
async function loadMyReports() {
    const data = await apiRequest("/reports/my")

    const container = document.getElementById("reports")
    container.innerHTML = ""

    data.forEach(report => {
        const div = document.createElement("div")
        div.style.border = "1px solid #ccc"
        div.style.padding = "10px"
        div.style.marginBottom = "10px"

        div.innerHTML = `
            <strong>${report.title}</strong><br>
            ${report.description}<br>
            Location: ${report.location}<br>
            Status: <b>${report.status}</b><br>
            ${report.image_url ? `<img src="${report.image_url}" width="200">` : ""}
        `

        container.appendChild(div)
    })
}

loadNotifications()
loadMyReports()