// api.js - Utility functions for making API requests from the frontend
const API_BASE_URL = "http://localhost:5000/api"

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