// mobile/lib/supabaseAdmin.js

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
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFobWdyamVxZHN2emV0em5jdHluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDI4NzMwOCwiZXhwIjoyMDg5ODYzMzA4fQ.S8x6MApla1EDzy_UvBvO0FRRgQ_lcuA0t0TIJGNDy8c';


export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});