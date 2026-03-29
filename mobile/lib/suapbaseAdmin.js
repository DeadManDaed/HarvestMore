// mobile/lib/supabaseAdmin.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://votreprojet.supabase.co';
const supabaseServiceKey = 'votre-clé-service-role'; // À garder SECRÈTE !

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});