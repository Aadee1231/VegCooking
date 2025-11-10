// src/components/Toast.tsx
import { useEffect, useState } from "react";

export function Toast({ msg }: { msg: string }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="toast-notify"
      style={{
        position: "fixed",
        bottom: "60px",
        left: "50%",
        transform: "translateX(-50%)",
        background: "var(--brand)",
        color: "#fff",
        padding: "14px 24px",
        borderRadius: "14px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
        fontSize: "1rem",
        fontWeight: 600,
        zIndex: 9999,
        opacity: 0,
        animation: "toast-fade 3s ease forwards",
      }}
    >
      {msg}
    </div>
  );
}
