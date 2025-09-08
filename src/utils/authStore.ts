import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { getItem, setItem, deleteItemAsync } from "expo-secure-store";
type UserState ={
    isLoggedIn: boolean;
    isadmin: boolean;
    istempadmin: boolean;
    iswhitecard: boolean;
    logIn: () => void;
    WhiteCardIn: () => void;
    WhiteCardOut: () => void;
    logOut: () => void;
};

export const useAuthStore = create (persist<UserState>((set) => ({
    isLoggedIn: false,
    isadmin: false,
    istempadmin: false,
    iswhitecard: false,
    WhiteCardIn: () => {
        set((state) => {
            return { 
                ...state, 
                istempadmin: true, 
            };
        });
    },
            WhiteCardOut: () => {
        set((state) => {
            return { 
                ...state, 
                istempadmin: false, 
            };
        });
    },
    logIn: () => {
        set((state) => {
            return { 
                ...state, 
                isLoggedIn: true, 
             };
        });
    },
    logOut: () => {
        set((state) => {
            return { 
                ...state, 
                isLoggedIn: false, 
             };
        });
    },
    }),
    {
        name: "auth-store", 
        storage: createJSONStorage(() => ({
            setItem,
            getItem,
            removeItem: deleteItemAsync,
        }))
    },
  ),
);

//hallo Julius :)
//ich arbeiter hier gerade am UserStateManagement
//es wird admins, users und WhiteCardUser geben
//admins können User verwalten
//users können nur die App nutzen 
// und werden nach einer Zeit automatisch ausgeloggt
//WhiteCardUser können die App genaus so wie Users nutzen 
// doch haben keine einschränkungen wie z.B. die automatische abmeldung
//sie können auch zum admin ernnant werden deshalb
//habe ich WhiteCardIn und WhiteCardOut funktionen erstellt
//diese geben ihnen admin Berechtigungen
//aber können von statischen admins wieder entzogen werden
//im nächsten meeting muss ich das mal mit Julius besprechen
//auch wer welche rechte bekommt

