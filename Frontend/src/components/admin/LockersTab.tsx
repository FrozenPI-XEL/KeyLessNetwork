import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { supabase } from "../../hooks/supabase-client";
import {
  cardStyle,
  dangerButton,
  formCardStyle,
  headingStyle,
  inputStyle,
  labelStyle,
  mutedText,
  primaryButton,
} from "./ui";

type LockerRow = {
  id: string;
  name: string;
  host: string;
  port: number;
  https: boolean;
};
type AdminUser = { user_id: string; username: string; is_admin: boolean };

// Der Setup-Code kommt vom Pi (python main.py init): "KLN1-" + 96 Hex-Zeichen = Locker-ID (32) + Schlüssel (64).
function parseSetupCode(input: string): { id: string; keyHex: string } | null {
  const hex = input
    .trim()
    .replace(/^KLN1[\s-]*/i, "")
    .replace(/[^0-9a-fA-F]/g, "")
    .toLowerCase();
  if (hex.length !== 96) return null;
  const i = hex.slice(0, 32);
  const id = `${i.slice(0, 8)}-${i.slice(8, 12)}-${i.slice(12, 16)}-${i.slice(16, 20)}-${i.slice(20)}`;
  return { id, keyHex: hex.slice(32) };
}

// Wer darf diesen Locker benutzen?
function MembersPanel({
  cab,
  onClose,
}: {
  cab: LockerRow;
  onClose: () => void;
}) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [allowed, setAllowed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [u, m] = await Promise.all([
      supabase.rpc("kln_list_users"),
      supabase
        .from("kln_locker_members")
        .select("user_id")
        .eq("locker_id", cab.id),
    ]);
    if (u.error) Alert.alert("Fehler", u.error.message);
    else setUsers((u.data ?? []) as AdminUser[]);
    if (m.error) Alert.alert("Fehler", m.error.message);
    else
      setAllowed(new Set((m.data ?? []).map((r: any) => r.user_id as string)));
    setLoading(false);
  }, [cab.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Daten beim Öffnen einmal laden
    load();
  }, [load]);

  const toggle = async (u: AdminUser) => {
    const next = !allowed.has(u.user_id);
    const { error } = await supabase.rpc("kln_set_member", {
      p_locker: cab.id,
      p_user: u.user_id,
      p_allowed: next,
    });
    if (error) {
      Alert.alert("Fehler", error.message);
      return;
    }
    setAllowed((prev) => {
      const copy = new Set(prev);
      if (next) copy.add(u.user_id);
      else copy.delete(u.user_id);
      return copy;
    });
  };

  return (
    <View>
      <TouchableOpacity onPress={onClose} style={{ marginBottom: 12 }}>
        <Text style={{ color: "#94a3b8", fontSize: 16 }}>
          ‹ Zurück zu den Lockern
        </Text>
      </TouchableOpacity>
      <Text style={headingStyle}>Zugriff auf „{cab.name}“</Text>
      <Text style={{ ...mutedText, marginBottom: 12 }}>
        Admins haben immer Zugriff. Ein entzogener Zugriff wirkt am Pi nach
        spätestens einer Minute.
      </Text>

      {loading && (
        <ActivityIndicator
          size="large"
          color="#6366f1"
          style={{ marginVertical: 20 }}
        />
      )}

      {users.map((u) => {
        const has = u.is_admin || allowed.has(u.user_id);
        return (
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
                  {u.is_admin
                    ? "👑 Admin (immer Zugriff)"
                    : has
                      ? "✅ Freigegeben"
                      : "Nicht freigegeben"}
                </Text>
              </View>
              {!u.is_admin && (
                <TouchableOpacity
                  onPress={() => toggle(u)}
                  style={{
                    backgroundColor: has ? "#ef4444" : "#10b981",
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 6,
                  }}
                >
                  <Text style={{ color: "white", fontWeight: "bold" }}>
                    {has ? "Entziehen" : "Freigeben"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// Admin-Tab "Locker": einrichten, Schlüssel erneuern, Zugriff verwalten, löschen.
export default function LockersTab() {
  const [lockers, setLockers] = useState<LockerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [memberTarget, setMemberTarget] = useState<LockerRow | null>(null);

  const [name, setName] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("8443");
  const [https, setHttps] = useState(false);
  const [code, setCode] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("kln_lockers")
      .select("id,name,host,port,https")
      .order("name");
    if (error) Alert.alert("Fehler", error.message);
    else setLockers((data ?? []) as LockerRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Daten beim Öffnen einmal laden
    load();
  }, [load]);

  const submit = async () => {
    const parsed = parseSetupCode(code);
    const portNum = Number(port);
    if (!name.trim() || !host.trim()) {
      Alert.alert("Fehler", "Name und Adresse sind erforderlich");
      return;
    }
    if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
      Alert.alert("Fehler", "Port muss eine Zahl zwischen 1 und 65535 sein");
      return;
    }
    if (!parsed) {
      Alert.alert(
        "Ungültiger Setup-Code",
        "Der Code vom Pi besteht aus 96 Hex-Zeichen (mit Bindestrichen). Bitte komplett einfügen.",
      );
      return;
    }
    setLoading(true);
    try {
      const c = await supabase.from("kln_lockers").upsert({
        id: parsed.id,
        name: name.trim(),
        host: host.trim(),
        port: portNum,
        https,
      });
      if (c.error) throw new Error(c.error.message);
      const s = await supabase
        .from("kln_locker_secrets")
        .upsert({ locker_id: parsed.id, key_hex: parsed.keyHex });
      if (s.error) throw new Error(s.error.message);
      setName("");
      setHost("");
      setCode("");
      await load();
      Alert.alert(
        "Erfolg",
        "Locker gespeichert. Jetzt unter „Zugriff“ Nutzer freigeben.",
      );
    } catch (e: any) {
      Alert.alert("Fehler", e?.message || String(e));
    }
    setLoading(false);
  };

  const parsedCode = parseSetupCode(code);

  // Setup-Code aus der Zwischenablage holen, ohne dass die Tastatur geöffnet werden muss.
  const pasteCode = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (!text.trim()) {
        Alert.alert(
          "Zwischenablage leer",
          "Kopiere zuerst den Setup-Code (KLN1-…) aus Termius.",
        );
        return;
      }
      setCode(text.trim());
      Keyboard.dismiss();
    } catch (e: any) {
      Alert.alert("Fehler", e?.message || String(e));
    }
  };

  const deleteLocker = (cab: LockerRow) => {
    Alert.alert(
      "Löschen bestätigen",
      `„${cab.name}“ mit Schlüssel und allen Freigaben aus der Datenbank entfernen?`,
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Löschen",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from("kln_lockers")
              .delete()
              .eq("id", cab.id);
            if (error) Alert.alert("Fehler", error.message);
            else load();
          },
        },
      ],
    );
  };

  if (memberTarget) {
    return (
      <MembersPanel cab={memberTarget} onClose={() => setMemberTarget(null)} />
    );
  }

  return (
    <View>
      <Text style={headingStyle}>Locker-Management</Text>

      {loading && (
        <ActivityIndicator
          size="large"
          color="#6366f1"
          style={{ marginVertical: 20 }}
        />
      )}

      {lockers.map((cab) => (
        <View key={cab.id} style={cardStyle}>
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
                {cab.name}
              </Text>
              <Text style={mutedText}>
                {cab.https ? "https" : "http"}://{cab.host}:{cab.port}
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                onPress={() => setMemberTarget(cab)}
                style={{
                  backgroundColor: "#475569",
                  padding: 8,
                  borderRadius: 6,
                }}
              >
                <Ionicons name="people" size={16} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => deleteLocker(cab)}
                style={dangerButton}
              >
                <Ionicons name="trash" size={16} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ))}

      {!loading && lockers.length === 0 ? (
        <Text style={mutedText}>Noch kein Locker eingerichtet.</Text>
      ) : null}

      <View style={formCardStyle}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <Ionicons name="hardware-chip" size={20} color="white" />
          <Text
            style={{
              color: "white",
              fontWeight: "bold",
              fontSize: 16,
              marginLeft: 8,
            }}
          >
            Locker einrichten
          </Text>
        </View>
        <Text style={{ ...mutedText, marginBottom: 12 }}>
          Auf dem Pi „python main.py init“ ausführen und den angezeigten
          Setup-Code hier einfügen. Mit einem neuen Code (python main.py rotate)
          wird der Schlüssel eines bestehenden Lockers erneuert.
        </Text>

        <View style={{ marginBottom: 12 }}>
          <Text style={labelStyle}>Setup-Code vom Pi</Text>
          <TouchableOpacity
            onPress={pasteCode}
            style={{ ...primaryButton, marginBottom: 8 }}
          >
            <Ionicons name="clipboard" size={18} color="white" />
            <Text style={{ color: "white", fontWeight: "bold", marginLeft: 8 }}>
              Aus Zwischenablage einfügen
            </Text>
          </TouchableOpacity>
          <TextInput
            style={{ ...inputStyle, minHeight: 80 }}
            value={code}
            onChangeText={setCode}
            placeholder="oder hier einfügen: KLN1-…"
            placeholderTextColor="#64748b"
            autoCapitalize="none"
            autoCorrect={false}
            multiline
          />
          <Text
            style={{
              ...mutedText,
              marginTop: 6,
              color: parsedCode ? "#4ade80" : "#cbd5e1",
            }}
          >
            {code.trim() === ""
              ? "Noch kein Code eingefügt."
              : parsedCode
                ? "✓ Code erkannt"
                : "Code unvollständig oder ungültig (96 Hex-Zeichen erwartet)."}
          </Text>
        </View>

        <View style={{ marginBottom: 8 }}>
          <Text style={labelStyle}>Name</Text>
          <TextInput
            style={inputStyle}
            value={name}
            onChangeText={setName}
            placeholder="z.B. Locker 1"
            placeholderTextColor="#64748b"
          />
        </View>

        <View style={{ marginBottom: 8 }}>
          <Text style={labelStyle}>IP-Adresse</Text>
          <TextInput
            style={inputStyle}
            value={host}
            onChangeText={setHost}
            placeholder="192.168.1.100"
            placeholderTextColor="#64748b"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={{ marginBottom: 8 }}>
          <Text style={labelStyle}>Port</Text>
          <TextInput
            style={inputStyle}
            value={port}
            onChangeText={setPort}
            placeholder="8443"
            placeholderTextColor="#64748b"
            keyboardType="numeric"
          />
        </View>

        <TouchableOpacity
          onPress={() => setHttps(!https)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: https ? "#10b981" : "#475569",
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 6,
            marginBottom: 8,
          }}
        >
          <Ionicons
            name={https ? "checkmark-circle-sharp" : "ellipse-outline"}
            size={18}
            color="white"
          />
          <Text style={{ color: "white", marginLeft: 8 }}>
            Pi läuft mit HTTPS (TLS)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={submit}
          disabled={loading}
          style={primaryButton}
        >
          <Ionicons name="add-circle" size={18} color="white" />
          <Text style={{ color: "white", fontWeight: "bold", marginLeft: 8 }}>
            Locker speichern
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
