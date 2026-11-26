import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppState } from "react-native";
import { secureSessionStorage } from "../lib/secure-storage";
import type { Database } from "../types/database";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase ist nicht konfiguriert: EXPO_PUBLIC_SUPABASE_URL und EXPO_PUBLIC_SUPABASE_ANON_KEY in Frontend/.env.local eintragen.",
  );
}

// Typisierter Client: Tabellen, Spalten und RPC-Funktionen kommen aus src/types/database.ts.
// Ein Tippfehler wie .from("kln_locker") oder .select("nmae") fällt so schon bei `tsc` auf.
// Die Sitzung (inkl. Refresh-Token) liegt verschlüsselt im SecureStore, siehe lib/secure-storage.ts.
export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage: secureSessionStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

// Token nur erneuern, solange die App im Vordergrund ist.
AppState.addEventListener("change", (state) => {
  if (state === "active") supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
