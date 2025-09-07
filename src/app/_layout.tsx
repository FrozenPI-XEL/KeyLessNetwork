import { Stack } from "expo-router";
import "../../global.css";
import React from "react";
import { StatusBar } from "expo-status-bar";

const isLoggedIn = true; // hi Julius :)
// du kannst true zu false wechseln um den login screen zu sehen
// Dies wurde mit den Expo SDK 53 Protected Routes möglich gemacht

export default function RootLayout() {
  return (
    <React.Fragment>
      <StatusBar style="auto" />
      <Stack>
        <Stack.Protected guard={isLoggedIn}>
          <Stack.Screen name="(tabs)" options={{headerShown: false}}/>
        </Stack.Protected>
        <Stack.Protected guard={!isLoggedIn}>
          <Stack.Screen name="login"/>
        </Stack.Protected> 
      </Stack>
    </React.Fragment>
  );
}
