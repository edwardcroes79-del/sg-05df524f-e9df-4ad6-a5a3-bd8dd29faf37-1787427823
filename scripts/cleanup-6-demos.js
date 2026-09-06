const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const userIds = [
  'a93c9888-2c80-4ccd-a24a-8a4b8940e0c4',
  'a3059389-2131-4ddd-bab8-d051a1f555d4',
  '3575306c-c7d0-43da-be48-dc56ec6fe55a',
  'a6471d54-492c-4dc1-b07b-04a57d361968',
  '3cd0f3f0-486f-4aca-adcd-c1271fe187ff',
  '9f456cde-3ef0-4769-bb34-2d89be1aed44'
];

async function run() {
  try {
    for (const uid of userIds) {
      console.log(`\nProcessing user: ${uid}`);
      
      // 1. Process Business Owner Records
      const { data: businesses } = await supabase.from('businesses').select('id').eq('owner_id', uid);
      const businessIds = businesses?.map(b => b.id) || [];
      
      if (businessIds.length > 0) {
        console.log(`- Found Businesses: ${businessIds.length}`);
        await supabase.from('qr_codes').delete().in('business_id', businessIds);
        await supabase.from('rewards').delete().in('business_id', businessIds);
        await supabase.from('stamp_transactions').delete().in('business_id', businessIds);
        await supabase.from('customer_loyalty_cards').delete().in('business_id', businessIds);
        await supabase.from('loyalty_programs').delete().in('business_id', businessIds);
        await supabase.from('business_users').delete().in('business_id', businessIds);
        await supabase.from('businesses').delete().in('id', businessIds);
      }

      // 2. Process Customer Records
      const { data: customers } = await supabase.from('customers').select('id').eq('user_id', uid);
      const customerIds = customers?.map(c => c.id) || [];
      
      if (customerIds.length > 0) {
        console.log(`- Found Customers: ${customerIds.length}`);
        await supabase.from('rewards').delete().in('customer_id', customerIds);
        await supabase.from('stamp_transactions').delete().in('customer_id', customerIds);
        await supabase.from('customer_loyalty_cards').delete().in('customer_id', customerIds);
        await supabase.from('customers').delete().in('id', customerIds);
      }

      // 3. Process Staff / Other direct associations
      await supabase.from('business_users').delete().eq('user_id', uid);
      await supabase.from('profiles').delete().eq('id', uid).catch(() => {}); // catch if profiles table doesn't exist
      
      // 4. Delete the Auth User
      const { error: delErr } = await supabase.auth.admin.deleteUser(uid);
      if (delErr) {
        console.error(`- Error deleting auth user:`, delErr.message);
      } else {
        console.log(`- Permanently deleted Auth User`);
      }
    }
    
    console.log('\n--- VERIFICATION ---');
    const { data: verifyUsers } = await supabase.auth.admin.listUsers();
    const remaining = verifyUsers?.users.filter(u => userIds.includes(u.id)) || [];
    console.log(`Remaining targeted auth users: ${remaining.length}`);
    if (remaining.length === 0) {
      console.log('SUCCESS: All specified demo accounts are completely removed.');
    }
  } catch(e) {
    console.error(e);
  }
}

run();