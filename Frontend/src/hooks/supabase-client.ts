import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

let supabaseClient: any = null;
let appStateListenerAdded = false;

export const initSupabase = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase credentials not found in environment variables");
    return null;
  }

  if (!supabaseClient) {
    // Der Login (Session) wird auf dem Gerät gespeichert und automatisch erneuert.
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });

    // Token nur erneuern, solange die App im Vordergrund ist.
    if (!appStateListenerAdded) {
      appStateListenerAdded = true;
      AppState.addEventListener("change", (state) => {
        if (!supabaseClient) return;
        if (state === "active") supabaseClient.auth.startAutoRefresh();
        else supabaseClient.auth.stopAutoRefresh();
      });
    }
  }
  return supabaseClient;
};

export const getSupabase = () => {
  if (!supabaseClient) {
    return initSupabase();
  }
  return supabaseClient;
};

export const supabase = new Proxy({} as any, {
  get: (_target, prop) => {
    const client = getSupabase();
    if (!client) {
      throw new Error(
        "Supabase not initialized. Make sure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set in your .env file",
      );
    }
    return client[prop as any];
  },
});
