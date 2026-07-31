import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/hooks/supabase-client";

type UserInfo = {
  username: string;
  code2: string;
  Role: boolean;
};

export default function InfoCard() {
  const currentUsername = useAuthStore((s) => s.username);
  const isadmin = useAuthStore((s) => s.isadmin);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUsername) {
      setUser(null);
      setLoading(false);
      return;
    }

    const loadUser = async () => {
      const { data, error } = await supabase
        .from("codes")
        .select("username, code2, Role")
        .eq("username", currentUsername)
        .single();

      if (!error && data) {
        setUser(data);
      }
      setLoading(false);
    };

    loadUser();
  }, [currentUsername]);

  if (loading) {
    return <ActivityIndicator color="white" style={{ marginVertical: 40 }} />;
  }

  if (!user) return null;

  const role = isadmin || user.Role ? "Admin" : "User";

  return (
    <View
      style={{
        backgroundColor: "#334155",
        padding: 20,
        borderRadius: 12,
        marginVertical: 40,
        width: "100%",
        alignItems: "center",
      }}
    >
      <Text style={{ color: "white", fontSize: 24, fontWeight: "bold", marginBottom: 8 }}>
        Deine Daten
      </Text>
      <Text style={{ color: "#cbd5e1", marginBottom: 4, fontSize: 18, fontWeight: "bold" }}>
        Benutzername: {user.username}
      </Text>
      <Text style={{ color: "#cbd5e1", marginBottom: 4, fontSize: 18, fontWeight: "bold" }}>
        Passwort: {user.code2}
      </Text>
      <Text style={{ color: "#cbd5e1", marginBottom: 4, fontSize: 18, fontWeight: "bold" }}>
        Rolle: {role}
      </Text>
    </View>
  );
}
