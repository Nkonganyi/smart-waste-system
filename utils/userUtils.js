/**
 * User Utilities Module
 * Helper functions for user management and authentication
 */

const supabase = require("../config/supabase")
const bcrypt = require("bcrypt")

/**
 * Get user by ID with sensitive fields excluded
 */
const getUserById = async (userId, includeSensitive = false) => {
    try {
        const { data: user, error } = await supabase
            .from("users")
            .select("*")
            .eq("id", userId)
            .single()

        if (error || !user) {
            return null
        }

        // Remove sensitive data unless explicitly requested
        if (!includeSensitive) {
            delete user.password_hash
        }

        return user
    } catch (error) {
        console.error("Error fetching user:", error)
        return null
    }
}

/**
 * Get user by email
 */
const getUserByEmail = async (email) => {
    try {
        const { data: user, error } = await supabase
            .from("users")
            .select("*")
            .eq("email", email)
            .single()

        if (error || !user) {
            return null
        }

        return user
    } catch (error) {
        console.error("Error fetching user by email:", error)
        return null
    }
}

/**
 * Check if user exists by email
 */
const userExists = async (email) => {
    const user = await getUserByEmail(email)
    return user !== null
}

/**
 * Validate password strength
 * Returns object: { isValid: boolean, message: string }
 */
const validatePasswordStrength = (password) => {
    const errors = []

    if (!password || password.length < 8) {
        errors.push("Password must be at least 8 characters long")
    }

    if (!/[A-Z]/.test(password)) {
        errors.push("Password must contain at least one uppercase letter")
    }

    if (!/[a-z]/.test(password)) {
        errors.push("Password must contain at least one lowercase letter")
    }

    if (!/[0-9]/.test(password)) {
        errors.push("Password must contain at least one number")
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push("Password must contain at least one special character")
    }

    return {
        isValid: errors.length === 0,
        message: errors.length === 0 ? "Password is strong" : errors.join("; "),
        errors
    }
}

/**
 * Validate email format
 */
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}

/**
 * Hash password with bcrypt
 */
const hashPassword = async (password, saltRounds = 12) => {
    try {
        return await bcrypt.hash(password, saltRounds)
    } catch (error) {
        console.error("Error hashing password:", error)
        throw error
    }
}

/**
 * Verify password against hash
 */
const verifyPassword = async (password, hash) => {
    try {
        return await bcrypt.compare(password, hash)
    } catch (error) {
        console.error("Error verifying password:", error)
        throw error
    }
}

/**
 * Get users by role
 */
const getUsersByRole = async (role) => {
    try {
        const validRoles = ["citizen", "collector", "admin"]
        if (!validRoles.includes(role)) {
            throw new Error(`Invalid role: ${role}`)
        }

        const { data: users, error } = await supabase
            .from("users")
            .select("id, name, email, role, is_verified, is_suspended, created_at")
            .eq("role", role)

        if (error) {
            throw error
        }

        return users || []
    } catch (error) {
        console.error("Error fetching users by role:", error)
        return []
    }
}

/**
 * Update user verification status
 */
const verifyUserEmail = async (userId) => {
    try {
        const { data: user, error } = await supabase
            .from("users")
            .update({
                is_verified: true,
                updated_at: new Date().toISOString()
            })
            .eq("id", userId)
            .select()

        if (error) {
            throw error
        }

        return user ? user[0] : null
    } catch (error) {
        console.error("Error verifying user email:", error)
        return null
    }
}

/**
 * Suspend a user account
 */
const suspendUserAccount = async (userId) => {
    try {
        const { data: user, error } = await supabase
            .from("users")
            .update({
                is_suspended: true,
                updated_at: new Date().toISOString()
            })
            .eq("id", userId)
            .select()

        if (error) {
            throw error
        }

        return user ? user[0] : null
    } catch (error) {
        console.error("Error suspending user:", error)
        return null
    }
}

/**
 * Unsuspend a user account
 */
const unsuspendUserAccount = async (userId) => {
    try {
        const { data: user, error } = await supabase
            .from("users")
            .update({
                is_suspended: false,
                updated_at: new Date().toISOString()
            })
            .eq("id", userId)
            .select()

        if (error) {
            throw error
        }

        return user ? user[0] : null
    } catch (error) {
        console.error("Error unsuspending user:", error)
        return null
    }
}

/**
 * Update user role
 */
const updateUserRole = async (userId, newRole) => {
    try {
        const validRoles = ["citizen", "collector", "admin"]
        if (!validRoles.includes(newRole)) {
            throw new Error(`Invalid role: ${newRole}`)
        }

        const { data: user, error } = await supabase
            .from("users")
            .update({
                role: newRole,
                updated_at: new Date().toISOString()
            })
            .eq("id", userId)
            .select()

        if (error) {
            throw error
        }

        return user ? user[0] : null
    } catch (error) {
        console.error("Error updating user role:", error)
        return null
    }
}

/**
 * Get user statistics for dashboard
 */
const getUserStatistics = async () => {
    try {
        const { data, error } = await supabase
            .from("users")
            .select("role, is_verified, is_suspended")

        if (error) {
            throw error
        }

        const stats = {
            total: data.length,
            byRole: {
                citizen: 0,
                collector: 0,
                admin: 0
            },
            verified: 0,
            suspended: 0
        }

        data.forEach(user => {
            stats.byRole[user.role]++
            if (user.is_verified) stats.verified++
            if (user.is_suspended) stats.suspended++
        })

        return stats
    } catch (error) {
        console.error("Error fetching user statistics:", error)
        return null
    }
}

/**
 * Validate user role
 */
const isValidRole = (role) => {
    return ["citizen", "collector", "admin"].includes(role)
}

module.exports = {
    getUserById,
    getUserByEmail,
    userExists,
    validatePasswordStrength,
    validateEmail,
    hashPassword,
    verifyPassword,
    getUsersByRole,
    verifyUserEmail,
    suspendUserAccount,
    unsuspendUserAccount,
    updateUserRole,
    getUserStatistics,
    isValidRole
}
