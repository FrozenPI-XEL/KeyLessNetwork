import React, { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, Pressable, Animated, Alert } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../hooks/supabase-client";

type ProfileData = {
  username: string;
  code2: string;
};

export default function ProfileSetupPage() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();
  const { control, handleSubmit, formState: { errors } } = useForm<ProfileData>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!code) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0f172a", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
        <Text style={{ color: "#ef5350", fontSize: 16 }}>Fehler: Kein Code gefunden</Text>
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

    if (!data.code2 || data.code2.length !== 8) {
      setError("Der Code muss 8 Zeichen lang sein!");
      return;
    }

    setIsLoading(true);

    try {
      const { error: updateError } = await supabase
        .from("codes")
        .update({
          username: data.username.trim(),
          code2: data.code2,
        })
        .eq("code", code);

      if (updateError) {
        setError("Fehler beim Speichern des Profils!");
        console.error(updateError);
        setIsLoading(false);
        return;
      }

      Alert.alert("Erfolg!", "Profil erstellt. Bitte melde dich an.", [
        { text: "OK", onPress: () => router.push("/login") },
      ]);
    } catch (err) {
      setError("Ein Fehler ist aufgetreten. Bitte versuche es später erneut.");
      console.error(err);
    }

    setIsLoading(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#1e293b", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
      <Text style={{ fontSize: 28, fontWeight: "bold", color: "white", marginBottom: 8 }}>Profil erstellen</Text>
      <Text style={{ color: "#9ca3af", marginBottom: 32, textAlign: "center" }}>Erstelle deinen Benutzernamen und einen persönlichen Code</Text>

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
      {errors.username && <Text style={{ color: "#f87171", marginBottom: 16 }}>{errors.username.message}</Text>}

      <View style={{ width: "100%" }}>
        <Controller
          control={control}
          name="code2"
          rules={{
            required: "Code ist erforderlich",
            minLength: { value: 8, message: "Code muss 8 Zeichen lang sein" },
            maxLength: { value: 8, message: "Code darf maximal 8 Zeichen lang sein" },
          }}
          render={({ field: { onChange, value } }) => (
            <FloatingInput
              label="Persönlicher Code (Passwort)"
              icon="lock-closed"
              value={value}
              onChangeText={onChange}
              secureTextEntry={true}
            />
          )}
        />
      </View>
      {errors.code2 && <Text style={{ color: "#f87171", marginBottom: 16 }}>{errors.code2.message}</Text>}

      {error && (
        <Text style={{ color: "#ef5350", backgroundColor: "rgba(244, 63, 94, 0.1)", paddingHorizontal: 12, paddingVertical: 12, borderRadius: 8, marginBottom: 16, textAlign: "center", width: "100%" }}>
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
        onPress={handleSubmit(onSubmit)}
        disabled={isLoading}
      >
        <Ionicons name="checkmark-circle-outline" size={22} color="white" />
        <Text style={{ color: "white", fontWeight: "600", fontSize: 16, marginLeft: 8 }}>
          {isLoading ? "Speichert..." : "Profil speichern"}
        </Text>
      </Pressable>
    </View>
  );
}

const FloatingInput = ({
  label,
  value,
  onChangeText,
  secureTextEntry,
  icon,
  placeholder,
}: {
  label: string;
  value?: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  placeholder?: string;
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: isFocused || value ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused, value, animatedValue]);

  const labelAnimStyle = {
    position: "absolute" as const,
    left: 40,
    top: animatedValue.interpolate({ inputRange: [0, 1], outputRange: [18, -8] }),
    fontSize: animatedValue.interpolate({ inputRange: [0, 1], outputRange: [16, 12] }),
    color: "#aaa",
  };

  return (
    <View style={{ flexDirection: "row", alignItems: "center", borderBottomWidth: 2, borderBottomColor: "#475569", marginBottom: 24, width: "100%", paddingBottom: 8 }}>
      <Ionicons name={icon} size={20} color="#666" style={{ marginRight: 8 }} />
      <View style={{ flex: 1 }}>
        <Animated.Text style={labelAnimStyle}>{label}</Animated.Text>
        <TextInput
          style={{
            height: 40,
            fontSize: 20,
            color: "white",
          }}
          value={value}
          placeholder={placeholder}
          placeholderTextColor="#555"
          secureTextEntry={secureTextEntry || false}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
    </View>
  );
};
