// citizen.js - Handles citizen-specific frontend logic

// Require citizen role on load
window.addEventListener("DOMContentLoaded", () => {
    if (!requireAuth("citizen")) return
    loadTheme()
    loadNotifications()
    loadMyReports()
    initAutocomplete()
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
    if (window.isSubmittingReport) return

    window.isSubmittingReport = true
    const submitBtn = document.getElementById("submitReportBtn")
    if (submitBtn) {
        submitBtn.disabled = true
        submitBtn.textContent = "Submitting..."
    }
    showLoading()
    const title = document.getElementById("title").value
    const description = document.getElementById("description").value
    const location = document.getElementById("location").value
    const image = document.getElementById("image").files[0]
    const priority = document.getElementById("priority").value

    if (!title || !description || !location || !priority) {
        showToast("Please fill in all required fields", "warning")
        hideLoading()
        window.isSubmittingReport = false
        if (submitBtn) {
            submitBtn.disabled = false
            submitBtn.textContent = "Submit Report"
        }
        return
    }

    const formData = new FormData()
    formData.append("title", title)
    formData.append("description", description)
    formData.append("location", location)
    formData.append("priority", priority)
    if (image) formData.append("image", image)

    try {
        const data = await apiRequest("/reports", "POST", formData, true)

        showToast("Report submitted successfully! Thank you for reporting.", "success")
        document.getElementById("title").value = ""
        document.getElementById("description").value = ""
        document.getElementById("location").value = ""
        document.getElementById("image").value = ""
        document.getElementById("priority").value = "normal"
        clearPreview()
        await loadMyReports()
    } catch (err) {
        console.error(err)
        const message = err.message && err.message.toLowerCase().includes("fetch failed")
            ? "Network issue while submitting. Please try again."
            : (err.message || "Error submitting report. Please try again.")
        showToast(message, "error")
    }

    hideLoading()
    window.isSubmittingReport = false
    if (submitBtn) {
        submitBtn.disabled = false
        submitBtn.textContent = "Submit Report"
    }
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

// Mark a single notification as read
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

// Load my reports
async function loadMyReports() {
    showLoading()
    try {
        const data = await apiRequest("/reports/my")
        if (!Array.isArray(data)) { hideLoading(); return }

        const container = document.getElementById("reportsList")
        if (!container) { hideLoading(); return }
        container.innerHTML = ""

        if (data.length === 0) {
            container.innerHTML = `<div class="card"><div class="card-body"><p style="color:var(--text-secondary);">You haven't submitted any reports yet.</p></div></div>`
            hideLoading()
            return
        }

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
                        <span class="badge badge-priority ${report.priority}">${report.priority}</span>
                    </div>
                    ${report.image_url ? `<img src="${report.image_url}" class="card-img">` : ""}
                </div>
            `
            container.appendChild(card)
        })
    } catch (err) {
        console.error("loadMyReports error:", err)
    }
    hideLoading()
}


// Location Autocomplete Logic
function initAutocomplete() {
    const locationInput = document.getElementById("location")
    const suggestionsList = document.getElementById("suggestionsList")
    let debounceTimer

    if (!locationInput || !suggestionsList) return

    locationInput.addEventListener("input", () => {
        clearTimeout(debounceTimer)
        const query = locationInput.value.trim()

        if (query.length < 2) {
            suggestionsList.style.display = "none"
            return
        }

        debounceTimer = setTimeout(async () => {
            try {
                // Fetch suggestions from backend
                const suggestions = await apiRequest(`/reports/location-suggestions?q=${encodeURIComponent(query)}`)
                
                renderSuggestions(suggestions)
            } catch (err) {
                console.error("Autocomplete error:", err)
            }
        }, 300)
    })

    // Hide suggestions when clicking outside
    document.addEventListener("click", (e) => {
        if (!e.target.closest(".suggestions-container")) {
            suggestionsList.style.display = "none"
        }
    })
}

function renderSuggestions(suggestions) {
    const list = document.getElementById("suggestionsList")
    if (!list) return

    list.innerHTML = ""
    
    if (suggestions.length === 0) {
        list.style.display = "none"
        return
    }

    suggestions.forEach(text => {
        const li = document.createElement("li")
        li.className = "suggestion-item"
        li.textContent = text
        li.addEventListener("click", () => {
            document.getElementById("location").value = text
            list.style.display = "none"
        })
        list.appendChild(li)
    })

    list.style.display = "block"
}

// Sidebar link close on mobile
document.querySelectorAll(".sidebar-link").forEach(link => {
    link.addEventListener("click", () => {
        if (window.innerWidth <= 768) {
            document.querySelector(".sidebar")?.classList.remove("active")
            document.getElementById("sidebarToggle")?.classList.remove("active")
        }
    })
})

// Image Preview Logic
function previewImage(event) {
    const reader = new FileReader()
    const preview = document.getElementById("imagePreview")
    const file = event.target.files[0]

    if (file) {
        reader.onload = function() {
            if (preview) {
                preview.src = reader.result
                preview.style.display = "block"
            }
        }
        reader.readAsDataURL(file)
    } else {
        clearPreview()
    }
}

function clearPreview() {
    const preview = document.getElementById("imagePreview")
    if (preview) {
        preview.src = ""
        preview.style.display = "none"
    }
}
