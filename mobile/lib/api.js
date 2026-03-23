//mobile/lib/api.js

import { supabase } from './supabase';

export const loginWithIdentifier = async (identifier, password) => {
  const { data, error } = await supabase.functions.invoke('login-with-identifier', {
    body: { identifier, password },
  });
  if (error) throw error;
  return data;
};