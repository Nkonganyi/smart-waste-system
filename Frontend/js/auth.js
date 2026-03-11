// auth.js - Handles user authentication (login/logout/register) on the frontend

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

// User Registration Logic
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

    if (password.length < 8) {
        showToast("Password must be at least 8 characters", "warning")
        btn.disabled = false
        hideLoading()
        return
    }

    try {
        const data = await apiRequest("/auth/register", "POST", { name, email, password, role })
    
        hideLoading()
    
        if (data.message && !data.error) {
            showToast("Registration successful! Check your email to verify your account.", "success")
    
            setTimeout(() => {
                window.location.href = "index.html"
            }, 1500)
        } else {
            showToast(data.error || data.message || "Registration failed", "error")
            btn.disabled = false
        }
    } catch (err) {
        console.error("Registration request failed:", err)
        showToast(err.message || "Request failed. Check connection.", "error")
        hideLoading()
        btn.disabled = false
    }
}

// Login Logic
async function login() {
    const btn = document.getElementById("loginBtn")
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

    try {
        const data = await apiRequest("/auth/login", "POST", { email, password })
    
        hideLoading()
    
        if (data.token) {
            const role = data.user?.role
            localStorage.setItem("token", data.token)
            localStorage.setItem("role", role || "")
            showToast("Login successful! Redirecting...", "success")
    
            setTimeout(() => {
                if (role === "admin") window.location.href = "admin.html"
                else if (role === "collector") window.location.href = "collector.html"
                else window.location.href = "citizen.html"
            }, 1500)
        } else if (data.error === "Account not verified") {
            showToast(
                "Please verify your email address before logging in. Check your inbox for the verification link.",
                "warning"
            )
            alert(
                "Email Not Verified\n\n" +
                "Your account has been created, but you need to verify your email first.\n\n" +
                "Please check your email for a verification link and click it to activate your account.\n\n" +
                "The link will expire in 24 hours."
            )
            btn.disabled = false
        } else if (data.error === "Account suspended") {
            showToast("Your account has been suspended. Please contact support.", "error")
            btn.disabled = false
        } else {
            showToast(data.error || data.message || "Login failed", "error")
            btn.disabled = false
        }
    } catch (err) {
        console.error("Login request failed:", err)
        showToast(err.message || "Login request failed. Check connection.", "error")
        hideLoading()
        btn.disabled = false
    }
}

// Resend verification email from login screen
async function resendVerification() {
    const email = document.getElementById("email").value.trim()

    if (!email) {
        showToast("Enter your email first, then click resend", "warning")
        return
    }

    showLoading()
    try {
        const data = await apiRequest("/auth/resend-verification", "POST", { email })

        if (data.message) {
            showToast(data.message, "success")
            return
        }

        showToast(data.error || "Unable to resend verification email", "error")
    } catch (err) {
        console.error("Resend verification error:", err)
        showToast("Request failed. Check backend server and network.", "error")
    } finally {
        hideLoading()
    }
}

// Forgot password — sends reset email
async function forgotPassword() {
    const email = document.getElementById("email").value.trim()

    if (!email) {
        showToast("Enter your email address first", "warning")
        return
    }

    showLoading()
    try {
        const data = await apiRequest("/auth/forgot-password", "POST", { email })

        showToast(data.message || "If that email exists, a reset link was sent.", "success")
    } catch (err) {
        console.error("Forgot password error:", err)
        showToast("Request failed. Check connection and try again.", "error")
    } finally {
        hideLoading()
    }
}

// Reset password — submit new password with token from URL
async function resetPassword() {
    const btn = document.getElementById("resetBtn")
    if (btn) btn.disabled = true

    const params = new URLSearchParams(window.location.search)
    const token = params.get("token")
    const password = document.getElementById("password").value
    const confirmPassword = document.getElementById("confirmPassword")?.value

    if (!token) {
        showToast("Invalid or missing reset token. Please request a new link.", "error")
        if (btn) btn.disabled = false
        return
    }

    if (!password) {
        showToast("Please enter a new password", "warning")
        if (btn) btn.disabled = false
        return
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
        showToast("Passwords do not match", "warning")
        if (btn) btn.disabled = false
        return
    }

    showLoading()
    try {
        const data = await apiRequest("/auth/reset-password", "POST", { token, password })

        if (data.message && !data.error) {
            showToast("Password reset successfully! Redirecting to login...", "success")
            setTimeout(() => { window.location.href = "index.html" }, 2000)
        } else {
            showToast(data.message || data.error || "Reset failed", "error")
            if (btn) btn.disabled = false
        }
    } catch (err) {
        console.error("Reset password error:", err)
        showToast("Request failed. Check connection and try again.", "error")
        if (btn) btn.disabled = false
    } finally {
        hideLoading()
    }
}
