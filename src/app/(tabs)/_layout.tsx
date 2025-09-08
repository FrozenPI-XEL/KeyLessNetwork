import {Tabs} from "expo-router"

export default function TabsLayout(){
   return<Tabs initialRouteName="index">
      <Tabs.Screen name="admin" options={{title:"Admin"}}/>
      <Tabs.Screen name="index"  options={{title: 'Home',headerShown: false}} />
      <Tabs.Screen name="profile" options={{title:"Mein Account"}}/>
   </Tabs>;
}