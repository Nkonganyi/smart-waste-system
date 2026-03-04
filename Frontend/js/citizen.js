// citizen.js - Handles citizen-specific frontend logic

// loading helpers
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

// Submit new report
async function submitReport() {
    showLoading()
    const title = document.getElementById("title").value
    const description = document.getElementById("description").value
    const location = document.getElementById("location").value
    const image = document.getElementById("image").files[0]
    const priority = document.getElementById("priority").value

    if (!title || !description || !location) {
        showToast("Please fill in all required fields", "warning")
        hideLoading()
        return
    }

    const formData = new FormData()
    formData.append("title", title)
    formData.append("description", description)
    formData.append("location", location)
    formData.append("priority", priority)

    if (image) {
        formData.append("image", image)
    }

    try {
        const response = await fetch("http://localhost:5000/api/reports", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`
            },
            body: formData
        })

        const data = await response.json()

        if (data.message) {
            showToast("Report submitted successfully! Thank you for reporting.", "success")
            document.getElementById("title").value = ""
            document.getElementById("description").value = ""
            document.getElementById("location").value = ""
            document.getElementById("image").value = ""
            document.getElementById("priority").value = "normal"
            await loadMyReports()
        } else {
            showToast(data.error || "Error submitting report", "error")
        }
    } catch (err) {
        console.error(err)
        showToast("Error submitting report. Please try again.", "error")
    }
    
    hideLoading()
}

// Load notifications and my reports on page load
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

// Load my reports
async function loadMyReports() {
    showLoading()

    const data = await apiRequest("/reports/my")

    const container = document.getElementById("reportsList")
    container.innerHTML = ""

    data.forEach(report => {
        const card = document.createElement("div")
        card.className = "card"

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
                <div class="card-body-item">
                    <span class="badge badge-status ${report.status}">${report.status}</span>
                </div>
                ${report.image_url ? `<img src="${report.image_url}" class="card-img">` : ""}
            </div>
        `

        container.appendChild(card)
    })
    hideLoading()
}

loadNotifications()
loadMyReports()