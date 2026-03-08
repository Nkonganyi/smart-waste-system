const nodemailer = require("nodemailer")

/**
 * Email Service Module
 * Handles all email sending functionality for the application
 */

// Configure transporter based on environment
let transporter

// Initialize email transporter on module load
const initializeTransporter = () => {
    if (transporter) return transporter

    // Support different email providers
    if (process.env.EMAIL_PROVIDER === "gmail") {
        transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        })
    } else if (process.env.EMAIL_PROVIDER === "smtp") {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: process.env.SMTP_SECURE === "true",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        })
    } else {
        // Default: use testing service (Ethereal) for development
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || "smtp.ethereal.email",
            port: process.env.SMTP_PORT || 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        })
    }

    return transporter
}

/**
 * Send verification email with unique token link
 * @param {string} userEmail - Recipient email address
 * @param {string} userName - User's name for personalization
 * @param {string} verificationToken - Unique token for email verification
 * @param {string} appUrl - Base URL of the application (e.g., http://localhost:3000)
 * @returns {Promise<Object>} Email send result
 */
exports.sendVerificationEmail = async (
    userEmail,
    userName,
    verificationToken,
    appUrl = process.env.APP_URL || "http://localhost:3000"
) => {
    try {
        const transport = initializeTransporter()

        // Create verification link
        const verificationLink = `${appUrl}/verify-email?token=${verificationToken}`

        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
            to: userEmail,
            subject: "Verify Your Email Address - Smart Waste System",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background-color: #2ecc71; padding: 20px; color: white; text-align: center;">
                        <h1>Welcome to Smart Waste System!</h1>
                    </div>
                    
                    <div style="padding: 20px; background-color: #f9f9f9;">
                        <p>Hi <strong>${userName}</strong>,</p>
                        
                        <p>Thank you for registering with our Smart Waste System. To complete your registration and start using the platform, please verify your email address by clicking the link below:</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${verificationLink}" style="background-color: #2ecc71; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                                Verify Email Address
                            </a>
                        </div>
                        
                        <p>Or copy and paste this link in your browser:</p>
                        <p style="word-break: break-all; background-color: #f0f0f0; padding: 10px; border-radius: 3px;">
                            ${verificationLink}
                        </p>
                        
                        <p style="color: #666;">
                            <strong>Note:</strong> This link will expire in 24 hours for security reasons.
                        </p>
                        
                        <p style="color: #999; font-size: 12px; margin-top: 30px;">
                            If you did not create this account, please ignore this email.
                        </p>
                    </div>
                    
                    <div style="padding: 20px; background-color: #333; color: white; text-align: center; font-size: 12px;">
                        <p>© 2026 Smart Waste System. All rights reserved.</p>
                    </div>
                </div>
            `,
            text: `
Welcome to Smart Waste System!

Hi ${userName},

Thank you for registering. To complete your registration, verify your email by visiting this link:

${verificationLink}

This link will expire in 24 hours.

If you did not create this account, please ignore this email.

© 2026 Smart Waste System
            `
        }

        const result = await transport.sendMail(mailOptions)
        console.log("Verification email sent successfully:", result.messageId)
        return { success: true, messageId: result.messageId }
    } catch (error) {
        console.error("Error sending verification email:", error)
        return { success: false, error: error.message }
    }
}

/**
 * Send password reset email
 * @param {string} userEmail - Recipient email address
 * @param {string} userName - User's name for personalization
 * @param {string} resetToken - Unique token for password reset
 * @param {string} appUrl - Base URL of the application
 * @returns {Promise<Object>} Email send result
 */
exports.sendPasswordResetEmail = async (
    userEmail,
    userName,
    resetToken,
    appUrl = process.env.APP_URL || "http://localhost:3000"
) => {
    try {
        const transport = initializeTransporter()

        const resetLink = `${appUrl}/reset-password?token=${resetToken}`

        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
            to: userEmail,
            subject: "Reset Your Password - Smart Waste System",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background-color: #e74c3c; padding: 20px; color: white; text-align: center;">
                        <h1>Password Reset Request</h1>
                    </div>
                    
                    <div style="padding: 20px; background-color: #f9f9f9;">
                        <p>Hi <strong>${userName}</strong>,</p>
                        
                        <p>We received a request to reset your password. Click the link below to set a new password:</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetLink}" style="background-color: #e74c3c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                                Reset Password
                            </a>
                        </div>
                        
                        <p style="color: #666;">
                            <strong>Note:</strong> This link will expire in 1 hour. If you did not request a password reset, please ignore this email.
                        </p>
                    </div>
                    
                    <div style="padding: 20px; background-color: #333; color: white; text-align: center; font-size: 12px;">
                        <p>© 2026 Smart Waste System. All rights reserved.</p>
                    </div>
                </div>
            `
        }

        const result = await transport.sendMail(mailOptions)
        console.log("Password reset email sent successfully:", result.messageId)
        return { success: true, messageId: result.messageId }
    } catch (error) {
        console.error("Error sending password reset email:", error)
        return { success: false, error: error.message }
    }
}

/**
 * Send generic email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} options.text - Plain text content
 * @returns {Promise<Object>} Email send result
 */
exports.sendEmail = async (options) => {
    try {
        const transport = initializeTransporter()

        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
            ...options
        }

        const result = await transport.sendMail(mailOptions)
        console.log("Email sent successfully:", result.messageId)
        return { success: true, messageId: result.messageId }
    } catch (error) {
        console.error("Error sending email:", error)
        return { success: false, error: error.message }
    }
}

/**
 * Test email transporter configuration
 * Useful for debugging email setup issues
 */
exports.testConnection = async () => {
    try {
        const transport = initializeTransporter()
        await transport.verify()
        console.log("Email service connected successfully")
        return { success: true }
    } catch (error) {
        console.error("Email service connection failed:", error)
        return { success: false, error: error.message }
    }
}

module.exports.initializeTransporter = initializeTransporter
