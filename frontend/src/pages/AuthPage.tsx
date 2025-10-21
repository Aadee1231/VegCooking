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
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username } },
        });
        if (error) throw error;
        if (data.user) {
          await supabase.from("profiles").insert({
            id: data.user.id,
            username,
          });
        }
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
    <div className="card fade-in" style={{ maxWidth: 420, margin: "5rem auto", padding: "2rem" }}>
      <h2 style={{ textAlign: "center", color: "#2e7d32", marginBottom: "1.5rem" }}>
        {isSignup ? "Create Account" : "Sign In"}
      </h2>

      <form onSubmit={handleAuth} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
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
        <button className="btn" disabled={loading}>
          {loading ? "Please wait..." : isSignup ? "Sign Up" : "Sign In"}
        </button>
      </form>

      <p style={{ textAlign: "center", marginTop: "1rem", color: "#555" }}>
        {isSignup ? "Already have an account?" : "Don’t have an account?"}{" "}
        <button
          type="button"
          style={{
            background: "none",
            border: "none",
            color: "#1565c0",
            fontWeight: 600,
            cursor: "pointer",
          }}
          onClick={() => setIsSignup(!isSignup)}
        >
          {isSignup ? "Sign in" : "Sign up"}
        </button>
      </p>
    </div>
  );
}
