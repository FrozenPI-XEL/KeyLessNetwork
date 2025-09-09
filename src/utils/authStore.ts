import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { getItem, setItem, deleteItemAsync } from "expo-secure-store";

type UserState = {
  isLoggedIn: boolean;
  isadmin: boolean;
  istempadmin: boolean;
  iswhitecard: boolean;
  logIn: () => void;
  logOut: () => void;
  WhiteCardIn: () => void;
  WhiteCardOut: () => void;
};

export const useAuthStore = create(
  persist<UserState>(
    (set) => ({
      isLoggedIn: false,
      isadmin: false,
      istempadmin: false,
      iswhitecard: false,

      logIn: () =>
        set((state) => ({
          ...state,
          isLoggedIn: true,
        })),

      logOut: () =>
        set(() => ({
          isLoggedIn: false,
          isadmin: false,
          istempadmin: false,
          iswhitecard: false,
        })),

      WhiteCardIn: () =>
        set((state) => ({
          ...state,
          istempadmin: true,
        })),

      WhiteCardOut: () =>
        set((state) => ({
          ...state,
          istempadmin: false,
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
