import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { getItem, setItem, deleteItemAsync } from "expo-secure-store";

type UserState = {
  isLoggedIn: boolean;
  isadmin: boolean;
  username?: string;
  logIn: (username: string, isadmin: boolean) => void;
  logOut: () => void;
};

export const useAuthStore = create(
  persist<UserState>(
    (set) => ({
      isLoggedIn: false,
      isadmin: false,
      username: undefined,

      logIn: (username: string, isadmin: boolean) => {
        set({
          isLoggedIn: true,
          username,
          isadmin,
        });
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
