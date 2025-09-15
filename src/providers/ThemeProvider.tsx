import React, { createContext, useContext, useState } from "react";
import { View } from "react-native";

type Theme = "light" | "dark";

const ThemeContext = createContext({
  theme: "light" as Theme,
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<Theme>("light");

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  // NativeWind bekommt den className
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <View className={'${theme} flex-1'}>
        {children}
      </View>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);