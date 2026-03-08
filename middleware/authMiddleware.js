const jwt = require("jsonwebtoken")

/**
 * Authenticate user by verifying JWT token
 * Extracts token from Authorization header and validates signature/expiration
 */
const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization

        if (!authHeader) {
            return res.status(401).json({
                error: "Unauthorized",
                message: "No token provided"
            })
        }

        // Extract token from "Bearer <token>" format
        const parts = authHeader.split(" ")
        if (parts.length !== 2 || parts[0] !== "Bearer") {
            return res.status(401).json({
                error: "Unauthorized",
                message: "Invalid token format. Use: Bearer <token>"
            })
        }

        const token = parts[1]

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET)
            req.user = decoded
            next()
        } catch (jwtError) {
            if (jwtError.name === "TokenExpiredError") {
                return res.status(401).json({
                    error: "Token expired",
                    message: "Your session has expired. Please login again."
                })
            }
            if (jwtError.name === "JsonWebTokenError") {
                return res.status(403).json({
                    error: "Invalid token",
                    message: "Token verification failed"
                })
            }
            throw jwtError
        }
    } catch (error) {
        console.error("Authentication error:", error)
        return res.status(500).json({
            error: "Authentication failed",
            message: "An unexpected error occurred during authentication"
        })
    }
}

/**
 * Authorize based on user roles
 * Middleware factory that returns a middleware function checking if user has required role
 */
const authorize = (allowedRoles = []) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    error: "Unauthorized",
                    message: "User information not found"
                })
            }

            if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
                return res.status(500).json({
                    error: "Server error",
                    message: "Route not properly configured"
                })
            }

            if (!allowedRoles.includes(req.user.role)) {
                return res.status(403).json({
                    error: "Forbidden",
                    message: `Access denied. Required role(s): ${allowedRoles.join(", ")}. Your role: ${req.user.role}`
                })
            }

            next()
        } catch (error) {
            console.error("Authorization error:", error)
            return res.status(500).json({
                error: "Authorization failed",
                message: "An unexpected error occurred during authorization"
            })
        }
    }
}

/**
 * Verify user ownership - ensures user can only access their own resources
 * Useful for getting user's own reports, notifications, etc.
 */
const verifyOwnership = (resourceFieldName = "userId") => {
    return (req, res, next) => {
        try {
            const resourceOwnerId = req.body[resourceFieldName] || req.query[resourceFieldName] || req.params[resourceFieldName]

            if (!req.user) {
                return res.status(401).json({
                    error: "Unauthorized",
                    message: "User information not found"
                })
            }

            // Admins can access any resource, others only their own
            if (req.user.role !== "admin" && req.user.id !== resourceOwnerId) {
                return res.status(403).json({
                    error: "Forbidden",
                    message: "You can only access your own resources"
                })
            }

            next()
        } catch (error) {
            console.error("Ownership verification error:", error)
            return res.status(500).json({
                error: "Verification failed",
                message: "An unexpected error occurred"
            })
        }
    }
}

/**
 * Check if user is the owner or has admin role
 * Middleware factory that returns a middleware checking ownership with admin override
 */
const requireOwnerOrAdmin = (idParamName = "id") => {
    return (req, res, next) => {
        try {
            const resourceId = req.params[idParamName] || req.body.id

            if (!req.user) {
                return res.status(401).json({
                    error: "Unauthorized",
                    message: "User information not found"
                })
            }

            // Check if user is admin or owner
            const isOwner = req.user.id === parseInt(resourceId)
            const isAdmin = req.user.role === "admin"

            if (!isOwner && !isAdmin) {
                return res.status(403).json({
                    error: "Forbidden",
                    message: "You do not have permission to access this resource"
                })
            }

            next()
        } catch (error) {
            console.error("Owner/Admin verification error:", error)
            return res.status(500).json({
                error: "Verification failed",
                message: "An unexpected error occurred"
            })
        }
    }
}

module.exports = {
    authenticate,
    authorize,
    verifyOwnership,
    requireOwnerOrAdmin
}