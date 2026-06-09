import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type FontSize = "P" | "M" | "G";

interface FontSizeContextValue {
  size: FontSize;
  setSize: (s: FontSize) => void;
}

const FontSizeContext = createContext<FontSizeContextValue | undefined>(undefined);
const STORAGE_KEY = "namzu-font-size";

const SIZE_PX: Record<FontSize, string> = {
  P: "14px",
  M: "16px",
  G: "18px",
};

const apply = (s: FontSize) => {
  document.documentElement.style.fontSize = SIZE_PX[s];
};

export const FontSizeProvider = ({ children }: { children: ReactNode }) => {
  const [size, setSizeState] = useState<FontSize>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as FontSize | null;
    return stored && ["P", "M", "G"].includes(stored) ? stored : "M";
  });

  useEffect(() => {
    apply(size);
  }, [size]);

  const setSize = (s: FontSize) => {
    localStorage.setItem(STORAGE_KEY, s);
    setSizeState(s);
  };

  return (
    <FontSizeContext.Provider value={{ size, setSize }}>{children}</FontSizeContext.Provider>
  );
};

export const useFontSize = () => {
  const ctx = useContext(FontSizeContext);
  if (!ctx) throw new Error("useFontSize must be used within FontSizeProvider");
  return ctx;
};
