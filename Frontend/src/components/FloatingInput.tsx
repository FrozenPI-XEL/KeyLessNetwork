import { useEffect, useState } from "react";
import {
  Animated,
  Pressable,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Eingabefeld mit "schwebendem" Label, gemeinsam genutzt von Login, Registrierung und Profil-Setup.
// (Vorher gab es drei leicht unterschiedliche Kopien am Ende der jeweiligen Dateien.)
type FloatingInputProps = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  value?: string;
  onChangeText: (text: string) => void;
  /** Passwortfeld: Eingabe verdeckt, mit Auge-Knopf zum Anzeigen. */
  secure?: boolean;
  /** Fehlerzustand: Label und Symbol werden rot. */
  hasError?: boolean;
  placeholder?: string;
  autoCapitalize?: TextInputProps["autoCapitalize"];
  textContentType?: TextInputProps["textContentType"];
  autoComplete?: TextInputProps["autoComplete"];
};

const ERROR_COLOR = "#f87171";

export default function FloatingInput({
  label,
  icon,
  value,
  onChangeText,
  secure = false,
  hasError = false,
  placeholder,
  autoCapitalize = "none",
  textContentType,
  autoComplete,
}: FloatingInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const [animatedValue] = useState(() => new Animated.Value(value ? 1 : 0));

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: isFocused || value ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [animatedValue, isFocused, value]);

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
    color: hasError ? ERROR_COLOR : "#aaa",
  };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        borderBottomWidth: 2,
        borderBottomColor: hasError ? ERROR_COLOR : "#475569",
        marginBottom: 24,
        width: "100%",
        paddingBottom: 8,
      }}
    >
      <Ionicons
        name={icon}
        size={20}
        color={hasError ? ERROR_COLOR : "#666"}
        style={{ marginRight: 8 }}
      />

      <View style={{ flex: 1 }}>
        <Animated.Text style={labelStyle}>{label}</Animated.Text>
        <TextInput
          style={{ height: 40, fontSize: 20, color: "white" }}
          value={value}
          placeholder={isFocused ? placeholder : undefined}
          placeholderTextColor="#555"
          secureTextEntry={secure && hidden}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          textContentType={textContentType}
          autoComplete={autoComplete}
          accessibilityLabel={label}
        />
      </View>

      {secure && (
        <Pressable
          onPress={() => setHidden(!hidden)}
          hitSlop={8}
          accessibilityLabel={
            hidden ? "Passwort anzeigen" : "Passwort verbergen"
          }
        >
          <Ionicons name={hidden ? "eye-off" : "eye"} size={22} color="gray" />
        </Pressable>
      )}
    </View>
  );
}
