import { Tabs } from "expo-router";
import { Stack } from "expo-router";
import React from "react";
import { useAuthStore } from "../../store/authStore";
import { Ionicons, MaterialIcons} from "@expo/vector-icons";

export default function TabsLayout() {
  const { isadmin, istempadmin, iswhitecard } = useAuthStore();

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        tabBarStyle: {
          backgroundColor: "white dark:#0f172b",
          borderTopColor: "white dark:#0f172b",
        },
        tabBarInactiveTintColor: "black dark:gray",
        tabBarActiveTintColor: "#0ea5e9",
        headerStyle: { backgroundColor: "#1e293b" },
        headerTintColor: "black dark:white",
        headerTitleStyle: { fontWeight: "bold" },
        headerTitleAlign: "center",
      }}
    >
      <Stack.Protected guard={isadmin || istempadmin}>
        <Tabs.Screen
          name="admin"
          options={{
            title: "Admin",
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="admin-panel-settings" size={size} color={color} />
            ),
          }}
        />
      </Stack.Protected>

      <Tabs.Screen
        name="index"
        options={{
          title: "Startseite",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-sharp" size={size} color={color} />
          ),
          headerShown: false,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Mein Account",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-sharp" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
