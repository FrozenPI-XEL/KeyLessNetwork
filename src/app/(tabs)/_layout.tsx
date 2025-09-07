import {Tabs} from "expo-router"

export default function TabsLayout(){
   return<Tabs>
      <Tabs.Screen name="admin" options={{title:"Admin"}}/>
      <Tabs.Screen name="Home" options={{headerShown: false}}/>
      <Tabs.Screen name="profile" options={{title:"Mein Account"}}/>
   </Tabs>;
}