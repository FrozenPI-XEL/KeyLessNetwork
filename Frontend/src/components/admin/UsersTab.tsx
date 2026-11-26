import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../hooks/supabase-client";
import type { FunctionReturns } from "../../types/database";
import {
  cardStyle,
  dangerButton,
  headingStyle,
  mutedText,
  runAdminAction,
  throwIfError,
} from "./ui";

type AdminUser = FunctionReturns<"kln_list_users">[number];

// Admin-Tab "Nutzer": registrierte Nutzer sehen, zu Admin machen oder löschen.
// Neue Nutzer registrieren sich selbst mit einem Code (Tab "Codes").
export default function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    () =>
      runAdminAction(
        async () => {
          const result = await supabase.rpc("kln_list_users");
          throwIfError(result);
          setUsers(result.data ?? []);
        },
        () => setLoading(false),
      ),
    [],
  );

  useEffect(() => {
    load();
  }, [load]);

  const toggleAdmin = (u: AdminUser) => {
    Alert.alert(
      u.is_admin ? "Admin-Rolle entziehen" : "Zum Admin machen",
      `${u.username} ${u.is_admin ? "verliert" : "bekommt"} Admin-Rechte.`,
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "OK",
          onPress: () =>
            runAdminAction(async () => {
              throwIfError(
                await supabase.rpc("kln_set_admin", {
                  p_user: u.user_id,
                  p_admin: !u.is_admin,
                }),
              );
              await load();
            }),
        },
      ],
    );
  };

  const removeUser = (u: AdminUser) => {
    Alert.alert(
      "Löschen bestätigen",
      `${u.username} mit Konto und allen Freigaben endgültig löschen?`,
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Löschen",
          style: "destructive",
          onPress: () =>
            runAdminAction(async () => {
              throwIfError(
                await supabase.rpc("kln_delete_user", { p_user: u.user_id }),
              );
              await load();
            }),
        },
      ],
    );
  };

  return (
    <View>
      <Text style={headingStyle}>Nutzerverwaltung</Text>
      <Text style={{ ...mutedText, marginBottom: 12 }}>
        Neue Nutzer registrieren sich selbst mit einem Code aus dem Tab „Codes“.
      </Text>

      {loading && (
        <ActivityIndicator
          size="large"
          color="#6366f1"
          style={{ marginVertical: 20 }}
        />
      )}

      {users.map((u) => (
        <View key={u.user_id} style={cardStyle}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{ color: "white", fontWeight: "bold", fontSize: 16 }}
              >
                {u.username}
              </Text>
              <Text style={mutedText}>
                {u.is_admin ? "👑 Admin" : "👤 User"}
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                onPress={() => toggleAdmin(u)}
                style={{
                  backgroundColor: "#475569",
                  padding: 8,
                  borderRadius: 6,
                }}
              >
                <Ionicons
                  name={u.is_admin ? "shield" : "shield-outline"}
                  size={16}
                  color="white"
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => removeUser(u)}
                style={dangerButton}
              >
                <Ionicons name="trash" size={16} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ))}

      {!loading && users.length === 0 ? (
        <Text style={mutedText}>Noch keine Nutzer.</Text>
      ) : null}
    </View>
  );
}
