import { Stack } from "expo-router";
import "../../global.css";
import React from "react";
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from "../store/authStore";
import { ThemeProvider } from "@/components/ThemeContext"

export default function RootLayout() {
  const { isLoggedIn, isadmin, istempadmin } = useAuthStore();

  return (
    <ThemeProvider>
    <>
      <StatusBar style="auto" />
      <Stack>
      
        <Stack.Protected guard={!isLoggedIn}>
          <Stack.Screen
            name="login"
            options={{
              title: "Anmelden",
              headerStyle: { backgroundColor: "white dark:#0f172b" },
              headerTintColor: "black dark:white",
              headerTitleStyle: { fontWeight: "bold" },
              headerTitleAlign: "center",
            }}
          />
        </Stack.Protected>        
          <Stack.Protected guard={isLoggedIn}>
            <Stack.Screen
              name="(tabs)"
              options={{ headerShown: false }}/>
          </Stack.Protected>
        
      </Stack>
    </>
    </ThemeProvider>
  );
}
