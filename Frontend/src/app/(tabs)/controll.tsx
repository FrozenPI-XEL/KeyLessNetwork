import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from "react-native";

const PI_IP = "192.168.178.136";
const PI_PORT = 5000;

const fetchTimeout = (url: string, opts: RequestInit = {}, ms = 3000) =>
  Promise.race([
    fetch(url, opts),
    new Promise((_r, rej) => setTimeout(() => rej(new Error("timeout")), ms))
  ]);

const apiCall = async (path: string, method: "GET" | "POST" = "GET", body?: any) => {
  const url = `http://${PI_IP}:${PI_PORT}${path}`;
  try {
    const res = await fetchTimeout(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined
    }, 4000);

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

  // Ping alle 10 Sekunden
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
      <View className="flex-1 items-center justify-center bg-slate-900">
        <ActivityIndicator size="large" color="white" />
        <Text className="mt-2 text-white">Verbinde...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-900 p-6">
      <Text className="text-white text-2xl font-bold mb-4">Mein Schrank (Pi)</Text>
      <Text className="text-white mb-4">
        {online ? "Online" : lastError ? `Fehler: ${lastError}` : "Offline"}
      </Text>

      {[1, 2].map((l) => (
        <View key={l} className="mb-4">
          <Text className="text-white font-medium mb-2">Schloss {l}</Text>
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => lockAction(l as 1 | 2, "open")}
              className="flex-1 bg-green-500 px-3 py-2 rounded-lg"
            >
              <Text className="text-white text-center">Auf</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => lockAction(l as 1 | 2, "close")}
              className="flex-1 bg-red-500 px-3 py-2 rounded-lg"
            >
              <Text className="text-white text-center">Zu</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}
