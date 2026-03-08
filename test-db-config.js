/**
 * Database Connection Diagnostic
 * Run this to test your Supabase connection: node test-db-config.js
 */

require("dotenv").config()
const { createClient } = require("@supabase/supabase-js")

console.log("\n========== DATABASE CONFIGURATION DIAGNOSTIC ==========\n")

// Check environment variables
console.log("📋 Current Configuration:")
console.log(`  SUPABASE_URL: ${process.env.SUPABASE_URL}`)
console.log(`  SUPABASE_KEY: ${process.env.SUPABASE_KEY}`)
console.log(`  JWT_SECRET: ${process.env.JWT_SECRET ? '✓ Set' : '❌ NOT SET'}`)

// Check key type
const keyType = process.env.SUPABASE_KEY?.split("_")[1] || "unknown"
console.log(`\n🔑 API Key Type: ${keyType}`)

console.log("\n⚠️  Issues Found:")

const issues = []

if (!process.env.SUPABASE_URL) {
    issues.push("❌ SUPABASE_URL is not set")
}

if (!process.env.SUPABASE_KEY) {
    issues.push("❌ SUPABASE_KEY is not set")
}

if (keyType === "publishable") {
    issues.push("⚠️  CRITICAL: You're using 'sb_publishable_...' key")
    issues.push("    This key has LIMITED permissions and cannot create/update/delete data")
    issues.push("    You need the 'sb_service_...' (SERVICE ROLE) key instead")
    issues.push("")
    issues.push("    To get the correct key:")
    issues.push("    1. Go to: https://app.supabase.com → Your Project → Settings")
    issues.push("    2. Click 'API'")
    issues.push("    3. Copy the 'service_role' key (starts with 'sb_service_')")
    issues.push("    4. Replace SUPABASE_KEY in .env")
}

if (issues.length > 0) {
    issues.forEach(issue => console.log(`  ${issue}`))
} else {
    console.log("  ✓ Configuration looks correct")
}

console.log("\n🧪 Testing Database Connection...\n")

// Test connection
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
)

// Try to query users table
supabase
    .from("users")
    .select("count", { count: "exact", head: true })
    .then(response => {
        if (response.error) {
            console.log("❌ Database query failed!")
            console.log(`   Error: ${response.error.message}`)
            console.log(`   Code: ${response.error.code}`)

            if (response.error.code === "PGRST116") {
                console.log("\n   💡 This usually means:")
                console.log("   - Table permissions are restricted (using public/publishable key)")
                console.log("   - You need to use the service_role key instead")
            }
        } else {
            console.log("✅ Database connection successful!")
            console.log(`   Users table count: ${response.count}`)
            console.log("\n✅ Your Supabase connection is working!")
        }
    })
    .catch(error => {
        console.log("❌ Connection error:", error.message)
    })

console.log("\n📚 How to Fix:")
console.log("\n1. Open your Supabase project: https://app.supabase.com")
console.log("2. Go to: Settings → API → Project API keys")
console.log("3. Copy the 'service_role' key (NOT 'anon' or 'public')")
console.log("4. Paste into .env file:")
console.log("   SUPABASE_KEY=<paste_service_role_key_here>")
console.log("5. Restart your server:")
console.log("   npm start")
console.log("6. Test registration again")

console.log("\n⚠️  WARNING: SERVICE_ROLE KEY")
console.log("The service_role key has FULL permissions.")
console.log("✓ Keep it SAFE and only use on backend")
console.log("✗ NEVER share it or commit it to git")
console.log("✗ NEVER use it on frontend")

console.log("\n================================================\n")
