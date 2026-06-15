import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

let supabaseClient: any = null;

export const initSupabase = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase credentials not found in environment variables");
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseClient;
};

export const getSupabase = () => {
  if (!supabaseClient) {
    return initSupabase();
  }
  return supabaseClient;
};

// Lazy initialization
export const supabase = new Proxy({} as any, {
  get: (target, prop) => {
    const client = getSupabase();
    if (!client) {
      throw new Error(
        "Supabase not initialized. Make sure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set in your .env file"
      );
    }
    return client[prop as any];
  },
});
