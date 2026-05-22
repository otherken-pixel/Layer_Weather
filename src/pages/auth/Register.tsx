import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { signUpWithEmail } from "@/lib/supabase";

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !password) { setError("Please fill in all fields."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true); setError("");
    try {
      await signUpWithEmail(email.trim(), password, name.trim());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Sign up failed.");
    } finally { setLoading(false); }
  }

  return (
    <div className="flex flex-col min-h-full px-7 py-8 pt-safe overflow-y-auto" style={{ background: "linear-gradient(135deg,#6C63FF,#4A3FDB)" }}>
      <div className="flex flex-col gap-5 max-w-sm w-full mx-auto">
        <button onClick={() => navigate(-1)} className="w-11 h-11 rounded-full flex items-center justify-center text-white self-start" style={{ background: "rgba(255,255,255,0.15)" }}>←</button>
        <div>
          <h1 className="text-4xl font-black text-white" style={{ letterSpacing: "-0.5px" }}>Create account</h1>
          <p className="text-base mt-2" style={{ color: "rgba(255,255,255,0.75)" }}>Let's get you dressed for the weather ahead.</p>
        </div>
        <div className="flex flex-col gap-4">
          <Field label="Your name" type="text" value={name} onChange={setName} placeholder="Alex" />
          <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
          <Field label="Password" type={showPw ? "text" : "password"} value={password} onChange={setPassword} placeholder="8+ characters"
            right={<button onClick={() => setShowPw(v => !v)} className="text-white/60 text-sm">{showPw ? "Hide" : "Show"}</button>} />
        </div>
        {error && <p className="text-red-300 text-sm">{error}</p>}
        <p className="text-xs text-center" style={{ color: "rgba(255,255,255,0.45)" }}>
          By creating an account you agree to our Terms of Service and Privacy Policy.
        </p>
        <Button label="Create Account" onPress={handleRegister} loading={loading} variant="secondary" size="lg" fullWidth />
        <button onClick={() => navigate("/login")} className="text-center text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
          Already have an account? <span className="text-white font-bold">Sign in</span>
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
      <label className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.75)" }}>{label}</label>
      <div className="relative">
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className="w-full rounded-2xl px-4 py-3.5 text-base text-white outline-none border"
          style={{ background: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.25)", paddingRight: right ? "3.5rem" : undefined }}
        />
        {right && <div className="absolute right-4 top-1/2 -translate-y-1/2">{right}</div>}
      </div>
    </div>
  );
}
