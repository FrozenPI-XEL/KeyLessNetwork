import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";

const PI_IP = "192.168.178.195";
const PI_PORT = 5001;

const fetchTimeout = (url: string, opts: RequestInit = {}, ms = 3000) =>
  Promise.race([
    fetch(url, opts),
    new Promise((_r, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
  ]);

const apiCall = async (path: string, method: "GET" | "POST" = "GET", body?: any) => {
  const url = `http://${PI_IP}:${PI_PORT}${path}`;

  try {
    const res = await fetchTimeout(
      url,
      {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      },
      4000,
    );

    if (!(res as Response).ok) {
      throw new Error(await (res as Response).text());
    }

    return { ok: true, data: await (res as Response).json().catch(() => ({})) };
  } catch (e: any) {
    return { ok: false, err: e.message || String(e) };
  }
};

export default function PiManager() {
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    const ping = async () => {
      const r = await apiCall("/health");

      if (r.ok) {
        setOnline(true);
        setLastError(null);
      } else {
        setOnline(false);
        setLastError(r.err);
      }

      setLoading(false);
    };

    ping();
    const id = setInterval(ping, 10000);
    return () => clearInterval(id);
  }, []);

  const lockAction = async (lock: 1 | 2, action: "open" | "close") => {
    const r = await apiCall(`/lock/${lock}/${action}`, "POST");
    if (!r.ok) {
      Alert.alert("Fehler", `Konnte Schloss ${lock} nicht ${action}: ${r.err}`);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0f172a", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={{ color: "white", marginTop: 8 }}>Verbinde...</Text>
      </View>
    );
  }

  return (
    <View style={{ flexGrow: 1, backgroundColor: "#0f172a", padding: 16 }}>
      <View style={{ backgroundColor: "#0f172a", borderRadius: 12, padding: 16 }}>
        <Text style={{ color: "white", fontSize: 28, fontWeight: "bold", marginBottom: 16, textAlign: "center" }}>
           Mein Schrank 1
        </Text>

        <Text style={{ color: "white", fontSize: 16, marginBottom: 20 }}>
          {online ? "Online" : lastError ? `Fehler: ${lastError}` : "Offline"}
        </Text>

        {[1, 2].map((lockNumber) => (
          <View key={lockNumber} style={{ marginBottom: 16 }}>
            <Text style={{ color: "white", fontWeight: "600", marginBottom: 8 }}>Schloss {lockNumber}</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                onPress={() => lockAction(lockNumber as 1 | 2, "open")}
                style={{ flex: 1, backgroundColor: "#22c55e", paddingVertical: 12, borderRadius: 10 }}
              >
                <Text style={{ color: "white", textAlign: "center", fontWeight: "bold" }}>Auf</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => lockAction(lockNumber as 1 | 2, "close")}
                style={{ flex: 1, backgroundColor: "#ef4444", paddingVertical: 12, borderRadius: 10 }}
              >
                <Text style={{ color: "white", textAlign: "center", fontWeight: "bold" }}>Zu</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
