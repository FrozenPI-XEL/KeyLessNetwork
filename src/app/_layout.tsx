import { Stack } from "expo-router";
import "../../global.css";
import React from "react";
import { StatusBar } from "expo-status-bar";
import { FadeIn } from "react-native-reanimated";
import { useAuthStore } from "../utils/authStore";

export default function RootLayout() {
  const {isLoggedIn, isadmin, istempadmin,iswhitecard} = useAuthStore();
  return (
    <React.Fragment>
      <StatusBar style="auto" />
      <Stack>
        <Stack.Protected guard={isLoggedIn}>
          <Stack.Screen name="(tabs)" options={{headerShown: false}}/>
        </Stack.Protected>
          <Stack.Screen name="login" options={{
            title:"Anmelden",
            headerStyle: { "backgroundColor": "#0f172b" },
            headerTintColor: "#fff",
            headerTitleStyle: {fontWeight: "bold"},
            headerTitleAlign: "center",
            }}/>
      </Stack>
    </React.Fragment>
  );
}
