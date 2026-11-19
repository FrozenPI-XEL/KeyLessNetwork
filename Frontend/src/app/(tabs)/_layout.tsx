import { Tabs } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";

// SDK 58: initialRouteName-Prop entfernt -> anchor über unstable_settings
export const unstable_settings = {
  anchor: "home",
};

export default function TabsLayout() {
  const { isadmin } = useAuthStore();

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: "#0f172b",
          borderTopColor: "#0f172b",
        },
        tabBarInactiveTintColor: "gray",
        tabBarActiveTintColor: "#0ea5e9",
        headerStyle: { backgroundColor: "#0f172b" },
        headerTintColor: "white",
        headerTitleStyle: { fontWeight: "bold" },
        headerTitleAlign: "center",
      }}
    >
      <Tabs.Protected guard={isadmin}>
        <Tabs.Screen
          name="admin"
          options={{
            title: "Admin",
            // Ab SDK 58 bleiben geschützte Routen registriert: Tab für Nicht-Admins zusätzlich ausblenden.
            href: isadmin ? undefined : null,
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons
                name="admin-panel-settings"
                size={size}
                color={color as string}
              />
            ),
          }}
        />
      </Tabs.Protected>

      <Tabs.Screen
        name="home"
        options={{
          title: "Startseite",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-sharp" size={size} color={color as string} />
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="controll"
        options={{
          title: "Steuerung",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="game-controller-outline"
              size={size}
              color={color as string}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Mein Account",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-sharp" size={size} color={color as string} />
          ),
        }}
      />
    </Tabs>
  );
}
