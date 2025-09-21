import {createContext,useContext,useState,useEffect,ReactNode} from "react";
import { View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  //  Theme beim App-Start aus dem Speicher laden
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem("theme");
        if (savedTheme === "light" || savedTheme === "dark") {
          setTheme(savedTheme);
        }
      } catch (err) {
        console.warn("Fehler beim Laden des Themes:", err);
      }
    };
    loadTheme();
  }, []);

  //  Theme umschalten + speichern
  const toggleTheme = async () => {
    try {
      const newTheme = theme === "light" ? "dark" : "light";
      setTheme(newTheme);
      await AsyncStorage.setItem("theme", newTheme);
    } catch (err) {
      console.warn("Fehler beim Speichern des Themes:", err);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      <View className={`${theme} flex-1`}>{children}</View>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme muss innerhalb von <ThemeProvider> verwendet werden");
  }
  return context;
}
