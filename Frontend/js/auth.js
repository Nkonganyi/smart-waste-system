// loading helpers
function showLoading() {
    const spinner = document.getElementById("loading")
    if (spinner) spinner.style.display = "block"
    const authLoading = document.getElementById("authLoading")
    if (authLoading) authLoading.style.display = "block"
}
function hideLoading() {
    const spinner = document.getElementById("loading")
    if (spinner) spinner.style.display = "none"
    const authLoading = document.getElementById("authLoading")
    if (authLoading) authLoading.style.display = "none"
}

//User Registration Logic
async function register() {
    const btn = document.getElementById("registerBtn")
    btn.disabled = true
    
    showLoading()
    const name = document.getElementById("name").value
    const email = document.getElementById("email").value
    const password = document.getElementById("password").value
    const role = document.getElementById("role").value

    if (!name || !email || !password || !role) {
        showToast("Please fill in all fields", "warning")
        btn.disabled = false
        hideLoading()
        return
    }

    if (password.length < 6) {
        showToast("Password must be at least 6 characters", "warning")
        btn.disabled = false
        hideLoading()
        return
    }

    const data = await apiRequest("/auth/register", "POST", {
        name,
        email,
        password,
        role
    })

    hideLoading()

    if (data.message) {
        showToast("Registration successful! Redirecting to login...", "success")
        setTimeout(() => {
            window.location.href = "index.html"
        }, 2000)
    } else {
        showToast(data.error || "Registration failed", "error")
        btn.disabled = false
    }
}
// auth.js - Handles user authentication (login/logout) on the frontend
async function login() {
    const btn = document.getElementById("loginBtn") || event.target
    btn.disabled = true
    
    showLoading()
    const email = document.getElementById("email").value
    const password = document.getElementById("password").value

    if (!email || !password) {
        showToast("Please enter email and password", "warning")
        btn.disabled = false
        hideLoading()
        return
    }

    const data = await apiRequest("/auth/login", "POST", {
        email,
        password
    })

    hideLoading()

    if (data.token) {
        localStorage.setItem("token", data.token)
        localStorage.setItem("role", data.role)
        showToast("Login successful! Redirecting...", "success")
        
        setTimeout(() => {
            if (data.role === "admin") {
                window.location.href = "admin.html"
            } else if (data.role === "collector") {
                window.location.href = "collector.html"
            } else {
                window.location.href = "citizen.html"
            }
        }, 1500)
    } else {
        showToast(data.error || "Login failed", "error")
        btn.disabled = false
    }
}
