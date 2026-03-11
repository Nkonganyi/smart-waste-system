// api.js - Utility functions for making API requests from the frontend

// Hardcoded to localhost:5000 to allow CORS requests from local file:// testing
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
            if (toast.parentElement) toast.remove()
        }, duration)
    }

    return toast
}

function getToken() {
    return localStorage.getItem("token")
}

// Redirect to login if no token — call on protected pages
function requireAuth(expectedRole) {
    const token = getToken()
    const role = localStorage.getItem("role")

    if (!token) {
        window.location.href = "index.html"
        return false
    }

    if (expectedRole && role !== expectedRole) {
        // Wrong role — redirect to their correct dashboard or login
        if (role === "admin") window.location.href = "admin.html"
        else if (role === "collector") window.location.href = "collector.html"
        else if (role === "citizen") window.location.href = "citizen.html"
        else window.location.href = "index.html"
        return false
    }

    return true
}

// Generic function to make API requests with authentication
async function apiRequest(endpoint, method = "GET", body = null, isForm = false) {
    const headers = {}
    const controller = new AbortController()
    const timeoutMs = 15000
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    if (!isForm) {
        headers["Content-Type"] = "application/json"
    }

    const token = getToken()
    if (token) {
        headers["Authorization"] = `Bearer ${token}`
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method,
            headers,
            signal: controller.signal,
            body: isForm ? body : body ? JSON.stringify(body) : null
        })

        console.log(`[API REQUEST] ${method} ${API_BASE_URL}${endpoint}`);
        console.log(`[API REQUEST HEADERS]`, headers);

        const text = await response.text()
        console.log(`[API RESPONSE] ${method} ${endpoint} -> Status: ${response.status}`);
        console.log(`[API HEADERS]`, Object.fromEntries(response.headers.entries()));
        console.log(`[API TEXT]`, text);
        
        // If the response is empty (e.g. 204 No Content), return an empty object
        if (!text) {
            console.error(`[API ERROR] Empty response body received! Status: ${response.status}`);
            
            // Allow 204 to return empty object, but 4xx/5xx empty responses should throw
            if (response.status >= 400) {
                throw new Error(`Server failed (Status ${response.status}) with no content.`);
            }
            return {}
        }
        
        try {
            return JSON.parse(text)
        } catch (parseError) {
            console.error(`[API JSON PARSE ERROR] Content: ${text.substring(0, 100)}...`);
            throw new Error(`Server returned non-JSON (Status ${response.status}). Check server logs.`)
        }
    } catch (error) {
        console.error(`[API FETCH ERROR] ${method} ${endpoint}:`, error);
        if (error.name === "AbortError") {
            throw new Error("Request timed out. Please try again.")
        }
        throw error
    } finally {
        clearTimeout(timeoutId)
    }
}
