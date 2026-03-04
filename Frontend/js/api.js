// api.js - Utility functions for making API requests from the frontend
const API_BASE_URL = "http://localhost:5000/api"

// Notification/Toast system
function showToast(message, type = 'info', duration = 4000) {
    let container = document.getElementById('toastContainer')
    if (!container) {
        container = document.createElement('div')
        container.id = 'toastContainer'
        container.className = 'toast-container'
        document.body.appendChild(container)
    }

    const toast = document.createElement('div')
    toast.className = `toast ${type}`
    
    const iconMap = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    }
    
    toast.innerHTML = `
        <span style="font-weight: 600; font-size: 1.25rem;">${iconMap[type] || '·'}</span>
        <span>${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `
    
    container.appendChild(toast)
    
    if (duration > 0) {
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove()
            }
        }, duration)
    }
    
    return toast
}

function getToken() {
    return localStorage.getItem("token")
}
// Generic function to make API requests with authentication
async function apiRequest(endpoint, method = "GET", body = null, isForm = false) {
    const headers = {}

    if (!isForm) {
        headers["Content-Type"] = "application/json"
    }

    const token = getToken()
    if (token) {
        headers["Authorization"] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers,
        body: isForm ? body : body ? JSON.stringify(body) : null
    })

    return response.json()
}