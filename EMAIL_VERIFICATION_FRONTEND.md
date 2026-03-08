# Email Verification - Frontend Integration Guide

## Overview
This guide shows how to integrate the email verification system into your frontend pages.

---

## 1. Register Page (`/register`)

### HTML Structure
```html
<div class="register-container">
  <h1>Create Account</h1>
  
  <form id="registerForm">
    <div class="form-group">
      <label for="name">Full Name</label>
      <input 
        type="text" 
        id="name" 
        name="name" 
        required
        placeholder="John Doe"
      />
    </div>

    <div class="form-group">
      <label for="email">Email Address</label>
      <input 
        type="email" 
        id="email" 
        name="email" 
        required
        placeholder="john@example.com"
      />
    </div>

    <div class="form-group">
      <label for="password">Password</label>
      <input 
        type="password" 
        id="password" 
        name="password" 
        required
        placeholder="Min 8 characters"
      />
      <small>Password must be at least 8 characters long</small>
    </div>

    <div class="form-group">
      <label for="role">Role</label>
      <select id="role" name="role">
        <option value="citizen">Citizen</option>
        <option value="collector">Waste Collector</option>
        <option value="admin">Administrator</option>
      </select>
    </div>

    <button type="submit" class="btn-primary">Create Account</button>
  </form>

  <div id="successMessage" class="alert alert-success" style="display: none;">
    <h3>Registration Successful!</h3>
    <p>
      A verification email has been sent to <strong id="confirmEmail"></strong>
    </p>
    <p>
      Please check your email and click the verification link within 24 hours 
      to activate your account.
    </p>
    <div class="tip">
      💡 <strong>Tip:</strong> Check your spam/junk folder if you don't see the email
    </div>
  </div>

  <div id="errorMessage" class="alert alert-error" style="display: none;">
    <h3>Registration Failed</h3>
    <p id="errorText"></p>
  </div>

  <p class="login-link">
    Already have an account? 
    <a href="/login">Sign in here</a>
  </p>
</div>
```

### JavaScript Handler
```javascript
document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = {
    name: document.getElementById('name').value,
    email: document.getElementById('email').value,
    password: document.getElementById('password').value,
    role: document.getElementById('role').value
  };

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });

    const data = await response.json();

    if (response.ok) {
      // Success
      document.getElementById('registerForm').style.display = 'none';
      document.getElementById('confirmEmail').textContent = formData.email;
      document.getElementById('successMessage').style.display = 'block';
      
      // Optional: Redirect after 5 seconds
      // setTimeout(() => window.location.href = '/login', 5000);
    } else {
      // Error
      document.getElementById('errorText').textContent = 
        data.message || 'Registration failed. Please try again.';
      document.getElementById('errorMessage').style.display = 'block';
    }
  } catch (error) {
    document.getElementById('errorText').textContent = 
      'Network error. Please check your connection.';
    document.getElementById('errorMessage').style.display = 'block';
  }
});
```

---

## 2. Verify Email Page (`/verify-email`)

### HTML Structure
```html
<div class="verify-email-container">
  <div id="verifyingState" class="verify-state">
    <div class="spinner"></div>
    <h2>Verifying Your Email...</h2>
    <p>Please wait while we verify your email address.</p>
  </div>

  <div id="successState" class="verify-state alert alert-success" style="display: none;">
    <div class="success-icon">✓</div>
    <h2>Email Verified Successfully!</h2>
    <p>
      Your email has been verified. You can now log in to your account.
    </p>
    <button class="btn-primary" onclick="window.location.href = '/login'">
      Go to Login
    </button>
  </div>

  <div id="errorState" class="verify-state alert alert-error" style="display: none;">
    <div class="error-icon">✗</div>
    <h2>Verification Failed</h2>
    <p id="errorMessage"></p>
    <div class="actions">
      <button class="btn-secondary" onclick="window.location.href = '/login'">
        Go to Login
      </button>
      <button class="btn-secondary" onclick="window.location.href = '/register'">
        Re-register
      </button>
    </div>
  </div>

  <div id="noTokenState" class="verify-state alert alert-warning" style="display: none;">
    <div class="warning-icon">⚠</div>
    <h2>Invalid Verification Link</h2>
    <p>
      No verification token found. The link may be incomplete or expired.
    </p>
    <div class="actions">
      <button class="btn-secondary" onclick="window.location.href = '/login'">
        Go to Login
      </button>
      <button class="btn-secondary" onclick="window.location.href = '/register'">
        Create New Account
      </button>
    </div>
  </div>
</div>
```

### JavaScript Handler
```javascript
// Handle email verification on page load
document.addEventListener('DOMContentLoaded', async () => {
  // Get token from URL
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  if (!token) {
    // No token provided
    document.getElementById('verifyingState').style.display = 'none';
    document.getElementById('noTokenState').style.display = 'block';
    return;
  }

  try {
    // Verify token
    const response = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
    const data = await response.json();

    // Hide loading state
    document.getElementById('verifyingState').style.display = 'none';

    if (response.ok) {
      // Success - show success message
      document.getElementById('successState').style.display = 'block';
      
      // Optional: Auto-redirect after 3 seconds
      setTimeout(() => {
        window.location.href = '/login';
      }, 3000);
    } else {
      // Error - show error message
      document.getElementById('errorMessage').textContent = 
        data.message || 'Verification failed. Please try again later.';
      document.getElementById('errorState').style.display = 'block';
    }
  } catch (error) {
    // Network error
    document.getElementById('verifyingState').style.display = 'none';
    document.getElementById('errorMessage').textContent = 
      'Network error. Please check your connection and try again.';
    document.getElementById('errorState').style.display = 'block';
  }
});
```

---

## 3. Login Page (Updated)

### HTML Changes
```html
<!-- Add error message for non-verified users -->
<form id="loginForm">
  <div class="form-group">
    <label for="email">Email Address</label>
    <input 
      type="email" 
      id="email" 
      name="email" 
      required
      placeholder="john@example.com"
    />
  </div>

  <div class="form-group">
    <label for="password">Password</label>
    <input 
      type="password" 
      id="password" 
      name="password" 
      required
      placeholder="Your password"
    />
  </div>

  <button type="submit" class="btn-primary">Sign In</button>
</form>

<div id="notVerifiedError" class="alert alert-warning" style="display: none;">
  <h3>Email Not Verified</h3>
  <p>
    Your account exists, but your email hasn't been verified yet.
  </p>
  <p>
    Please check your email for a verification link. 
    <a href="#" onclick="showResendForm()">Resend verification email?</a>
  </p>
</div>

<div id="generalError" class="alert alert-error" style="display: none;">
  <p id="errorText"></p>
</div>
```

### JavaScript Changes
```javascript
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
      // Success - store token and redirect
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Redirect to dashboard
      window.location.href = '/dashboard';
    } else if (response.status === 403 && data.error === 'Account not verified') {
      // User exists but email not verified
      document.getElementById('notVerifiedError').style.display = 'block';
      document.getElementById('generalError').style.display = 'none';
    } else {
      // Other error
      document.getElementById('errorText').textContent = 
        data.message || 'Login failed. Please try again.';
      document.getElementById('generalError').style.display = 'block';
      document.getElementById('notVerifiedError').style.display = 'none';
    }
  } catch (error) {
    document.getElementById('errorText').textContent = 
      'Network error. Please check your connection.';
    document.getElementById('generalError').style.display = 'block';
  }
});
```

---

## 4. API Integration Helper

### Create an API Module (`js/auth.js`)
```javascript
// Authentication API calls
const authAPI = {
  // Register new user
  register: async (name, email, password, role = 'citizen') => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role })
    });
    return response.json();
  },

  // Verify email with token
  verifyEmail: async (token) => {
    const response = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
    return response.json();
  },

  // Login
  login: async (email, password) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return response.json();
  },

  // Logout
  logout: async () => {
    const token = localStorage.getItem('authToken');
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    return response.json();
  },

  // Get stored token
  getToken: () => localStorage.getItem('authToken'),

  // Get stored user
  getUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  // Check if logged in
  isLoggedIn: () => !!localStorage.getItem('authToken')
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = authAPI;
}
```

### Usage in Other Pages
```javascript
// In any page that needs authentication
const token = authAPI.getToken();
const user = authAPI.getUser();

if (!authAPI.isLoggedIn()) {
  // Redirect to login
  window.location.href = '/login';
} else {
  // User is logged in
  console.log('Welcome', user.name);
}

// Make authenticated API calls
const response = await fetch('/api/reports', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

---

## 5. CSS Styling Examples

```css
/* Loading spinner */
.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #2ecc71;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 20px auto;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Verify states */
.verify-state {
  text-align: center;
  padding: 40px 20px;
  border-radius: 8px;
  max-width: 500px;
  margin: 50px auto;
}

.success-icon {
  font-size: 48px;
  color: #2ecc71;
  margin-bottom: 10px;
}

.error-icon {
  font-size: 48px;
  color: #e74c3c;
  margin-bottom: 10px;
}

.warning-icon {
  font-size: 48px;
  color: #f39c12;
  margin-bottom: 10px;
}

/* Alert styles */
.alert {
  padding: 15px;
  margin: 20px 0;
  border-radius: 4px;
  border-left: 4px solid;
}

.alert-success {
  background-color: #d4edda;
  border-color: #2ecc71;
  color: #155724;
}

.alert-error {
  background-color: #f8d7da;
  border-color: #e74c3c;
  color: #721c24;
}

.alert-warning {
  background-color: #fff3cd;
  border-color: #f39c12;
  color: #856404;
}

/* Button styles */
.btn-primary {
  background-color: #2ecc71;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.btn-primary:hover {
  background-color: #27ae60;
}

.btn-secondary {
  background-color: #95a5a6;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  margin: 5px;
}

.btn-secondary:hover {
  background-color: #7f8c8d;
}

/* Form styles */
.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.form-group small {
  display: block;
  margin-top: 5px;
  color: #666;
  font-size: 12px;
}
```

---

## 6. Error Handling

### Common Scenarios

```javascript
// Handle different error responses
if (response.status === 400) {
  // Bad request - validation error
  console.log('Invalid input:', data.message);
} else if (response.status === 403) {
  if (data.error === 'Account not verified') {
    // User not verified - show verification message
    showVerificationNeeded();
  } else if (data.error === 'Account suspended') {
    // User suspended - show suspension message
    showAccountSuspended();
  }
} else if (response.status === 409) {
  // Email already exists
  showEmailExists();
} else if (response.status === 500) {
  // Server error
  showServerError();
}
```

---

## 7. Testing Checklist

- [ ] Register page loads and submits correctly
- [ ] Verification email received in time
- [ ] Token in email link is valid
- [ ] Clicking verification link verifies the email
- [ ] Cannot login before email verification
- [ ] Can login after email verification
- [ ] Invalid/expired tokens show proper error
- [ ] All form validation works (email format, password length)
- [ ] Duplicate email registration blocked
- [ ] Network errors handled gracefully
- [ ] Mobile responsive design

---

## 8. Screenshots Layout

### Register Page
```
┌─────────────────────────────────┐
│         Create Account          │
├─────────────────────────────────┤
│ Full Name:  [text input]        │
│ Email:      [email input]       │
│ Password:   [password input]    │
│ Role:       [dropdown]          │
│                                 │
│     [Create Account Button]     │
│                                 │
│ Already registered? Sign in     │
└─────────────────────────────────┘
```

### Verify Email Page
```
✓ Email Verified Successfully!

Your email has been verified. 
You can now log in to your account.

     [Go to Login Button]
```

---

**Ready to integrate!** Start with the register page, then create the verify-email page, and finally update the login page.
