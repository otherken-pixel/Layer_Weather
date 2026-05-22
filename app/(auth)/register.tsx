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
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui/Button";
import { signUpWithEmail } from "@/lib/supabase";
import { Colors } from "@/constants/colors";

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!displayName.trim() || !email.trim() || !password) {
      Alert.alert("Missing fields", "Please fill in all fields.");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Weak password", "Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      await signUpWithEmail(email.trim(), password, displayName.trim());
      // Navigation handled by auth state change → onboarding
    } catch (err: unknown) {
      Alert.alert("Sign up failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={["#6C63FF", "#4A3FDB"]} style={styles.root}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.inner,
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>

          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>
            Let's get you dressed for the weather ahead.
          </Text>

          <View style={styles.form}>
            <InputField
              label="Your name"
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Alex"
              autoCapitalize="words"
            />
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
              placeholder="8+ characters"
              rightAction={
                <Pressable onPress={() => setShowPassword((v) => !v)}>
                  <Ionicons
                    name={showPassword ? "eye-off" : "eye"}
                    size={20}
                    color={Colors.text.inverseSecondary}
                  />
                </Pressable>
              }
            />
          </View>

          <Text style={styles.legal}>
            By creating an account you agree to our Terms of Service and Privacy Policy.
          </Text>

          <Button
            label="Create Account"
            onPress={handleRegister}
            loading={loading}
            variant="secondary"
            size="lg"
            fullWidth
          />

          <Pressable style={styles.link} onPress={() => router.push("/(auth)/login")}>
            <Text style={styles.linkText}>
              Already have an account? <Text style={styles.linkBold}>Sign in</Text>
            </Text>
          </Pressable>
        </ScrollView>
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
          placeholderTextColor="rgba(255,255,255,0.4)"
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
    paddingHorizontal: 28,
    gap: 20,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
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
    color: "rgba(255,255,255,0.75)",
    marginTop: -8,
  },
  form: { gap: 16 },
  legal: {
    fontSize: 12,
    color: "rgba(255,255,255,0.45)",
    textAlign: "center",
    lineHeight: 18,
  },
  link: { alignItems: "center" },
  linkText: { fontSize: 15, color: "rgba(255,255,255,0.7)" },
  linkBold: { fontWeight: "700", color: "white" },
});

const inputStyles = StyleSheet.create({
  wrap: { gap: 8 },
  label: { fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.75)" },
  row: { position: "relative" },
  input: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
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
