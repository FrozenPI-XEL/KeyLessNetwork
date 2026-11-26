import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../hooks/supabase-client";
import { useRouter } from "expo-router";
import FloatingInput from "../components/FloatingInput";

type RegisterData = {
  code: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterData>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (formData: RegisterData) => {
    setError(null);
    setIsLoading(true);

    const cleanedCode = formData.code.trim().toUpperCase();

    try {
      // Nur prüfen, ob der Code gültig ist. Verbraucht wird er erst bei der echten Registrierung (serverseitig).
      const { data: isValid, error: checkError } = await supabase.rpc(
        "kln_check_invite",
        {
          p_code: cleanedCode,
        },
      );

      if (checkError || isValid !== true) {
        setError("Code ungültig oder bereits verwendet!");
        return;
      }

      router.push({
        pathname: "/profile-setup",
        params: { code: cleanedCode },
      });
    } catch (err) {
      console.error(err);
      setError("Ein Fehler ist aufgetreten.");
    } finally {
      setIsLoading(false);
    }
  };

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
      <Text
        style={{
          fontSize: 28,
          fontWeight: "bold",
          color: "white",
          marginBottom: 32,
        }}
      >
        Registrierung
      </Text>

      <View style={{ marginTop: 40, marginBottom: 40, width: "100%" }}>
        <Controller
          control={control}
          name="code"
          rules={{
            required: "Code ist erforderlich",
            minLength: { value: 8, message: "Code muss 8 Zeichen lang sein" },
            maxLength: {
              value: 8,
              message: "Code darf maximal 8 Zeichen lang sein",
            },
          }}
          render={({ field: { onChange, value } }) => (
            <FloatingInput
              label="8-stelliger Code"
              icon="key"
              hasError={Boolean(error)}
              value={value}
              onChangeText={onChange}
              autoCapitalize="characters"
            />
          )}
        />
      </View>

      {errors.code && (
        <Text style={{ color: "#f87171", marginBottom: 16 }}>
          {errors.code.message}
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
          {isLoading ? "Überprüfe..." : "Code überprüfen"}
        </Text>
      </Pressable>

      <Pressable onPress={() => router.back()} style={{ marginTop: 24 }}>
        <Text style={{ color: "#a78bfa", textAlign: "center" }}>
          Hast du bereits einen Account?{" "}
          <Text style={{ fontWeight: "bold" }}>Login</Text>
        </Text>
      </Pressable>
    </View>
  );
}
