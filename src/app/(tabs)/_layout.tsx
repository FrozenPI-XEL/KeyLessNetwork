import {Tabs} from "expo-router"
import { Stack } from "expo-router";
import React from "react";
import { useAuthStore } from "../../utils/authStore";

export default function TabsLayout(){
   const {isadmin,istempadmin} = useAuthStore();
   return<Tabs initialRouteName="index">
      <Stack.Protected guard={isadmin || istempadmin}>
      <Tabs.Screen name="admin" options={{title:"Admin"}}/>
      </Stack.Protected>
      <Tabs.Screen name="index"  options={{title: 'Home',headerShown: false}} />
      <Tabs.Screen name="profile" options={{title:"Mein Account"}}/>
   </Tabs>;
}
