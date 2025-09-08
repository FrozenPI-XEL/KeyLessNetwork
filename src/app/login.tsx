import React from "react";
import { View, TextInput, Text, Pressable } from "react-native";
import { useForm, Controller } from "react-hook-form";

const sanitizeTextInput = (value: string) => {
  return value.replace(/<[^>]*>?/gm, "");
};

export default function Login() {
  const { control, handleSubmit } = useForm();

  const onSubmit = (data: any) => {
    console.log("Saubere Daten:", data);
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 16 }}>
      {/* Benutzername */}
      <Controller
        control={control}
        name="username"
        rules={{ required: "Benutzername ist erforderlich" }}
        render={({ field: { onChange, value }, fieldState: { error } }) => (
          <>
            <TextInput
              style={{ borderWidth: 1, marginBottom: 5, padding: 8 }}
              placeholder="Benutzername"
              value={value}
              onChangeText={(text) => onChange(sanitizeTextInput(text))}
            />
            {error && <Text style={{ color: "red" }}>{error.message}</Text>}
          </>
        )}
      />

      {/* Passwort */}
      <Controller
        control={control}
        name="password"
        rules={{ required: "Passwort ist erforderlich" }}
        render={({ field: { onChange, value }, fieldState: { error } }) => (
          <>
            <TextInput
              style={{ borderWidth: 1, marginBottom: 5, padding: 8 }}
              placeholder="Passwort"
              secureTextEntry
              value={value}
              onChangeText={(text) => onChange(sanitizeTextInput(text))}
            />
            {error && <Text style={{ color: "red" }}>{error.message}</Text>}
          </>
        )}
      />

      {/* Submit */}
      <Pressable
        style={{ backgroundColor: "blue", padding: 12, marginTop: 10 }}
        onPress={handleSubmit(onSubmit)}
      >
        <Text style={{ color: "white", textAlign: "center" }}>Login</Text>
      </Pressable>
    </View>
  );
}


