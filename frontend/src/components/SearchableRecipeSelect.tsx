import { useEffect, useMemo, useRef, useState } from "react";

export type RecipeOpt = { id: number; title: string; user_id: string; is_public: boolean };

type Props = {
  value: number | null;
  onChange: (id: number | null) => void;
  options: RecipeOpt[];
  placeholder?: string;
  disabled?: boolean;
  // pass current user id so we can show "• public" only when it's not yours
  currentUserId?: string | null;
};

export default function SearchableRecipeSelect({
  value,
  onChange,
  options,
  placeholder = "(choose recipe)",
  disabled,
  currentUserId,
}: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);

  const selected = options.find(o => o.id === value) || null;

  // filter options by title (case-insensitive)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(o => o.title.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    // close when clicking outside
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (open) {
      // focus the search box when menu opens
      setTimeout(() => inputRef.current?.focus(), 0);
      setHighlight(0);
    } else {
      setQuery("");
    }
  }, [open]);

  function pick(opt: RecipeOpt | null) {
    onChange(opt ? opt.id : null);
    setOpen(false);
  }

  function label(opt: RecipeOpt) {
    const isOtherPublic = opt.is_public && opt.user_id !== currentUserId;
    return `${opt.title}${isOtherPublic ? " • public" : ""}`;
  }

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "8px 10px",
          border: "1px solid #cfd2d6",
          borderRadius: 6,
          background: disabled ? "#f5f5f5" : "#fff",
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        <span style={{ opacity: selected ? 1 : 0.65 }}>
          {selected ? label(selected) : placeholder}
        </span>
        <span style={{ float: "right", opacity: 0.6 }}>▾</span>
      </button>

      {/* Popover */}
      {open && (
        <div
          role="listbox"
          aria-activedescendant={`sr-opt-${highlight}`}
          style={{
            position: "absolute",
            zIndex: 30,
            marginTop: 6,
            width: "100%",
            background: "#fff",
            border: "1px solid #cfd2d6",
            borderRadius: 8,
            boxShadow: "0 6px 24px rgba(16,24,40,.12)",
            overflow: "hidden",
          }}
        >
          {/* Search box inside dropdown */}
          <div style={{ padding: 8, borderBottom: "1px solid #eee" }}>
            <input
              ref={inputRef}
              placeholder="Search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setHighlight((h) => Math.min(h + 1, Math.max(filtered.length - 1, 0)));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setHighlight((h) => Math.max(h - 1, 0));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  const item = filtered[highlight];
                  if (item) pick(item);
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  setOpen(false);
                }
              }}
              style={{
                width: "100%",
                padding: "8px 10px",
                border: "1px solid #d0d5dd",
                borderRadius: 6,
              }}
            />
          </div>

          {/* Options list */}
          <ul
            style={{
              maxHeight: 220,
              overflowY: "auto",
              margin: 0,
              padding: 6,
              listStyle: "none",
            }}
          >
            {filtered.length === 0 && (
              <li style={{ padding: "8px 10px", color: "#6b7280" }}>No matches</li>
            )}
            {filtered.map((opt, i) => (
              <li
                id={`sr-opt-${i}`}
                key={opt.id}
                role="option"
                aria-selected={i === highlight}
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={(e) => {
                  // prevent input from losing focus before onClick fires
                  e.preventDefault();
                }}
                onClick={() => pick(opt)}
                style={{
                  padding: "8px 10px",
                  borderRadius: 6,
                  background: i === highlight ? "#f2f4f7" : "transparent",
                  cursor: "pointer",
                }}
                title={label(opt)}
              >
                {label(opt)}
              </li>
            ))}
          </ul>

          {/* Optional clear selection row (only shown if something is selected) */}
          {selected && (
            <button
              type="button"
              onClick={() => pick(null)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderTop: "1px solid #eee",
                background: "#fafafa",
                cursor: "pointer",
              }}
            >
              Clear selection
            </button>
          )}
        </div>
      )}
    </div>
  );
}
