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

    if (password.length < 8) {
        showToast("Password must be at least 8 characters", "warning")
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
        // Show email verification message
        showToast(
            "Registration successful! Check your email to verify your account.",
            "success"
        )
        
        // Show verification message in modal or alert
        setTimeout(() => {
            alert(
                `Welcome ${name}!\n\n` +
                `A verification link has been sent to:\n${email}\n\n` +
                `Please click the link in your email to activate your account.\n\n` +
                `The link will expire in 24 hours.`
            )
            
            // Redirect to login page
            window.location.href = "index.html"
        }, 1500)
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
    } else if (data.error === "Account not verified") {
        // User email not verified
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
        // Account suspended
        showToast(
            "Your account has been suspended. Please contact support.",
            "error"
        )
        btn.disabled = false
    } else {
        showToast(data.error || "Login failed", "error")
        btn.disabled = false
    }
}
