# Email Verification System Setup Guide

## Database Schema

First, create the `email_verification_tokens` table in Supabase. Run this SQL query in your Supabase SQL editor:

```sql
-- Create email_verification_tokens table
CREATE TABLE email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
CREATE INDEX idx_email_verification_tokens_token ON email_verification_tokens(token);
CREATE INDEX idx_email_verification_tokens_expires_at ON email_verification_tokens(expires_at);

-- Enable Row Level Security (RLS) if needed
ALTER TABLE email_verification_tokens ENABLE ROW LEVEL SECURITY;
```

## Environment Variables (.env)

Add the following variables to your `.env` file:

### Supabase Configuration (Already existing)
```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
JWT_SECRET=your_jwt_secret
```

### Email Configuration (New)

**Option 1: Gmail (Easy for testing)**
```
EMAIL_PROVIDER=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-gmail-app-password
EMAIL_FROM=your-email@gmail.com
APP_URL=http://localhost:3000
```

For Gmail:
1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use the 16-character app password in `EMAIL_PASSWORD`

**Option 2: Custom SMTP Server (e.g., SendGrid, Mailgun, AWS SES)**
```
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_USER=your-username
EMAIL_PASSWORD=your-password
EMAIL_FROM=noreply@yourdomain.com
APP_URL=http://localhost:3000
```

**Option 3: Ethereal Email (Testing Only - Auto-generated)**
```
EMAIL_PROVIDER=development
EMAIL_USER=your-ethereal-email@ethereal.email
EMAIL_PASSWORD=your-ethereal-password
APP_URL=http://localhost:3000
```

To get Ethereal credentials:
```bash
npm run generate-ethereal-credentials
```

## Installation & Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy example below to your `.env` file and fill in your actual values:
```bash
cp .env.example .env
```

### 3. Set Up Database
Run the SQL schema above in your Supabase console.

### 4. Install NPM Packages
```bash
npm install nodemailer
```

### 5. Test Email Configuration (Optional)
```bash
node -e "const emailService = require('./utils/emailService'); emailService.testConnection().then(r => console.log(r));"
```

## Usage

### Registration Flow
1. User registers with email and password:
```bash
POST /api/auth/register
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "role": "citizen"
}
```

2. System automatically:
   - Creates user with `is_verified: false`
   - Generates unique verification token
   - Stores token in `email_verification_tokens` table
   - Sends verification email with link

3. Email contains verification link:
```
http://localhost:3000/verify-email?token=<unique-token>
```

### Email Verification
User clicks verification link or makes request:
```bash
GET /api/auth/verify-email?token=<unique-token>
```

Response on success:
```json
{
  "message": "Email verified successfully! You can now log in.",
  "user": {
    "id": "user-id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "citizen",
    "is_verified": true
  }
}
```

### Login After Verification
```bash
POST /api/auth/login
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

Login will fail with error message if user is not verified.

## Frontend Integration

### Register Form
Create a registration form that:
1. Collects name, email, password, role
2. Posts to `/api/auth/register`
3. Shows message: "Please check your email to verify your account"
4. Optionally shows link to resend verification email

### Verification Page
Create a verification page (`/verify-email`):
1. Extracts token from URL query parameter
2. Displays loading state
3. Makes GET request to `/api/auth/verify-email?token=<token>`
4. Shows success message or error
5. Redirects to login page on success

Example frontend code:
```javascript
// Get token from URL
const params = new URLSearchParams(window.location.search);
const token = params.get('token');

if (token) {
  fetch(`/api/auth/verify-email?token=${token}`)
    .then(res => res.json())
    .then(data => {
      if (data.message) {
        alert('Email verified! You can now log in.');
        window.location.href = '/login';
      }
    })
    .catch(err => alert('Verification failed: ' + err.message));
}
```

## Security Considerations

1. **Token Expiration**: Tokens expire in 24 hours (configurable)
2. **Token Uniqueness**: Each token is cryptographically random and unique
3. **One Token Per User**: Only one valid token can exist per user at a time
4. **Production Email**: Use proper email service in production (SendGrid, AWS SES, etc.)
5. **HTTPS Only**: Always use HTTPS in production for verification links
6. **Rate Limiting**: Consider adding rate limiting to registration and resend endpoints

## Troubleshooting

### Email Not Sending
1. Check env variables are set correctly
2. Test connection: `npm run test-email`
3. Check server console for detailed error messages
4. For Gmail: Ensure App Password (not regular password) is used
5. For SMTP: Test connection on SMTP host

### Token Issues
1. Check token expiration time
2. Verify token exists in database
3. Ensure token format is correct (32 bytes hex)

### Database Error
1. Ensure `email_verification_tokens` table exists
2. Check user table has `is_verified` column
3. Verify database permissions allow INSERT/UPDATE/DELETE

## Admin Verification (Optional)

For admin to manually verify users:
```bash
POST /api/auth/verify-email-admin
Headers: Authorization: Bearer <admin-token>
{
  "userId": "user-id"
}
```

## Future Enhancements

- [ ] Resend verification email endpoint
- [ ] Resend email rate limiting
- [ ] Email verification required flag per organization
- [ ] Custom email templates per role
- [ ] Verification email analytics
- [ ] SMS verification option
