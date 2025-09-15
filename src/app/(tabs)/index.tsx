import React from "react";
import { View, Text, TouchableOpacity, ScrollView, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "@/providers/ThemeProvider"



export default function Index() { 
  const { theme, toggleTheme } = useTheme();
  return ( 
      <ScrollView>
        <StatusBar style="light" />

        <View className="flex-1 items-center mt-20 justify-center">
          <Ionicons name="rocket" size={120} color="text-light-t1 dark:text-dark-t1" className="m-10 mt-20" />
            <Text className="text-light-t1 dark:text-dark-t1 text-4xl font-extrabold text-center mb-2 mt-10">
                Willkommen im MakerLab
            </Text>
            <View className=" flex-row justify-beetween">
              <Text className="text-light-t1 dark:text-dark-t1  text-2xl text-center">
                  by Digiclub e.v
              </Text>
              <Text className="text-light-t1 dark:text-dark-t1 text-sm font-mono font-bold  ">
                   1.0 DevBuild
              </Text>
            </View>
            <View className="flex-1 items-center justify-center text-light-b2 dark:text-dark-b2">
              <Text className="text-light-t1 dark:text-dark-t1 text-xl">
              Aktuelles Theme: {theme}
              </Text>
              <TouchableOpacity onPress={toggleTheme} />
            </View>
          </View>
      </ScrollView>
  );
}
