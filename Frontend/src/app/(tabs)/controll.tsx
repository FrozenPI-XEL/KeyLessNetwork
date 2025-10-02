import React, { useEffect, useState, useCallback } from "react";
import {View,Text,TouchableOpacity,FlatList,TextInput,Modal,Alert, ActivityIndicator,} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { v4 as uuidv4 } from "uuid"; 


type PiDevice = {
  id: string;
  name: string;     // z.B. "pi"
  host: string;     // z.B. "pi.local" oder "192.168.178.50"
  port: number;     // z.B. 5000
  lastSeen?: number; 
  lastError?: string | null;
};

const STORAGE_KEY = "MY_PIS_v1";

function timeoutFetch(url: string, opts: RequestInit = {}, ms = 3000) {
  return Promise.race([
    fetch(url, opts),
    new Promise((_r, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
  ]);
}

async function callPiApi(pi: PiDevice, path: string, method: "GET" | "POST" = "GET", body?: any) {
  const url = `http://${pi.host}:${pi.port}${path}`;
  try {
    const res = await timeoutFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    }, 4000); // 4s timeout
    if (!(res as Response).ok) {
      const text = await (res as Response).text();
      throw new Error(`HTTP ${(res as Response).status}: ${text || (res as Response).statusText}`);
    }
    const json = await (res as Response).json().catch(() => ({}));
    return { ok: true, data: json };
  } catch (e: any) {
    return { ok: false, error: e.message || String(e) };
  }
}

export default function PiManagerScreen() {
  const [pis, setPis] = useState<PiDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminVisible, setAdminVisible] = useState(false);
  const [editingPi, setEditingPi] = useState<Partial<PiDevice> | null>(null);
  const [scanning, setScanning] = useState(false);

  // Load saved Pis
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setPis(JSON.parse(raw));
      } catch (e) {
        console.warn("Failed to load Pis:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Persist Pis
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(pis)).catch((e) =>
      console.warn("save failed", e)
    );
  }, [pis]);

  // Heartbeat: ping all Pis every 10s
  useEffect(() => {
    let mounted = true;
    async function pingAll() {
      if (!mounted) return;
      const updated = await Promise.all(
        pis.map(async (p) => {
          const r = await callPiApi(p, "/health", "GET");
          if (r.ok) {
            return { ...p, lastSeen: Date.now(), lastError: null };
          } else {
            return { ...p, lastError: r.error, lastSeen: p.lastSeen };
          }
        })
      );
      if (mounted) setPis(updated);
    }
    // initial
    pingAll();
    const id = setInterval(pingAll, 10_000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [pis.length]); // rebind when number of Pis changes

  const openAdminForNew = () => {
    setEditingPi({ name: "", host: "pi.local", port: 5000 });
    setAdminVisible(true);
  };

  const savePi = async (data: Partial<PiDevice>) => {
    const pi: PiDevice = {
      id: data.id ?? uuidv4?.() ?? String(Date.now()),
      name: (data.name || "pi").trim(),
      host: (data.host || "pi.local").trim(),
      port: Number(data.port || 5000),
      lastSeen: data.lastSeen,
      lastError: data.lastError ?? null,
    };
    setPis((prev) => {
      const idx = prev.findIndex((p) => p.id === pi.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = pi;
        return copy;
      }
      return [pi, ...prev];
    });
    setAdminVisible(false);
    setEditingPi(null);
  };

  const deletePi = (id: string) => {
    Alert.alert("Löschen bestätigen", "Willst du dieses Gerät wirklich löschen?", [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Löschen",
        style: "destructive",
        onPress: () => setPis((p) => p.filter((x) => x.id !== id)),
      },
    ]);
  };

  const performLockAction = async (pi: PiDevice, lockNumber: 1 | 2, action: "open" | "close") => {
    // Example path - passe an deine Pi-API an
    const path = `/lock/${lockNumber}/${action}`;
    const result = await callPiApi(pi, path, "POST");
    if (result.ok) {
      // success — zeige Erfolg kurz als Alert
      Alert.alert("Erfolg", `Schloss ${lockNumber} ${action} erfolgreich auf ${pi.name}`);
      // update lastSeen
      setPis((prev) => prev.map((p) => (p.id === pi.id ? { ...p, lastSeen: Date.now(), lastError: null } : p)));
    } else {
      // show error messages (von Pi oder Netzwerk)
      const err = (result as { error?: string }).error || "Unbekannter Fehler";
      Alert.alert("Fehler", `Auf ${pi.name}: ${err}`);
      setPis((prev) => prev.map((p) => (p.id === pi.id ? { ...p, lastError: err } : p)));
    }
  };

  // Quick "discover pi.local" attempt
  const tryDiscoverPi = async () => {
    setScanning(true);
    const candidate: PiDevice = { id: `auto-${Date.now()}`, name: "pi", host: "pi.local", port: 5000 };
    const r = await callPiApi(candidate, "/health", "GET");
    if (r.ok) {
      // add if not exists
      setPis((prev: PiDevice[]) => {
        const exists = prev.some((p: PiDevice) => p.host === candidate.host && p.port === candidate.port);
        if (exists) return prev;
        return [{ ...candidate, lastSeen: Date.now() }, ...prev];
      });
      Alert.alert("Gefunden", "Raspberry Pi unter pi.local gefunden und hinzugefügt.");
    } else {
      Alert.alert("Nicht gefunden", `pi.local konnte nicht erreicht werden: ${(r as { error?: string }).error}`);
    }
    setScanning(false);
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" />
        <Text className="mt-2">Lade gespeicherte Geräte …</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white p-4">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-2xl font-bold">Raspberry Pi Manager</Text>
        <View className="flex-row">
          <TouchableOpacity
            onPress={tryDiscoverPi}
            className="bg-blue-500 px-3 py-2 rounded-md mr-2"
            accessibilityLabel="Try discover"
          >
            <Text className="text-white">Find pi.local</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={openAdminForNew}
            className="bg-green-600 px-3 py-2 rounded-md"
            accessibilityLabel="Add new"
          >
            <Text className="text-white">Admin (Add)</Text>
          </TouchableOpacity>
        </View>
      </View>

      {scanning && (
        <View className="mb-2">
          <Text>Scanning pi.local …</Text>
        </View>
      )}

      <FlatList
        data={pis}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View className="h-2" />}
        renderItem={({ item }) => {
          const online = !!item.lastSeen && Date.now() - item.lastSeen < 20_000;
          return (
            <View className="border rounded-lg p-3 bg-gray-50">
              <View className="flex-row justify-between">
                <View>
                  <Text className="text-lg font-semibold">{item.name}</Text>
                  <Text className="text-sm text-gray-600">{item.host}:{item.port}</Text>
                  <Text className="text-xs mt-1">
                    {online ? "Online" : item.lastError ? `Fehler: ${item.lastError}` : "Offline"}
                  </Text>
                </View>
                <View className="flex-col items-end">
                  <TouchableOpacity
                    onPress={() => { setEditingPi(item); setAdminVisible(true); }}
                    className="px-2 py-1 border rounded mb-2"
                  >
                    <Text>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => deletePi(item.id)}
                    className="px-2 py-1 border rounded"
                  >
                    <Text>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View className="flex-row justify-between mt-3">
                <View className="flex-1 mr-2">
                  <Text className="font-medium mb-2">Schloss 1</Text>
                  <View className="flex-row">
                    <TouchableOpacity
                      onPress={() => performLockAction(item, 1, "open")}
                      className="flex-1 px-3 py-2 border rounded mr-1"
                    >
                      <Text className="text-center">Auf</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => performLockAction(item, 1, "close")}
                      className="flex-1 px-3 py-2 border rounded ml-1"
                    >
                      <Text className="text-center">Zu</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View className="flex-1 ml-2">
                  <Text className="font-medium mb-2">Schloss 2</Text>
                  <View className="flex-row">
                    <TouchableOpacity
                      onPress={() => performLockAction(item, 2, "open")}
                      className="flex-1 px-3 py-2 border rounded mr-1"
                    >
                      <Text className="text-center">Auf</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => performLockAction(item, 2, "close")}
                      className="flex-1 px-3 py-2 border rounded ml-1"
                    >
                      <Text className="text-center">Zu</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={() => (
          <View className="items-center mt-8">
            <Text className="text-gray-500">Keine Pis konfiguriert. Admin → + hinzufügen.</Text>
          </View>
        )}
      />

      {/* Admin Modal */}
      <Modal visible={adminVisible} animationType="slide" onRequestClose={() => setAdminVisible(false)}>
        <View className="flex-1 p-4 bg-white">
          <Text className="text-xl font-bold mb-4">{editingPi?.id ? "Edit Pi" : "Add Pi"}</Text>
          <AdminForm
            initial={editingPi}
            onCancel={() => { setAdminVisible(false); setEditingPi(null); }}
            onSave={(d) => savePi(d)}
          />
        </View>
      </Modal>
    </View>
  );
}

/* AdminForm Component */
function AdminForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<PiDevice> | null;
  onSave: (data: Partial<PiDevice>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [host, setHost] = useState(initial?.host ?? "pi.local");
  const [port, setPort] = useState(String(initial?.port ?? 5000));

  return (
    <View className="flex-1">
      <Text className="mb-1">Name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="pi"
        className="border p-2 rounded mb-3"
      />

      <Text className="mb-1">Host (z.B. pi.local oder 192.168.1.55)</Text>
      <TextInput
        value={host}
        onChangeText={setHost}
        placeholder="pi.local"
        className="border p-2 rounded mb-3"
      />

      <Text className="mb-1">Port</Text>
      <TextInput
        value={port}
        onChangeText={setPort}
        keyboardType="numeric"
        placeholder="5000"
        className="border p-2 rounded mb-3"
      />

      <View className="flex-row mt-4">
        <TouchableOpacity
          onPress={() => onCancel()}
          className="flex-1 border px-3 py-2 rounded mr-2"
        >
          <Text className="text-center">Abbrechen</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            if (!name.trim() || !host.trim() || !port.trim()) {
              Alert.alert("Fehler", "Bitte alle Felder ausfüllen.");
              return;
            }
            onSave({
              id: initial?.id,
              name: name.trim(),
              host: host.trim(),
              port: Number(port),
            });
          }}
          className="flex-1 bg-blue-600 px-3 py-2 rounded"
        >
          <Text className="text-center text-white">Speichern</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
