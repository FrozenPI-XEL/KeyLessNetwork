import { View } from "react-native";
import { useAuthStore } from "@/store/authStore";
import { TouchableOpacity, Text } from "react-native";
import React from "react";
import { Ionicons } from "@expo/vector-icons";
import InfoCard from "@/components/InfoCard";




export default function ProfileScreen() {
  const {logOut} = useAuthStore();

  return (
    <View className="justify-center items-center  bg-slate-900 h-full " >
        <Ionicons name="person" size={120} color="white" />
      <InfoCard/>

        <TouchableOpacity className=" flex-row mt-20 m-10 pt-1 pb-1 pl-6 pr-6 bg-red-500 rounded-lg justify-center items-center" onPress={logOut}>
          <Ionicons name="log-out-outline" size={26} color="white" />
          <Text className="text-white font-bold p-6 text-xl">Ausloggen</Text>
        </TouchableOpacity>
      
    </View>
  );
}