//User Registration Logic
async function register() {
    const name = document.getElementById("name").value
    const email = document.getElementById("email").value
    const password = document.getElementById("password").value
    const role = document.getElementById("role").value

    const data = await apiRequest("/auth/register", "POST", {
        name,
        email,
        password,
        role
    })

    if (data.message) {
        alert("Registration successful! Please login.")
        window.location.href = "index.html"
    } else {
        alert(data.error || "Registration failed")
    }
}
// auth.js - Handles user authentication (login/logout) on the frontend
async function login() {
    const email = document.getElementById("email").value
    const password = document.getElementById("password").value

    const data = await apiRequest("/auth/login", "POST", {
        email,
        password
    })

    if (data.token) {
        localStorage.setItem("token", data.token)
        localStorage.setItem("role", data.role)

        if (data.role === "admin") {
            window.location.href = "admin.html"
        } else if (data.role === "collector") {
            window.location.href = "collector.html"
        } else {
            window.location.href = "citizen.html"
        }

    } else {
        alert(data.error || "Login failed")
    }
}
