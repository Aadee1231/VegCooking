import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

export type RecipeOpt = { id: number; title: string };

export default function SearchableRecipeSelect({
  value,
  onChange,
  options,
  currentUserId,
  placeholder,
  disabled,
}: {
  value: number | null;
  onChange: (id: number | null) => void;
  options: RecipeOpt[];
  currentUserId: string | null;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [filtered, setFiltered] = useState<RecipeOpt[]>([]);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const term = q.trim().toLowerCase();
    const filtered = options.filter((r) => r.title.toLowerCase().includes(term));
    setFiltered(filtered);
  }, [q, open, options]);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) && e.target !== inputRef.current) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const selectedTitle = options.find((r) => r.id === value)?.title ?? "";

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <input
        ref={inputRef}
        placeholder={placeholder ?? "Select recipe..."}
        value={open ? q : selectedTitle}
        onChange={(e) => {
          setQ(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        disabled={disabled}
        style={{
          width: "100%",
          padding: "4px 6px",
          fontSize: "0.8rem",
          borderRadius: "6px",
          border: "1px solid #ddd",
          textAlign: "center",
        }}
      />
      {open && (
        <div
            ref={panelRef}
            className="card"
            style={{
                position: "absolute",
                top: "105%",
                left: 0,
                right: 0,
                zIndex: 10000,           // ✅ keep on top of everything
                maxHeight: 200,
                overflowY: "auto",
                marginTop: 2,
                background: "#fff",      // ✅ make sure it doesn’t blend
                boxShadow: "0 4px 8px rgba(0,0,0,0.15)", // ✅ add subtle shadow
                borderRadius: "8px",
            }}
        >

          {filtered.length ? (
            filtered.map((r) => (
              <div
                key={r.id}
                onClick={() => {
                  onChange(r.id);
                  setOpen(false);
                }}
                style={{
                  padding: "6px 10px",
                  borderBottom: "1px solid #eee",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                }}
              >
                {r.title}
              </div>
            ))
          ) : (
            <div style={{ padding: 8, color: "#777", fontSize: "0.8rem" }}>No matches</div>
          )}
        </div>
      )}
    </div>
  );
}
