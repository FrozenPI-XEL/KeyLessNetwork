import React, { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, Pressable, Animated } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuthStore } from "../store/authStore";
import { supabase } from "../hooks/supabase-client";

type FormData = {
  username: string;
  password: string;
};

export default function LoginForm() {
  const router = useRouter();
  const { logIn } = useAuthStore();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const [isLocked, setIsLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sichtbar, setSichtbar] = useState(true);

  const onSubmit = async (data: FormData) => {
    setError(null);
    setIsLoading(true);

    try {
      const { data: userData, error: loginError } = await supabase
        .from("codes")
        .select("username, code2, Role")
        .eq("username", data.username.trim())
        .eq("code2", data.password)
        .single();

      if (loginError || !userData) {
        setIsLocked(false);
        setError("Benutzername oder Passwort falsch!");
        setIsLoading(false);
        return;
      }

      setIsLocked(true);
      logIn(userData.username, userData.Role === true);
      router.replace("/(tabs)/home");
    } catch (err) {
      console.error(err);
      setError("Ein Fehler ist aufgetreten. Bitte versuche es erneut.");
    }

    setIsLoading(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0f172a", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
      <Text style={{ fontSize: 30, fontWeight: "bold", color: "white", marginBottom: 32 }}>
        Login
      </Text>

      <Controller
        control={control}
        name="username"
        rules={{ required: "Benutzername ist erforderlich" }}
        render={({ field: { onChange, value } }) => (
          <FloatingInput
            label="Benutzername"
            icon="person"
            value={value}
            onChangeText={onChange}
            secureTextEntry={false}
          />
        )}
      />

      {errors.username && (
        <Text style={{ color: "#f87171" }}>
          {errors.username.message}
        </Text>
      )}

      <Controller
        control={control}
        name="password"
        rules={{ required: "Passwort ist erforderlich" }}
        render={({ field: { onChange, value } }) => (
          <View style={{ flexDirection: "row", alignItems: "center", width: "100%" }}>
            <View style={{ flex: 1 }}>
              <FloatingInput
                label="Passwort"
                icon="lock-closed"
                value={value}
                onChangeText={onChange}
                secureTextEntry={sichtbar}
              />
            </View>

            <Pressable
              onPress={() => setSichtbar(!sichtbar)}
              style={{ position: "absolute", right: 16, top: 12 }}
            >
              <Ionicons
                name={sichtbar ? "eye-off" : "eye"}
                size={22}
                color="gray"
              />
            </Pressable>
          </View>
        )}
      />

      {errors.password && (
        <Text style={{ color: "#f87171" }}>
          {errors.password.message}
        </Text>
      )}

      {error && (
        <Text style={{ color: "#f87171" }}>
          {error}
        </Text>
      )}

      <Pressable
        style={{ flexDirection: "row", alignItems: "center", backgroundColor: isLoading ? "#6b7280" : "#6366f1", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 12 }}
        onPress={handleSubmit(onSubmit)}
        disabled={isLoading}
      >
        <Ionicons
          name="checkmark-circle-outline"
          size={22}
          color="white"
        />

        <Text style={{ color: "white", fontWeight: "600", fontSize: 16, marginLeft: 8 }}>
          {isLoading ? "Anmelden..." : "Login"}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => router.push("/register")}
        style={{ marginTop: 24, paddingHorizontal: 24, paddingVertical: 12 }}
      >
        <Text style={{ color: "#818cf8", textAlign: "center" }}>
          Noch kein Account? <Text style={{ fontWeight: "bold" }}>Registrieren</Text>
        </Text>
      </Pressable>

      {isLocked && (
        <Text style={{ color: "#4ade80", marginTop: 20, fontSize: 18 }}>
          ✅ Erfolgreich eingeloggt!
        </Text>
      )}
    </View>
  );
}

const FloatingInput = ({
  label,
  value,
  onChangeText,
  secureTextEntry,
  icon,
}: {
  label: string;
  value?: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: isFocused || value ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused, value]);

  const labelStyle = {
    position: "absolute" as const,
    left: 40,
    top: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [18, -8],
    }),
    fontSize: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [16, 12],
    }),
    color: "#aaa",
  };

  return (
    <View style={{ flexDirection: "row", alignItems: "center", borderBottomWidth: 2, borderBottomColor: "#475569", marginBottom: 24, width: "100%", position: "relative", paddingBottom: 4 }}>
      <Ionicons
        name={icon}
        size={20}
        color="#666"
        style={{ marginRight: 8 }}
      />

      <View style={{ flex: 1 }}>
        <Animated.Text style={labelStyle}>
          {label}
        </Animated.Text>

        <TextInput
          style={{ height: 40, fontSize: 20, color: "white" }}
          value={value}
          secureTextEntry={secureTextEntry}
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