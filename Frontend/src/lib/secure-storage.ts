// Speicher für die Supabase-Sitzung (Access- und vor allem Refresh-Token).
//
// iOS/Android: verschlüsselt im Schlüsselbund bzw. Android Keystore (expo-secure-store).
// SecureStore ist pro Eintrag auf ca. 2 KB ausgelegt, eine Sitzung ist größer. Deshalb wird der Wert
// in Stücke aufgeteilt: <key>.n = Anzahl der Stücke, <key>.0, <key>.1, ... = Inhalt.
// Web (nur zum Testen am PC): Der Browser hat keinen sicheren Speicher, dort bleibt es bei localStorage.
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CHUNK_SIZE = 1800;

// SecureStore erlaubt in Schlüsseln nur Buchstaben, Ziffern, ".", "-" und "_".
const safeKey = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, "_");

async function secureGet(key: string): Promise<string | null> {
  const k = safeKey(key);
  const count = Number(await SecureStore.getItemAsync(`${k}.n`));
  if (!Number.isInteger(count) || count <= 0) return null;
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    const part = await SecureStore.getItemAsync(`${k}.${i}`);
    if (part === null) return null; // unvollständig -> wie nicht vorhanden behandeln
    parts.push(part);
  }
  return parts.join("");
}

async function secureRemove(key: string): Promise<void> {
  const k = safeKey(key);
  const count = Number(await SecureStore.getItemAsync(`${k}.n`)) || 0;
  await SecureStore.deleteItemAsync(`${k}.n`);
  for (let i = 0; i < count; i++)
    await SecureStore.deleteItemAsync(`${k}.${i}`);
}

async function secureSet(key: string, value: string): Promise<void> {
  await secureRemove(key);
  const k = safeKey(key);
  const count = Math.max(1, Math.ceil(value.length / CHUNK_SIZE));
  for (let i = 0; i < count; i++) {
    await SecureStore.setItemAsync(
      `${k}.${i}`,
      value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
    );
  }
  // Die Anzahl zuletzt schreiben: Bricht das Speichern ab, gilt der Eintrag als nicht vorhanden.
  await SecureStore.setItemAsync(`${k}.n`, String(count));
}

export const secureSessionStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === "web") return AsyncStorage.getItem(key);
    const value = await secureGet(key);
    if (value !== null) return value;
    // Einmalige Übernahme: Ältere App-Versionen lagen die Sitzung unverschlüsselt in AsyncStorage.
    const legacy = await AsyncStorage.getItem(key);
    if (legacy !== null) {
      await secureSet(key, legacy);
      await AsyncStorage.removeItem(key);
    }
    return legacy;
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") return AsyncStorage.setItem(key, value);
    await secureSet(key, value);
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === "web") return AsyncStorage.removeItem(key);
    await secureRemove(key);
    await AsyncStorage.removeItem(key);
  },
};
