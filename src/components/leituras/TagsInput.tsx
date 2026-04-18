import { useState, KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

interface Props {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export const TagsInput = ({ tags, onChange }: Props) => {
  const [value, setValue] = useState("");

  const add = () => {
    const v = value.trim().toLowerCase();
    if (!v) return;
    if (tags.includes(v)) return setValue("");
    onChange([...tags, v]);
    setValue("");
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKey}
        onBlur={add}
        placeholder="Digite e pressione Enter"
        className="h-11 rounded-xl"
      />
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground rounded-full px-3 py-1 text-xs">
              {t}
              <button type="button" onClick={() => onChange(tags.filter((x) => x !== t))}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
