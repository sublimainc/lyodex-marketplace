import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";

const DEMO_USER = {
  name: "Demo Buyer",
  email: "buyer@lyodex.ca",
  role: "Buyer",
  company: "Pharma Co. Inc.",
  memberSince: "Jan 2026",
  requestsSubmitted: 3,
  bidsReceived: 7,
  contractsCompleted: 1,
};

const HOW_IT_WORKS = [
  {
    step: "1",
    icon: "file-text" as const,
    title: "Submit a Request",
    desc: "Describe your freeze-dry job — material type, quantity, deadline, and any special requirements.",
  },
  {
    step: "2",
    icon: "users" as const,
    title: "Operators Compete",
    desc: "Verified freeze-dry facilities across Canada and USA submit competitive bids to win your contract.",
  },
  {
    step: "3",
    icon: "check-circle" as const,
    title: "Select & Contract",
    desc: "Compare bids, review certifications, and accept the best offer. Payments are secured by escrow.",
  },
];

function SectionHeader({ title, colors }: { title: string; colors: ReturnType<typeof useColors> }) {
  return (
    <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>{title}</Text>
  );
}

function MenuRow({
  icon,
  label,
  value,
  onPress,
  colors,
  danger,
  right,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  value?: string;
  onPress?: () => void;
  colors: ReturnType<typeof useColors>;
  danger?: boolean;
  right?: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuRow,
        { borderBottomColor: colors.border, opacity: pressed && onPress ? 0.7 : 1 },
      ]}
    >
      <View style={[styles.menuIcon, { backgroundColor: (danger ? colors.destructive : colors.primary) + "15" }]}>
        <Feather name={icon} size={16} color={danger ? colors.destructive : colors.primary} />
      </View>
      <Text style={[styles.menuLabel, { color: danger ? colors.destructive : colors.foreground }]}>{label}</Text>
      <View style={styles.menuRight}>
        {value && <Text style={[styles.menuValue, { color: colors.mutedForeground }]}>{value}</Text>}
        {right}
        {onPress && !right && (
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        )}
      </View>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [notifEnabled, setNotifEnabled] = useState(true);

  const topPad = isWeb ? 67 : insets.top + 16;
  const bottomPad = isWeb ? 34 + 84 : insets.bottom + 90;

  const handleSignOut = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/login");
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: topPad, paddingBottom: bottomPad }}
      showsVerticalScrollIndicator={false}
    >
      {/* Avatar + User Info */}
      <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>{DEMO_USER.name.charAt(0)}</Text>
        </View>
        <View style={styles.heroInfo}>
          <Text style={[styles.heroName, { color: colors.foreground }]}>{DEMO_USER.name}</Text>
          <Text style={[styles.heroEmail, { color: colors.mutedForeground }]}>{DEMO_USER.email}</Text>
          <View style={styles.heroBadges}>
            <View style={[styles.roleBadge, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "40" }]}>
              <Text style={[styles.roleBadgeText, { color: colors.primary }]}>{DEMO_USER.role}</Text>
            </View>
            <View style={[styles.demoBadge, { backgroundColor: colors.warning + "18", borderColor: colors.warning + "40" }]}>
              <Text style={[styles.demoBadgeText, { color: colors.warning }]}>Demo</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Stats */}
      <View style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {[
          { label: "Requests", value: DEMO_USER.requestsSubmitted },
          { label: "Bids In", value: DEMO_USER.bidsReceived },
          { label: "Completed", value: DEMO_USER.contractsCompleted },
        ].map((s, i, arr) => (
          <View
            key={s.label}
            style={[
              styles.statItem,
              i < arr.length - 1 && { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: colors.border },
            ]}
          >
            <Text style={[styles.statValue, { color: colors.primary }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* How It Works */}
      <SectionHeader title="HOW LYODEX WORKS" colors={colors} />
      <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {HOW_IT_WORKS.map((step, idx) => (
          <View
            key={step.step}
            style={[
              styles.howItWorksRow,
              idx < HOW_IT_WORKS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
            ]}
          >
            <View style={[styles.stepBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.stepBadgeText}>{step.step}</Text>
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>{step.title}</Text>
              <Text style={[styles.stepDesc, { color: colors.mutedForeground }]}>{step.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Account Actions */}
      <SectionHeader title="ACCOUNT" colors={colors} />
      <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <MenuRow
          icon="user"
          label="Company"
          value={DEMO_USER.company}
          colors={colors}
        />
        <MenuRow
          icon="calendar"
          label="Member since"
          value={DEMO_USER.memberSince}
          colors={colors}
        />
        <MenuRow
          icon="plus-circle"
          label="Submit a Request"
          onPress={() => router.push("/new-request")}
          colors={colors}
        />
        <MenuRow
          icon="search"
          label="Browse Operators"
          onPress={() => router.push("/operators")}
          colors={colors}
        />
      </View>

      {/* Notifications */}
      <SectionHeader title="PREFERENCES" colors={colors} />
      <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <MenuRow
          icon="bell"
          label="Bid Notifications"
          colors={colors}
          right={
            <Switch
              value={notifEnabled}
              onValueChange={(v) => {
                Haptics.selectionAsync();
                setNotifEnabled(v);
              }}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor="#fff"
            />
          }
        />
        <MenuRow
          icon="moon"
          label="Appearance"
          value="System default"
          colors={colors}
        />
      </View>

      {/* Support */}
      <SectionHeader title="SUPPORT" colors={colors} />
      <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <MenuRow
          icon="globe"
          label="Visit lyodex.com"
          onPress={() => Linking.openURL("https://lyodex.com")}
          colors={colors}
        />
        <MenuRow
          icon="mail"
          label="Contact Support"
          onPress={() => Linking.openURL("mailto:support@lyodex.com")}
          colors={colors}
        />
        <MenuRow
          icon="help-circle"
          label="How It Works"
          onPress={() => Linking.openURL("https://lyodex.com/how-it-works")}
          colors={colors}
        />
        <MenuRow
          icon="dollar-sign"
          label="Pricing"
          onPress={() => Linking.openURL("https://lyodex.com/pricing")}
          colors={colors}
        />
      </View>

      {/* Certifications info */}
      <SectionHeader title="CERTIFICATIONS ACCEPTED" colors={colors} />
      <View style={[styles.certRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {["GMP", "HACCP", "FDA", "Organic", "ISO", "SQF"].map((cert) => (
          <View key={cert} style={[styles.certChip, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Text style={[styles.certChipText, { color: colors.foreground }]}>{cert}</Text>
          </View>
        ))}
      </View>

      {/* Sign Out */}
      <View style={styles.signOutWrap}>
        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => [
            styles.signOutBtn,
            { borderColor: colors.destructive + "50", opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Feather name="log-out" size={16} color={colors.destructive} />
          <Text style={[styles.signOutText, { color: colors.destructive }]}>Sign Out</Text>
        </Pressable>
        <Text style={[styles.versionText, { color: colors.mutedForeground }]}>
          LyoDex v1.0 · Canada & USA
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  heroInfo: {
    flex: 1,
    gap: 4,
  },
  heroName: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  heroEmail: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  heroBadges: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  demoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  demoBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  statsRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  statItem: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  sectionHeader: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    marginLeft: 16,
    marginBottom: 8,
    marginTop: 4,
  },
  menuCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  menuRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  menuValue: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  howItWorksRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    padding: 16,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  stepBadgeText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  stepTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  stepDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  certRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  certChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  certChipText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  signOutWrap: {
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 14,
    alignItems: "center",
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    width: "100%",
    justifyContent: "center",
  },
  signOutText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  versionText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
