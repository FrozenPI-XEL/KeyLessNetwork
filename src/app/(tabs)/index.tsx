import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";




export default function Index() {
  return ( 
      <ScrollView className="flex-1 bg-slate-900 p-6">
        <StatusBar style="light" />

        <View className="flex-1 items-center mt-20 justify-center">
          <Ionicons name="rocket" size={120} color="white" className="m-10 mt-20" />
            <Text className="text-white text-4xl font-extrabold text-center mb-2 mt-10">
                Willkommen im MakerLab
            </Text>
            <View className=" flex-row justify-beetween">
              <Text className="text-white text-2xl text-center">
                  by Digiclub e.v
              </Text>
              <Text className="text-gray-300 text-sm font-mono font-bold  ">
                   1.0 DevBuild
              </Text>
            </View>
              </View>
      </ScrollView>
  );
}
