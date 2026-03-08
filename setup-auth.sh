#!/bin/bash
# setup-auth.sh - Setup script for production authentication system

set -e  # Exit on error

echo "=========================================="
echo "Smart Waste System - Authentication Setup"
echo "=========================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "ERROR: .env file not found!"
    echo "Please copy .env.example to .env and configure your values:"
    echo ""
    echo "  cp .env.example .env"
    echo "  # Edit .env with your Supabase and JWT_SECRET values"
    echo ""
    exit 1
fi

# Verify required environment variables
echo "Checking environment variables..."
for var in SUPABASE_URL SUPABASE_KEY JWT_SECRET; do
    if ! grep -q "^$var=" .env; then
        echo "WARNING: $var is not set in .env"
    fi
done

echo "✓ Environment file found"
echo ""

# Check Node.js version
NODE_VERSION=$(node -v)
echo "Node.js version: $NODE_VERSION"
echo ""

# Check dependencies
echo "Checking dependencies..."
if ! npm list bcrypt > /dev/null 2>&1; then
    echo "Installing bcrypt..."
    npm install bcrypt
fi

if ! npm list jsonwebtoken > /dev/null 2>&1; then
    echo "Installing jsonwebtoken..."
    npm install jsonwebtoken
fi

echo "✓ All dependencies installed"
echo ""

# Instructions for database migration
echo "=========================================="
echo "NEXT STEPS:"
echo "=========================================="
echo ""
echo "1. Create/Update your database schema:"
echo "   - Open: https://app.supabase.com"
echo "   - Go to SQL Editor"
echo "   - Run the SQL from DATABASE_SCHEMA.md"
echo ""
echo "2. Test authentication endpoints:"
echo "   - Start the server: npm start or node server.js"
echo "   - Use Postman/Thunder Client to test:"
echo "     POST /api/auth/register"
echo "     POST /api/auth/login"
echo ""
echo "3. Update your frontend:"
echo "   - See AUTHENTICATION_GUIDE.md for implementation examples"
echo "   - Include JWT token in all API requests"
echo "   - Store token in sessionStorage or httpOnly cookie"
echo ""
echo "=========================================="
echo "Setup completed successfully!"
echo "=========================================="
