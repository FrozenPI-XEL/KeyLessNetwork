import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { getRandomBytes } from "expo-crypto";
import { hmac } from "@noble/hashes/hmac";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex, hexToBytes, utf8ToBytes } from "@noble/hashes/utils";

// ---------------------------------------------------------------------------
// Typen
// ---------------------------------------------------------------------------
type Pi = {
  id: string;
  name: string;
  host: string;
  port: number;
  https: boolean;
  deviceId: string;
  keyHex: string; // 64 Hex-Zeichen, geheimer Geräteschlüssel (nur im SecureStore!)
};

type ApiResult = { ok: true; data: any } | { ok: false; err: string };

const FALLBACK_LOCKS = [1, 2, 3, 4];
const MAX_CLOCK_SKEW_SECONDS = 30;

// ---------------------------------------------------------------------------
// Speicher (SecureStore = iOS Keychain / Android Keystore)
// ---------------------------------------------------------------------------
const INDEX_KEY = "kln_pi_index";
const piKey = (id: string) => `kln_pi_${id}`;

async function loadPis(): Promise<Pi[]> {
  try {
    const raw = await SecureStore.getItemAsync(INDEX_KEY);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    const pis = await Promise.all(
      ids.map(async (id) => {
        const r = await SecureStore.getItemAsync(piKey(id));
        return r ? (JSON.parse(r) as Pi) : null;
      }),
    );
    return pis.filter((p): p is Pi => p !== null);
  } catch {
    return [];
  }
}

async function savePi(pi: Pi): Promise<void> {
  const raw = await SecureStore.getItemAsync(INDEX_KEY);
  const ids: string[] = raw ? JSON.parse(raw) : [];
  if (!ids.includes(pi.id)) ids.push(pi.id);
  await SecureStore.setItemAsync(piKey(pi.id), JSON.stringify(pi));
  await SecureStore.setItemAsync(INDEX_KEY, JSON.stringify(ids));
}

async function deletePi(id: string): Promise<void> {
  const raw = await SecureStore.getItemAsync(INDEX_KEY);
  const ids: string[] = raw ? JSON.parse(raw) : [];
  await SecureStore.deleteItemAsync(piKey(id));
  await SecureStore.setItemAsync(INDEX_KEY, JSON.stringify(ids.filter((i) => i !== id)));
}

// ---------------------------------------------------------------------------
// Signierte API-Aufrufe (passend zu backend/main.py, siehe FRONTEND_CHANGES.md)
// ---------------------------------------------------------------------------
const constantTimeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

const apiCall = async (
  pi: Pi,
  path: string,
  method: "GET" | "POST" = "GET",
  body?: any,
): Promise<ApiResult> => {
  const bodyText = body ? JSON.stringify(body) : "";
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = bytesToHex(getRandomBytes(16)); // 32 Hex-Zeichen, bei jeder Anfrage neu

  const canonical = [
    "KLN1",
    method,
    path,
    "", // Query (hier nie vorhanden)
    timestamp,
    nonce,
    bytesToHex(sha256(utf8ToBytes(bodyText))),
  ].join("\n");

  const key = hexToBytes(pi.keyHex);
  const signature = bytesToHex(hmac(sha256, key, utf8ToBytes(canonical)));

  const headers: Record<string, string> = {
    "X-Device-Id": pi.deviceId,
    "X-Timestamp": timestamp,
    "X-Nonce": nonce,
    "X-Signature": signature,
  };
  if (bodyText) headers["Content-Type"] = "application/json";

  const url = `${pi.https ? "https" : "http"}://${pi.host}:${pi.port}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: bodyText || undefined,
      signal: controller.signal,
    });
    const text = await res.text();

    if (res.status === 401) {
      return {
        ok: false,
        err: "Nicht autorisiert. Schlüssel, Geräte-ID oder Uhrzeit (max. 30 s Abweichung) prüfen.",
      };
    }
    if (res.status === 429) {
      return { ok: false, err: "Zu viele Fehlversuche, der Pi hat dich 5 Minuten gesperrt." };
    }
    if (!res.ok) {
      return { ok: false, err: `Serverfehler (HTTP ${res.status})` };
    }

    // Antwort des Pi prüfen: nur wenn die Signatur stimmt, wird sie akzeptiert.
    const respTs = res.headers.get("X-Response-Timestamp") ?? "";
    const respSig = (res.headers.get("X-Response-Signature") ?? "").toLowerCase();
    const respCanonical = [
      "KLN1-RESP",
      nonce,
      respTs,
      String(res.status),
      bytesToHex(sha256(utf8ToBytes(text))),
    ].join("\n");
    const expected = bytesToHex(hmac(sha256, key, utf8ToBytes(respCanonical)));
    const skew = Math.abs(Date.now() / 1000 - Number(respTs));

    if (!respTs || !respSig || !constantTimeEqual(expected, respSig) || !(skew <= MAX_CLOCK_SKEW_SECONDS)) {
      return { ok: false, err: "Antwort nicht vertrauenswürdig (Signatur ungültig)." };
    }

    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      /* leere Antwort */
    }
    return { ok: true, data };
  } catch (e: any) {
    if (e?.name === "AbortError") return { ok: false, err: "Zeitüberschreitung" };
    return { ok: false, err: e?.message || String(e) };
  } finally {
    clearTimeout(timer);
  }
};

// ---------------------------------------------------------------------------
// Bisherige Control-Ansicht (jetzt pro Pi)
// ---------------------------------------------------------------------------
function ControlView({ pi, onBack }: { pi: Pi; onBack: () => void }) {
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [locks, setLocks] = useState<number[]>(FALLBACK_LOCKS);

  useEffect(() => {
    let cancelled = false;
    const ping = async () => {
      const r = await apiCall(pi, "/health");
      if (cancelled) return;
      if (r.ok) {
        setOnline(true);
        setLastError(null);
        if (Array.isArray(r.data?.motors) && r.data.motors.length > 0) {
          setLocks(r.data.motors as number[]);
        }
      } else {
        setOnline(false);
        setLastError(r.err);
      }
      setLoading(false);
    };
    ping();
    const id = setInterval(ping, 10000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [pi]);

  const lockAction = async (lock: number, action: "open" | "close") => {
    const r = await apiCall(pi, `/lock/${lock}/${action}`, "POST");
    if (!r.ok) {
      Alert.alert("Fehler", `Konnte Schloss ${lock} nicht ${action}: ${r.err}`);
    } else if (r.data?.success === false) {
      Alert.alert("Hinweis", String(r.data.error ?? "Aktion nicht möglich"));
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0f172a", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={{ color: "white", marginTop: 8 }}>Verbinde...</Text>
        <TouchableOpacity onPress={onBack} style={{ marginTop: 24 }}>
          <Text style={{ color: "#94a3b8" }}>Abbrechen</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#0f172a" }} contentContainerStyle={{ flexGrow: 1, padding: 16 }}>
      <TouchableOpacity onPress={onBack} style={{ marginBottom: 12 }}>
        <Text style={{ color: "#94a3b8", fontSize: 16 }}>‹ Alle Schränke</Text>
      </TouchableOpacity>

      <View style={{ backgroundColor: "#0f172a", borderRadius: 12, padding: 16 }}>
        <Text style={{ color: "white", fontSize: 28, fontWeight: "bold", marginBottom: 16, textAlign: "center" }}>
          {pi.name}
        </Text>

        <Text style={{ color: "white", fontSize: 16, marginBottom: 20 }}>
          {online ? "Online" : lastError ? `Fehler: ${lastError}` : "Offline"}
        </Text>

        {locks.map((lockNumber) => (
          <View key={lockNumber} style={{ marginBottom: 16 }}>
            <Text style={{ color: "white", fontWeight: "600", marginBottom: 8 }}>Schloss {lockNumber}</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                onPress={() => lockAction(lockNumber, "open")}
                style={{ flex: 1, backgroundColor: "#22c55e", paddingVertical: 12, borderRadius: 10 }}
              >
                <Text style={{ color: "white", textAlign: "center", fontWeight: "bold" }}>Auf</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => lockAction(lockNumber, "close")}
                style={{ flex: 1, backgroundColor: "#ef4444", paddingVertical: 12, borderRadius: 10 }}
              >
                <Text style={{ color: "white", textAlign: "center", fontWeight: "bold" }}>Zu</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Formular: neuen Schrank / Pi hinzufügen
// ---------------------------------------------------------------------------
const inputStyle = {
  backgroundColor: "#1e293b",
  color: "white",
  borderRadius: 10,
  paddingHorizontal: 12,
  paddingVertical: 10,
  marginBottom: 10,
} as const;

function AddPiForm({ onSaved, onCancel }: { onSaved: (pi: Pi) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("8443");
  const [https, setHttps] = useState(true);
  const [deviceId, setDeviceId] = useState("");
  const [keyHex, setKeyHex] = useState("");

  const submit = async () => {
    const cleanKey = keyHex.trim().toLowerCase();
    const portNum = Number(port);
    if (!name.trim() || !host.trim() || !deviceId.trim()) {
      Alert.alert("Fehlt noch etwas", "Name, Adresse und Geräte-ID ausfüllen.");
      return;
    }
    if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
      Alert.alert("Ungültiger Port", "Bitte eine Zahl zwischen 1 und 65535 eingeben.");
      return;
    }
    if (!/^[0-9a-f]{64}$/.test(cleanKey)) {
      Alert.alert("Ungültiger Schlüssel", "Der Schlüssel besteht aus genau 64 Hex-Zeichen (0-9, a-f).");
      return;
    }
    const pi: Pi = {
      id: `${Date.now().toString(36)}${bytesToHex(getRandomBytes(3))}`,
      name: name.trim(),
      host: host.trim(),
      port: portNum,
      https,
      deviceId: deviceId.trim(),
      keyHex: cleanKey,
    };
    try {
      await savePi(pi);
      onSaved(pi);
    } catch (e: any) {
      Alert.alert("Speichern fehlgeschlagen", e?.message || String(e));
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#0f172a" }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ color: "white", fontSize: 24, fontWeight: "bold", marginBottom: 16 }}>Schrank hinzufügen</Text>

      <TextInput style={inputStyle} placeholder="Name (z. B. Mein Schrank 1)" placeholderTextColor="#64748b" value={name} onChangeText={setName} />
      <TextInput
        style={inputStyle}
        placeholder="Adresse (z. B. 192.168.178.195)"
        placeholderTextColor="#64748b"
        autoCapitalize="none"
        autoCorrect={false}
        value={host}
        onChangeText={setHost}
      />
      <TextInput style={inputStyle} placeholder="Port" placeholderTextColor="#64748b" keyboardType="number-pad" value={port} onChangeText={setPort} />

      <TouchableOpacity
        onPress={() => {
          setHttps(!https);
          setPort(https ? "8000" : "8443");
        }}
        style={{ marginBottom: 12 }}
      >
        <Text style={{ color: https ? "#22c55e" : "#f59e0b" }}>
          {https ? "HTTPS (sicher) – antippen zum Wechseln" : "HTTP (unsicher, nur zum Testen) – antippen zum Wechseln"}
        </Text>
      </TouchableOpacity>

      <TextInput
        style={inputStyle}
        placeholder="Geräte-ID (wie bei genkey)"
        placeholderTextColor="#64748b"
        autoCapitalize="none"
        autoCorrect={false}
        value={deviceId}
        onChangeText={setDeviceId}
      />
      <TextInput
        style={inputStyle}
        placeholder="Schlüssel (64 Hex-Zeichen)"
        placeholderTextColor="#64748b"
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        value={keyHex}
        onChangeText={setKeyHex}
      />

      <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
        <TouchableOpacity onPress={onCancel} style={{ flex: 1, backgroundColor: "#334155", paddingVertical: 12, borderRadius: 10 }}>
          <Text style={{ color: "white", textAlign: "center", fontWeight: "bold" }}>Abbrechen</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={submit} style={{ flex: 1, backgroundColor: "#22c55e", paddingVertical: 12, borderRadius: 10 }}>
          <Text style={{ color: "white", textAlign: "center", fontWeight: "bold" }}>Speichern</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Hauptansicht: Schrankliste mit Suche -> Klick öffnet die Control-Ansicht
// ---------------------------------------------------------------------------
export default function PiManager() {
  const [pis, setPis] = useState<Pi[]>([]);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Pi | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadPis().then((list) => {
      setPis(list);
      setReady(true);
    });
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pis;
    return pis.filter((p) => p.name.toLowerCase().includes(q) || p.host.toLowerCase().includes(q));
  }, [pis, query]);

  const confirmDelete = useCallback((pi: Pi) => {
    Alert.alert("Schrank entfernen", `„${pi.name}" und den gespeicherten Schlüssel von diesem Gerät löschen?`, [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Löschen",
        style: "destructive",
        onPress: async () => {
          await deletePi(pi.id);
          setPis((prev) => prev.filter((p) => p.id !== pi.id));
        },
      },
    ]);
  }, []);

  if (selected) {
    return <ControlView pi={selected} onBack={() => setSelected(null)} />;
  }

  if (adding) {
    return (
      <AddPiForm
        onCancel={() => setAdding(false)}
        onSaved={(pi) => {
          setPis((prev) => [...prev, pi]);
          setAdding(false);
        }}
      />
    );
  }

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0f172a", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#0f172a", padding: 16 }}>
      <Text style={{ color: "white", fontSize: 28, fontWeight: "bold", marginBottom: 16, textAlign: "center" }}>
        Meine Schränke
      </Text>

      <TextInput
        style={inputStyle}
        placeholder="Schrank suchen…"
        placeholderTextColor="#64748b"
        autoCapitalize="none"
        autoCorrect={false}
        value={query}
        onChangeText={setQuery}
      />

      <FlatList
        data={filtered}
        keyExtractor={(p) => p.id}
        style={{ flex: 1 }}
        ListEmptyComponent={
          <Text style={{ color: "#94a3b8", textAlign: "center", marginTop: 24 }}>
            {pis.length === 0 ? "Noch kein Schrank gespeichert. Füge unten einen hinzu." : "Kein Schrank gefunden."}
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setSelected(item)}
            onLongPress={() => confirmDelete(item)}
            style={{ backgroundColor: "#1e293b", borderRadius: 12, padding: 16, marginBottom: 10 }}
          >
            <Text style={{ color: "white", fontSize: 18, fontWeight: "600" }}>{item.name}</Text>
            <Text style={{ color: "#94a3b8", marginTop: 4 }}>
              {item.https ? "https" : "http"}://{item.host}:{item.port}
            </Text>
          </TouchableOpacity>
        )}
      />

      <Text style={{ color: "#64748b", fontSize: 12, textAlign: "center", marginBottom: 8 }}>
        Lange drücken zum Entfernen
      </Text>
      <TouchableOpacity onPress={() => setAdding(true)} style={{ backgroundColor: "#22c55e", paddingVertical: 14, borderRadius: 10 }}>
        <Text style={{ color: "white", textAlign: "center", fontWeight: "bold" }}>+ Schrank hinzufügen</Text>
      </TouchableOpacity>
    </View>
  );
}
