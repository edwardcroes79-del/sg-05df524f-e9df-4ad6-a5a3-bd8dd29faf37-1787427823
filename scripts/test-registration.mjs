import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Safely parse local environment variables
const envFile = fs.readFileSync('.env.local', 'utf8');
const getEnv = (key) => {
  const match = envFile.match(new RegExp(`${key}=(.*)`));
  return match ? match[1].replace(/['"]/g, '').trim() : null;
};

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase keys in .env.local');
  process.exit(1);
}

// Initialize standard client (No bypasses, strictly testing the real flow)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('\n======================================================');
console.log('   ARUBA ROYALTY STAMP: E2E REGISTRATION TESTER');
console.log('======================================================');
console.log('This script safely automates the creation of a test business using');
console.log('a unique email alias. This bypasses the email rate limit while');
console.log('keeping production security completely intact.\n');

rl.question('Enter your real base email address (e.g. 297plugins@gmail.com): ', async (baseEmail) => {
  if (!baseEmail || !baseEmail.includes('@')) {
    console.error('❌ Invalid email.');
    process.exit(1);
  }

  const timestamp = Date.now().toString().slice(-6);
  const [name, domain] = baseEmail.split('@');
  
  // The magic alias that prevents rate limiting
  const testEmail = `${name}+test${timestamp}@${domain}`;
  const password = 'TestPassword123!';

  console.log(`\n[1/4] Generating unique test alias: ${testEmail}`);
  console.log(`[2/4] Registering user with Supabase Auth...`);

  // 1. Sign up the user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: testEmail,
    password: password,
  });

  if (authError) {
    console.error('\n❌ Auth Error:', authError.message);
    process.exit(1);
  }

  console.log(`✅ User registered successfully. ID: ${authData.user.id}`);
  console.log(`[3/4] Creating 'pending' business profile...`);

  // 2. Insert the pending business (replicating the onboarding flow)
  const { data: bizData, error: bizError } = await supabase.from('businesses').insert({
    owner_id: authData.user.id,
    business_name: `Test Business ${timestamp}`,
    slug: `test-biz-${timestamp}`,
    status: 'pending',
    subscription_plan: 'starter',
    email: testEmail
  }).select().single();

  if (bizError) {
    console.error('\n❌ Business Creation Error:', bizError.message);
    process.exit(1);
  }

  console.log(`✅ Business profile created. Status: ${bizData.status}`);
  
  console.log(`\n======================================================`);
  console.log(`                 TEST CREDENTIALS`);
  console.log(`======================================================`);
  console.log(`Email:    ${testEmail}`);
  console.log(`Password: ${password}`);
  console.log(`\n======================================================`);
  console.log(`                 MANUAL NEXT STEPS`);
  console.log(`======================================================`);
  console.log(`1. Check the inbox for ${baseEmail}. You should receive the initial confirmation email.`);
  console.log(`2. Click the link in the email to confirm the account.`);
  console.log(`3. Log into the application as the Super Admin.`);
  console.log(`4. Go to Admin -> Businesses -> Pending and click 'Approve'.`);
  console.log(`5. Check the inbox for ${baseEmail} again. You should receive the custom 'Royalty Stamp' approval email.`);
  console.log(`6. Click the Dashboard link in that email to log in with the test credentials above.\n`);

  process.exit(0);
});