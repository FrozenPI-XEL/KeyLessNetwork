import { View, TouchableOpacity, Text } from "react-native";
import { useAuthStore } from "@/store/authStore";
import React from "react";
import { Ionicons } from "@expo/vector-icons";
import InfoCard from "@/components/InfoCard";

export default function ProfileScreen() {
  const { logOut } = useAuthStore();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#0f172a",
        paddingHorizontal: 24,
      }}
    >
      <Ionicons name="person" size={120} color="white" />
      <InfoCard />

      <TouchableOpacity
        onPress={logOut}
        style={{
          flexDirection: "row",
          marginTop: 40,
          paddingVertical: 12,
          paddingHorizontal: 24,
          backgroundColor: "#ef4444",
          borderRadius: 12,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Ionicons name="log-out-outline" size={26}  color="white" />
        <Text style={{ color: "white", fontWeight: "bold", marginLeft: 12, fontSize: 20 }}>
          Ausloggen
        </Text>
      </TouchableOpacity>
    </View>
  );
}
