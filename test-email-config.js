/**
 * Email Configuration Diagnostic Tool
 * Run this to test your email setup: node test-email-config.js
 */

require("dotenv").config()
const emailService = require("./utils/emailService")

console.log("\n========== EMAIL CONFIGURATION DIAGNOSTIC ==========\n")

// Check environment variables
console.log("📋 Current Configuration:")
console.log(`  EMAIL_PROVIDER: ${process.env.EMAIL_PROVIDER}`)
console.log(`  EMAIL_USER: ${process.env.EMAIL_USER}`)
console.log(`  EMAIL_PASSWORD: ${process.env.EMAIL_PASSWORD ? '✓ Set' : '❌ NOT SET'}`)
console.log(`  EMAIL_FROM: ${process.env.EMAIL_FROM}`)
console.log(`  APP_URL: ${process.env.APP_URL}`)

if (process.env.EMAIL_PROVIDER === "smtp") {
    console.log(`  SMTP_HOST: ${process.env.SMTP_HOST}`)
    console.log(`  SMTP_PORT: ${process.env.SMTP_PORT}`)
    console.log(`  SMTP_SECURE: ${process.env.SMTP_SECURE}`)
}

console.log("\n⚠️  Issues Found:")

const issues = []

if (!process.env.EMAIL_USER) {
    issues.push("❌ EMAIL_USER is not set")
}
if (!process.env.EMAIL_PASSWORD) {
    issues.push("❌ EMAIL_PASSWORD is not set (currently empty/masked)")
}
if (!process.env.EMAIL_FROM) {
    issues.push("❌ EMAIL_FROM is not set")
}
if (!process.env.APP_URL) {
    issues.push("⚠️  APP_URL not set (using default: http://localhost:3000)")
}

if (issues.length > 0) {
    issues.forEach(issue => console.log(`  ${issue}`))
} else {
    console.log("  ✓ All environment variables are set")
}

console.log("\n🧪 Testing Email Connection...\n")

// Test email connection
emailService.testConnection().then(result => {
    if (result.success) {
        console.log("✅ Email service connected successfully!")
        console.log("\n✅ You should be able to send emails now.")
        console.log("\n📧 To test sending an email, you can:")
        console.log("   1. Register a new account on the website")
        console.log("   2. Check your email for the verification link")
    } else {
        console.log("❌ Email service connection failed!")
        console.log(`   Error: ${result.error}`)
        console.log("\n🔧 Troubleshooting steps:")
        console.log("   1. Check your EMAIL_USER is correct")
        console.log("   2. Check your EMAIL_PASSWORD is correct")
        console.log("   3. For SendGrid: Use 'apikey' as user, your API key as password")
        console.log("   4. For Gmail: Use your email, then App-Specific Password")
        console.log("   5. For testing: Use Ethereal Email (free testing service)")
    }
}).catch(error => {
    console.log("❌ Error testing connection:", error.message)
    console.log("\n🔧 Make sure your .env file is properly configured")
})

console.log("\n📚 Setup Options:")
console.log("\n1️⃣  SENDGRID (Production)")
console.log("   Set in .env:")
console.log("   EMAIL_PROVIDER=smtp")
console.log("   EMAIL_USER=apikey")
console.log("   EMAIL_PASSWORD=<your_sendgrid_api_key>")
console.log("   SMTP_HOST=smtp.sendgrid.net")
console.log("   SMTP_PORT=587")

console.log("\n2️⃣  GMAIL (Easy)")
console.log("   Set in .env:")
console.log("   EMAIL_PROVIDER=gmail")
console.log("   EMAIL_USER=your-email@gmail.com")
console.log("   EMAIL_PASSWORD=<your_app_specific_password>")
console.log("   (Create App Password: myaccount.google.com/apppasswords)")

console.log("\n3️⃣  ETHEREAL EMAIL (Free Testing - Development Only)")
console.log("   Set in .env:")
console.log("   EMAIL_PROVIDER=development")
console.log("   EMAIL_USER=<ethereal_test_email@ethereal.email>")
console.log("   EMAIL_PASSWORD=<ethereal_test_password>")
console.log("   (Generate free at: https://ethereal.email)")

console.log("\n================================================\n")
