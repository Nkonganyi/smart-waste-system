require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableStructure() {
  console.log('\n========== CHECKING TABLE STRUCTURE ==========\n');
  
  try {
    // Get the structure by attempting select with all columns
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(0);  // 0 rows, just get column info
    
    if (error) {
      console.log(`Error: ${error.message}`);
    } else {
      console.log('✓ Users table columns:', Object.keys(data[0] || {}));
    }

    // Also try email_verification_tokens
    const { data: tokenData, error: tokenError } = await supabase
      .from('email_verification_tokens')
      .select('*')
      .limit(0);
    
    if (tokenError) {
      console.log(`Error: ${tokenError.message}`);
    } else {
      console.log('✓ Email tokens table columns:', Object.keys(tokenData[0] || {}));
    }

  } catch (err) {
    console.log('Error:', err.message);
  }

  console.log('\n========================================\n');
}

checkTableStructure();
