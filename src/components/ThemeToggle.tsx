import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

const opts = [
  { value: "light", label: "Claro", Icon: Sun },
  { value: "system", label: "Auto", Icon: Monitor },
  { value: "dark", label: "Escuro", Icon: Moon },
] as const;

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  return (
    <div className="inline-flex bg-muted rounded-2xl p-1 gap-1">
      {opts.map(({ value, label, Icon }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors",
            theme === value
              ? "bg-card text-foreground shadow-soft"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Icon className="w-3.5 h-3.5" /> {label}
        </button>
      ))}
    </div>
  );
};
