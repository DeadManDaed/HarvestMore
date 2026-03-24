//mobile/lib/supabase.jsx

import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import 'react-native-url-polyfill/auto';

// Adaptateur pour que Supabase utilise SecureStore
const ExpoSecureStoreAdapter = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

       
const supabaseUrl = 'https://qhmgrjeqdsvzetznctyn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFobWdyamVxZHN2emV0em5jdHluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODczMDgsImV4cCI6MjA4OTg2MzMwOH0.uWOViz7bOVoqIZfqmT0LVI-RIBnDXmOr-prn_SuruUo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});