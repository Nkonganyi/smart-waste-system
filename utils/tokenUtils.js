const crypto = require("crypto")
const supabase = require("../config/supabase")

/**
 * Token Utility Module
 * Handles generation and validation of verification tokens
 */

/**
 * Generate a unique verification token
 * Returns a cryptographically secure random token
 * @returns {string} Verification token
 */
exports.generateVerificationToken = () => {
    return crypto.randomBytes(32).toString("hex")
}

/**
 * Store verification token in database
 * Creates or updates a verification token record for a user
 * @param {string} userId - User ID
 * @param {string} token - Verification token
 * @param {number} expiresInHours - Token expiration time in hours (default: 24)
 * @returns {Promise<Object>} Token storage result
 */
exports.storeVerificationToken = async (userId, token, expiresInHours = 24) => {
    try {
        const expiresAt = new Date()
        expiresAt.setHours(expiresAt.getHours() + expiresInHours)

        const { data, error } = await supabase
            .from("email_verification_tokens")
            .upsert(
                {
                    user_id: userId,
                    token: token,
                    expires_at: expiresAt.toISOString(),
                    created_at: new Date().toISOString()
                },
                { onConflict: "user_id" }
            )
            .select()

        if (error) {
            console.error("Error storing verification token:", error)
            return { success: false, error: error.message }
        }

        return { success: true, data: data[0] }
    } catch (error) {
        console.error("Exception storing verification token:", error)
        return { success: false, error: error.message }
    }
}

/**
 * Verify the token and check if it's still valid
 * @param {string} token - Token to verify
 * @returns {Promise<Object>} Verification result with user data
 */
exports.verifyToken = async (token) => {
    try {
        const { data, error } = await supabase
            .from("email_verification_tokens")
            .select("*, user_id")
            .eq("token", token)
            .single()

        if (error || !data) {
            return { success: false, error: "Invalid token" }
        }

        // Check if token has expired
        const expiresAt = new Date(data.expires_at)
        const now = new Date()

        if (now > expiresAt) {
            return { success: false, error: "Token has expired" }
        }

        return { success: true, data: data }
    } catch (error) {
        console.error("Exception verifying token:", error)
        return { success: false, error: error.message }
    }
}

/**
 * Delete verification token after successful verification
 * @param {string} token - Token to delete
 * @returns {Promise<Object>} Deletion result
 */
exports.deleteVerificationToken = async (token) => {
    try {
        const { error } = await supabase
            .from("email_verification_tokens")
            .delete()
            .eq("token", token)

        if (error) {
            console.error("Error deleting verification token:", error)
            return { success: false, error: error.message }
        }

        return { success: true }
    } catch (error) {
        console.error("Exception deleting verification token:", error)
        return { success: false, error: error.message }
    }
}

/**
 * Delete all tokens for a user (when they verify or on re-registration)
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Deletion result
 */
exports.deleteUserTokens = async (userId) => {
    try {
        const { error } = await supabase
            .from("email_verification_tokens")
            .delete()
            .eq("user_id", userId)

        if (error) {
            console.error("Error deleting user tokens:", error)
            return { success: false, error: error.message }
        }

        return { success: true }
    } catch (error) {
        console.error("Exception deleting user tokens:", error)
        return { success: false, error: error.message }
    }
}

/**
 * Get token record by user ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Token record if exists
 */
exports.getTokenByUserId = async (userId) => {
    try {
        const { data, error } = await supabase
            .from("email_verification_tokens")
            .select("*")
            .eq("user_id", userId)
            .maybeSingle()

        if (error) {
            console.error("Error retrieving token:", error)
            return { success: false, error: error.message }
        }

        return { success: true, data: data }
    } catch (error) {
        console.error("Exception retrieving token:", error)
        return { success: false, error: error.message }
    }
}
