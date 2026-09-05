import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mssyyuipnswzuwhwbudm.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zc3l5dWlwbnN3enV3aHdidWRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NTIzNzUsImV4cCI6MjA5NjIyODM3NX0.3zQUIAn-FCCPp50nFe8eP0qaaTZ7V5zHcUHO-9GEiEw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
