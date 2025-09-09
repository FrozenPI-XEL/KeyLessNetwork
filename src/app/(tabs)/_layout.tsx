import {Tabs} from "expo-router"
import { Stack } from "expo-router";
import React from "react";
import { useAuthStore } from "../../utils/authStore";

export default function TabsLayout(){
   const {isadmin,istempadmin} = useAuthStore();
   return<Tabs initialRouteName="index"
   screenOptions={{tabBarActiveTintColor: '#0ea5e9',
    tabBarStyle: { backgroundColor: '#0f172b',
     borderTopColor: '#0f172b' }, 
     tabBarInactiveTintColor: 'gray', 
     headerStyle: { backgroundColor: '#0f172b' },
      headerTintColor: '#fff', 
      headerTitleStyle: { fontWeight: 'bold' }, 
      headerTitleAlign: 'center' }}>

      <Stack.Protected guard={isadmin || istempadmin}>

      <Tabs.Screen name="admin" options={{title:"Admin", 
            headerStyle: { backgroundColor: "#0f172b" },
            headerTintColor: "#fff",
            headerTitleStyle: { fontWeight: "bold" },
            headerTitleAlign: "center",}}/>

      </Stack.Protected>

      <Tabs.Screen name="index"  options={{title: 'Home',headerShown: false}} />

      <Tabs.Screen name="profile" options={{title:"Mein Account", 
            headerStyle: { backgroundColor: "#0f172b" },
            headerTintColor: "#fff",
            headerTitleStyle: { fontWeight: "bold" },
            headerTitleAlign: "center",}}/>
   </Tabs>;
}
