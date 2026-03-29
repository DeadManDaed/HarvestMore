// mobile/lib/supabase.jsx

import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import 'react-native-url-polyfill/auto';

// Adaptateur pour que Supabase utilise SecureStore sur Android/iOS
const ExpoSecureStoreAdapter = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

// Récupération des variables depuis le .env
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Sécurité : Vérification avant création du client
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "ERREUR CRITIQUE : Les variables Supabase sont introuvables. " +
    "Vérifiez votre fichier .env et relancez avec 'npx expo start -c'"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
