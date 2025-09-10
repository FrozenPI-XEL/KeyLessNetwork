import React, { useState } from "react";
import { View, Text, TouchableOpacity, FlatList, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import  { SubscriptionTimePicker, SubscriptionTimePickerWithPulse } from "@/components/zeitauswahl";
import RoleDropdown from "@/components/rollenauswahl";

// kleine test liste später implementation mit lokaldb
const dummyUsers = [
  {
    id: "1",
    username: "Max",
    role: "Admin",
    daysLeft: 30,
  },
  {
    id: "2",
    username: "Erika",
    role: "User",
    daysLeft: 15,
  },
];

export default function AdminScreen() {
  const [role, setRole] = useState("User");
  const [users, setUsers] = useState(dummyUsers);

  return (
    <View className="flex-1 bg-slate-900 p-6">
      <Text className="text-white text-2xl font-bold mb-6 text-center">Nutzerverwaltung</Text>
      {/* User Liste */}
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        className="mb-6"
        renderItem={({ item }) => (
          <View className="bg-slate-800 p-4 rounded-xl mb-3 flex-row justify-between items-center">
            <>
              <View>
                <Text className="text-white font-semibold">{item.username}</Text>
                <Text className="text-gray-400 text-sm">{item.role}</Text>
                <SubscriptionTimePickerWithPulse
                  initialTime={{ months: 0, weeks: 0, days: 0 }}
                  onSave={(t) => console.log("Mit Pulse:", t)}
                />
              </View>
              <View className="flex-row gap-4 items-center" >
                <TouchableOpacity className="bg-green-500 p-3 rounded-lg">    
                  <Ionicons name="star" size={20} color="white"/>
                </TouchableOpacity>
                <TouchableOpacity className="bg-red-500 p-3 rounded-lg">
                  <Ionicons name="trash" size={20} color="white" />
                </TouchableOpacity>
              </View>
            </>
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
        <Text className="text-gray-400 mb-1">Rolle</Text>
        <RoleDropdown value={role} onChange={setRole}/>

        {/* Zeit */}
        <SubscriptionTimePicker
          initialTime={{ months: 1, weeks: 0, days: 5 }}
          onSave={(t) => console.log("Normale Version:", t)}
        />

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
