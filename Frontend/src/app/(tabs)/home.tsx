import React from "react";
import { View, Text, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";

export default function Index() {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#0f172a" }}
      contentContainerStyle={{
        flexGrow: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 80,
        paddingHorizontal: 16,
      }}
    >
      <StatusBar style="light" />

      <Ionicons name="rocket" size={120} color="white" style={{ marginVertical: 20 }} />

      <Text
        style={{
          color: "white",
          fontSize: 36,
          fontWeight: "800",
          textAlign: "center",
          marginBottom: 10,
          marginTop: 40,
        }}
      >
        Willkommen im MakerLab
      </Text>

      <View
        style={{
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
        }}
      >
        <Text style={{ color: "#e5e7eb", fontSize: 24, textAlign: "center" }}>
          by Digiclub e.v
        </Text>
        <Text style={{ color: "#94a3b8", fontSize: 14, fontWeight: "bold" }}>
          1.0 DevBuild
        </Text>
      </View>
    </ScrollView>
  );
}
