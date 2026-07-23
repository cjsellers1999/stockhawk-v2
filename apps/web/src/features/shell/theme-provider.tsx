import {
  createContext,
  useContext,
  useEffect,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

type Theme = "dark" | "light";

type ThemeContextValue = {
  dark: boolean;
  setDark: (dark: boolean) => void;
};

type ThemeProviderProps = {
  children: ReactNode;
};

const themeStorageKey = "stockhawk-theme";
const ThemeContext = createContext<Theme | undefined>(undefined);
const SetThemeContext = createContext<
  Dispatch<SetStateAction<Theme>> | undefined
>(undefined);

const getInitialTheme = (): Theme =>
  window.localStorage.getItem(themeStorageKey) === "dark" ? "dark" : "light";

const applyTheme = (theme: Theme) => {
  document.documentElement.classList.toggle("dark", theme === "dark");
  window.localStorage.setItem(themeStorageKey, theme);
};

const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLInputElement ||
  target instanceof HTMLTextAreaElement ||
  target instanceof HTMLSelectElement ||
  (target instanceof HTMLElement && target.isContentEditable);

const subscribeThemeShortcut = (setTheme: Dispatch<SetStateAction<Theme>>) => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (isTypingTarget(event.target)) {
      return;
    }
    if (event.key.toLowerCase() !== "d") {
      return;
    }
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  };

  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
};

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => applyTheme(theme), [theme]);
  useEffect(() => subscribeThemeShortcut(setTheme), []);

  return (
    <ThemeContext value={theme}>
      <SetThemeContext value={setTheme}>{children}</SetThemeContext>
    </ThemeContext>
  );
};

export const useTheme = (): ThemeContextValue => {
  const theme = useContext(ThemeContext);
  const setTheme = useContext(SetThemeContext);
  if (theme === undefined || setTheme === undefined) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return {
    dark: theme === "dark",
    setDark: (dark) => setTheme(dark ? "dark" : "light"),
  };
};
