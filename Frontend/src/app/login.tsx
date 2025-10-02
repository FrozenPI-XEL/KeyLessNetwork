import React, { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, Animated } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../store/authStore";
import { useUserStore } from "../store/userStore"; 

type FormData = {
  username: string;
  password: string;
};

export default function LoginForm() {
  const { logIn } = useAuthStore();
  const users = useUserStore((s) => s.users); 
  const { control, handleSubmit, formState: { errors } } = useForm<FormData>();
  const [isLocked, setIsLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sichtbar, setSichtbar] = useState<boolean>(true);

  const onSubmit = (data: FormData) => {
    const foundUser = users.find(
      (u) => u.username === data.username && u.password === data.password
    );

    if (foundUser) {
      setIsLocked(true);
      setError(null);

      logIn(foundUser.username);

      useAuthStore.setState({
        isadmin: !!foundUser.isadmin,
        iswhitecard: !!foundUser.iswhitecard,
        istempadmin: !!foundUser.istempadmin,
      });
    } else {
      setIsLocked(false);
      setError("Benutzername oder Passwort falsch!");
    }
  };

  return (
    <View className="flex-1 bg-slate-900 items-center justify-center px-6">
      {/* Username */}
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
      {errors.username && <Text className="text-red-400">{errors.username.message}</Text>}

      {/* Passwort */}
      <Controller
        control={control}
        name="password"
        rules={{ required: "Passwort ist erforderlich" }}
        render={({ field: { onChange, value } }) => (
          <View className="flex-row items-center w-full">
            <View className="flex-1">
              <FloatingInput
                label="Passwort"
                icon="lock-closed"
                value={value}
                onChangeText={onChange}
                secureTextEntry={sichtbar}
              />
            </View>
            <TouchableOpacity
              onPress={() => setSichtbar(!sichtbar)}
              className="absolute right-4 top-3"
            >
              <Ionicons name={sichtbar ? "eye-off" : "eye"} size={22} color="gray" />
            </TouchableOpacity>
          </View>
        )}
      />
      {errors.password && <Text className="text-red-400">{errors.password.message}</Text>}

      {error && <Text className="text-red-400">{error}</Text>}

      <TouchableOpacity
        className="flex-row items-center bg-indigo-500 px-6 py-3 rounded-xl mt-3"
        onPress={handleSubmit(onSubmit)}
      >
        <Ionicons name="checkmark-circle-outline" size={22} color="white" />
        <Text className="text-white font-semibold text-base ml-2">Confirm</Text>
      </TouchableOpacity>

      {isLocked && (
        <Text className="text-green-400 mt-5 text-lg">✅ Erfolgreich eingeloggt!</Text>
      )}
    </View>
  );
}

/* FloatingInput bleibt unverändert */
const FloatingInput = ({ label, value, onChangeText, secureTextEntry, icon }: {
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
    top: animatedValue.interpolate({ inputRange: [0, 1], outputRange: [18, -8] }),
    fontSize: animatedValue.interpolate({ inputRange: [0, 1], outputRange: [16, 12] }),
    color: "#aaa",
  };

  return (
    <View className="flex-row items-center border-b-2 border-slate-600 mb-6 w-full relative pb-1">
      <Ionicons name={icon} size={20} color="#666" style={{ marginRight: 8 }} />
      <View className="flex-1">
        <Animated.Text style={labelStyle}>{label}</Animated.Text>
        <TextInput
          className="h-10 text-xl text-white"
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
