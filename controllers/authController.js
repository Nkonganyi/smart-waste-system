// Production-grade authentication controller
const supabase = require("../config/supabase")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const emailService = require("../utils/emailService")
const tokenUtils = require("../utils/tokenUtils")

const SALT_ROUNDS = 12
const JWT_EXPIRY = "24h"

/**
 * User Registration
 * Creates a new user with hashed password and default role
 * Sends verification email with unique token
 */
exports.register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body

        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({
                error: "Invalid input",
                message: "Name, email, and password are required"
            })
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                error: "Invalid email",
                message: "Please provide a valid email address"
            })
        }

        // Check if user already exists
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
        if (password.length < 8) {
            return res.status(400).json({
                error: "Weak password",
                message: "Password must be at least 8 characters long"
            })
        }

        // Validate role
        const validRoles = ["citizen", "collector", "admin"]
        const userRole = role && validRoles.includes(role) ? role : "citizen"

        // Hash password
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

        // Create user in database
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
            console.error("Registration error - Full error object:", JSON.stringify(error, null, 2))
            console.error("Registration error - Details:", error.details)
            console.error("Registration error - Hint:", error.hint)
            console.error("Registration error - Code:", error.code)
            return res.status(500).json({
                error: "Registration failed",
                message: "Failed to create user account",
                debugInfo: process.env.NODE_ENV === 'development' ? {
                    dbError: error.message,
                    dbCode: error.code,
                    dbDetails: error.details,
                    dbHint: error.hint
                } : undefined
            })
        }

        const userId = newUser[0].id

        // Generate verification token
        const verificationToken = tokenUtils.generateVerificationToken()

        // Store verification token in database
        const tokenResult = await tokenUtils.storeVerificationToken(userId, verificationToken)

        if (!tokenResult.success) {
            console.error("Token storage error:", tokenResult.error)
            return res.status(500).json({
                error: "Verification setup failed",
                message: "Failed to create verification token"
            })
        }

        // Send verification email
        const appUrl = process.env.APP_URL || "http://localhost:3000"
        const emailResult = await emailService.sendVerificationEmail(
            email,
            name,
            verificationToken,
            appUrl
        )

        if (!emailResult.success) {
            console.error("Email send error:", emailResult.error)
            // Note: User is still created, but they won't be able to verify without email
            // In production, you might want to delete the user here or handle this differently
            return res.status(500).json({
                error: "Email send failed",
                message: "Failed to send verification email. Please check your email configuration.",
                userId: userId
            })
        }

        res.status(201).json({
            message: "User registered successfully. Please check your email to verify your account.",
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
 * Authenticates user and returns JWT token
 * Checks verification status and suspension before issuing token
 */
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                error: "Invalid input",
                message: "Email and password are required"
            })
        }

        // Fetch user from database
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

        // Check if account is suspended
        if (user.is_suspended) {
            return res.status(403).json({
                error: "Account suspended",
                message: "Your account has been suspended. Contact administrator for details."
            })
        }

        // Check if account is verified
        if (!user.is_verified) {
            return res.status(403).json({
                error: "Account not verified",
                message: "Please verify your email address before logging in"
            })
        }

        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.password_hash)

        if (!passwordMatch) {
            return res.status(401).json({
                error: "Invalid credentials",
                message: "Email or password is incorrect"
            })
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role,
                name: user.name
            },
            process.env.JWT_SECRET,
            { expiresIn: JWT_EXPIRY }
        )

        // Update last login timestamp
        await supabase
            .from("users")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", user.id)

        res.status(200).json({
            message: "Login successful",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
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
 * Logout
 * Invalidates the current token (client-side responsibility)
 */
exports.logout = async (req, res) => {
    try {
        res.status(200).json({
            message: "Logout successful",
            info: "Please clear the token from client storage"
        })
    } catch (error) {
        res.status(500).json({
            error: "Logout failed",
            message: "An error occurred during logout"
        })
    }
}

/**
 * Verify Email
 * Admin endpoint to mark email as verified
 */
exports.verifyEmail = async (req, res) => {
    try {
        const { userId } = req.body

        if (!userId) {
            return res.status(400).json({
                error: "Invalid input",
                message: "User ID is required"
            })
        }

        const { data: updatedUser, error } = await supabase
            .from("users")
            .update({
                is_verified: true,
                updated_at: new Date().toISOString()
            })
            .eq("id", userId)
            .select()

        if (error) {
            return res.status(500).json({
                error: "Verification failed",
                message: "Failed to verify email"
            })
        }

        res.status(200).json({
            message: "Email verified successfully",
            user: updatedUser[0]
        })
    } catch (error) {
        console.error("Email verification exception:", error)
        res.status(500).json({
            error: "Server error",
            message: "An unexpected error occurred"
        })
    }
}

/**
 * Verify Email Token
 * Public endpoint for users to verify their email using the token from the link
 * GET /auth/verify-email?token=<token>
 */
exports.verifyEmailToken = async (req, res) => {
    try {
        const { token } = req.query

        // Validate token parameter
        if (!token) {
            return res.status(400).json({
                error: "Invalid request",
                message: "Verification token is required"
            })
        }

        // Verify the token
        const tokenResult = await tokenUtils.verifyToken(token)

        if (!tokenResult.success) {
            return res.status(400).json({
                error: "Verification failed",
                message: tokenResult.error
            })
        }

        const userId = tokenResult.data.user_id

        // Update user as verified
        const { data: updatedUser, error: updateError } = await supabase
            .from("users")
            .update({
                is_verified: true,
                updated_at: new Date().toISOString()
            })
            .eq("id", userId)
            .select()

        if (updateError) {
            console.error("User update error:", updateError)
            return res.status(500).json({
                error: "Verification failed",
                message: "Failed to update user verification status"
            })
        }

        // Delete the verification token
        const deleteResult = await tokenUtils.deleteVerificationToken(token)

        if (!deleteResult.success) {
            console.error("Token deletion warning:", deleteResult.error)
            // Don't fail the request, token cleanup is not critical
        }

        res.status(200).json({
            message: "Email verified successfully! You can now log in.",
            user: {
                id: updatedUser[0].id,
                name: updatedUser[0].name,
                email: updatedUser[0].email,
                role: updatedUser[0].role,
                is_verified: updatedUser[0].is_verified
            }
        })
    } catch (error) {
        console.error("Email token verification exception:", error)
        res.status(500).json({
            error: "Server error",
            message: "An unexpected error occurred during verification"
        })
    }
}

/**
 * Suspend User
 * Admin endpoint to suspend a user account
 */
exports.suspendUser = async (req, res) => {
    try {
        const { userId } = req.body

        if (!userId) {
            return res.status(400).json({
                error: "Invalid input",
                message: "User ID is required"
            })
        }

        const { data: updatedUser, error } = await supabase
            .from("users")
            .update({
                is_suspended: true,
                updated_at: new Date().toISOString()
            })
            .eq("id", userId)
            .select()

        if (error) {
            return res.status(500).json({
                error: "Suspension failed",
                message: "Failed to suspend user"
            })
        }

        res.status(200).json({
            message: "User suspended successfully",
            user: updatedUser[0]
        })
    } catch (error) {
        console.error("Suspension exception:", error)
        res.status(500).json({
            error: "Server error",
            message: "An unexpected error occurred"
        })
    }
}

/**
 * Unsuspend User
 * Admin endpoint to reactivate a suspended user
 */
exports.unsuspendUser = async (req, res) => {
    try {
        const { userId } = req.body

        if (!userId) {
            return res.status(400).json({
                error: "Invalid input",
                message: "User ID is required"
            })
        }

        const { data: updatedUser, error } = await supabase
            .from("users")
            .update({
                is_suspended: false,
                updated_at: new Date().toISOString()
            })
            .eq("id", userId)
            .select()

        if (error) {
            return res.status(500).json({
                error: "Reactivation failed",
                message: "Failed to reactivate user"
            })
        }

        res.status(200).json({
            message: "User reactivated successfully",
            user: updatedUser[0]
        })
    } catch (error) {
        console.error("Reactivation exception:", error)
        res.status(500).json({
            error: "Server error",
            message: "An unexpected error occurred"
        })
    }
}