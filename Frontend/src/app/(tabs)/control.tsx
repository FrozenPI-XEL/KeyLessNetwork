import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { supabase } from "../../hooks/supabase-client";
import { apiCall, loadLockers, type Locker } from "../../lib/kln-api";
import { errorMessage } from "../../lib/errors";

// Tab "Steuerung" (Nutzer-Seite): freigegebene Locker suchen und steuern.
// Locker anlegen, Nutzer freigeben usw. passiert ausschließlich im Admin-Tab.

const FALLBACK_LOCKS = [1, 2, 3, 4];
const COOLDOWN_MS = 1000; // Pause nach jeder Aktion, damit niemand die Knöpfe spammen kann
const PING_INTERVAL_MS = 10000;
// Bei diesen Antworten wird nicht automatisch weiter gepingt: Jede abgelehnte Anfrage zählt am Pi als
// Fehlversuch, nach 5 davon sperrt er die Adresse für 5 Minuten (bei 10-s-Ping also nach ca. 50 s).
const STOP_PING_STATUS = new Set([401, 426, 429]);

const inputStyle = {
  backgroundColor: "#1e293b",
  color: "white",
  borderRadius: 10,
  paddingHorizontal: 12,
  paddingVertical: 10,
  marginBottom: 10,
} as const;

// ---------------------------------------------------------------------------
// Control-Ansicht eines Lockers
// ---------------------------------------------------------------------------
function ControlView({ cab, onBack }: { cab: Locker; onBack: () => void }) {
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [locks, setLocks] = useState<number[]>(FALLBACK_LOCKS);
  const [pingPaused, setPingPaused] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    const stopPing = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const ping = async () => {
      const r = await apiCall(cab, "/health");
      if (cancelled) return;
      if (r.ok) {
        setOnline(true);
        setLastError(null);
        if (Array.isArray(r.data.motors) && r.data.motors.length > 0) {
          setLocks(r.data.motors);
        }
      } else {
        setOnline(false);
        setLastError(r.err);
        if (r.status !== undefined && STOP_PING_STATUS.has(r.status)) {
          stopPing();
          setPingPaused(true);
        }
      }
      setLoading(false);
    };
    ping();
    timer = setInterval(ping, PING_INTERVAL_MS);
    return () => {
      cancelled = true;
      stopPing();
    };
  }, [cab, retryCount]);

  const retry = () => {
    setPingPaused(false);
    setLoading(true);
    setRetryCount((n) => n + 1);
  };

  // Solange eine Aktion läuft (und kurz danach), sind ALLE Knöpfe gesperrt. Der Pi arbeitet die Schlösser
  // ohnehin nacheinander ab. Die Ref blockt auch Doppeltipps, bevor der State neu gezeichnet ist.
  const busyRef = useRef(false);
  const cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [busy, setBusy] = useState<{
    lock: number;
    action: "open" | "close";
  } | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
    };
  }, []);

  const lockAction = async (lock: number, action: "open" | "close") => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy({ lock, action });
    try {
      const r = await apiCall(cab, `/lock/${lock}/${action}`, "POST");
      if (!r.ok) {
        Alert.alert(
          "Fehler",
          `Konnte Schloss ${lock} nicht ${action}: ${r.err}`,
        );
      } else if (r.data?.success === false) {
        Alert.alert("Hinweis", String(r.data.error ?? "Aktion nicht möglich"));
      }
    } finally {
      cooldownTimer.current = setTimeout(() => {
        busyRef.current = false;
        setBusy(null);
      }, COOLDOWN_MS);
    }
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#0f172a",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={{ color: "white", marginTop: 8 }}>Verbinde...</Text>
        <TouchableOpacity onPress={onBack} style={{ marginTop: 24 }}>
          <Text style={{ color: "#94a3b8" }}>Abbrechen</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#0f172a" }}
      contentContainerStyle={{ flexGrow: 1, padding: 16 }}
    >
      <TouchableOpacity onPress={onBack} style={{ marginBottom: 12 }}>
        <Text style={{ color: "#94a3b8", fontSize: 16 }}>‹ Alle Locker</Text>
      </TouchableOpacity>

      <View
        style={{ backgroundColor: "#0f172a", borderRadius: 12, padding: 16 }}
      >
        <Text
          style={{
            color: "white",
            fontSize: 28,
            fontWeight: "bold",
            marginBottom: 16,
            textAlign: "center",
          }}
        >
          {cab.name}
        </Text>

        <Text style={{ color: "white", fontSize: 16, marginBottom: 20 }}>
          {online ? "Online" : lastError ? `Fehler: ${lastError}` : "Offline"}
        </Text>

        {pingPaused && (
          <TouchableOpacity
            onPress={retry}
            style={{
              backgroundColor: "#475569",
              paddingVertical: 10,
              borderRadius: 10,
              marginBottom: 20,
            }}
          >
            <Text style={{ color: "white", textAlign: "center" }}>
              Verbindung pausiert, erneut versuchen
            </Text>
          </TouchableOpacity>
        )}

        {locks.map((lockNumber) => (
          <View key={lockNumber} style={{ marginBottom: 16 }}>
            <Text
              style={{ color: "white", fontWeight: "600", marginBottom: 8 }}
            >
              Schloss {lockNumber}
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                onPress={() => lockAction(lockNumber, "open")}
                disabled={busy !== null}
                style={{
                  flex: 1,
                  backgroundColor: "#22c55e",
                  paddingVertical: 12,
                  borderRadius: 10,
                  opacity: busy !== null ? 0.4 : 1,
                }}
              >
                <Text
                  style={{
                    color: "white",
                    textAlign: "center",
                    fontWeight: "bold",
                  }}
                >
                  {busy?.lock === lockNumber && busy.action === "open"
                    ? "Öffnet…"
                    : "Auf"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => lockAction(lockNumber, "close")}
                disabled={busy !== null}
                style={{
                  flex: 1,
                  backgroundColor: "#ef4444",
                  paddingVertical: 12,
                  borderRadius: 10,
                  opacity: busy !== null ? 0.4 : 1,
                }}
              >
                <Text
                  style={{
                    color: "white",
                    textAlign: "center",
                    fontWeight: "bold",
                  }}
                >
                  {busy?.lock === lockNumber && busy.action === "close"
                    ? "Schließt…"
                    : "Zu"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Lockerliste mit Suche -> Tippen öffnet die Control-Ansicht
// ---------------------------------------------------------------------------
export default function ControlScreen() {
  const [lockers, setLockers] = useState<Locker[]>([]);
  const [ready, setReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Locker | null>(null);

  const refresh = useCallback(async () => {
    setLoadError(null);
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      setLoggedIn(false);
      setLockers([]);
      setReady(true);
      return;
    }
    setLoggedIn(true);
    try {
      setLockers(await loadLockers());
    } catch (e: unknown) {
      setLoadError(errorMessage(e));
    }
    setReady(true);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Daten beim Öffnen einmal laden
    refresh();
    const { data: sub } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === "SIGNED_OUT") {
        // Beim Ausloggen verschwinden alle Schlüssel aus dem Arbeitsspeicher.
        setLockers([]);
        setSelected(null);
        setLoggedIn(false);
      } else if (event === "SIGNED_IN") {
        refresh();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return lockers;
    return lockers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.host.toLowerCase().includes(q),
    );
  }, [lockers, query]);

  if (selected) {
    return <ControlView cab={selected} onBack={() => setSelected(null)} />;
  }

  if (!ready) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#0f172a",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  if (!loggedIn) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#0f172a",
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
        }}
      >
        <Text style={{ color: "white", fontSize: 18, textAlign: "center" }}>
          Bitte melde dich an, um deine Locker zu sehen.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#0f172a", padding: 16 }}>
      <Text
        style={{
          color: "white",
          fontSize: 28,
          fontWeight: "bold",
          marginBottom: 16,
          textAlign: "center",
        }}
      >
        Meine Locker
      </Text>

      <TextInput
        style={inputStyle}
        placeholder="Locker suchen…"
        placeholderTextColor="#64748b"
        autoCapitalize="none"
        autoCorrect={false}
        value={query}
        onChangeText={setQuery}
      />

      {loadError ? (
        <Text style={{ color: "#f87171", marginBottom: 8 }}>
          Fehler beim Laden: {loadError}
        </Text>
      ) : null}

      <FlatList
        data={filtered}
        keyExtractor={(c) => c.id}
        style={{ flex: 1 }}
        refreshing={refreshing}
        onRefresh={async () => {
          setRefreshing(true);
          await refresh();
          setRefreshing(false);
        }}
        ListEmptyComponent={
          <Text
            style={{ color: "#94a3b8", textAlign: "center", marginTop: 24 }}
          >
            {lockers.length === 0
              ? "Dir ist noch kein Locker freigegeben. Frag einen Admin."
              : "Kein Locker gefunden."}
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setSelected(item)}
            style={{
              backgroundColor: "#1e293b",
              borderRadius: 12,
              padding: 16,
              marginBottom: 10,
            }}
          >
            <Text style={{ color: "white", fontSize: 18, fontWeight: "600" }}>
              {item.name}
            </Text>
            <Text style={{ color: "#94a3b8", marginTop: 4 }}>
              {item.host}:{item.port}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
