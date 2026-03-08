require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function getSchema() {
  console.log('\n========== DATABASE SCHEMA ==========\n');
  
  try {
    // Try to use RPC or raw SQL through Supabase
    const { data, error } = await supabase
      .rpc('query_columns', { table_name: 'users' })
      .catch(() => null);
    
    if (data) {
      console.log('Users table columns:', data);
      return;
    }

    // Fallback: Try to insert with minimal fields and catch the error to see what's expected
    console.log('Attempting to insert and check error for column info...\n');
    
    const { error: insertError } = await supabase
      .from('users')
      .insert([{ email: 'test@test.com' }])
      .select();
    
    if (insertError) {
      console.log('Insert error (this tells us what columns exist):');
      console.log(`  Message: ${insertError.message}`);
      console.log(`  Code: ${insertError.code}`);
    }

    // Try getting all column info via REST info endpoint
    console.log('\n📋 Trying to fetch table metadata...');
    const response = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`);
    const metadata = await response.json();
    console.log('Available tables:', metadata);

  } catch (err) {
    console.log('Error:', err.message);
  }

  console.log('\n====================================\n');
}

getSchema();
