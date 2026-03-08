require('dotenv').config();
const http = require('http');

async function testRegistrationEndpoint() {
  console.log('\n========== REGISTRATION ENDPOINT TEST ==========\n');
  
  const testData = {
    name: 'Test User ' + Date.now(),
    email: `test_${Date.now()}@example.com`,
    password: 'TestPass123!',
    role: 'citizen'
  };

  console.log('📤 Sending registration request...');
  console.log('   Endpoint: http://localhost:5000/api/auth/register');
  console.log('   Payload:', JSON.stringify(testData, null, 2));
  console.log('');

  try {
    const response = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    const responseData = await response.json();
    
    console.log('📥 Response (HTTP ' + response.status + '):');
    console.log('   ', JSON.stringify(responseData, null, 2));
    console.log('');

    if (response.status === 201) {
      console.log('✅ Registration succeeded!');
      if (responseData.user?.id) {
        console.log('   User ID: ' + responseData.user.id);
        console.log('   Email: ' + responseData.user.email);
      }
    } else if (response.status >= 400) {
      console.log('❌ Registration failed!');
      console.log('   Error: ' + (responseData.error || 'Unknown error'));
      console.log('   Message: ' + (responseData.message || 'No message provided'));
    }

    // Now check if user was actually created in database
    console.log('\n📋 Checking if user was created in database...');
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', testData.email)
      .single();
    
    if (error) {
      console.log('❌ Database query error: ' + error.message);
    } else if (user) {
      console.log('✅ User found in database!');
      console.log('   ID: ' + user.id);
      console.log('   Name: ' + user.name);
      console.log('   Email: ' + user.email);
      console.log('   Verified: ' + user.is_verified);
    } else {
      console.log('❌ User NOT found in database!');
    }

    // Check if verification token was created
    if (user) {
      console.log('\n📋 Checking if verification token was created...');
      const { data: token, error: tokenError } = await supabase
        .from('email_verification_tokens')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (tokenError) {
        console.log('❌ Token query error: ' + tokenError.message);
      } else if (token) {
        console.log('✅ Verification token created!');
        console.log('   Token: ' + token.token.substring(0, 20) + '...');
        console.log('   Expires: ' + new Date(token.expires_at).toLocaleString());
      } else {
        console.log('❌ No verification token found!');
      }
    }

  } catch (err) {
    console.log('❌ Request failed: ' + err.message);
  }

  console.log('\n================================================\n');
}

testRegistrationEndpoint();
