import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../hooks/supabase-client";
import { useAuthStore } from "../../store/authStore";

type AdminUser = {
  id: number;
  username: string;
  Role: boolean;
  code: string;
};

type CodeItem = {
  id: number;
  code: string;
  genutzt: boolean;
};

type RaspberryPi = {
  id: number;
  name: string;
  ip_address: string;
  port: number;
};

export default function AdminPanel() {
  const username = useAuthStore((s: any) => s.username);
  const isadmin = useAuthStore((s: any) => s.isadmin);

  const [activeTab, setActiveTab] = useState("users");
  const [loading, setLoading] = useState(false);

  // Users Tab State
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newIsAdmin, setNewIsAdmin] = useState(false);

  // Codes Tab State
  const [codes, setCodes] = useState<CodeItem[]>([]);
  const [newCode, setNewCode] = useState("");

  // Pis Tab State
  const [pis, setPis] = useState<RaspberryPi[]>([]);
  const [piName, setPiName] = useState("");
  const [piIp, setPiIp] = useState("");
  const [piPort, setPiPort] = useState("");

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadUsers(), loadCodes(), loadPis()]);
    } catch (err) {
      console.error("Error loading data:", err);
    }
    setLoading(false);
  };

  // ===== USERS TAB =====
  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("codes")
        .select("id, username, Role, code")
        .not("username", "is", null);

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error("Error loading users:", err);
    }
  };

  const handleAddUser = async () => {
    if (!newUsername.trim() || !newPassword.trim()) {
      Alert.alert("Fehler", "Benutzername und Passwort erforderlich");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("codes").insert([
        {
          username: newUsername,
          code: `USER-${Date.now()}`,
          genutzt: true,
          Role: newIsAdmin,
        },
      ]);

      if (error) throw error;

      setNewUsername("");
      setNewPassword("");
      setNewIsAdmin(false);
      await loadUsers();
      Alert.alert("Erfolg", "Nutzer hinzugefügt!");
    } catch (err: any) {
      Alert.alert("Fehler", err.message || "Fehler beim Hinzufügen");
    }
    setLoading(false);
  };

  const handleDeleteUser = (userId: number) => {
    Alert.alert("Löschen bestätigen", "Soll dieser Nutzer wirklich gelöscht werden?", [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Löschen",
        style: "destructive",
        onPress: async () => {
          try {
            const { error } = await supabase.from("codes").delete().eq("id", userId);
            if (error) throw error;
            await loadUsers();
          } catch (err: any) {
            Alert.alert("Fehler", err.message);
          }
        },
      },
    ]);
  };

  // ===== CODES TAB =====
  const loadCodes = async () => {
    try {
      const { data, error } = await supabase
        .from("codes")
        .select("id, code, genutzt")
        .is("username", null);

      if (error) throw error;
      setCodes(data || []);
    } catch (err) {
      console.error("Error loading codes:", err);
    }
  };

  const handleAddCode = async () => {
    if (!newCode.trim() || newCode.length !== 8) {
      Alert.alert("Fehler", "Code muss 8 Zeichen lang sein");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("codes")
        .insert([{ code: newCode.toUpperCase(), genutzt: false }]);

      if (error) throw error;

      setNewCode("");
      await loadCodes();
      Alert.alert("Erfolg", "Code hinzugefügt!");
    } catch (err: any) {
      Alert.alert("Fehler", err.message);
    }
    setLoading(false);
  };

  const handleDeleteCode = (codeId: number) => {
    Alert.alert("Löschen bestätigen", "Soll dieser Code gelöscht werden?", [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Löschen",
        style: "destructive",
        onPress: async () => {
          try {
            const { error } = await supabase.from("codes").delete().eq("id", codeId);
            if (error) throw error;
            await loadCodes();
          } catch (err: any) {
            Alert.alert("Fehler", err.message);
          }
        },
      },
    ]);
  };

  // ===== PIS TAB =====
  const loadPis = async () => {
    try {
      const { data, error } = await supabase
        .from("raspberry_pis")
        .select("*");

      if (error) throw error;
      setPis(data || []);
    } catch (err) {
      console.error("Error loading pis:", err);
    }
  };

  const handleAddPi = async () => {
    if (!piName.trim() || !piIp.trim() || !piPort.trim()) {
      Alert.alert("Fehler", "Alle Felder erforderlich");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("raspberry_pis").insert([
        {
          name: piName,
          ip_address: piIp,
          port: parseInt(piPort),
        },
      ]);

      if (error) throw error;

      setPiName("");
      setPiIp("");
      setPiPort("");
      await loadPis();
      Alert.alert("Erfolg", "Raspberry Pi hinzugefügt!");
    } catch (err: any) {
      Alert.alert("Fehler", err.message);
    }
    setLoading(false);
  };

  const handleDeletePi = (piId: number) => {
    Alert.alert("Löschen bestätigen", "Soll dieser Raspberry Pi gelöscht werden?", [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Löschen",
        style: "destructive",
        onPress: async () => {
          try {
            const { error } = await supabase.from("raspberry_pis").delete().eq("id", piId);
            if (error) throw error;
            await loadPis();
          } catch (err: any) {
            Alert.alert("Fehler", err.message);
          }
        },
      },
    ]);
  };

  if (!isadmin) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#1e293b" }}>
        <Text style={{ color: "white", fontSize: 18 }}>❌ Du hast keine Admin-Berechtigung</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#1e293b" }}>
      <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
        {/* Header */}
        <Text style={{ color: "white", fontSize: 28, fontWeight: "bold", marginBottom: 16, textAlign: "center" }}>
          👑 Admin Panel
        </Text>

        {/* Tab Buttons */}
        <View style={{ flexDirection: "row", marginBottom: 20, gap: 8 }}>
          <TouchableOpacity
            onPress={() => setActiveTab("users")}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 8,
              backgroundColor: activeTab === "users" ? "#6366f1" : "#475569",
            }}
          >
            <Text style={{ color: "white", fontWeight: "bold", textAlign: "center" }}>👤 Nutzer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab("codes")}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 8,
              backgroundColor: activeTab === "codes" ? "#6366f1" : "#475569",
            }}
          >
            <Text style={{ color: "white", fontWeight: "bold", textAlign: "center" }}>🔑 Codes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab("pis")}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 8,
              backgroundColor: activeTab === "pis" ? "#6366f1" : "#475569",
            }}
          >
            <Text style={{ color: "white", fontWeight: "bold", textAlign: "center" }}>🥧 Pi</Text>
          </TouchableOpacity>
        </View>

        {loading && <ActivityIndicator size="large" color="#6366f1" style={{ marginVertical: 20 }} />}

        {/* USERS TAB */}
        {activeTab === "users" && (
          <View>
            <Text style={{ color: "white", fontSize: 20, fontWeight: "bold", marginBottom: 12 }}>Nutzerverwaltung</Text>

            {/* Users List */}
            <FlatList
              scrollEnabled={false}
              data={users}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <View style={{ backgroundColor: "#334155", padding: 12, borderRadius: 8, marginBottom: 8 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "white", fontWeight: "bold", fontSize: 16 }}>{item.username}</Text>
                      <Text style={{ color: "#cbd5e1", fontSize: 12 }}>
                        {item.Role ? "👑 Admin" : "👤 User"} • Code: {item.code}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteUser(item.id)}
                      style={{ backgroundColor: "#ef4444", padding: 8, borderRadius: 6 }}
                    >
                      <Ionicons name="trash" size={16} color="white" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />

            {/* Add User Form */}
            <View style={{ backgroundColor: "#334155", padding: 12, borderRadius: 8, marginTop: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                <Ionicons name="person-add" size={20} color="white" />
                <Text style={{ color: "white", fontWeight: "bold", fontSize: 16, marginLeft: 8 }}>Neuer Nutzer</Text>
              </View>

              <View style={{ marginBottom: 8 }}>
                <Text style={{ color: "#cbd5e1", marginBottom: 4 }}>Benutzername</Text>
                <TextInput
                  style={{
                    backgroundColor: "#1e293b",
                    color: "white",
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 6,
                  }}
                  value={newUsername}
                  onChangeText={setNewUsername}
                  placeholder="Username"
                  placeholderTextColor="#64748b"
                />
              </View>

              <View style={{ marginBottom: 8 }}>
                <Text style={{ color: "#cbd5e1", marginBottom: 4 }}>Passwort</Text>
                <TextInput
                  style={{
                    backgroundColor: "#1e293b",
                    color: "white",
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 6,
                  }}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Passwort"
                  placeholderTextColor="#64748b"
                  secureTextEntry
                />
              </View>

              <View style={{ marginBottom: 12 }}>
                <TouchableOpacity
                  onPress={() => setNewIsAdmin(!newIsAdmin)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: newIsAdmin ? "#10b981" : "#475569",
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 6,
                  }}
                >
                  <Ionicons name={newIsAdmin ? "checkmark-circle-sharp" : "ellipse-outline"} size={18} color="white" />
                  <Text style={{ color: "white", marginLeft: 8 }}>Admin Rolle</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={handleAddUser}
                disabled={loading}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#6366f1",
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 6,
                  justifyContent: "center",
                }}
              >
                <Ionicons name="add-circle" size={18} color="white" />
                <Text style={{ color: "white", fontWeight: "bold", marginLeft: 8 }}>Nutzer hinzufügen</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* CODES TAB */}
        {activeTab === "codes" && (
          <View>
            <Text style={{ color: "white", fontSize: 20, fontWeight: "bold", marginBottom: 12 }}>Code-Verwaltung</Text>

            {/* Codes List */}
            <FlatList
              scrollEnabled={false}
              data={codes}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <View style={{ backgroundColor: "#334155", padding: 12, borderRadius: 8, marginBottom: 8 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <View>
                      <Text style={{ color: "white", fontWeight: "bold", fontSize: 16 }}>{item.code}</Text>
                      <Text style={{ color: "#cbd5e1", fontSize: 12 }}>
                        {item.genutzt ? "✅ Verwendet" : "⏳ Verfügbar"}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteCode(item.id)}
                      style={{ backgroundColor: "#ef4444", padding: 8, borderRadius: 6 }}
                    >
                      <Ionicons name="trash" size={16} color="white" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />

            {/* Add Code Form */}
            <View style={{ backgroundColor: "#334155", padding: 12, borderRadius: 8, marginTop: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                <Ionicons name="key" size={20} color="white" />
                <Text style={{ color: "white", fontWeight: "bold", fontSize: 16, marginLeft: 8 }}>Neuer Code</Text>
              </View>

              <TextInput
                style={{
                  backgroundColor: "#1e293b",
                  color: "white",
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 6,
                  marginBottom: 12,
                }}
                value={newCode}
                onChangeText={(text) => setNewCode(text.toUpperCase().slice(0, 8))}
                placeholder="12345678"
                placeholderTextColor="#64748b"
                maxLength={8}
              />

              <TouchableOpacity
                onPress={handleAddCode}
                disabled={loading}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#6366f1",
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 6,
                  justifyContent: "center",
                }}
              >
                <Ionicons name="add-circle" size={18} color="white" />
                <Text style={{ color: "white", fontWeight: "bold", marginLeft: 8 }}>Code hinzufügen</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* PIS TAB */}
        {activeTab === "pis" && (
          <View>
            <Text style={{ color: "white", fontSize: 20, fontWeight: "bold", marginBottom: 12 }}>Raspberry Pi Management</Text>

            {/* Pis List */}
            <FlatList
              scrollEnabled={false}
              data={pis}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <View style={{ backgroundColor: "#334155", padding: 12, borderRadius: 8, marginBottom: 8 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <View>
                      <Text style={{ color: "white", fontWeight: "bold", fontSize: 16 }}>{item.name}</Text>
                      <Text style={{ color: "#cbd5e1", fontSize: 12 }}>
                        {item.ip_address}:{item.port}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeletePi(item.id)}
                      style={{ backgroundColor: "#ef4444", padding: 8, borderRadius: 6 }}
                    >
                      <Ionicons name="trash" size={16} color="white" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />

            {/* Add Pi Form */}
            <View style={{ backgroundColor: "#334155", padding: 12, borderRadius: 8, marginTop: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                <Ionicons name="hardware-chip" size={20} color="white" />
                <Text style={{ color: "white", fontWeight: "bold", fontSize: 16, marginLeft: 8 }}>Neuer Raspberry Pi</Text>
              </View>

              <View style={{ marginBottom: 8 }}>
                <Text style={{ color: "#cbd5e1", marginBottom: 4 }}>Name</Text>
                <TextInput
                  style={{
                    backgroundColor: "#1e293b",
                    color: "white",
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 6,
                  }}
                  value={piName}
                  onChangeText={setPiName}
                  placeholder="z.B. Pi-Wohnzimmer"
                  placeholderTextColor="#64748b"
                />
              </View>

              <View style={{ marginBottom: 8 }}>
                <Text style={{ color: "#cbd5e1", marginBottom: 4 }}>IP Address</Text>
                <TextInput
                  style={{
                    backgroundColor: "#1e293b",
                    color: "white",
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 6,
                  }}
                  value={piIp}
                  onChangeText={setPiIp}
                  placeholder="192.168.1.100"
                  placeholderTextColor="#64748b"
                />
              </View>

              <View style={{ marginBottom: 12 }}>
                <Text style={{ color: "#cbd5e1", marginBottom: 4 }}>Port</Text>
                <TextInput
                  style={{
                    backgroundColor: "#1e293b",
                    color: "white",
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 6,
                  }}
                  value={piPort}
                  onChangeText={setPiPort}
                  placeholder="3000"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                />
              </View>

              <TouchableOpacity
                onPress={handleAddPi}
                disabled={loading}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#6366f1",
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 6,
                  justifyContent: "center",
                }}
              >
                <Ionicons name="add-circle" size={18} color="white" />
                <Text style={{ color: "white", fontWeight: "bold", marginLeft: 8 }}>Pi hinzufügen</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
