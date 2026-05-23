import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import Logo from "@/components/ui/Logo";
import { signInWithEmail, supabase } from "@/lib/supabase";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);

  async function handleLogin(e?: React.FormEvent) {
    e?.preventDefault();
    if (!email.trim() || !password) { setError("Please enter your email and password."); return; }
    setLoading(true); setError(""); setResetSent(false);
    try {
      const { error: err } = await signInWithEmail(email.trim(), password);
      if (err) throw err;
      // useAuth handles session change → route redirect
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Sign in failed.";
      setError(
        msg.toLowerCase().includes("invalid login credentials")
          ? "Incorrect email or password. Try again."
          : msg
      );
    } finally { setLoading(false); }
  }

  async function handleForgotPassword() {
    if (!email.trim()) { setError("Enter your email address first, then tap Forgot Password."); return; }
    setResetLoading(true); setError("");
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/login`,
      });
      if (err) throw err;
      setResetSent(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Reset failed. Try again.");
    } finally { setResetLoading(false); }
  }

  return (
    <div
      className="relative flex flex-col min-h-full"
      style={{ background: "linear-gradient(160deg,#1a1a2e 0%,#2d1b4e 55%,#162033 100%)" }}
    >
      {/* Background glow blobs */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 300,
          height: 300,
          background: "radial-gradient(circle, rgba(108,99,255,0.22) 0%, transparent 70%)",
          top: -80,
          left: -80,
        }}
        animate={{ scale: [1, 1.12, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 220,
          height: 220,
          background: "radial-gradient(circle, rgba(0,122,255,0.15) 0%, transparent 70%)",
          bottom: 80,
          right: -60,
        }}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />

      <div className="relative flex flex-col gap-6 px-7 pt-safe mt-8 pb-10 max-w-sm w-full mx-auto min-h-0 flex-1 overflow-y-auto">
        <button
          onClick={() => navigate("/welcome")}
          className="w-11 h-11 rounded-full flex items-center justify-center text-white self-start"
          style={{ background: "rgba(255,255,255,0.1)" }}
          aria-label="Back"
        >
          ←
        </button>

        <Logo size={28} />

        <div>
          <h1 className="text-4xl font-black text-white" style={{ letterSpacing: "-0.03em" }}>
            Welcome back
          </h1>
          <p className="text-base mt-2" style={{ color: "rgba(255,255,255,0.6)" }}>
            Sign in to your WearToday account
          </p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" autoComplete="email" />
          <Field
            label="Password"
            type={showPw ? "text" : "password"}
            value={password}
            onChange={setPassword}
            placeholder="Your password"
            autoComplete="current-password"
            right={
              <button type="button" onClick={() => setShowPw((v) => !v)} className="text-white/50 text-sm">
                {showPw ? "Hide" : "Show"}
              </button>
            }
          />

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm font-medium px-4 py-3 rounded-xl"
              style={{ color: "#FF3B30", background: "rgba(255,59,48,0.1)", border: "1px solid rgba(255,59,48,0.2)" }}
            >
              {error}
            </motion.p>
          )}

          {resetSent && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm font-medium px-4 py-3 rounded-xl"
              style={{ color: "#34C759", background: "rgba(52,199,89,0.1)", border: "1px solid rgba(52,199,89,0.2)" }}
            >
              Password reset email sent. Check your inbox.
            </motion.p>
          )}

          <Button label="Sign In" onPress={() => handleLogin()} loading={loading} variant="primary" size="lg" fullWidth />
        </form>

        <button
          type="button"
          onClick={handleForgotPassword}
          disabled={resetLoading}
          className="text-sm text-center disabled:opacity-40 transition-opacity"
          style={{ color: "rgba(255,255,255,0.45)" }}
        >
          {resetLoading ? "Sending…" : "Forgot password?"}
        </button>

        <button onClick={() => navigate("/register")} className="text-center text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
          No account yet? <span className="text-white font-bold">Create one</span>
        </button>
      </div>
    </div>
  );
}

function Field({
  label, type, value, onChange, placeholder, right, autoComplete,
}: {
  label: string; type: string; value: string; onChange: (v: string) => void;
  placeholder: string; right?: React.ReactNode; autoComplete?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>{label}</label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full rounded-2xl px-4 py-3.5 text-base text-white outline-none border"
          style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.15)", paddingRight: right ? "3rem" : undefined }}
        />
        {right && <div className="absolute right-4 top-1/2 -translate-y-1/2">{right}</div>}
      </div>
    </div>
  );
}
