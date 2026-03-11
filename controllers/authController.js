// Production-grade authentication controller
const supabase = require("../config/supabase")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const emailService = require("../utils/emailService")
const tokenUtils = require("../utils/tokenUtils")
const crypto = require("crypto")

const SALT_ROUNDS = 12
const JWT_EXPIRY = "24h"

/**
 * Validate password strength
 * At least 8 chars, one uppercase, one lowercase, one number, one special char
 */
function validatePasswordStrength(password) {
    const errors = []
    if (!password || password.length < 8) errors.push("at least 8 characters")
    if (!/[A-Z]/.test(password)) errors.push("one uppercase letter")
    if (!/[a-z]/.test(password)) errors.push("one lowercase letter")
    if (!/[0-9]/.test(password)) errors.push("one number")
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) errors.push("one special character")
    return {
        isValid: errors.length === 0,
        message: errors.length === 0 ? "Strong" : `Password must contain: ${errors.join(", ")}`
    }
}

/**
 * User Registration
 */
exports.register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body

        if (!name || !email || !password) {
            return res.status(400).json({
                error: "Invalid input",
                message: "Name, email, and password are required"
            })
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                error: "Invalid email",
                message: "Please provide a valid email address"
            })
        }

        const { data: existingUser } = await supabase
            .from("users")
            .select("id")
            .eq("email", email)
            .single()

        if (existingUser) {
            return res.status(409).json({
                error: "User exists",
                message: "Email already registered"
            })
        }

        // Validate password strength
        const passwordCheck = validatePasswordStrength(password)
        if (!passwordCheck.isValid) {
            return res.status(400).json({
                error: "Weak password",
                message: passwordCheck.message
            })
        }

        const validRoles = ["citizen", "collector", "admin"]
        const userRole = role && validRoles.includes(role) ? role : "citizen"

        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

        const { data: newUser, error } = await supabase
            .from("users")
            .insert([
                {
                    name,
                    email,
                    password_hash: passwordHash,
                    role: userRole,
                    is_verified: false,
                    is_suspended: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            ])
            .select()

        if (error) {
            console.error("Registration error:", JSON.stringify(error, null, 2))
            return res.status(500).json({
                error: "Registration failed",
                message: "Failed to create user account",
                debugInfo: process.env.NODE_ENV === "development" ? {
                    dbError: error.message,
                    dbCode: error.code,
                    dbDetails: error.details,
                    dbHint: error.hint
                } : undefined
            })
        }

        const userId = newUser[0].id
        const verificationToken = tokenUtils.generateVerificationToken()
        const tokenResult = await tokenUtils.storeVerificationToken(userId, verificationToken)

        if (!tokenResult.success) {
            console.error("Token storage error:", tokenResult.error)
            return res.status(500).json({
                error: "Verification setup failed",
                message: "Failed to create verification token"
            })
        }

        const appUrl = process.env.APP_URL || "http://localhost:5000"
        const verificationUrl = `${appUrl}/verify-email?token=${verificationToken}`
        const includeDevLink = process.env.NODE_ENV !== "production"
        const emailResult = await emailService.sendVerificationEmail(email, name, verificationToken, appUrl)

        if (!emailResult.success) {
            console.error("Email send error:", emailResult.error)

            return res.status(500).json({
                error: "Email send failed",
                message: "Failed to send verification email. Please check your email configuration.",
                userId: userId
            })
        }

        res.status(201).json({
            message: "User registered successfully. Please check your email to verify your account.",
            verificationUrl: includeDevLink ? verificationUrl : undefined,
            user: {
                id: newUser[0].id,
                name: newUser[0].name,
                email: newUser[0].email,
                role: newUser[0].role,
                is_verified: newUser[0].is_verified
            },
            info: "A verification email has been sent to your email address. The link will expire in 24 hours."
        })
    } catch (error) {
        console.error("Registration exception:", error)
        res.status(500).json({
            error: "Server error",
            message: "An unexpected error occurred during registration"
        })
    }
}

/**
 * User Login
 */
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({
                error: "Invalid input",
                message: "Email and password are required"
            })
        }

        const { data: user, error } = await supabase
            .from("users")
            .select("*")
            .eq("email", email)
            .single()

        if (!user || error) {
            return res.status(401).json({
                error: "Invalid credentials",
                message: "Email or password is incorrect"
            })
        }

        if (user.is_suspended) {
            return res.status(403).json({
                error: "Account suspended",
                message: "Your account has been suspended. Contact administrator for details."
            })
        }

        if (!user.is_verified) {
            return res.status(403).json({
                error: "Account not verified",
                message: "Please verify your email address before logging in"
            })
        }

        const passwordMatch = await bcrypt.compare(password, user.password_hash)
        if (!passwordMatch) {
            return res.status(401).json({
                error: "Invalid credentials",
                message: "Email or password is incorrect"
            })
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: JWT_EXPIRY }
        )

        await supabase
            .from("users")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", user.id)

        res.status(200).json({
            message: "Login successful",
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        })
    } catch (error) {
        console.error("Login exception:", error)
        res.status(500).json({
            error: "Server error",
            message: "An unexpected error occurred during login"
        })
    }
}

/**
 * Logout (client-side token removal)
 */
exports.logout = async (req, res) => {
    try {
        res.status(200).json({
            message: "Logout successful",
            info: "Please clear the token from client storage"
        })
    } catch (error) {
        res.status(500).json({ error: "Logout failed", message: "An error occurred during logout" })
    }
}

/**
 * Verify Email (admin endpoint — direct by userId)
 */
exports.verifyEmail = async (req, res) => {
    try {
        const { userId } = req.body

        if (!userId) {
            return res.status(400).json({ error: "Invalid input", message: "User ID is required" })
        }

        const { data: updatedUser, error } = await supabase
            .from("users")
            .update({ is_verified: true, updated_at: new Date().toISOString() })
            .eq("id", userId)
            .select("id, name, email, role, is_verified, created_at")

        if (error) {
            return res.status(500).json({ error: "Verification failed", message: "Failed to verify email" })
        }

        res.status(200).json({
            message: "Email verified successfully",
            user: updatedUser[0]  // password_hash excluded by explicit column select
        })
    } catch (error) {
        console.error("Email verification exception:", error)
        res.status(500).json({ error: "Server error", message: "An unexpected error occurred" })
    }
}

/**
 * Verify Email Token (public — from email link)
 */
exports.verifyEmailToken = async (req, res) => {
    try {
        const { token } = req.query

        if (!token) {
            return res.status(400).json({ error: "Invalid request", message: "Verification token is required" })
        }

        const tokenResult = await tokenUtils.verifyToken(token)
        if (!tokenResult.success) {
            return res.status(400).json({ error: "Verification failed", message: tokenResult.error })
        }

        const userId = tokenResult.data.user_id

        const { data: updatedUser, error: updateError } = await supabase
            .from("users")
            .update({ is_verified: true, updated_at: new Date().toISOString() })
            .eq("id", userId)
            .select("id, name, email, role, is_verified")

        if (updateError) {
            console.error("User update error:", updateError)
            return res.status(500).json({ error: "Verification failed", message: "Failed to update user verification status" })
        }

        const deleteResult = await tokenUtils.deleteVerificationToken(token)
        if (!deleteResult.success) {
            console.error("Token deletion warning:", deleteResult.error)
        }

        res.status(200).json({
            message: "Email verified successfully! You can now log in.",
            user: updatedUser[0]
        })
    } catch (error) {
        console.error("Email token verification exception:", error)
        res.status(500).json({ error: "Server error", message: "An unexpected error occurred during verification" })
    }
}

/**
 * Suspend User (admin)
 */
exports.suspendUser = async (req, res) => {
    try {
        const { userId } = req.body

        if (!userId) {
            return res.status(400).json({ error: "Invalid input", message: "User ID is required" })
        }

        const { data: updatedUser, error } = await supabase
            .from("users")
            .update({ is_suspended: true, updated_at: new Date().toISOString() })
            .eq("id", userId)
            .select("id, name, email, role, is_suspended")

        if (error) {
            return res.status(500).json({ error: "Suspension failed", message: "Failed to suspend user" })
        }

        res.status(200).json({ message: "User suspended successfully", user: updatedUser[0] })
    } catch (error) {
        console.error("Suspension exception:", error)
        res.status(500).json({ error: "Server error", message: "An unexpected error occurred" })
    }
}

/**
 * Unsuspend User (admin)
 */
exports.unsuspendUser = async (req, res) => {
    try {
        const { userId } = req.body

        if (!userId) {
            return res.status(400).json({ error: "Invalid input", message: "User ID is required" })
        }

        const { data: updatedUser, error } = await supabase
            .from("users")
            .update({ is_suspended: false, updated_at: new Date().toISOString() })
            .eq("id", userId)
            .select("id, name, email, role, is_suspended")

        if (error) {
            return res.status(500).json({ error: "Reactivation failed", message: "Failed to reactivate user" })
        }

        res.status(200).json({ message: "User reactivated successfully", user: updatedUser[0] })
    } catch (error) {
        console.error("Reactivation exception:", error)
        res.status(500).json({ error: "Server error", message: "An unexpected error occurred" })
    }
}

/**
 * Resend Verification Email
 */
exports.resendVerificationEmail = async (req, res) => {
    try {
        const { email } = req.body

        if (!email) {
            return res.status(400).json({ error: "Invalid input", message: "Email is required" })
        }

        const { data: user, error } = await supabase
            .from("users")
            .select("id, name, email, is_verified")
            .eq("email", email)
            .maybeSingle()

        // Avoid account enumeration
        if (error || !user) {
            return res.status(200).json({ message: "If an account exists, a verification link has been sent." })
        }

        if (user.is_verified) {
            return res.status(200).json({ message: "This account is already verified. You can log in now." })
        }

        const verificationToken = tokenUtils.generateVerificationToken()
        const tokenResult = await tokenUtils.storeVerificationToken(user.id, verificationToken)

        if (!tokenResult.success) {
            return res.status(500).json({ error: "Verification setup failed", message: "Failed to create verification token" })
        }

        const appUrl = process.env.APP_URL || "http://localhost:5000"
        const verificationUrl = `${appUrl}/verify-email?token=${verificationToken}`
        const emailResult = await emailService.sendVerificationEmail(user.email, user.name, verificationToken, appUrl)

        if (!emailResult.success) {
            console.error("Resend email error:", emailResult.error)
            return res.status(500).json({ error: "Email send failed", message: "Failed to send verification email. Please try again later." })
        }

        return res.status(200).json({
            message: "Verification email sent. Please check your inbox/spam folder."
        })
    } catch (error) {
        console.error("Resend verification exception:", error)
        return res.status(500).json({ error: "Server error", message: "An unexpected error occurred" })
    }
}

/**
 * Forgot Password — sends reset email
 */
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body

        if (!email) {
            return res.status(400).json({ error: "Invalid input", message: "Email is required" })
        }

        const { data: user } = await supabase
            .from("users")
            .select("id, name, email")
            .eq("email", email)
            .maybeSingle()

        // Always return generic message to avoid account enumeration
        if (!user) {
            return res.status(200).json({ message: "If an account with that email exists, a password reset link has been sent." })
        }

        // Generate a secure reset token and store with 1-hour expiry
        const resetToken = crypto.randomBytes(32).toString("hex")
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour

        // Upsert reset token (one token per user at a time)
        const { error: tokenError } = await supabase
            .from("password_reset_tokens")
            .upsert(
                { user_id: user.id, token: resetToken, expires_at: expiresAt, created_at: new Date().toISOString() },
                { onConflict: "user_id" }
            )

        if (tokenError) {
            console.error("Token store error:", tokenError)
            return res.status(500).json({ error: "Server error", message: "Failed to create reset token" })
        }

        const appUrl = process.env.APP_URL || "http://localhost:5000"
        const resetUrl = `${appUrl}/reset-password?token=${resetToken}`

        const emailResult = await emailService.sendPasswordResetEmail(user.email, user.name, resetToken, appUrl)

        if (!emailResult.success) {
            console.error("Reset email error:", emailResult.error)
            return res.status(500).json({ error: "Email send failed", message: "Failed to send password reset email." })
        }

        return res.status(200).json({
            message: "If an account with that email exists, a password reset link has been sent."
        })
    } catch (error) {
        console.error("forgotPassword exception:", error)
        return res.status(500).json({ error: "Server error", message: "An unexpected error occurred" })
    }
}

/**
 * Reset Password — validates token and sets new password
 */
exports.resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body

        if (!token || !password) {
            return res.status(400).json({ error: "Invalid input", message: "Token and new password are required" })
        }

        // Validate password strength
        const passwordCheck = validatePasswordStrength(password)
        if (!passwordCheck.isValid) {
            return res.status(400).json({ error: "Weak password", message: passwordCheck.message })
        }

        // Look up the reset token
        const { data: tokenRecord, error: tokenError } = await supabase
            .from("password_reset_tokens")
            .select("*")
            .eq("token", token)
            .single()

        if (tokenError || !tokenRecord) {
            return res.status(400).json({ error: "Invalid token", message: "Password reset link is invalid or has already been used." })
        }

        // Check expiry
        if (new Date() > new Date(tokenRecord.expires_at)) {
            return res.status(400).json({ error: "Token expired", message: "Password reset link has expired. Please request a new one." })
        }

        // Hash and update the password
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

        const { error: updateError } = await supabase
            .from("users")
            .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
            .eq("id", tokenRecord.user_id)

        if (updateError) {
            console.error("Password update error:", updateError)
            return res.status(500).json({ error: "Reset failed", message: "Failed to update password." })
        }

        // Delete the used token
        await supabase.from("password_reset_tokens").delete().eq("token", token)

        return res.status(200).json({ message: "Password reset successfully. You can now log in with your new password." })
    } catch (error) {
        console.error("resetPassword exception:", error)
        return res.status(500).json({ error: "Server error", message: "An unexpected error occurred" })
    }
}
