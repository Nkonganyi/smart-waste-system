require('dotenv').config();
const emailService = require('./utils/emailService');

async function testEmailService() {
  console.log('\n========== EMAIL SERVICE TEST ==========\n');
  
  console.log('📋 Configuration Check:');
  console.log('  EMAIL_PROVIDER:', process.env.EMAIL_PROVIDER);
  console.log('  SMTP_HOST:', process.env.SMTP_HOST);
  console.log('  SMTP_PORT:', process.env.SMTP_PORT);
  console.log('  SMTP_SECURE:', process.env.SMTP_SECURE);
  console.log('  EMAIL_USER:', process.env.EMAIL_USER);
  console.log('  EMAIL_PASSWORD length:', process.env.EMAIL_PASSWORD ? process.env.EMAIL_PASSWORD.length : 'NOT SET');
  console.log('  EMAIL_FROM:', process.env.EMAIL_FROM);
  console.log('  APP_URL:', process.env.APP_URL);
  console.log('');

  // Test with a real token
  const testToken = 'test_token_' + Date.now();
  const testEmail = 'nkonganyiblec@gmail.com'; // Using your email
  
  console.log('📤 Sending test verification email...');
  console.log('  To:', testEmail);
  console.log('  Token:', testToken);
  console.log('');

  const result = await emailService.sendVerificationEmail(
    testEmail,
    'Test User',
    testToken,
    process.env.APP_URL
  );

  if (result.success) {
    console.log('✅ Email sent successfully!');
    console.log('  Message ID:', result.messageId);
  } else {
    console.log('❌ Email send failed!');
    console.log('  Error:', result.error);
  }

  console.log('\n========================================\n');
}

testEmailService();
