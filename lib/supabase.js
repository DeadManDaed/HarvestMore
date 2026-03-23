//lib/supabase.js

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';

const supabaseUrl = 'https://votreprojet.supabase.co'; // Remplacez par votre URL Supabase
const supabaseAnonKey = 'votre-clé-anon-publique';    // Remplacez par votre clé anon

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});