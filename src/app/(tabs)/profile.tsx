import { View } from "react-native";
import { useAuthStore } from "@/utils/authStore";
import { TouchableOpacity, Text } from "react-native";
import React from "react";
import { Ionicons } from "@expo/vector-icons";


const {logOut} = useAuthStore();

export default function ProfileScreen() {
  return (
    <View className="justify-center flex-col p-4 " >
<TouchableOpacity className="flex-row bg-slate-500 p-3 rounded-lg justify-center items-center" onPress={logOut}>
        <Ionicons name="checkmark-circle-outline" size={22} color="white" />
        <Text className="text-white font-semibold text-base ml-2">LogOut</Text>
      </TouchableOpacity>
    </View>
  );
}