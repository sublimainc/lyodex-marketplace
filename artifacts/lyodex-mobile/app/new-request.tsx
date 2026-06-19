import { useCreateRequest } from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";

const MATERIAL_TYPES = [
  "Pharmaceutical API",
  "Biologics",
  "Vaccines",
  "Food Products",
  "Nutraceuticals",
  "Biotech Materials",
  "Clinical Samples",
  "Other",
];

function FieldLabel({ label, required, colors }: { label: string; required?: boolean; colors: ReturnType<typeof useColors> }) {
  return (
    <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
      {label}
      {required && <Text style={{ color: colors.destructive }}> *</Text>}
    </Text>
  );
}

export default function NewRequestScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const queryClient = useQueryClient();
  const createRequest = useCreateRequest();

  const [materialType, setMaterialType] = useState("");
  const [customMaterial, setCustomMaterial] = useState("");
  const [quantityKg, setQuantityKg] = useState("");
  const [deadline, setDeadline] = useState("");
  const [budgetPerKg, setBudgetPerKg] = useState("");
  const [email, setEmail] = useState("");
  const [specialReqs, setSpecialReqs] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const effectiveMaterial = materialType === "Other" ? customMaterial : materialType;

  const canSubmit =
    effectiveMaterial.trim().length > 0 &&
    quantityKg.trim().length > 0 &&
    deadline.trim().length > 0 &&
    email.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await createRequest.mutateAsync({
        data: {
          material_type: effectiveMaterial,
          quantity_kg: parseInt(quantityKg, 10),
          deadline,
          buyer_email: email,
          ...(budgetPerKg ? { budget_per_kg: parseFloat(budgetPerKg) } : {}),
          ...(specialReqs ? { special_requirements: specialReqs } : {}),
        },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["listRequests"] });
      Alert.alert("Request Submitted", "Your freeze-dry request is now live. Operators will start bidding shortly.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert("Error", "Could not submit your request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const bottomPad = isWeb ? 34 : insets.bottom + 24;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: bottomPad }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Describe your freeze-dry job. Operators across Canada and USA will submit competitive bids.
        </Text>

        {/* Material Type */}
        <View style={styles.field}>
          <FieldLabel label="Material Type" required colors={colors} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
          >
            {MATERIAL_TYPES.map((type) => (
              <Pressable
                key={type}
                onPress={() => setMaterialType(type)}
                style={({ pressed }) => [
                  styles.chip,
                  {
                    backgroundColor: materialType === type ? colors.primary : colors.muted,
                    borderColor: materialType === type ? colors.primary : colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: materialType === type ? "#fff" : colors.foreground },
                  ]}
                >
                  {type}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          {materialType === "Other" && (
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
              placeholder="Describe your material..."
              placeholderTextColor={colors.mutedForeground}
              value={customMaterial}
              onChangeText={setCustomMaterial}
            />
          )}
        </View>

        {/* Quantity */}
        <View style={styles.field}>
          <FieldLabel label="Quantity (kg)" required colors={colors} />
          <TextInput
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
            placeholder="e.g. 500"
            placeholderTextColor={colors.mutedForeground}
            value={quantityKg}
            onChangeText={setQuantityKg}
            keyboardType="number-pad"
          />
        </View>

        {/* Deadline */}
        <View style={styles.field}>
          <FieldLabel label="Deadline (YYYY-MM-DD)" required colors={colors} />
          <TextInput
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
            placeholder="e.g. 2026-09-30"
            placeholderTextColor={colors.mutedForeground}
            value={deadline}
            onChangeText={setDeadline}
          />
        </View>

        {/* Budget */}
        <View style={styles.field}>
          <FieldLabel label="Estimated Budget per kg ($)" colors={colors} />
          <TextInput
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
            placeholder="Optional — e.g. 15.00"
            placeholderTextColor={colors.mutedForeground}
            value={budgetPerKg}
            onChangeText={setBudgetPerKg}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Email */}
        <View style={styles.field}>
          <FieldLabel label="Your Email" required colors={colors} />
          <TextInput
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
            placeholder="buyer@yourcompany.com"
            placeholderTextColor={colors.mutedForeground}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Special Requirements */}
        <View style={styles.field}>
          <FieldLabel label="Special Requirements" colors={colors} />
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card },
            ]}
            placeholder="GMP facility required, specific moisture target, sterility testing..."
            placeholderTextColor={colors.mutedForeground}
            value={specialReqs}
            onChangeText={setSpecialReqs}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Submit */}
        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit || submitting}
          style={({ pressed }) => [
            styles.submitBtn,
            {
              backgroundColor: canSubmit ? colors.primary : colors.muted,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="send" size={18} color={canSubmit ? "#fff" : colors.mutedForeground} />
              <Text style={[styles.submitBtnText, { color: canSubmit ? "#fff" : colors.mutedForeground }]}>
                Submit Request
              </Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
    marginBottom: 24,
  },
  field: {
    marginBottom: 20,
    gap: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 8,
  },
  submitBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
