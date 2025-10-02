import React from "react";
import { View, Text } from "react-native";
import { useAuthStore } from "@/store/authStore";
import { useUserStore } from "@/store/userStore";

export default function InfoCard() {
  const currentUsername = useAuthStore((s) => s.username);
  const users = useUserStore((s) => s.users);

  const user = users.find((u) => u.username === currentUsername);

  if (!user) return null;

  const role = user.isadmin ? "Admin" : user.istempadmin ? "TempAdmin" : user.iswhitecard ? "WhiteCard" : "User";
  const subscription = user.subscription
    ? `${user.subscription.months}M ${user.subscription.weeks}W ${user.subscription.days}T`
    : "-";

  return (
    <View className="text-dark-b2 p-5 rounded-xl m-10 w-full justify-center items-center">
      <Text className="text-dark-t1 text-2xl font-bold mb-2">Deine Daten</Text>
      <Text className="text-dark-t2 mb-1 text-lg font-bold">Benutzername: {user.username}</Text>
      <Text className="text-dark-t2 mb-1 text-lg font-bold">Passwort: {user.password}</Text>
      <Text className="text-dark-t2 mb-1 text-lg font-bold">Rolle: {role}</Text>
      {!user.isadmin && !user.iswhitecard && (
        <Text className="text-dark-t2 mb-1">Verbleibende Zeit: {subscription}</Text>
      )}
    </View>
  );
}
