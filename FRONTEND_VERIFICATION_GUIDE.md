# Frontend Email Verification - Quick Reference

## Files Created/Modified

### New Files
- **`Frontend/verify-email.html`** - Email verification landing page

### Modified Files
- **`Frontend/js/auth.js`** - Updated register and login functions
- **`Frontend/register.html`** - Already configured (no changes needed)

---

## How It Works

### 1. User Registration Flow

**Step 1:** User fills registration form and submits
```
Frontend/register.html → register() → /api/auth/register
```

**Step 2:** Backend creates user and sends verification email
```
Backend: Sets is_verified = false
Backend: Generates token and sends email
Backend: Returns success message
```

**Step 3:** Frontend shows confirmation message
```javascript
Alert: "A verification link has been sent to your email..."
Redirects to login after 2 seconds
```

**Step 4:** User receives email with link
```
Email content includes:
http://localhost:3000/verify-email?token=XYZ123ABC...
```

### 2. Email Verification Flow

**Step 1:** User clicks verification link in email
```
Opens: http://localhost:3000/verify-email?token=ABC123XYZ
```

**Step 2:** Page automatically verifies token
```javascript
verify-email.html extracts token from URL
Makes request: GET /api/auth/verify-email?token=ABC123XYZ
```

**Step 3:** Backend verifies and updates user
```
Backend: Validates token
Backend: Sets is_verified = true
Backend: Deletes token
Returns success response
```

**Step 4:** Frontend shows success page
```
Display: ✓ Email Verified Successfully!
Buttons: "Go to Login" or "Back to Home"
```

### 3. Login Flow

**Normal Login:** User can login after email is verified

**If Email Not Verified:** Shows friendly message
```
"Please verify your email address before logging in.
Check your inbox for the verification link."
```

---

## Frontend Pages

### Register Page (`/register`)
- **File:** `Frontend/register.html`
- **Function:** `register()` in `js/auth.js`
- **Shows:** Registration form
- **On Success:** Displays email verification message

### Verification Page (`/verify-email`)
- **File:** `Frontend/verify-email.html`
- **Triggered:** User clicks email link
- **States:**
  - Loading: "Please wait while we verify..."
  - Success: "✓ Email Verified! Go to Login"
  - Error: Shows error message and options
  - No Token: Shows invalid link message

### Login Page (`/login` or `/index.html`)
- **File:** `Frontend/index.html`
- **Function:** `login()` in `js/auth.js`
- **Updated:** Shows error if email not verified

---

## Testing the Flow

### Test Registration & Verification

1. **Register a new user:**
   - Go to: `http://localhost:3000/register`
   - Fill form: Name, Email, Password, Role
   - Click "Create Account"
   - See message: "Check your email to verify your account"

2. **Check for verification email:**
   - Check email inbox (or console if using Ethereal Email)
   - Look for subject: "Verify Your Email Address - Smart Waste System"
   - Copy the verification link

3. **Verify email:**
   - Click the link from email OR
   - Paste URL: `http://localhost:3000/verify-email?token=<token>`
   - See: ✓ Email Verified Successfully!

4. **Login with verified account:**
   - Go to: `http://localhost:3000/login` (or `index.html`)
   - Email: the email you registered with
   - Password: the password you created
   - Click "Sign In"
   - Should redirect to dashboard (citizen/collector/admin)

### Test Error Cases

**1. Invalid Token:**
- Modify the token in the URL: `.../verify-email?token=invalid123`
- See error message: "Verification failed"

**2. No Token:**
- Visit: `http://localhost:3000/verify-email` (without token)
- See error message: "Invalid Verification Link"

**3. Expired Token:**
- Wait 24+ hours (or modify token expiry in tokenUtils.js)
- Try to verify
- See error: "Token has expired"

**4. Login Before Verification:**
- Register but don't verify email
- Try to login with those credentials
- See message: "Please verify your email address before logging in"

---

## API Endpoints Used

### Registration
```
POST /api/auth/register
Body: { name, email, password, role }
Response: { message, user, info }
```

### Email Verification
```
GET /api/auth/verify-email?token=<token>
Response: { message, user }
Errors: Invalid token, expired token
```

### Login
```
POST /api/auth/login
Body: { email, password }
Response: { token, user, role }
Errors: Invalid credentials, account not verified, suspended
```

---

## Configuration

### Email Provider Configuration
The email service is configured in the backend `.env` file:

```env
EMAIL_PROVIDER=smtp        # gmail, smtp, or development
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=your_api_key
EMAIL_FROM=noreply@yourapp.com
APP_URL=http://localhost:3000
```

### Frontend Settings
All frontend pages are static HTML/JavaScript:
- No environment variables needed
- `APP_URL` from backend is used in email link
- Frontend automatically adapts to backend responses

---

## Browser Compatibility

✅ Works on:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers

Features used:
- Fetch API
- URLSearchParams
- localStorage
- ES6+ JavaScript

---

## Troubleshooting

### Problem: "No verification email received"
**Solution:**
1. Check email spam folder
2. Verify EMAIL_USER and EMAIL_PASSWORD in .env
3. Check server console for email sending errors
4. Test email service: `npm run test-email`

### Problem: Verification link doesn't work
**Solution:**
1. Check token is correct (64 characters, hex)
2. Verify APP_URL in .env matches your domain
3. Check token expiration (24 hours)
4. Database table exists: `email_verification_tokens`

### Problem: Can't login after verification
**Solution:**
1. Verify user's `is_verified` = true in database
2. Check JWT_SECRET is set in .env
3. Verify token was deleted from `email_verification_tokens`
4. Check for any network errors

### Problem: Page styling looks broken
**Solution:**
1. Ensure `css/style.css` exists and loads properly
2. Check browser console for CSS file 404 errors
3. Verify file paths in HTML head section
4. Check CSS variables are defined

---

## Security Notes

✅ **Secured:**
- Token is 64-character random string
- Tokens expire after 24 hours
- Tokens are deleted after use (one-time use)
- Password hashed with bcrypt (12 rounds)
- Email format validated
- Password strength checked (8+ chars)
- User can't login without verification

⚠️ **Always:**
- Use HTTPS in production (not just HTTP)
- Regenerate API keys if exposed
- Keep JWT_SECRET confidential
- Monitor email delivery metrics
- Implement rate limiting on registration

---

## Future Enhancements

- [ ] Resend verification email button
- [ ] SMS verification option
- [ ] Social login integration
- [ ] Two-factor authentication
- [ ] Session timeout warnings
- [ ] Remember me functionality
- [ ] Email templates customization
- [ ] Password reset flow

---

## Support Files

### Backend Documentation
- `EMAIL_VERIFICATION_SETUP.md` - Detailed setup guide
- `EMAIL_VERIFICATION_API.md` - API endpoint documentation
- `EMAIL_VERIFICATION_IMPLEMENTATION.md` - Implementation overview
- `DATABASE_MIGRATIONS_EMAIL_VERIFICATION.sql` - Database schema

### Frontend
This file (you're reading it now!)

---

**Last Updated:** March 7, 2026
**Status:** ✅ Ready for Use
