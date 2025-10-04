import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";

type Pi = { id?: string; n: string; h: string; p: number };
type Props = {
  initial?: Partial<Pi>;
  onSave: (data: Pi) => void;
  onCancel: () => void;
};

export default function PiForm({ initial, onSave, onCancel }: Props) {
  const [n, setN] = useState(initial?.n ?? "");
  const [h, setH] = useState(initial?.h ?? "pi.local");
  const [p, setP] = useState(String(initial?.p ?? 5000));

  return (
    <View className="flex-1">
      <Text className="text-dark-t2 mb-1">Name</Text>
      <TextInput className="bg-slate-700 rounded-lg px-3 py-2 mb-3 text-dark-t1" value={n} onChangeText={setN} placeholder="pi" />
      <Text className="text-dark-t2 mb-1">Host</Text>
      <TextInput className="bg-slate-700 rounded-lg px-3 py-2 mb-3 text-dark-t1" value={h} onChangeText={setH} placeholder="pi.local" />
      <Text className="text-dark-t2 mb-1">Port</Text>
      <TextInput className="bg-slate-700 rounded-lg px-3 py-2 mb-3 text-dark-t1" value={p} onChangeText={setP} keyboardType="numeric" placeholder="5000" />
      <View className="flex-row gap-2 mt-4">
        <TouchableOpacity onPress={onCancel} className="flex-1 bg-slate-600 px-3 py-3 rounded-lg">
          <Text className="text-dark-t1 text-center">Abbrechen</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            if (!n.trim() || !h.trim() || !p.trim()) {
              Alert.alert("Fehler", "Alle Felder ausfüllen");
              return;
            }
            onSave({ id: initial?.id, n: n.trim(), h: h.trim(), p: Number(p) });
          }}
          className="flex-1 bg-blue-600 px-3 py-3 rounded-lg"
        >
          <Text className="text-white text-center">Speichern</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
