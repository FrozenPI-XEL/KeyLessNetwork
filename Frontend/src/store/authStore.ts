import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { getItem, setItem, deleteItemAsync } from "expo-secure-store";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils";
import { supabase } from "../hooks/supabase-client";

// Supabase Auth braucht eine E-Mail-Adresse. Die App erzeugt sie intern aus dem Benutzernamen
// (nie sichtbar, es wird nie eine Mail verschickt, "Confirm email" ist in Supabase aus).
// Hex-Kodierung, damit Umlaute und Sonderzeichen im Namen kein Problem sind.
export const usernameToEmail = (username: string) =>
  `${bytesToHex(utf8ToBytes(username.trim().toLowerCase()))}@kln-users.example.com`;

export const MAX_USERNAME_LENGTH = 24;

type UserState = {
  isLoggedIn: boolean;
  isadmin: boolean;
  username?: string;
  logIn: (username: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
  syncSession: () => Promise<void>;
};

export const useAuthStore = create(
  persist<UserState>(
    (set) => ({
      isLoggedIn: false,
      isadmin: false,
      username: undefined,

      logIn: async (username: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: usernameToEmail(username),
          password,
        });
        if (error || !data?.user) {
          throw new Error("Benutzername oder Passwort falsch");
        }

        const [profile, admin] = await Promise.all([
          supabase
            .from("kln_profiles")
            .select("username")
            .eq("user_id", data.user.id)
            .maybeSingle(),
          supabase.rpc("kln_is_admin"),
        ]);

        set({
          isLoggedIn: true,
          username: profile.data?.username ?? username.trim(),
          // Reine Anzeige-Information. Die echte Prüfung macht die Datenbank (RLS) bei jeder Anfrage.
          isadmin: admin.data === true,
        });
      },

      logOut: async () => {
        set(() => ({ isLoggedIn: false, isadmin: false, username: undefined }));
        try {
          await supabase.auth.signOut();
        } catch {
          /* lokal ist man bereits ausgeloggt */
        }
      },

      // Beim App-Start: Gibt es noch eine echte Sitzung? Wenn nicht, wird ausgeloggt.
      syncSession: async () => {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          set(() => ({
            isLoggedIn: false,
            isadmin: false,
            username: undefined,
          }));
          return;
        }
        const admin = await supabase.rpc("kln_is_admin");
        set({ isadmin: admin.data === true });
      },
    }),
    {
      name: "auth-store",
      storage: createJSONStorage(() => ({
        setItem,
        getItem,
        removeItem: deleteItemAsync,
      })),
    },
  ),
);
