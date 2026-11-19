// Nutzer-Seite (Tab "Steuerung"): Locker laden und signierte Anfragen an den Pi senden.
// Hier gibt es bewusst nichts zum Anlegen/Ändern von Lockern, das ist Sache des Admin-Tabs.
import { getRandomBytes } from "expo-crypto";
import { hmac } from "@noble/hashes/hmac";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex, hexToBytes, utf8ToBytes } from "@noble/hashes/utils";
import { supabase } from "../hooks/supabase-client";

export type Locker = {
  id: string; // Locker-ID (UUID, kommt vom Pi)
  name: string;
  host: string;
  port: number;
  https: boolean;
  keyHex: string; // Lockerschlüssel: nur im Arbeitsspeicher, wird nie auf dem Handy gespeichert
};

export type ApiResult = { ok: true; data: any } | { ok: false; err: string };

const MAX_CLOCK_SKEW_SECONDS = 30;

// Lädt alle für diesen Nutzer freigegebenen Locker samt Schlüssel.
// Was der Nutzer sehen darf, entscheidet die Datenbank (Row Level Security), nicht die App.
export async function loadLockers(): Promise<Locker[]> {
  const [cabs, secrets] = await Promise.all([
    supabase
      .from("kln_lockers")
      .select("id,name,host,port,https")
      .order("name"),
    supabase.from("kln_locker_secrets").select("locker_id,key_hex"),
  ]);
  if (cabs.error) throw new Error(cabs.error.message);
  if (secrets.error) throw new Error(secrets.error.message);

  const keys = new Map<string, string>(
    (secrets.data ?? []).map((s: any) => [s.locker_id, s.key_hex]),
  );
  return (cabs.data ?? [])
    .filter((c: any) => keys.has(c.id))
    .map((c: any) => ({
      id: c.id,
      name: c.name,
      host: c.host,
      port: c.port,
      https: c.https,
      keyHex: keys.get(c.id) as string,
    }));
}

const constantTimeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

// Signierte Anfrage an den Pi (passend zu Backend/main.py, siehe Backend/FRONTEND_CHANGES.md)
export const apiCall = async (
  cab: Locker,
  path: string,
  method: "GET" | "POST" = "GET",
  body?: any,
): Promise<ApiResult> => {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return { ok: false, err: "Nicht eingeloggt." };

  const bodyText = body ? JSON.stringify(body) : "";
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = bytesToHex(getRandomBytes(16)); // bei jeder Anfrage neu

  const canonical = [
    "KLN1",
    method,
    path,
    "", // Query (hier nie vorhanden)
    timestamp,
    nonce,
    bytesToHex(sha256(utf8ToBytes(bodyText))),
  ].join("\n");

  const key = hexToBytes(cab.keyHex);
  const signature = bytesToHex(hmac(sha256, key, utf8ToBytes(canonical)));

  const headers: Record<string, string> = {
    "X-Locker-Id": cab.id,
    "X-Timestamp": timestamp,
    "X-Nonce": nonce,
    "X-Signature": signature,
    Authorization: `Bearer ${token}`,
  };
  if (bodyText) headers["Content-Type"] = "application/json";

  const url = `${cab.https ? "https" : "http"}://${cab.host}:${cab.port}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

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
        err: "Kein Zugriff. Freigabe, Login oder Uhrzeit (max. 30 s Abweichung) prüfen.",
      };
    }
    if (res.status === 429) {
      return {
        ok: false,
        err: "Zu viele Fehlversuche, der Pi hat dich 5 Minuten gesperrt.",
      };
    }
    if (res.status === 503) {
      return {
        ok: false,
        err: "Der Pi erreicht den Anmeldedienst nicht (Internet am Pi prüfen).",
      };
    }
    if (!res.ok) {
      return { ok: false, err: `Serverfehler (HTTP ${res.status})` };
    }

    // Antwort des Pi prüfen: nur mit gültiger Signatur wird sie akzeptiert.
    const respTs = res.headers.get("X-Response-Timestamp") ?? "";
    const respSig = (
      res.headers.get("X-Response-Signature") ?? ""
    ).toLowerCase();
    const respCanonical = [
      "KLN1-RESP",
      nonce,
      respTs,
      String(res.status),
      bytesToHex(sha256(utf8ToBytes(text))),
    ].join("\n");
    const expected = bytesToHex(hmac(sha256, key, utf8ToBytes(respCanonical)));
    const skew = Math.abs(Date.now() / 1000 - Number(respTs));

    if (
      !respTs ||
      !respSig ||
      !constantTimeEqual(expected, respSig) ||
      !(skew <= MAX_CLOCK_SKEW_SECONDS)
    ) {
      return {
        ok: false,
        err: "Antwort nicht vertrauenswürdig (Signatur ungültig).",
      };
    }

    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      /* leere Antwort */
    }
    return { ok: true, data };
  } catch (e: any) {
    if (e?.name === "AbortError")
      return { ok: false, err: "Zeitüberschreitung" };
    return { ok: false, err: e?.message || String(e) };
  } finally {
    clearTimeout(timer);
  }
};
