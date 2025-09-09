import { View } from "react-native";
import { Text } from "react-native";
import React from "react";

export default function IndexScreen() {
  return (
    <View className="justify-center flex-col p-4 bg-slate-900" >
      <Text className="text-white font-bold text-xl text-center">
        Willkommen im MakerLab
      </Text>
      <Text text-gray-400 text-sm mt-1 ml-2>
        founded by Digiclub e.V 
      </Text>
    </View>
  );
}