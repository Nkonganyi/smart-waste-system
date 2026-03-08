require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabase() {
  console.log('\n========== DETAILED DATABASE DIAGNOSTIC ==========\n');
  
  try {
    // Step 1: List all tables
    console.log('📋 Step 1: Checking available tables...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (tablesError) {
      console.log('Cannot query information_schema, trying direct table access...\n');
    } else {
      console.log('✓ Available tables:');
      tables.forEach(t => console.log(`  - ${t.table_name}`));
    }

    // Step 2: Test users table
    console.log('\n📋 Step 2: Testing USERS table...');
    const { data: usersCheck, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (usersError) {
      console.log(`❌ Users table error: ${usersError.message}`);
      console.log(`   Code: ${usersError.code}`);
      console.log(`   Status: ${usersError.status}`);
    } else {
      console.log(`✓ Users table exists and is readable`);
    }

    // Step 3: Test email_verification_tokens table
    console.log('\n📋 Step 3: Testing EMAIL_VERIFICATION_TOKENS table...');
    const { data: tokensCheck, error: tokensError } = await supabase
      .from('email_verification_tokens')
      .select('*')
      .limit(1);
    
    if (tokensError) {
      console.log(`❌ Tokens table error: ${tokensError.message}`);
      console.log(`   Code: ${tokensError.code}`);
      console.log(`   Status: ${tokensError.status}`);
    } else {
      console.log(`✓ Tokens table exists and is readable`);
    }

    // Step 4: Test insert to users table
    console.log('\n📋 Step 4: Testing INSERT into users table...');
    const testUser = {
      name: 'Test User',
      email: `test_${Date.now()}@example.com`,
      password_hash: 'test_hash_' + Date.now(),
      role: 'citizen',
      is_verified: false,
      is_suspended: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: insertData, error: insertError } = await supabase
      .from('users')
      .insert([testUser])
      .select();
    
    if (insertError) {
      console.log(`❌ Insert failed!`);
      console.log(`   Message: ${insertError.message}`);
      console.log(`   Code: ${insertError.code}`);
      console.log(`   Status: ${insertError.status}`);
      console.log(`   Details: ${JSON.stringify(insertError.details || 'N/A')}`);
      console.log(`   Hint: ${insertError.hint || 'N/A'}`);
    } else {
      console.log(`✓ Insert successful!`);
      console.log(`   Created: ${JSON.stringify(insertData)}`);
    }

    // Step 5: Check user count
    console.log('\n📋 Step 5: Checking total users in database...');
    const { data: allUsers, error: countError } = await supabase
      .from('users')
      .select('*', { count: 'exact' });
    
    if (countError) {
      console.log(`❌ Count error: ${countError.message}`);
    } else {
      console.log(`✓ Total users in database: ${allUsers.length}`);
    }

  } catch (err) {
    console.log('❌ Unexpected error:', err.message);
  }

  console.log('\n================================================\n');
}

testDatabase();
