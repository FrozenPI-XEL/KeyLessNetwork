import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Alert, Modal } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import "react-native-get-random-values";
import { Ionicons } from "@expo/vector-icons";


type Pi = { id: string; n: string; h: string; p: number; last?: number; err?: string | null };
type Props = { isAdmin?: boolean; isTempAdmin?: boolean };

const KEY = "MY_PIS_v1";

const fetchTimeout = (url: string, opts: RequestInit = {}, ms = 3000) =>
  Promise.race([fetch(url, opts), new Promise((_r, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);

const apiCall = async (pi: Pi, path: string, method: "GET" | "POST" = "GET", body?: any) => {
  const url = `http://${pi.h}:${pi.p}${path}`;
  try {
    const res = await fetchTimeout(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }, 4000);
    if (!(res as Response).ok) throw new Error(await (res as Response).text());
    return { ok: true, data: await (res as Response).json().catch(() => ({})) };
  } catch (e: any) {
    return { ok: false, err: e.message || String(e) };
  }
};

export default function PiManager({ isAdmin, isTempAdmin }: Props) {
  const [pis, setPis] = useState<Pi[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState<Partial<Pi> | null>(null);
  const [scan, setScan] = useState(false);

  const canEdit = isAdmin || isTempAdmin;

  useEffect(() => { (async () => { const data = await AsyncStorage.getItem(KEY); if(data) setPis(JSON.parse(data)); setLoading(false); })(); }, []);
  useEffect(() => { canEdit && AsyncStorage.setItem(KEY, JSON.stringify(pis)); }, [pis, canEdit]);
  
  useEffect(() => {
    let mounted = true;
    const ping = async () => {
      if (!mounted) return;
      const updated = await Promise.all(pis.map(async p => { const r = await apiCall(p, "/health"); return r.ok ? { ...p, last: Date.now(), err: null } : { ...p, err: r.err, last: p.last }; }));
      if (mounted) setPis(updated);
    };
    ping();
    const id = setInterval(ping, 10000);
    return () => { mounted = false; clearInterval(id); };
  }, [pis.length]);

  const lock = async (pi: Pi, l: 1 | 2, a: "open" | "close") => {
    const res = await apiCall(pi, `/lock/${l}/${a}`, "POST");
    if (res.ok) Alert.alert("Erfolg", `Schloss ${l} ${a} auf ${pi.n}`);
    else Alert.alert("Fehler", res.err || "Unbekannt");
    setPis(prev => prev.map(p => p.id === pi.id ? { ...p, last: Date.now(), err: res.ok ? null : res.err } : p));
  };

  if (loading) return <View className="flex-1 items-center justify-center bg-slate-900"><ActivityIndicator size="large" color="white"/><Text className="mt-2 text-dark-t1">Lade...</Text></View>;

  return (
    <View className="flex-1 bg-slate-900 p-6">
      <Text className="text-dark-t1 text-2xl font-bold mb-4">Mein Schrank</Text>

      <FlatList
        data={pis}
        keyExtractor={i => i.id}
        renderItem={({ item }) => {
          const online = !!item.last && Date.now() - item.last < 20000;
          return (
            <View className="p-4 rounded-xl bg-slate-700 mb-3">
              <Text className="text-dark-t1 text-lg font-semibold">{item.n}</Text>
              <Text className="text-l mb-4 ml-1 text-dark-t2">{online ? "Online" : item.err ? `Fehler: ${item.err}` : "Offline"}</Text>

              <View className="flex-row justify-between mt-3">
                {[1, 2].map(l =>
                  <View key={l} className="flex-1 mx-1">
                    <Text className="text-dark-t1 font-medium mb-2">Schloss {l}</Text>
                    <View className="flex-row gap-2">
                      <TouchableOpacity onPress={() => lock(item, l as 1|2, "open")} className="flex-1 bg-green-500 px-3 py-2 rounded-lg"><Text className="text-white text-center">Auf</Text></TouchableOpacity>
                      <TouchableOpacity onPress={() => lock(item, l as 1|2, "close")} className="flex-1 bg-red-500 px-3 py-2 rounded-lg"><Text className="text-white text-center">Zu</Text></TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              {canEdit &&
                <View className="flex-row gap-2 mt-3">
                  <TouchableOpacity onPress={() => { setEdit(item); setModal(true); }} className="bg-yellow-500 p-2 rounded-lg"><Ionicons name="create" size={18} color="white"/></TouchableOpacity>
                  <TouchableOpacity onPress={() => Alert.alert("Löschen?", "Gerät löschen?", [{text:"Ja", onPress:()=>setPis(prev=>prev.filter(p=>p.id!==item.id))}, {text:"Abbrechen", style:"cancel"}])} className="bg-red-500 p-2 rounded-lg"><Ionicons name="trash" size={18} color="white"/></TouchableOpacity>
                </View>
              }
            </View>
          )
        }}
        ListEmptyComponent={() => <Text className="text-dark-t2 mt-8 text-center">Keine Schränke verfügbar.</Text>}
      />

      {canEdit && modal &&
        <Modal visible={modal} animationType="slide" onRequestClose={() => setModal(false)}>
          <View className="flex-1 p-6 bg-slate-900">
            <Text className="text-dark-t1 text-xl font-bold mb-6">{edit?.id ? "Bearbeiten" : "Hinzufügen"}</Text>
          </View>
        </Modal>
      }
    </View>
  );
}
