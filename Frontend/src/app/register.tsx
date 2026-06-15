import React, { useState, useRef, useEffect } from "react";
import { View, Text, TextInput, Pressable, Animated } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { Ionicons } from '@expo/vector-icons';
import { supabase } from "../hooks/supabase-client";
import { useRouter } from "expo-router";

type RegisterData = {
  code: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const { control, handleSubmit, formState: { errors } } = useForm<RegisterData>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (formData: RegisterData) => {
    setError(null);
    setIsLoading(true);

    const cleanedCode = formData.code.trim().toUpperCase();

    try {
      const { data: codeData, error: checkError } = await supabase
        .from("codes")
        .select("*")
        .eq("code", cleanedCode)
        .eq("genutzt", false)
        .single();

      if (checkError || !codeData) {
        setError("Code ungültig oder bereits verwendet!");
        setIsLoading(false);
        return;
      }

      const { error: updateError } = await supabase
        .from("codes")
        .update({ genutzt: true })
        .eq("code", cleanedCode);

      if (updateError) {
        setError("Fehler beim Speichern. Bitte versuche es erneut.");
        setIsLoading(false);
        return;
      }

      router.push(`/profile-setup?code=${cleanedCode}`);
    } catch (err) {
      console.error(err);
      setError("Ein Fehler ist aufgetreten.");
    }

    setIsLoading(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#1e293b", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
      <Text style={{ fontSize: 28, fontWeight: "bold", color: "white", marginBottom: 32 }}>Registrierung</Text>

      <View style={{ marginTop: 40, marginBottom: 40, width: "100%" }}>
        <Controller
          control={control}
          name="code"
          rules={{
            required: "Code ist erforderlich",
            minLength: { value: 8, message: "Code muss 8 Zeichen lang sein" },
            maxLength: { value: 8, message: "Code darf maximal 8 Zeichen lang sein" },
          }}
          render={({ field: { onChange, value } }) => (
            <FloatingInput
              label="8-stelliger Code"
              labelStyle={{ color: error ? "#f87171" : "white" }}
              icon="key"
              iconColor={error ? "#f87171" : "white"}
              value={value}
              onChangeText={onChange}
            />
          )}
        />
      </View>

      {errors.code && (
        <Text style={{ color: "#f87171", marginBottom: 16 }}>{errors.code.message}</Text>
      )}

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
        }}
        onPress={handleSubmit(onSubmit)}
        disabled={isLoading}
      >
        <Ionicons name="checkmark-circle-outline" size={22} color="white" />
        <Text style={{ color: "white", fontWeight: "600", fontSize: 16, marginLeft: 8 }}>
          {isLoading ? "Überprüfe..." : "Code überprüfen"}
        </Text>
      </Pressable>

      <Pressable onPress={() => router.back()} style={{ marginTop: 24 }}>
        <Text style={{ color: "#a78bfa", textAlign: "center" }}>
          Hast du bereits einen Account? <Text style={{ fontWeight: "bold" }}>Login</Text>
        </Text>
      </Pressable>
    </View>
  );
}

const FloatingInput = ({
  label,
  value,
  onChangeText,
  icon,
  placeholder,
  labelStyle,
  iconColor,
}: {
  label: string;
  value?: string;
  onChangeText: (text: string) => void;
  icon: keyof typeof Ionicons.glyphMap;
  placeholder?: string;
  labelStyle?: { color: string };
  iconColor?: string;
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
    color: labelStyle?.color || "#aaa",
  };

  return (
    <View style={{ flexDirection: "row", alignItems: "center", borderBottomWidth: 2, borderBottomColor: "#475569", marginBottom: 24, width: "100%", paddingBottom: 8 }}>
      <Ionicons name={icon} size={20} color={iconColor || "#666"} style={{ marginRight: 8 }} />
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
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoCapitalize="characters"
          autoCorrect={false}
        />
      </View>
    </View>
  );
};
