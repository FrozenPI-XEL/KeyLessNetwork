import React, { useState } from "react";
import { View, Text, TouchableOpacity, FlatList, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Dummy Users – später aus DB / Zustand
const dummyUsers = [
  { id: "1", username: "Max", role: "User", daysLeft: 7 },
  { id: "2", username: "Anna", role: "Admin", daysLeft: 30 },
];

export default function AdminScreen() {
  const [users, setUsers] = useState(dummyUsers);

  return (
    <View className="flex-1 bg-slate-900 p-6">
      {/* Titel */}

      <Text className="text-white text-2xl font-bold mb-6 text-center">Nutzerverwaltung</Text>

      {/* User Liste */}
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        className="mb-6"
        renderItem={({ item }) => (
          <View className="bg-slate-800 p-4 rounded-xl mb-3 flex-row justify-between items-center">
            <View>
              <Text className="text-white font-semibold">{item.username}</Text>
              <Text className="text-gray-400 text-sm">{item.role}</Text>
              <View className="flex-row items-center mt-1 font-bold">
                <Ionicons name="time" size={16} color="#6366f1" />
                <Text className="text-indigo-400 text-sm">
                 {item.daysLeft} Tage übrig
                </Text>
              </View>
            </View>
            <TouchableOpacity className="bg-red-500 p-2 rounded-lg">
              <Ionicons name="trash" size={20} color="white" />
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Neuer User */}
      <View className="bg-slate-800 p-4 rounded-xl">
        <View className="flex-row items-bottom mb-2">
        <Ionicons name="person-add" size={24} color="white" />
        <Text className="text-white center font-semibold text-xl mb-3"> Neuer Nutzer</Text>
        </View>
        {/* Username */}
        <View className="mb-4">
          <Text className="text-gray-400 mb-1">Benutzername</Text>
          <View className="bg-slate-700 rounded-lg px-3 py-2">
            <TextInput className="text-white"></TextInput>
          </View>
        </View>

        {/* Passwort */}
        <View className="mb-4">
          <Text className="text-gray-400 mb-1">Passwort</Text>
          <View className="bg-slate-700 rounded-lg px-3 py-2">
            <TextInput className="text-white"></TextInput>
          </View>
        </View>

        {/* Rolle */}
        <View className="mb-4">
          <Text className="text-gray-400 mb-1">Rolle</Text>
          <View className="bg-slate-700 rounded-lg px-3 py-2">
          </View>
        </View>

        {/* Zeitlimit */}
        <View className="mb-4">
          <Text className="text-gray-400 mb-1">Login-Dauer (Tage)</Text>
          <View className="bg-slate-700 rounded-lg px-3 py-2">
            <TextInput className="text-white"></TextInput>
          </View>
        </View>

        {/* Button */}
        <TouchableOpacity className="flex-row items-center bg-indigo-500 px-6 py-3 rounded-xl mt-2 justify-center">
          <Ionicons name="add-circle-outline" size={22} color="white" />
          <Text className="text-white font-semibold text-base ml-2">
            Nutzer hinzufügen
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
