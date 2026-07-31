import { useRouter } from "expo-router";
import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../store/authStore";



export default function IndexPage() {
  const router = useRouter();




  return (
   <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0f172a", paddingHorizontal: 24 }}>

  <View style={{ marginBottom: 48, alignItems: "center" }}>
    <Ionicons name="key" size={64} color="white" />

    <Text style={{ marginTop: 16, textAlign: "center", fontSize: 36, fontWeight: "bold", color: "white" }}>
      MakerLab KeylessNetwork
    </Text>

    <Text style={{ marginTop: 16, marginBottom: 24, textAlign: "center", fontSize: 18, lineHeight: 24, color: "#e5e7eb" }}>
      Willkommen! Wähle eine Option, um fortzufahren.
    </Text>
  </View>

  <Pressable
    onPress={() => router.push("/login")}
    style={{ marginBottom: 16, width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "#4f46e5", paddingHorizontal: 24, paddingVertical: 16 }}
  >
    <Ionicons name="log-in" size={24} color="white" />
    <Text style={{ marginLeft: 12, fontSize: 18, fontWeight: "bold", color: "white" }}>
      Anmelden
    </Text>
  </Pressable>

  <Pressable
    onPress={() => router.push("/register")}
    style={{ width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "#4f46e5", paddingHorizontal: 24, paddingVertical: 16 }}
  >
    <Ionicons name="person-add" size={24} color="white" />
    <Text style={{ marginLeft: 12, fontSize: 18, fontWeight: "bold", color: "white" }}>
      Registrieren
    </Text>
  </Pressable>

  <Text style={{ marginTop: 48, textAlign: "center", fontSize: 12, color: "#6b7280" }}>
    v1.0 - Sichere Verwaltung mit Supabase
  </Text>
  <Pressable
    onPress={() => {
      useAuthStore.setState({ isLoggedIn: true });
      router.push("/(tabs)/home");
    }}
    style={{ marginTop: 16, width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "#16a34a", paddingHorizontal: 24, paddingVertical: 16 }}
  >
  <Ionicons name="construct" size={24} color="white" />
  <Text style={{ marginLeft: 12, fontSize: 18, fontWeight: "bold", color: "white" }}>
    Test Login
  </Text>
</Pressable>
  

</View>

  );
}