import { Stack } from "expo-router";
<<<<<<< HEAD
import { useEffect } from "react";
=======
import React from "react";
>>>>>>> 447e459aea7227994332b9f6f539f6c32ae610b7
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from "../store/authStore";
import { supabase } from "../hooks/supabase-client";

export default function RootLayout() {
<<<<<<< HEAD
  const { isLoggedIn } = useAuthStore();

  // Beim Start prüfen, ob noch eine echte Supabase-Sitzung existiert, und bei Abmeldung/Ablauf ausloggen.
  useEffect(() => {
    useAuthStore.getState().syncSession();
    const { data } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === "SIGNED_OUT") {
        useAuthStore.setState({
          isLoggedIn: false,
          isadmin: false,
          username: undefined,
        });
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);
=======
  const { isLoggedIn} = useAuthStore();
>>>>>>> 447e459aea7227994332b9f6f539f6c32ae610b7

  return (
    <>
      <StatusBar style="auto" />
      <Stack>
<<<<<<< HEAD
        <Stack.Screen
          name="index"
          options={{
            title: "Welcome",
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="login"
          options={{
            title: "Anmelden",
            headerStyle: { backgroundColor: "#0f172b" },
            headerTintColor: "white",
            headerTitleStyle: { fontWeight: "bold" },
            headerTitleAlign: "center",
          }}
        />
        <Stack.Screen
          name="register"
          options={{
            title: "Registrierung",
            headerStyle: { backgroundColor: "#0f172b" },
            headerTintColor: "white",
            headerTitleStyle: { fontWeight: "bold" },
            headerTitleAlign: "center",
          }}
        />
        <Stack.Screen
          name="profile-setup"
          options={{
            title: "Profil erstellen",
            headerStyle: { backgroundColor: "#0f172b" },
            headerTintColor: "white",
            headerTitleStyle: { fontWeight: "bold" },
            headerTitleAlign: "center",
          }}
        />
        <Stack.Protected guard={isLoggedIn}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack.Protected>
=======
      
       
          <Stack.Screen
            name="index"
            options={{
              title: "Welcome",
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="login"
            options={{
              title: "Anmelden",
              headerStyle: { backgroundColor: "#0f172b" },
              headerTintColor: "white",
              headerTitleStyle: { fontWeight: "bold" },
              headerTitleAlign: "center",
            }}
          />
          <Stack.Screen
            name="register"
            options={{
              title: "Registrierung",
              headerStyle: { backgroundColor: "#0f172b" },
              headerTintColor: "white",
              headerTitleStyle: { fontWeight: "bold" },
              headerTitleAlign: "center",
            }}
          />
          <Stack.Screen
            name="profile-setup"
            options={{
              title: "Profil erstellen",
              headerStyle: { backgroundColor: "#0f172b" },
              headerTintColor: "white",
              headerTitleStyle: { fontWeight: "bold" },
              headerTitleAlign: "center",
            }}
          />       
          <Stack.Protected guard={isLoggedIn}>
            <Stack.Screen
              name="(tabs)"
              options={{ headerShown: false }}/>
          </Stack.Protected>
        
>>>>>>> 447e459aea7227994332b9f6f539f6c32ae610b7
      </Stack>
    </>
  );
}
