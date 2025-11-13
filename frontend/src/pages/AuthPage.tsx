import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { username },
                emailRedirectTo: "https://veg-cooking.vercel.app/me",
            },
        });

        if (error) throw error;
        alert("Check your email for verification!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/");
      }
    } catch (err: any) {
      alert(err.message ?? "Auth failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",           // ✅ full-screen takeover
        top: 0,
        left: 0,
        width: "100vw",              // ✅ fill entire width
        height: "100vh",             // ✅ fill entire height
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #e8f5e9, #c8e6c9, #a5d6a7)",
        backgroundSize: "200% 200%",
        animation: "gradientShift 10s ease infinite",
        zIndex: 9999,                // ✅ sits above layout/navbar
      }}
    >
      <div
        className="fade-in"
        style={{
          width: "100%",
          maxWidth: 420,
          background: "rgba(255,255,255,0.8)",
          backdropFilter: "blur(14px)",
          borderRadius: 20,
          boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
          padding: "2.2rem 2rem",
        }}
      >
        <h1
          style={{
            textAlign: "center",
            color: "var(--brand)",
            fontWeight: 800,
            fontSize: "1.8rem",
            marginBottom: "1.5rem",
          }}
        >
          {isSignup ? "Create Account" : "Welcome Back"}
        </h1>

        <form
          onSubmit={handleAuth}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          {isSignup && (
            <input
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          )}
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
            disabled={loading}
            style={{
              fontSize: "1rem",
              padding: "12px",
              borderRadius: 12,
              marginTop: "0.5rem",
            }}
          >
            {loading ? "Please wait..." : isSignup ? "Sign Up" : "Sign In"}
          </button>
        </form>

        <div
          style={{
            textAlign: "center",
            marginTop: "1rem",
            color: "#555",
            fontSize: "0.95rem",
          }}
        >
          {isSignup ? "Already have an account?" : "Don’t have an account?"}{" "}
          <button
            type="button"
            onClick={() => setIsSignup(!isSignup)}
            style={{
              background: "none",
              border: "none",
              color: "var(--brand)",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: "0.95rem",
            }}
          >
            {isSignup ? "Sign in" : "Sign up"}
          </button>
        </div>
      </div>

      {/* animated gradient keyframes */}
      <style>
        {`
          @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}
      </style>
    </div>
  );
}
