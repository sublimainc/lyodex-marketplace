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

type UserRole = "buyer" | "operator";

const ROLES: { value: UserRole; label: string; desc: string; icon: React.ComponentProps<typeof Feather>["name"] }[] = [
  { value: "buyer",    label: "Buyer",    icon: "shopping-cart", desc: "Source freeze-dry services for your products" },
  { value: "operator", label: "Operator", icon: "settings",      desc: "List your facility and receive RFQs" },
];

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const [role, setRole] = useState<UserRole>("buyer");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async () => {
    setError("");
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("All fields are required.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace("/");
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

        <Text style={[styles.heading, { color: colors.foreground }]}>Create your account</Text>
        <Text style={[styles.subheading, { color: colors.mutedForeground }]}>
          Join Canada & USA's leading freeze-dry marketplace
        </Text>

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Joining as</Text>
          <View style={styles.roleRow}>
            {ROLES.map((r) => {
              const active = role === r.value;
              return (
                <Pressable
                  key={r.value}
                  onPress={() => { setRole(r.value); Haptics.selectionAsync(); }}
                  style={({ pressed }) => [
                    styles.roleCard,
                    {
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? colors.primary + "10" : colors.card,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <View style={[styles.roleIconWrap, { backgroundColor: (active ? colors.primary : colors.mutedForeground) + "18" }]}>
                    <Feather name={r.icon} size={20} color={active ? colors.primary : colors.mutedForeground} />
                  </View>
                  <Text style={[styles.roleLabel, { color: active ? colors.primary : colors.foreground }]}>{r.label}</Text>
                  <Text style={[styles.roleDesc, { color: colors.mutedForeground }]}>{r.desc}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Full name</Text>
          <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Feather name="user" size={16} color={colors.mutedForeground} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Jane Smith"
              placeholderTextColor={colors.mutedForeground}
              value={name}
              onChangeText={(t) => { setName(t); setError(""); }}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>
        </View>

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
              placeholder="8+ characters"
              placeholderTextColor={colors.mutedForeground}
              value={password}
              onChangeText={(t) => { setPassword(t); setError(""); }}
              secureTextEntry={!showPw}
              returnKeyType="done"
              onSubmitEditing={handleRegister}
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
          onPress={handleRegister}
          disabled={loading}
          style={({ pressed }) => [styles.submitBtn, { backgroundColor: colors.primary, opacity: pressed || loading ? 0.85 : 1 }]}
        >
          {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitBtnText}>Create account</Text>}
        </Pressable>

        <View style={styles.linkRow}>
          <Text style={[styles.linkLabel, { color: colors.mutedForeground }]}>Already have an account?</Text>
          <Pressable onPress={() => router.push("/login")}>
            <Text style={[styles.linkAction, { color: colors.primary }]}> Sign in</Text>
          </Pressable>
        </View>

        <Text style={[styles.terms, { color: colors.mutedForeground }]}>
          By creating an account you agree to LyoDex's Terms of Service and Privacy Policy.
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
  roleRow: { flexDirection: "row", gap: 10 },
  roleCard: { flex: 1, padding: 14, borderRadius: 14, borderWidth: 1.5, alignItems: "center", gap: 8 },
  roleIconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  roleLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  roleDesc: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 15 },
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
  submitBtn: { paddingVertical: 15, borderRadius: 13, alignItems: "center", marginBottom: 14 },
  submitBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
  linkRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginBottom: 16 },
  linkLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  linkAction: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  terms: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 16 },
});
