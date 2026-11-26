import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuthStore } from "../store/authStore";
import FloatingInput from "../components/FloatingInput";

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

  const onSubmit = async (data: FormData) => {
    setError(null);
    setIsLoading(true);

    try {
      await logIn(data.username.trim(), data.password);
      setIsLocked(true);
      router.replace("/(tabs)/home");
    } catch {
      setIsLocked(false);
      setError("Benutzername oder Passwort falsch!");
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
          fontSize: 30,
          fontWeight: "bold",
          color: "white",
          marginBottom: 32,
        }}
      >
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
            textContentType="username"
            autoComplete="username"
          />
        )}
      />

      {errors.username && (
        <Text style={{ color: "#f87171" }}>{errors.username.message}</Text>
      )}

      <Controller
        control={control}
        name="password"
        rules={{ required: "Passwort ist erforderlich" }}
        render={({ field: { onChange, value } }) => (
          <FloatingInput
            label="Passwort"
            icon="lock-closed"
            value={value}
            onChangeText={onChange}
            secure
            textContentType="password"
            autoComplete="password"
          />
        )}
      />

      {errors.password && (
        <Text style={{ color: "#f87171" }}>{errors.password.message}</Text>
      )}

      {error && <Text style={{ color: "#f87171" }}>{error}</Text>}

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
          {isLoading ? "Anmelden..." : "Login"}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => router.push("/register")}
        style={{ marginTop: 24, paddingHorizontal: 24, paddingVertical: 12 }}
      >
        <Text style={{ color: "#818cf8", textAlign: "center" }}>
          Noch kein Account?{" "}
          <Text style={{ fontWeight: "bold" }}>Registrieren</Text>
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
