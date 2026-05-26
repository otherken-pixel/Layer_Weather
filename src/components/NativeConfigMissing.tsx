import { Capacitor } from "@capacitor/core";

/** Shown on iOS/Android when the app was built without Supabase env vars. */
export function NativeConfigMissing() {
  if (!Capacitor.isNativePlatform()) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 28,
        background: "#1a1a2e",
        color: "white",
        textAlign: "center",
      }}
    >
      <span style={{ fontSize: 48 }}>⚙️</span>
      <h1 style={{ fontSize: 22, fontWeight: 800 }}>Configuration required</h1>
      <p style={{ opacity: 0.75, fontSize: 15, lineHeight: 1.5, maxWidth: 320 }}>
        Create a <code style={{ color: "#a5b4fc" }}>.env</code> file in the project root with your
        Supabase keys, then rebuild:
      </p>
      <pre
        style={{
          textAlign: "left",
          fontSize: 12,
          background: "rgba(0,0,0,0.35)",
          padding: 16,
          borderRadius: 12,
          overflow: "auto",
          maxWidth: "100%",
        }}
      >
        {`VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

npm run build:ios
npx cap sync ios`}
      </pre>
    </div>
  );
}
