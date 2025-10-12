import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/");
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert("Check your email to confirm your account!");
      }
      navigate("/");
    } catch (err: any) {
      alert(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "calc(100vh - 80px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #e8f5e9, #ffffff)",
        padding: "2rem",
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "400px",
          padding: "2rem",
          textAlign: "center",
          borderRadius: "16px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
          background: "#fff",
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
        }}
      >
        <h1
          style={{
            fontSize: "1.8rem",
            fontWeight: "700",
            color: "#2e7d32",
            marginBottom: "0.5rem",
          }}
        >
          VegCooking
        </h1>
        <p style={{ color: "#555", marginBottom: "1.5rem" }}>
          {mode === "signin"
            ? "Welcome back! Sign in to continue."
            : "Join our community of vegetarian food lovers."}
        </p>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            className="btn"
            type="submit"
            disabled={loading}
            style={{ width: "100%", padding: "10px 0", fontSize: "1rem" }}
          >
            {loading ? "Please wait..." : mode === "signin" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <div
          style={{
            marginTop: "1.5rem",
            fontSize: "0.9rem",
            color: "#666",
          }}
        >
          {mode === "signin" ? (
            <>
              Don’t have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("signup")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#2e7d32",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("signin")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#2e7d32",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Sign in
              </button>
            </>
          )}
        </div>

        <div
          style={{
            marginTop: "2rem",
            fontSize: "0.8rem",
            color: "#999",
            borderTop: "1px solid #eee",
            paddingTop: "1rem",
          }}
        >
          © {new Date().getFullYear()} VegCooking — Eat Better. Live Better.
        </div>
      </div>
    </div>
  );
}
