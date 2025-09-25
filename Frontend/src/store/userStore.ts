import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";



export type User = {
  id: number;
  username: string;
  password: string;
  isadmin?: boolean;
  istempadmin?: boolean;
  iswhitecard?: boolean;
  subscription?: {
    months: number;
    weeks: number;
    days: number;
  };
};
type Subscription = {
  months: number;
  weeks: number;
  days: number;
};

type UserState = {
  users: User[];
  loadUsers: (initialUsers: User[]) => void;
  addUser: (user: Omit<User, "id">) => void;
  deleteUser: (id: number) => void;
  promoteUser: (id: number) => void;
  demoteUser: (id: number) => void;
};

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      users: [],

      loadUsers: (initialUsers) => set({ users: initialUsers }),

      addUser: (user) =>
        set((state) => {
          const newUser: User = { id: Date.now(), ...user }; // ID automatisch erzeugt
          return { users: [...state.users, newUser] };
        }),

      deleteUser: (id) =>
        set((state) => ({ users: state.users.filter((u) => u.id !== id) })),

      promoteUser: (id) =>
        set((state) => ({
          users: state.users.map((u) => {
            if (u.id !== id) return u;
            if (!u.iswhitecard && !u.istempadmin && !u.isadmin)
              return { ...u, iswhitecard: true };
            if (u.iswhitecard) return { ...u, iswhitecard: false, istempadmin: true };
            if (u.istempadmin) return { ...u, istempadmin: false, isadmin: true };
            return u;
          }),
        })),

      demoteUser: (id) =>
        set((state) => ({
          users: state.users.map((u) => {
            if (u.id !== id) return u;
            if (u.isadmin) return { ...u, isadmin: false, istempadmin: true };
            if (u.istempadmin) return { ...u, istempadmin: false, iswhitecard: true };
            if (u.iswhitecard) return { ...u, iswhitecard: false };
            return u;
          }),
        })),
    }),
    {
      name: "user-store",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
