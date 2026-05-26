import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import Logo from "@/components/ui/Logo";
import { signUpWithEmail } from "@/lib/supabase";

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [confirmEmail, setConfirmEmail] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (countdown <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [countdown]);

  async function handleRegister(e?: React.FormEvent) {
    e?.preventDefault();
    if (!name.trim() || !email.trim() || !password) { setError("Please fill in all fields."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true); setError("");
    try {
      const data = await signUpWithEmail(email.trim(), password, name.trim());
      if (data.session) {
        // Email confirmation disabled — auto-logged in, useAuth handles redirect
      } else {
        // Email confirmation required — show success state
        setConfirmEmail(email.trim());
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Sign up failed.";
      const match = msg.match(/after (\d+) second/);
      if (match) {
        setCountdown(parseInt(match[1]));
      } else {
        setError(
          msg.toLowerCase().includes("already registered") || msg.toLowerCase().includes("already been registered")
            ? "An account with this email already exists."
            : msg
        );
      }
    } finally { setLoading(false); }
  }

  // Email confirmation sent — show success screen
  if (confirmEmail) {
    return (
      <div
        className="flex flex-col h-full items-center justify-center gap-6 px-8 text-center pt-safe"
        style={{ background: "linear-gradient(160deg,#1a1a2e,#16213e)" }}
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 16 }}
          className="text-6xl"
        >
          ✉️
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <h1 className="text-2xl font-black text-white mb-3" style={{ letterSpacing: "-0.02em" }}>
            Check your email
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
            We sent a verification link to{" "}
            <strong className="text-white">{confirmEmail}</strong>.{" "}
            Click it to activate your account.
          </p>
        </motion.div>
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={() => navigate("/login")}
          className="text-sm font-semibold mt-2"
          style={{ color: "#9D97FF" }}
        >
          Go to Sign In
        </motion.button>
      </div>
    );
  }

  return (
    <div
      className="relative flex flex-col min-h-full overflow-hidden"
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
          right: -80,
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
          bottom: 60,
          left: -60,
        }}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />

      <div className="relative flex flex-col gap-5 px-7 py-8 pt-safe overflow-y-auto max-w-sm w-full mx-auto">
        <button
          onClick={() => navigate("/welcome")}
          className="w-11 h-11 rounded-full flex items-center justify-center text-white self-start"
          style={{ background: "rgba(255,255,255,0.15)" }}
          aria-label="Back"
        >
          ←
        </button>

        <Logo size={28} />

        <div>
          <h1 className="text-4xl font-black text-white" style={{ letterSpacing: "-0.03em" }}>
            Create account
          </h1>
          <p className="text-base mt-2" style={{ color: "rgba(255,255,255,0.65)" }}>
            Let's get you dressed for the weather ahead.
          </p>
        </div>

        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <Field label="Your name" type="text" value={name} onChange={setName} placeholder="Alex" autoComplete="given-name" />
          <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" autoComplete="email" />
          <Field
            label="Password"
            type={showPw ? "text" : "password"}
            value={password}
            onChange={setPassword}
            placeholder="8+ characters"
            autoComplete="new-password"
            right={<button type="button" onClick={() => setShowPw((v) => !v)} className="text-white/60 text-sm">{showPw ? "Hide" : "Show"}</button>}
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

          {countdown > 0 && (
            <p className="text-sm text-center" style={{ color: "rgba(255,255,255,0.7)" }}>
              Retrying in <span className="font-bold text-white">{countdown}s</span>…
            </p>
          )}

          <p className="text-xs text-center" style={{ color: "rgba(255,255,255,0.4)" }}>
            By creating an account you agree to our{" "}
            <a
              href="https://www.layerweather.app/terms"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "rgba(255,255,255,0.75)", textDecoration: "underline" }}
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              href="https://www.layerweather.app/privacy"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "rgba(255,255,255,0.75)", textDecoration: "underline" }}
            >
              Privacy Policy
            </a>
            .
          </p>

          <Button
            label={countdown > 0 ? `Wait ${countdown}s…` : "Create Account"}
            onPress={() => handleRegister()}
            loading={loading}
            disabled={countdown > 0}
            variant="secondary"
            size="lg"
            fullWidth
          />
        </form>

        <button onClick={() => navigate("/login")} className="text-center text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
          Already have an account? <span className="text-white font-bold">Sign in</span>
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
      <label className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.75)" }}>{label}</label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full rounded-2xl px-4 py-3.5 text-base text-white outline-none border"
          style={{ background: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.22)", paddingRight: right ? "3.5rem" : undefined }}
        />
        {right && <div className="absolute right-4 top-1/2 -translate-y-1/2">{right}</div>}
      </div>
    </div>
  );
}
