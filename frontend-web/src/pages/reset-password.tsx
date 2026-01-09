"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ResetPasswordBridge() {
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      // This finalizes the recovery session from the email link
      await supabase.auth.getSession();

      // Try to open the app
      window.location.href = "flavur://reset-password";

      // Fallback: if app isn't installed, stay on web reset page
      setTimeout(() => {
        router.replace("/login");
      }, 800);
    };

    run();
  }, [router]);

  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <h1>Resetting your password…</h1>
      <p>If nothing happens, you’ll be redirected shortly.</p>
    </div>
  );
}
