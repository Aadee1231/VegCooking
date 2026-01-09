"use client";

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

export default function ResetPasswordBridge() {
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      // This finalizes the recovery session from the email link
      await supabase.auth.getSession();

      // Try to open the app
      window.location.href = "flavur://reset-password";

      // Fallback: if app isn't installed, stay on web reset page
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 800);
    };

    run();
  }, [navigate]);

  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <h1>Resetting your password…</h1>
      <p>If nothing happens, you’ll be redirected shortly.</p>
    </div>
  );
}
