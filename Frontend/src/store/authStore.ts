import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { getItem, setItem, deleteItemAsync } from "expo-secure-store";
import { supabase } from "../hooks/supabase-client";

type UserState = {
  isLoggedIn: boolean;
  isadmin: boolean;
  username?: string;
  logIn: (username: string) => Promise<void>;
  logOut: () => void;
};

export const useAuthStore = create(
  persist<UserState>(
    (set) => ({
      isLoggedIn: false,
      isadmin: false,
      username: undefined,

      logIn: async (username: string) => {
        try {
          console.log("🔍 Login attempt with username:", username);

          // Fetch user from codes table
          const { data, error } = await supabase
            .from("codes")
            .select("username, Role")
            .eq("username", username)
            .single();

          if (error || !data) {
            console.error("❌ User not found:", error);
            throw new Error("User nicht gefunden");
          }

          console.log("✅ User found:", data);

          // Set state with Role from database
          set({
            isLoggedIn: true,
            username: data.username,
            isadmin: data.Role === true, // Role true = isadmin true, Role false = isadmin false
          });

          console.log("✅ Login successful!");
        } catch (err) {
          console.error("❌ Login error:", err);
          throw err;
        }
      },

      logOut: () =>
        set(() => ({
          isLoggedIn: false,
          isadmin: false,
          username: undefined,
        })),
    }),
    {
      name: "auth-store",
      storage: createJSONStorage(() => ({
        setItem,
        getItem,
        removeItem: deleteItemAsync,
      })),
    }
  )
);
