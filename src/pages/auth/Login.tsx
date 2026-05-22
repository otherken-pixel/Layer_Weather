import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { signInWithEmail } from "@/lib/supabase";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    if (!email.trim() || !password) { setError("Please enter your email and password."); return; }
    setLoading(true); setError("");
    try {
      const { error: err } = await signInWithEmail(email.trim(), password);
      if (err) throw err;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Sign in failed.");
    } finally { setLoading(false); }
  }

  return (
    <div className="flex flex-col min-h-full px-7 pt-safe" style={{ background: "linear-gradient(160deg,#1a1a2e,#16213e)" }}>
      <div className="flex flex-col gap-6 mt-8">
        <button onClick={() => navigate(-1)} className="w-11 h-11 rounded-full flex items-center justify-center text-white" style={{ background: "rgba(255,255,255,0.1)" }}>
          ←
        </button>
        <div>
          <h1 className="text-4xl font-black text-white" style={{ letterSpacing: "-0.5px" }}>Welcome back</h1>
          <p className="text-base mt-2" style={{ color: "rgba(255,255,255,0.6)" }}>Sign in to your WearToday account</p>
        </div>
        <div className="flex flex-col gap-4">
          <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
          <Field label="Password" type={showPw ? "text" : "password"} value={password} onChange={setPassword} placeholder="Your password"
            right={<button onClick={() => setShowPw(v => !v)} className="text-white/50 text-sm">{showPw ? "Hide" : "Show"}</button>} />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <Button label="Sign In" onPress={handleLogin} loading={loading} variant="primary" size="lg" fullWidth />
        <button onClick={() => navigate("/register")} className="text-center text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
          No account yet? <span className="text-white font-bold">Create one</span>
        </button>
      </div>
    </div>
  );
}

function Field({ label, type, value, onChange, placeholder, right }: {
  label: string; type: string; value: string; onChange: (v: string) => void; placeholder: string; right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>{label}</label>
      <div className="relative">
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className="w-full rounded-2xl px-4 py-3.5 text-base text-white outline-none border"
          style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.15)", paddingRight: right ? "3rem" : undefined }}
        />
        {right && <div className="absolute right-4 top-1/2 -translate-y-1/2">{right}</div>}
      </div>
    </div>
  );
}
