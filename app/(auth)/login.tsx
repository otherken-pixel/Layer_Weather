import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui/Button";
import { signInWithEmail } from "@/lib/supabase";
import { Colors } from "@/constants/colors";

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert("Missing fields", "Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await signInWithEmail(email.trim(), password);
      if (error) throw error;
      // Auth state change in useAuth will trigger navigation
    } catch (err: unknown) {
      Alert.alert("Sign in failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={["#1a1a2e", "#16213e"]} style={styles.root}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[styles.inner, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </Pressable>

        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to your WearToday account</Text>

        <View style={styles.form}>
          <InputField
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="you@example.com"
          />
          <InputField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            placeholder="Your password"
            rightAction={
              <Pressable onPress={() => setShowPassword((v) => !v)}>
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={20}
                  color={Colors.text.muted}
                />
              </Pressable>
            }
          />
        </View>

        <Button
          label="Sign In"
          onPress={handleLogin}
          loading={loading}
          variant="primary"
          size="lg"
          fullWidth
        />

        <Pressable style={styles.link} onPress={() => router.push("/(auth)/register")}>
          <Text style={styles.linkText}>
            No account yet? <Text style={styles.linkBold}>Create one</Text>
          </Text>
        </Pressable>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

function InputField({
  label,
  rightAction,
  ...props
}: React.ComponentProps<typeof TextInput> & { label: string; rightAction?: React.ReactNode }) {
  return (
    <View style={inputStyles.wrap}>
      <Text style={inputStyles.label}>{label}</Text>
      <View style={inputStyles.row}>
        <TextInput
          style={[inputStyles.input, rightAction && { paddingRight: 44 }]}
          placeholderTextColor={Colors.text.muted}
          {...props}
        />
        {rightAction && <View style={inputStyles.right}>{rightAction}</View>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inner: {
    flex: 1,
    paddingHorizontal: 28,
    gap: 20,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginBottom: 8,
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: "white",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.text.inverseSecondary,
    marginTop: -8,
  },
  form: { gap: 16 },
  link: { alignItems: "center", paddingVertical: 4 },
  linkText: { fontSize: 15, color: Colors.text.inverseSecondary },
  linkBold: { fontWeight: "700", color: "white" },
});

const inputStyles = StyleSheet.create({
  wrap: { gap: 8 },
  label: { fontSize: 14, fontWeight: "600", color: Colors.text.inverseSecondary },
  row: { position: "relative" },
  input: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "white",
  },
  right: {
    position: "absolute",
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
});
