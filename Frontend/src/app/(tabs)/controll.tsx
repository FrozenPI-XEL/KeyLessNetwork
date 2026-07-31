import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";

const PI_IP = "192.168.178.195";
const PI_PORT = 5000;

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
      4000
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
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0f172a",
        }}
      >
        <ActivityIndicator size="large" color="white" />
        <Text style={{ marginTop: 8, color: "white", fontSize: 16 }}>Verbinde...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#0f172a" }}>
      <View style={{ padding: 24 }}>
        <View
          style={{
            backgroundColor: "#1e293b",
            borderRadius: 12,
            padding: 24,
          }}
        >
          <Text style={{ color: "white", fontSize: 24, fontWeight: "bold", marginBottom: 16 }}>
            Mein Schrank (Pi)
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 24,
            }}
          >
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: online ? "#22c55e" : "#ef4444",
                marginRight: 8,
              }}
            />
            <Text style={{ color: online ? "#86efac" : "#fca5a5", fontSize: 16 }}>
              {online ? "Online" : lastError ? `Fehler: ${lastError}` : "Offline"}
            </Text>
          </View>

          {[1, 2].map((l) => (
            <View key={l} style={{ marginBottom: 20 }}>
              <Text style={{ color: "white", fontWeight: "500", marginBottom: 8, fontSize: 16 }}>
                Schloss {l}
              </Text>
              <View style={{ flexDirection: "row" }}>
                <TouchableOpacity
                  onPress={() => lockAction(l as 1 | 2, "open")}
                  style={{
                    flex: 1,
                    backgroundColor: "#22c55e",
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    borderRadius: 8,
                    marginRight: 8,
                  }}
                >
                  <Text style={{ color: "white", textAlign: "center", fontWeight: "600" }}>Auf</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => lockAction(l as 1 | 2, "close")}
                  style={{
                    flex: 1,
                    backgroundColor: "#ef4444",
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ color: "white", textAlign: "center", fontWeight: "600" }}>Zu</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          <TouchableOpacity
            onPress={async () => {
              const r = await apiCall("/rainbow", "POST");
              if (!r.ok) {
                Alert.alert("Fehler", `Konnte Rainbow nicht starten: ${r.err}`);
              }
            }}
            style={{
              padding: 16,
              borderRadius: 8,
              backgroundColor: "#475569",
              marginTop: 8,
            }}
          >
            <Text style={{ color: "white", textAlign: "center", fontWeight: "bold", fontSize: 16 }}>
              LOCATE
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
