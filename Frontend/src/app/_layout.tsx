import { Stack } from "expo-router";
import React from "react";
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from "../store/authStore";


export default function RootLayout() {
  const { isLoggedIn} = useAuthStore();

  return (
    
    <>
      <StatusBar style="auto" />
      <Stack>
      
       
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
        
      </Stack>
    </>
    
  );
}
