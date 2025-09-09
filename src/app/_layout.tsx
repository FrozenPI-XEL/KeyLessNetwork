import { Stack } from "expo-router";
import "../../global.css";
import React from "react";
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from "../utils/authStore";

export default function RootLayout() {
  const { isLoggedIn, isadmin } = useAuthStore();

  return (
    <>
      <StatusBar style="auto" />
      <Stack>
        <Stack.Protected guard={!isLoggedIn}>
          <Stack.Screen
            name="login"
            options={{
              title: "Anmelden",
              headerStyle: { backgroundColor: "#0f172b" },
              headerTintColor: "#fff",
              headerTitleStyle: { fontWeight: "bold" },
              headerTitleAlign: "center",
            }}
          />
        </Stack.Protected>

        <Stack.Protected guard={isLoggedIn}>
          <Stack.Screen
            name="(tabs)"
            options={{ headerShown: false }}
          />
          {isadmin && (
            <Stack.Screen
              name="admin"
              options={{ title: "Admin Bereich" }}
            />
          )}
        </Stack.Protected>
      </Stack>
    </>
  );
}
