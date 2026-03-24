//mobile/lib/supabase.jsx

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';

const supabaseUrl = 'https://qhmgrjeqdsvzetznctyn.supabase.co';   // remplacez par votre URL
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFobWdyamVxZHN2emV0em5jdHluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODczMDgsImV4cCI6MjA4OTg2MzMwOH0.uWOViz7bOVoqIZfqmT0LVI-RIBnDXmOr-prn_SuruUo';  
/* const 

EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_s7ri3I6GJ8qsShfAmJYXIg_hD5NntMS
*/       

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});