import { useRouter } from "expo-router";
import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";


export default function IndexPage() {
  const router = useRouter();

  return (
    <View className="flex-1 items-center justify-center bg-slate-800 px-6">
      <View className="mb-12 items-center">
        <Ionicons name="key" size={64} color="white" />

        <Text className="mt-4 text-center text-4xl font-bold text-white">
          MakerLab KeylessNetwork
        </Text>

        <Text className="mt-4 mb-6 text-center text-lg leading-6 text-gray-200">
          Willkommen! Wähle eine Option, um fortzufahren.
        </Text>
      </View>

      <Pressable
        onPress={() => router.push("/login")}
        className="mb-4 w-full flex-row items-center justify-center rounded-xl bg-indigo-600 px-6 py-4"
      >
        <Ionicons name="log-in" size={24} color="white" />
        <Text className="ml-3 text-lg font-bold text-white">
          Anmelden
        </Text>
      </Pressable>

      <Pressable
        onPress={() => router.push("/register")}
        className="w-full flex-row items-center justify-center rounded-xl bg-indigo-600 px-6 py-4"
      >
        <Ionicons name="person-add" size={24} color="white" />
        <Text className="ml-3 text-lg font-bold text-white">
          Registrieren
        </Text>
      </Pressable>

      <Text className="mt-12 text-center text-xs text-gray-500">
        v1.0 - Sichere Verwaltung mit Supabase
      </Text>
    </View>
  );
}