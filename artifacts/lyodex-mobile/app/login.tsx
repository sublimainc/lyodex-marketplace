import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError(data.error ?? "Login failed. Please check your credentials.");
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace("/");
      }
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const topPad = isWeb ? 64 : insets.top + 16;
  const bottomPad = isWeb ? 40 : insets.bottom + 20;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: topPad, paddingBottom: bottomPad }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoRow}>
          <View style={[styles.logoBox, { backgroundColor: colors.primary }]}>
            <Text style={styles.logoLetter}>L</Text>
          </View>
          <View>
            <Text style={[styles.logoName, { color: colors.foreground }]}>LyoDex</Text>
            <Text style={[styles.logoTagline, { color: colors.mutedForeground }]}>Freeze-Drying Marketplace</Text>
          </View>
        </View>

        <Text style={[styles.heading, { color: colors.foreground }]}>Sign in to your account</Text>
        <Text style={[styles.subheading, { color: colors.mutedForeground }]}>
          Canada & USA freeze-dry procurement network
        </Text>

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Work email</Text>
          <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Feather name="mail" size={16} color={colors.mutedForeground} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="you@yourcompany.com"
              placeholderTextColor={colors.mutedForeground}
              value={email}
              onChangeText={(t) => { setEmail(t); setError(""); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Password</Text>
          <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Feather name="lock" size={16} color={colors.mutedForeground} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="••••••••"
              placeholderTextColor={colors.mutedForeground}
              value={password}
              onChangeText={(t) => { setPassword(t); setError(""); }}
              secureTextEntry={!showPw}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <Pressable onPress={() => setShowPw((v) => !v)}>
              <Feather name={showPw ? "eye-off" : "eye"} size={16} color={colors.mutedForeground} />
            </Pressable>
          </View>
        </View>

        {!!error && (
          <View style={[styles.errorBox, { backgroundColor: colors.destructive + "15", borderColor: colors.destructive + "40" }]}>
            <Feather name="alert-circle" size={14} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
          </View>
        )}

        <Pressable
          onPress={handleLogin}
          disabled={loading}
          style={({ pressed }) => [styles.signInBtn, { backgroundColor: colors.primary, opacity: pressed || loading ? 0.85 : 1 }]}
        >
          {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.signInBtnText}>Sign in</Text>}
        </Pressable>

        <View style={styles.linkRow}>
          <Text style={[styles.linkLabel, { color: colors.mutedForeground }]}>Don't have an account?</Text>
          <Pressable onPress={() => router.push("/register")}>
            <Text style={[styles.linkAction, { color: colors.primary }]}> Create account</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => router.replace("/")}
          style={({ pressed }) => [styles.guestBtn, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={[styles.guestBtnText, { color: colors.mutedForeground }]}>Continue as guest</Text>
        </Pressable>

        <Text style={[styles.accessNote, { color: colors.mutedForeground }]}>
          Access is restricted to verified users. Contact support@lyodex.com to request access.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  logoRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 28 },
  logoBox: { width: 48, height: 48, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  logoLetter: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#fff" },
  logoName: { fontSize: 20, fontFamily: "Inter_700Bold" },
  logoTagline: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  heading: { fontSize: 24, fontFamily: "Inter_700Bold", marginBottom: 6 },
  subheading: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20, marginBottom: 28 },
  field: { marginBottom: 16, gap: 8 },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", padding: 0 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  errorText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  signInBtn: { paddingVertical: 15, borderRadius: 13, alignItems: "center", marginBottom: 14 },
  signInBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
  linkRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginBottom: 12 },
  linkLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  linkAction: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  guestBtn: { paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: "center", marginBottom: 20 },
  guestBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  accessNote: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },
});
