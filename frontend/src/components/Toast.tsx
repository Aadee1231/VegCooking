import { useEffect } from "react";

export default function GlobalToast({
  message,
  clear,
}: {
  message: string;
  clear: () => void;
}) {
  useEffect(() => {
    if (message) {
      const t = setTimeout(() => clear(), 2500);
      return () => clearTimeout(t);
    }
  }, [message]);

  if (!message) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        padding: "16px 22px",
        background: "var(--brand)",
        color: "#fff",
        borderRadius: 14,
        fontWeight: 700,
        zIndex: 999999,
        boxShadow: "0 14px 40px rgba(0,0,0,.25)",
        fontSize: "1rem",
        textAlign: "center",
      }}
    >
      {message}
    </div>
  );
}
