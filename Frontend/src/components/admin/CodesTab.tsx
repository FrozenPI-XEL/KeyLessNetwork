import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getRandomBytes } from "expo-crypto";
import { supabase } from "../../hooks/supabase-client";
import type { Tables } from "../../types/database";
import {
  cardStyle,
  dangerButton,
  formCardStyle,
  headingStyle,
  inputStyle,
  mutedText,
  primaryButton,
  runAdminAction,
  throwIfError,
} from "./ui";

type CodeItem = Pick<Tables<"codes">, "id" | "code">;

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 Zeichen, ohne leicht verwechselbare (0/O, 1/I)

const randomCode = () => {
  const bytes = getRandomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i++) out += CODE_ALPHABET[bytes[i] & 31];
  return out;
};

// Admin-Tab "Codes": Einladungscodes für die Registrierung.
export default function CodesTab() {
  const [codes, setCodes] = useState<CodeItem[]>([]);
  const [newCode, setNewCode] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    () =>
      runAdminAction(
        async () => {
          const result = await supabase
            .from("codes")
            .select("id, code")
            .eq("genutzt", false)
            .order("id", { ascending: false });
          throwIfError(result);
          setCodes(result.data ?? []);
        },
        () => setLoading(false),
      ),
    [],
  );

  useEffect(() => {
    load();
  }, [load]);

  const addCode = async (value: string) => {
    const code = value.trim().toUpperCase();
    if (code.length !== 8) {
      Alert.alert("Fehler", "Code muss 8 Zeichen lang sein");
      return;
    }
    setLoading(true);
    await runAdminAction(
      async () => {
        throwIfError(
          await supabase.from("codes").insert([{ code, genutzt: false }]),
        );
        setNewCode("");
        await load();
        Alert.alert("Erfolg", `Code ${code} hinzugefügt!`);
      },
      () => setLoading(false),
    );
  };

  const deleteCode = (id: number) => {
    Alert.alert("Löschen bestätigen", "Soll dieser Code gelöscht werden?", [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Löschen",
        style: "destructive",
        onPress: () =>
          runAdminAction(async () => {
            throwIfError(await supabase.from("codes").delete().eq("id", id));
            await load();
          }),
      },
    ]);
  };

  return (
    <View>
      <Text style={headingStyle}>Code-Verwaltung</Text>
      <Text style={{ ...mutedText, marginBottom: 12 }}>
        Offene Einladungscodes (jeder Code funktioniert genau einmal).
      </Text>

      {loading && (
        <ActivityIndicator
          size="large"
          color="#6366f1"
          style={{ marginVertical: 20 }}
        />
      )}

      {codes.map((c) => (
        <View key={c.id} style={cardStyle}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View>
              <Text
                style={{ color: "white", fontWeight: "bold", fontSize: 16 }}
              >
                {c.code}
              </Text>
              <Text style={mutedText}>⏳ Verfügbar</Text>
            </View>
            <TouchableOpacity
              onPress={() => deleteCode(c.id)}
              style={dangerButton}
            >
              <Ionicons name="trash" size={16} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {!loading && codes.length === 0 ? (
        <Text style={mutedText}>Keine offenen Codes.</Text>
      ) : null}

      <View style={formCardStyle}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <Ionicons name="key" size={20} color="white" />
          <Text
            style={{
              color: "white",
              fontWeight: "bold",
              fontSize: 16,
              marginLeft: 8,
            }}
          >
            Neuer Code
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => addCode(randomCode())}
          disabled={loading}
          style={{ ...primaryButton, marginBottom: 12 }}
        >
          <Ionicons name="shuffle" size={18} color="white" />
          <Text style={{ color: "white", fontWeight: "bold", marginLeft: 8 }}>
            Zufälligen Code erzeugen
          </Text>
        </TouchableOpacity>

        <TextInput
          style={{ ...inputStyle, marginBottom: 12 }}
          value={newCode}
          onChangeText={(text) => setNewCode(text.toUpperCase().slice(0, 8))}
          placeholder="oder selbst eintippen (8 Zeichen)"
          placeholderTextColor="#64748b"
          maxLength={8}
          autoCapitalize="characters"
        />

        <TouchableOpacity
          onPress={() => addCode(newCode)}
          disabled={loading}
          style={primaryButton}
        >
          <Ionicons name="add-circle" size={18} color="white" />
          <Text style={{ color: "white", fontWeight: "bold", marginLeft: 8 }}>
            Code hinzufügen
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
