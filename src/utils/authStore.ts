import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { getItem, setItem, deleteItemAsync } from "expo-secure-store";
type UserState ={
    isLoggedIn: boolean;
    isadmin: boolean;
    istempadmin: boolean;
    iswhitecard: boolean;
    loggedIn: () => void;
    WhiteCardIn: () => void;
    WhiteCardOut: () => void;
    loggedOut: () => void;
};

export const useAuthStore = create<UserState>((set) => ({
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
    loggedIn: () => {
        set((state) => {
            return { 
                ...state, 
                isLoggedIn: true, 
             };
        });
    },
    loggedOut: () => {
        set((state) => {
            return { 
                ...state, 
                isLoggedIn: false, 
             };
        })
    },

}));

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

