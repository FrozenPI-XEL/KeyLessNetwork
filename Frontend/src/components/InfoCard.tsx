import React from "react";
import { View, Text } from "react-native";
import { useAuthStore } from "@/store/authStore";

// Profilkarte: zeigt nur noch Benutzername und Rolle aus der Anmeldung.
// Das Passwort wird nicht mehr angezeigt oder gespeichert (die Anmeldung läuft über Supabase Auth).
export default function InfoCard() {
  const username = useAuthStore((s) => s.username);
  const isadmin = useAuthStore((s) => s.isadmin);

  if (!username) return null;

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
        Benutzername: {username}
      </Text>
      <Text style={{ color: "#cbd5e1", marginBottom: 4, fontSize: 18, fontWeight: "bold" }}>
        Rolle: {isadmin ? "Admin" : "User"}
      </Text>
    </View>
  );
}
