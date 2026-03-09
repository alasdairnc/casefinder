import { createContext, useContext, useState, useMemo } from "react";
import { themes } from "./themes.js";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);
  const theme = isDark ? themes.dark : themes.light;

  const value = useMemo(
    () => ({ theme, isDark, toggleTheme: () => setIsDark((d) => !d) }),
    [theme, isDark]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx.theme;
}

export function useThemeActions() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeActions must be used within ThemeProvider");
  return { isDark: ctx.isDark, toggleTheme: ctx.toggleTheme };
}
