import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { v4 as uuidv4 } from "uuid";
import { Ionicons } from "@expo/vector-icons";

type PiDevice = {
  id: string;
  name: string;
  host: string;
  port: number;
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
    const res = await timeoutFetch(
      url,
      {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      },
      4000
    );
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

  // Heartbeat
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
    pingAll();
    const id = setInterval(pingAll, 10_000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [pis.length]);

  const openAdminForNew = () => {
    setEditingPi({ name: "", host: "pi.local", port: 5000 });
    setAdminVisible(true);
  };

  const savePi = (data: Partial<PiDevice>) => {
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
    const path = `/lock/${lockNumber}/${action}`;
    const result = await callPiApi(pi, path, "POST");
    if (result.ok) {
      Alert.alert("Erfolg", `Schloss ${lockNumber} ${action} erfolgreich auf ${pi.name}`);
      setPis((prev) =>
        prev.map((p) =>
          p.id === pi.id ? { ...p, lastSeen: Date.now(), lastError: null } : p
        )
      );
    } else {
      const err = (result as { error?: string }).error || "Unbekannter Fehler";
      Alert.alert("Fehler", `Auf ${pi.name}: ${err}`);
      setPis((prev) => prev.map((p) => (p.id === pi.id ? { ...p, lastError: err } : p)));
    }
  };

  const tryDiscoverPi = async () => {
    setScanning(true);
    const candidate: PiDevice = { id: `auto-${Date.now()}`, name: "pi", host: "pi.local", port: 5000 };
    const r = await callPiApi(candidate, "/health", "GET");
    if (r.ok) {
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
      <View className="flex-1 items-center justify-center bg-slate-900">
        <ActivityIndicator size="large" color="white" />
        <Text className="mt-2 text-dark-t1">Lade gespeicherte Geräte …</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-900 p-6">
      <View className="flex-row justify-between items-center mb-6">
        <Text className="text-dark-t1 text-2xl font-bold">Raspberry Pi Manager</Text>
        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={tryDiscoverPi}
            className="bg-blue-500 px-4 py-2 rounded-xl flex-row items-center"
          >
            <Ionicons name="search" size={18} color="white" />
            <Text className="text-white ml-2">Find pi.local</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={openAdminForNew}
            className="bg-green-600 px-4 py-2 rounded-xl flex-row items-center"
          >
            <Ionicons name="add-circle" size={18} color="white" />
            <Text className="text-white ml-2">Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {scanning && (
        <View className="mb-2">
          <Text className="text-dark-t2">Scanning pi.local …</Text>
        </View>
      )}

      <FlatList
        data={pis}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const online = !!item.lastSeen && Date.now() - item.lastSeen < 20_000;
          return (
            <View className="p-4 rounded-xl bg-slate-700 mb-3">
              <View className="flex-row justify-between items-start">
                <View>
                  <Text className="text-dark-t1 text-lg font-semibold">{item.name}</Text>
                  <Text className="text-dark-t2 text-sm">{item.host}:{item.port}</Text>
                  <Text className="text-xs mt-1 text-dark-t2">
                    {online ? "Online" : item.lastError ? `Fehler: ${item.lastError}` : "Offline"}
                  </Text>
                </View>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => { setEditingPi(item); setAdminVisible(true); }}
                    className="bg-yellow-500 p-2 rounded-lg"
                  >
                    <Ionicons name="create" size={18} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => deletePi(item.id)}
                    className="bg-red-500 p-2 rounded-lg"
                  >
                    <Ionicons name="trash" size={18} color="white" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Locks */}
              <View className="flex-row justify-between mt-4">
                {[1, 2].map((lock) => (
                  <View key={lock} className="flex-1 mx-1">
                    <Text className="text-dark-t1 font-medium mb-2">Schloss {lock}</Text>
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        onPress={() => performLockAction(item, lock as 1 | 2, "open")}
                        className="flex-1 bg-green-500 px-3 py-2 rounded-lg"
                      >
                        <Text className="text-white text-center">Auf</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => performLockAction(item, lock as 1 | 2, "close")}
                        className="flex-1 bg-red-500 px-3 py-2 rounded-lg"
                      >
                        <Text className="text-white text-center">Zu</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={() => (
          <View className="items-center mt-8">
            <Text className="text-dark-t2">Keine Pis konfiguriert. Admin → + hinzufügen.</Text>
          </View>
        )}
      />

      {/* Admin Modal */}
      <Modal visible={adminVisible} animationType="slide" onRequestClose={() => setAdminVisible(false)}>
        <View className="flex-1 p-6 bg-slate-900">
          <Text className="text-dark-t1 text-xl font-bold mb-6">
            {editingPi?.id ? "Edit Pi" : "Add Pi"}
          </Text>
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
      <Text className="text-dark-t2 mb-1">Name</Text>
      <View className="bg-slate-700 rounded-lg px-3 py-2 mb-3">
        <TextInput className="text-dark-t1" value={name} onChangeText={setName} placeholder="pi" />
      </View>

      <Text className="text-dark-t2 mb-1">Host</Text>
      <View className="bg-slate-700 rounded-lg px-3 py-2 mb-3">
        <TextInput className="text-dark-t1" value={host} onChangeText={setHost} placeholder="pi.local" />
      </View>

      <Text className="text-dark-t2 mb-1">Port</Text>
      <View className="bg-slate-700 rounded-lg px-3 py-2 mb-3">
        <TextInput
          className="text-dark-t1"
          value={port}
          onChangeText={setPort}
          keyboardType="numeric"
          placeholder="5000"
        />
      </View>

      <View className="flex-row mt-4 gap-2">
        <TouchableOpacity onPress={onCancel} className="flex-1 bg-slate-600 px-3 py-3 rounded-lg">
          <Text className="text-dark-t1 text-center">Abbrechen</Text>
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
          className="flex-1 bg-blue-600 px-3 py-3 rounded-lg"
        >
          <Text className="text-white text-center">Speichern</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
