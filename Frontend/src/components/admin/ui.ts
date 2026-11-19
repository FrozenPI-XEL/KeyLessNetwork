import type { TextStyle, ViewStyle } from "react-native";

// Gemeinsame Optik der Admin-Tabs (passend zum bisherigen Admin-Panel).
export const cardStyle: ViewStyle = {
  backgroundColor: "#334155",
  padding: 12,
  borderRadius: 8,
  marginBottom: 8,
};

export const formCardStyle: ViewStyle = {
  backgroundColor: "#334155",
  padding: 12,
  borderRadius: 8,
  marginTop: 16,
};

export const inputStyle: TextStyle = {
  backgroundColor: "#1e293b",
  color: "white",
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 6,
};

export const labelStyle: TextStyle = { color: "#cbd5e1", marginBottom: 4 };

export const primaryButton: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#6366f1",
  paddingHorizontal: 12,
  paddingVertical: 10,
  borderRadius: 6,
};

export const dangerButton: ViewStyle = {
  backgroundColor: "#ef4444",
  padding: 8,
  borderRadius: 6,
};

export const headingStyle: TextStyle = { color: "white", fontSize: 20, fontWeight: "bold", marginBottom: 12 };
export const mutedText: TextStyle = { color: "#cbd5e1", fontSize: 12 };
