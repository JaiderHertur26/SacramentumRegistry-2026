import { createClient } from '@supabase/supabase-js';
const getRuntimeCredential = (key) => {
  if (typeof window === 'undefined') return '';
  const value = window.localStorage.getItem(key);
  return value ? value.trim() : '';
};

const getSupabaseUrl = () => {
  return (
    import.meta.env.VITE_SUPABASE_URL
    || getRuntimeCredential('supabase_url')
    || ''
  );
};

const getSupabaseAnonKey = () => {
  return (
    import.meta.env.VITE_SUPABASE_ANON_KEY
    || getRuntimeCredential('supabase_key')
    || ''
  );
};

const supabaseUrl = getSupabaseUrl();
const supabaseAnonKey = getSupabaseAnonKey();

const canInitializeClient = Boolean(supabaseUrl && supabaseAnonKey);

const customSupabaseClient = canInitializeClient
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export const isSupabaseConfigured = () => canInitializeClient;

export default customSupabaseClient;

export {
  customSupabaseClient,
  customSupabaseClient as supabase,
};