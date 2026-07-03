const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

async function wipeDatabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase URL or Service Role Key');
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    console.log('Connecting via Supabase JS client to wipe data...');

     const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;

    console.log(`Found ${users.users.length} users. Deleting...`);
    for (const user of users.users) {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
      if (deleteError) {
        console.error(`Error deleting user ${user.id}:`, deleteError.message);
      } else {
        console.log(`Deleted user ${user.id}`);
      }
    }

    // 2. Try to empty major tables manually just in case
    const tables = [
      'messages',
      'instagram_accounts',
      'instagram_posts',
      'knowledge_sources',
      'escalation_rules',
      'orders',
      'customers',
      'profiles'
    ];

    for (const table of tables) {
      const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000'); // hack to delete all rows
      // another hack for tables without 'id' column is to delete where something else is not null, but id is common.
      if (error) {
        console.log(`Skipped clearing table ${table}:`, error.message);
      } else {
        console.log(`Cleared table ${table}`);
      }
    }

    console.log('✅ Database wiped successfully.');
  } catch (error) {
    console.error('Failed to wipe database:', error.message || error);
  }
}

wipeDatabase();
