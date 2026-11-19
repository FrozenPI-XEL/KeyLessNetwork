import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useAuthStore } from "../../store/authStore";
import UsersTab from "../../components/admin/UsersTab";
import CodesTab from "../../components/admin/CodesTab";
import LockersTab from "../../components/admin/LockersTab";

// Admin-Tab (nur für Admins sichtbar). Alles, was Nutzer, Codes und Locker verwaltet, liegt hier
// in src/components/admin/. Die Nutzer-Seite (Steuerung) ist controll.tsx.
// Die eigentliche Absicherung macht die Datenbank (Row Level Security), die Anzeige hier ist nur Komfort.

type AdminTabKey = "users" | "codes" | "lockers";

const TABS: { key: AdminTabKey; label: string }[] = [
  { key: "users", label: "Nutzer" },
  { key: "codes", label: "Codes" },
  { key: "lockers", label: "Locker" },
];

export default function AdminPanel() {
  const isadmin = useAuthStore((s: any) => s.isadmin);
  const [activeTab, setActiveTab] = useState<AdminTabKey>("users");

  if (!isadmin) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#1e293b",
        }}
      >
        <Text style={{ color: "white", fontSize: 18 }}>
          ❌ Du hast keine Admin-Berechtigung
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#1e293b" }}
      contentContainerStyle={{ paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
    >
      <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
        <Text
          style={{
            color: "white",
            fontSize: 28,
            fontWeight: "bold",
            marginBottom: 16,
            textAlign: "center",
          }}
        >
          Admin Panel
        </Text>

        <View style={{ flexDirection: "row", marginBottom: 20, gap: 8 }}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 8,
                backgroundColor: activeTab === tab.key ? "#6366f1" : "#475569",
              }}
            >
              <Text
                style={{
                  color: "white",
                  fontWeight: "bold",
                  textAlign: "center",
                }}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === "users" && <UsersTab />}
        {activeTab === "codes" && <CodesTab />}
        {activeTab === "lockers" && <LockersTab />}
      </View>
    </ScrollView>
  );
}
