import React, { useState, useEffect } from "react";
import { ScrollView, View, Text, TouchableOpacity, FlatList, TextInput, Alert, Modal} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SubscriptionTimePicker, SubscriptionTimePickerWithPulse } from "@/components/zeitauswahl";
import RoleDropdown from "@/components/rollenauswahl";
import { useUserStore, User } from "@/store/userStore";
import { useAuthStore } from "@/store/authStore";
import PiForm from "@/components/PiForm";
import AsyncStorage from "@react-native-async-storage/async-storage";


export default function Admin() {
  const users = useUserStore((s) => s.users);
  const addUser = useUserStore((s) => s.addUser);
  const deleteUser = useUserStore((s) => s.deleteUser);
  const promoteUser = useUserStore((s) => s.promoteUser);
  const demoteUser = useUserStore((s) => s.demoteUser);
  const currentUser = useAuthStore((s) => s.username);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("User");
  const [subscriptionTime, setSubscriptionTime] = useState({ months: 0, weeks: 0, days: 0 });
  const [subscriptionTimeKey, setSubscriptionTimeKey] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [editPi, setEditPi] = useState<Partial<Pi> | null>(null);
  const [pis, setPis] = useState<Pi[]>([]); 
  const [loadingPis, setLoadingPis] = useState(true);
  const [open, setOpen] = useState(false);

  type Pi = { id?: string; n: string; h: string; p: number };

  useEffect(() => { (async () => { const data = await AsyncStorage.getItem("MY_PIS_v1"); if(data) setPis(JSON.parse(data)); setLoadingPis(false); })(); }, []);

  // --- Neuen User hinzufügen ---
  const handleAddUser = () => {
    if (!username || !password) return;

    addUser({
      username,
      password,
      isadmin: role === "Admin",
      istempadmin: role === "TempAdmin",
      iswhitecard: role === "WhiteCard",
      subscription: role === "User" || role === "TempAdmin" ? subscriptionTime : undefined,
    });

    setUsername("");
    setPassword("");
    setRole("User");
    setSubscriptionTime({ months: 0, weeks: 0, days: 0 });

    setSubscriptionTimeKey(prev => prev + 1);
  };

  // --- User löschen und kicken ---
  const deleteUserHandler = (id: number) => {
    const userToDelete = users.find((u) => u.id === id);
    if (!userToDelete) return;

    // Letzter Admin Check
    const adminCount = users.filter(u => u.isadmin).length;
    if (userToDelete.isadmin && adminCount === 1) {
      Alert.alert("Fehler", "Der letzte Admin kann nicht gelöscht werden!");
      return; // Abbruch
    }

    deleteUser(id);

    // Kick, wenn aktueller User gelöscht wird
    if (userToDelete.username === currentUser) {
      useAuthStore.getState().logOut();
    }
  };

  // --- Auto-Abzug der Subscription jeden Tag ---
  useEffect(() => {
    const interval = setInterval(() => {
      useUserStore.getState().users.forEach((u) => {
        if (!u.isadmin && !u.iswhitecard && u.subscription) {
          let { months, weeks, days } = u.subscription;
          days -= 1;
          if (days < 0) {
            weeks -= 1;
            days = 6;
          }
          if (weeks < 0) {
            months -= 1;
            weeks = 3;
          }

          const subscriptionEnded = months <= 0 && weeks <= 0 && days <= 0;

          if (subscriptionEnded) {
            deleteUser(u.id);
            if (useAuthStore.getState().username === u.username) {
              useAuthStore.getState().logOut();
            }
          } else {
            // Subscription aktualisieren
            useUserStore.setState({
              users: useUserStore.getState().users.map((usr) =>
                usr.id === u.id ? { ...usr, subscription: { months, weeks, days } } : usr
              ),
            });
          }
        }
      });
    }, 60000*60*24);

    return () => clearInterval(interval);
  }, []);

  // --- Komponente für User-Picker ---
  const UserSubscriptionPicker = ({ userId }: { userId: number }) => {
    const user = useUserStore((s) => s.users.find(u => u.id === userId));
    if (!user || !user.subscription) return null;

    return (
      <SubscriptionTimePickerWithPulse
        initialTime={user.subscription}
        onSave={(t) => {
          useUserStore.setState({
            users: useUserStore.getState().users.map(u =>
              u.id === userId ? { ...u, subscription: t } : u
            ),
          });
        }}
        key={user.id} 
      />
    );
  };

  return (
    <ScrollView 
    className="flex-1 bg-slate-900 p-6">
      <Text className=" text-dark-t1 text-2xl font-bold mb-6 text-center">Nutzerverwaltung</Text>

      {/* Liste */}
      <FlatList
        data={users}
        keyExtractor={(item) => item.id.toString()}
        
        renderItem={({ item }) => (
          <View className=" p-4 rounded-xl bg-slate-700  mb-3 flex-row justify-between items-center">
            <View>
              <Text className="text-dark-t1 text-lg font-semibold">{item.username}</Text>
              <Text className="text-dark-t2 text-sm mb-3">
                {item.isadmin
                  ? "Admin"
                  : item.istempadmin
                  ? "TempAdmin"
                  : item.iswhitecard
                  ? "WhiteCard"
                  : "User"}
              </Text>

                            {(!item.isadmin && !item.iswhitecard) && (
                <UserSubscriptionPicker userId={item.id} />
              )}
            </View>

            <View className="flex-row gap-4 items-center">
              <TouchableOpacity onPress={() => promoteUser(item.id)} className="bg-green-500 p-3 rounded-lg">
                <Ionicons name="star" size={20} color="white" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => demoteUser(item.id)} className="bg-yellow-500 p-3 rounded-lg">
                <Ionicons name="arrow-undo" size={20} color="white" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteUserHandler(item.id)} className="bg-red-500 p-3 rounded-lg">
                <Ionicons name="trash" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Neuer User */}
      <View className="bg-slate-700 p-4 rounded-xl mt-4">
        <View className="flex-row items-center mb-2">
          <Ionicons name="person-add" size={24} color="white" />
          <Text className="text-dark-t1 font-semibold text-xl ml-2">Neuer Nutzer</Text>
        </View>

        <View className="mb-4">
          <Text className="text-dark-t2 mb-1">Benutzername</Text>
          <View className="bg-slate-600 rounded-lg px-3 py-2">
            <TextInput className="text-dark-t1" value={username} onChangeText={setUsername} />
          </View>
        </View>

        <View className="mb-4">
          <Text className="text-dark-t2 mb-1">Passwort</Text>
          <View className="bg-slate-600 rounded-lg px-3 py-2">
            <TextInput className="text-dark-t1" value={password} onChangeText={setPassword} secureTextEntry />
          </View>
        </View>

        <Text className="text-dark-t2 mb-1">Rolle</Text>
        <RoleDropdown value={role} onChange={setRole} />

        <Text className="text-dark-t2 mb-1">Zeit</Text>
        <View className="text-dark-b3 rounded-lg px-3 py-2">
          <SubscriptionTimePicker  key={subscriptionTimeKey} initialTime={subscriptionTime} onSave={setSubscriptionTime} />
        </View>

        <TouchableOpacity onPress={handleAddUser} className="flex-row items-center bg-indigo-500 px-6 py-3 rounded-xl mt-2 justify-center">
          <Ionicons name="add-circle-outline" size={22} color="white" />
          <Text className="text-dark-t1 font-semibold text-base ml-2">Nutzer hinzufügen</Text>
        </TouchableOpacity>
      </View>

      {/* Pi Verwaltung */}
      <TouchableOpacity
       onPress={() => { setEditPi(null); setOpen(true) }}
        className="flex-row items-center bg-indigo-500 p-3 mb-20 rounded-xl mt-20 justify-center"
      >
        <Text className="text-white text-lg">Neuen Schrank hinzufügen</Text>
      </TouchableOpacity>
        <Modal visible={open} transparent={true} animationType="fade" >
          <View className="flex-1 bg-black/70 justify-center">           
              <Text className="text-dark-t1 text-xl font-bold mb-6">
                {editPi?.id ? "Pi bearbeiten" : "Neuen Pi hinzufügen"}
              </Text>

              <PiForm 
              onSave={(piData) => {
              setPis(prev => {
                const idx = prev.findIndex(p => p.id === piData.id);
                if (idx >= 0) { 
                const copy = [...prev]; 
                copy[idx] = piData; 
                return copy; 
                }
                return [piData, ...prev];
              });
              setOpen(false);
              }}
              onCancel={() => setOpen(false)}
              />
          </View>
         
      </Modal>
    </ScrollView>
  );
}
