import { useState } from "react";
import { View, Text, Pressable, Alert } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../hooks/supabase-client";
import {
  usernameToEmail,
  MAX_USERNAME_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "../store/authStore";
import FloatingInput from "../components/FloatingInput";

type ProfileData = {
  username: string;
  password: string;
};

export default function ProfileSetupPage() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileData>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!code) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#0f172a",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 24,
        }}
      >
        <Text style={{ color: "#ef5350", fontSize: 16 }}>
          Fehler: Kein Code gefunden
        </Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: "#a78bfa" }}>Zurück zur Registrierung</Text>
        </Pressable>
      </View>
    );
  }

  const onSubmit = async (data: ProfileData) => {
    setError(null);

    if (!data.username || data.username.trim().length === 0) {
      setError("Benutzername ist erforderlich!");
      return;
    }

    if (data.username.trim().length > MAX_USERNAME_LENGTH) {
      setError(
        `Der Benutzername darf höchstens ${MAX_USERNAME_LENGTH} Zeichen lang sein!`,
      );
      return;
    }

    if (!data.password || data.password.length < MIN_PASSWORD_LENGTH) {
      setError(
        `Das Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein!`,
      );
      return;
    }

    setIsLoading(true);

    try {
      // Das Konto wird in Supabase Auth angelegt. Ob der Einladungscode gültig ist,
      // prüft und verbraucht die Datenbank selbst (Trigger kln_handle_new_user).
      const { error: signUpError } = await supabase.auth.signUp({
        email: usernameToEmail(data.username),
        password: data.password,
        options: {
          data: { username: data.username.trim(), invite_code: code },
        },
      });

      if (signUpError) {
        const alreadyUsed = /already|registered/i.test(
          signUpError.message || "",
        );
        setError(
          alreadyUsed
            ? "Dieser Benutzername ist schon vergeben!"
            : "Registrierung fehlgeschlagen. Code ungültig, bereits verwendet oder Benutzername nicht erlaubt.",
        );
        console.error(signUpError);
        return;
      }

      // Kein automatischer Login: der Nutzer meldet sich danach normal an.
      await supabase.auth.signOut();

      Alert.alert("Erfolg!", "Profil erstellt. Bitte melde dich an.", [
        { text: "OK", onPress: () => router.push("/login") },
      ]);
    } catch (err) {
      setError("Ein Fehler ist aufgetreten. Bitte versuche es später erneut.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#1e293b",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
      }}
    >
      <Text
        style={{
          fontSize: 28,
          fontWeight: "bold",
          color: "white",
          marginBottom: 8,
        }}
      >
        Profil erstellen
      </Text>
      <Text style={{ color: "#9ca3af", marginBottom: 32, textAlign: "center" }}>
        Wähle einen Benutzernamen und ein Passwort (mindestens{" "}
        {MIN_PASSWORD_LENGTH} Zeichen)
      </Text>

      <View style={{ width: "100%", marginTop: 40 }}>
        <Controller
          control={control}
          name="username"
          rules={{ required: "Benutzername ist erforderlich" }}
          render={({ field: { onChange, value } }) => (
            <FloatingInput
              label="Benutzername"
              icon="person-circle"
              value={value}
              onChangeText={onChange}
            />
          )}
        />
      </View>
      {errors.username && (
        <Text style={{ color: "#f87171", marginBottom: 16 }}>
          {errors.username.message}
        </Text>
      )}

      <View style={{ width: "100%" }}>
        <Controller
          control={control}
          name="password"
          rules={{
            required: "Passwort ist erforderlich",
            minLength: {
              value: MIN_PASSWORD_LENGTH,
              message: `Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein`,
            },
          }}
          render={({ field: { onChange, value } }) => (
            <FloatingInput
              label="Passwort"
              icon="lock-closed"
              value={value}
              onChangeText={onChange}
              secure
              textContentType="newPassword"
              autoComplete="new-password"
            />
          )}
        />
      </View>
      {errors.password && (
        <Text style={{ color: "#f87171", marginBottom: 16 }}>
          {errors.password.message}
        </Text>
      )}

      {error && (
        <Text
          style={{
            color: "#ef5350",
            backgroundColor: "rgba(244, 63, 94, 0.1)",
            paddingHorizontal: 12,
            paddingVertical: 12,
            borderRadius: 8,
            marginBottom: 16,
            textAlign: "center",
            width: "100%",
          }}
        >
          {error}
        </Text>
      )}

      <Pressable
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: isLoading ? "#6b7280" : "#6366f1",
          paddingHorizontal: 24,
          paddingVertical: 12,
          borderRadius: 12,
          marginTop: 12,
          width: "100%",
          justifyContent: "center",
        }}
        onPress={() => handleSubmit(onSubmit)()}
        disabled={isLoading}
      >
        <Ionicons name="checkmark-circle-outline" size={22} color="white" />
        <Text
          style={{
            color: "white",
            fontWeight: "600",
            fontSize: 16,
            marginLeft: 8,
          }}
        >
          {isLoading ? "Speichert..." : "Profil speichern"}
        </Text>
      </Pressable>
    </View>
  );
}
