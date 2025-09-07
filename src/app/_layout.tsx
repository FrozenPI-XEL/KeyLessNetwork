import { Stack } from "expo-router";
import "../../global.css";
import React from "react";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <React.Fragment>
      <StatusBar style="auto" />
      <Stack>
        <Stack.Protected guard={true}>
          <Stack.Screen name="(tabs)" options={{headerShown: false}}/>
        </Stack.Protected>
        <Stack.Protected guard={false}>
          <Stack.Screen name="login"/>
        </Stack.Protected> 
      </Stack>
    </React.Fragment>
  );
}
