/**
 * Profile Management Logic
 * Handles fetching and updating user profile data
 */

document.addEventListener("DOMContentLoaded", () => {
    // Check if user is logged in
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "index.html";
        return;
    }

    fetchProfile();

    const profileForm = document.getElementById("profileForm");
    profileForm.addEventListener("submit", handleProfileUpdate);
});

/**
 * Fetch user profile from API
 */
async function fetchProfile() {
    showLoading();
    try {
        const user = await apiRequest("/users/profile", "GET");
        
        if (user.error) {
            showToast(user.message || "Failed to load profile", "error");
            return;
        }

        // Fill form fields
        document.getElementById("name").value = user.name || "";
        document.getElementById("email").value = user.email || "";
        document.getElementById("phone").value = user.phone || "";
        document.getElementById("address").value = user.address || "";
        
        // Update header
        document.getElementById("userNameHeading").textContent = user.name;
        document.getElementById("userRoleBadge").textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);
        document.getElementById("avatarCircle").textContent = user.name ? user.name.charAt(0).toUpperCase() : "U";
        
        const statusText = document.getElementById("statusText");
        statusText.textContent = user.is_verified ? "✅ Verified Account" : "⚠️ Email Not Verified";
        statusText.style.color = user.is_verified ? "var(--success-color)" : "var(--warning-color)";

    } catch (error) {
        console.error("Fetch profile error:", error);
        showToast("Network error. Please ensure the server is running.", "error");
    } finally {
        hideLoading();
    }
}

/**
 * Handle profile update form submission
 */
async function handleProfileUpdate(e) {
    e.preventDefault();
    
    const saveBtn = document.getElementById("saveBtn");
    saveBtn.disabled = true;
    showLoading();

    const name = document.getElementById("name").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const address = document.getElementById("address").value.trim();

    try {
        const result = await apiRequest("/users/profile", "PUT", { name, phone, address });

        if (result.error) {
            showToast(result.details ? result.details.join(", ") : result.message, "error");
        } else {
            showToast("Profile updated successfully!", "success");
            // Refresh header info
            document.getElementById("userNameHeading").textContent = result.user.name;
            document.getElementById("avatarCircle").textContent = result.user.name.charAt(0).toUpperCase();
        }
    } catch (error) {
        console.error("Update profile error:", error);
        showToast("Failed to update profile. Check your connection.", "error");
    } finally {
        saveBtn.disabled = false;
        hideLoading();
    }
}

/**
 * Loading helpers
 */
function showLoading() {
    const loader = document.getElementById("loading");
    if (loader) loader.style.display = "block";
}

function hideLoading() {
    const loader = document.getElementById("loading");
    if (loader) loader.style.display = "none";
}
