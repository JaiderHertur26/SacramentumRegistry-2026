import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fqgbyhgquhdamhbwvdbt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxZ2J5aGdxdWhkYW1oYnd2ZGJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNzM5MzMsImV4cCI6MjA4Njc0OTkzM30.866ryiVcDQ_LjI4wlcyASfEExfQiRaJ1QVyZIR-sU3w';

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

export { 
    customSupabaseClient,
    customSupabaseClient as supabase,
};
