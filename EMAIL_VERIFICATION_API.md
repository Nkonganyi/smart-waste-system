# Email Verification API Documentation

## Overview
This document describes all email-related authentication endpoints in the Smart Waste System.

## Base URL
```
http://localhost:3000/api/auth
```

---

## Endpoints

### 1. Register User (with Email Verification)
**Endpoint:** `POST /register`

**Description:** Creates a new user account and sends a verification email.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "role": "citizen"
}
```

**Request Parameters:**
- `name` (string, required): User's full name
- `email` (string, required): User's email address (must be unique, valid format)
- `password` (string, required): Password (minimum 8 characters)
- `role` (string, optional): User role - "citizen", "collector", or "admin" (default: "citizen")

**Success Response (201):**
```json
{
  "message": "User registered successfully. Please check your email to verify your account.",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "citizen",
    "is_verified": false
  },
  "info": "A verification email has been sent to your email address. The link will expire in 24 hours."
}
```

**Error Responses:**
- `400` - Invalid input, weak password, or invalid email format
- `409` - Email already registered
- `500` - Server error or email send failure

**Example cURL:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123!",
    "role": "citizen"
  }'
```

---

### 2. Verify Email (Public - Token-based)
**Endpoint:** `GET /verify-email?token=<token>`

**Description:** Verifies user's email using the token from the verification email link.

**Query Parameters:**
- `token` (string, required): Verification token sent in email

**Success Response (200):**
```json
{
  "message": "Email verified successfully! You can now log in.",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "citizen",
    "is_verified": true
  }
}
```

**Error Responses:**
- `400` - Token missing, invalid, or expired
- `500` - Server error during verification

**Example cURL:**
```bash
curl -X GET "http://localhost:3000/api/auth/verify-email?token=abc123def456..."
```

**Frontend Implementation:**
```javascript
// In your verify-email page component
const params = new URLSearchParams(window.location.search);
const token = params.get('token');

if (!token) {
  alert('No verification token found');
  window.location.href = '/login';
}

fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
  .then(res => res.json())
  .then(data => {
    if (data.message) {
      alert('Email verified successfully! Redirecting to login...');
      setTimeout(() => window.location.href = '/login', 2000);
    }
  })
  .catch(err => {
    alert('Verification failed: ' + err.message);
  });
```

---

### 3. Login
**Endpoint:** `POST /login`

**Description:** Authenticates user and returns JWT token. **User must be verified to log in.**

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Success Response (200):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "citizen"
  }
}
```

**Error Responses:**
- `401` - Invalid email or password
- `403` - Account not verified or suspended
  ```json
  {
    "error": "Account not verified",
    "message": "Please verify your email address before logging in"
  }
  ```
- `500` - Server error

**Example cURL:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'
```

---

### 4. Verify Email (Admin - Manual Verification)
**Endpoint:** `POST /verify-email-admin`

**Description:** Admin endpoint to manually verify a user's email.

**Authentication:** Required (Bearer token)

**Authorization:** Admin role required

**Request Body:**
```json
{
  "userId": "123e4567-e89b-12d3-a456-426614174000"
}
```

**Request Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Success Response (200):**
```json
{
  "message": "Email verified successfully",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "citizen",
    "is_verified": true,
    ...
  }
}
```

**Error Responses:**
- `400` - User ID missing
- `401` - No token provided
- `403` - Insufficient permissions
- `500` - Server error

**Example cURL:**
```bash
curl -X POST http://localhost:3000/api/auth/verify-email-admin \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_jwt_token>" \
  -d '{
    "userId": "123e4567-e89b-12d3-a456-426614174000"
  }'
```

---

## Email Verification Flow Diagram

```
┌──────────────────────────────────────┐
│  User Registration (POST /register)  │
└────────────┬─────────────────────────┘
             │
             ├─► Validate input
             │
             ├─► Hash password
             │
             ├─► Create user (is_verified = false)
             │
             ├─► Generate verification token
             │
             ├─► Store token in DB (expires in 24h)
             │
             └─► Send verification email
                    │
                    └─► Email contains:
                        http://localhost:3000/verify-email?token=XYZ
                        │
                        └─► User clicks link
                            │
                            ├─► Browser requests GET /verify-email?token=XYZ
                            │
                            ├─► Server verifies token
                            │
                            ├─► Updates user (is_verified = true)
                            │
                            ├─► Deletes token from DB
                            │
                            └─► User can now login (POST /login)
```

---

## Token Details

### Verification Token
- **Type:** Cryptographic random token (256-bit hex string)
- **Length:** 64 characters
- **Expiration:** 24 hours from creation
- **Storage:** `email_verification_tokens` table
- **One per user:** Only one valid token per user at a time

### JWT Token (After Login)
- **Type:** JSON Web Token (JWT)
- **Expiration:** 24 hours
- **Payload contains:**
  - `id`: User ID
  - `email`: User email
  - `role`: User role
  - `name`: User name
- **Used for:** Protected routes authentication

---

## Environment Variables Required

```env
# Email Provider Configuration
EMAIL_PROVIDER=gmail|smtp|development
EMAIL_USER=your-email@example.com
EMAIL_PASSWORD=your-password
EMAIL_FROM=noreply@yourapp.com

# Application
APP_URL=http://localhost:3000

# Supabase (existing)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_key

# JWT (existing)
JWT_SECRET=your_jwt_secret
```

---

## Security Considerations

1. **Email Verification Required:** All new users must verify email before logging in
2. **Token Expiration:** Tokens expire after 24 hours
3. **One-time Use:** Tokens are deleted after successful verification
4. **Rate Limiting:** Consider implementing rate limiting on registration endpoint
5. **HTTPS Only:** Always use HTTPS in production
6. **No Token in URL Logs:** Verification links should not be logged in servers
7. **Email Validation:** Email format validated before sending

---

## Common Error Codes

| Code | Error | Cause |
|------|-------|-------|
| 400 | Invalid input | Missing required fields |
| 400 | Invalid token | Token doesn't exist or is malformed |
| 400 | Token has expired | Token is older than 24 hours |
| 401 | Invalid credentials | Wrong email or password |
| 403 | Account not verified | Email not verified yet |
| 403 | Account suspended | User account suspended by admin |
| 409 | Email already registered | Email already exists in system |
| 500 | Email send failed | SMTP/email service configuration error |

---

## Testing

### Test Registration & Verification Flow
```bash
# 1. Register a user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "TestPassword123",
    "role": "citizen"
  }'

# Response has user ID, save it

# 2. Get verification token from your email (or database)
# For Ethereal testing, check the console output

# 3. Verify email with token
curl -X GET "http://localhost:3000/api/auth/verify-email?token=<YOUR_TOKEN>"

# 4. Login with verified email
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123"
  }'
```

---

## Frontend Pages Needed

1. **Register Page** (`/register`)
   - Form for name, email, password, role
   - Submit to POST /api/auth/register
   - Show success message with instruction to check email

2. **Verification Page** (`/verify-email`)
   - Extract token from URL query parameter
   - Show loading indicator
   - Call GET /api/auth/verify-email?token=<token>
   - Show success/error message
   - Redirect to login on success

3. **Login Page** (`/login`)
   - Form for email, password
   - Submit to POST /api/auth/login
   - Store JWT token in localStorage
   - Redirect to dashboard on success

---

## Resend Email Feature (Future Enhancement)

Consider implementing:
```
POST /resend-verification-email
{
  "email": "john@example.com"
}
```

This would:
- Check if user exists and is not verified
- Generate new token
- Delete old token
- Send new verification email
- Implement rate limiting (e.g., 5 minutes between resends)
