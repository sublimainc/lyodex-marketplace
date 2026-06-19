import { useGetDashboardSummary, useGetRecentActivity } from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatDistanceToNow } from "date-fns";

import { useColors } from "@/hooks/useColors";

const HOW_IT_WORKS_STEPS = [
  { n: "1", icon: "file-text" as const, title: "Submit a Request", desc: "Describe your job — material, quantity, deadline." },
  { n: "2", icon: "users" as const, title: "Operators Compete", desc: "Verified facilities submit competitive sealed bids." },
  { n: "3", icon: "check-circle" as const, title: "Select & Contract", desc: "Accept the best bid. Payments are held in escrow." },
];

const MARKET_KPIS = [
  { label: "Avg food-grade price", value: "$9.40/kg", trend: "+4.2% vs last month", up: true },
  { label: "Avg GMP-grade price", value: "$28.20/kg", trend: "+2% vs last month", up: true },
  { label: "Active operators", value: "22", trend: "7 available now", up: true },
  { label: "Avg response time", value: "38h", trend: "−8% vs 3 months ago", up: false },
];

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number | undefined;
  icon: React.ComponentProps<typeof Feather>["name"];
  color: string;
}) {
  const colors = useColors();
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: color + "18" }]}>
        <Feather name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.foreground }]}>
        {value ?? "—"}
      </Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: activity, isLoading: loadingActivity } = useGetRecentActivity();

  const topPad = isWeb ? 67 : insets.top + 16;
  const bottomPad = isWeb ? 34 + 84 : insets.bottom + 90;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: topPad, paddingBottom: bottomPad }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.brand, { color: colors.primary }]}>LyoDex</Text>
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
            Freeze-Drying Marketplace
          </Text>
        </View>
        <View style={[styles.headerBadge, { backgroundColor: colors.successLight }]}>
          <View style={[styles.dot, { backgroundColor: colors.success }]} />
          <Text style={[styles.headerBadgeText, { color: colors.success }]}>Live</Text>
        </View>
      </View>

      {/* Stats */}
      {loadingSummary ? (
        <View style={styles.loadingStats}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <View style={styles.statsGrid}>
          <StatCard
            label="Operators"
            value={summary?.total_operators}
            icon="users"
            color={colors.primary}
          />
          <StatCard
            label="Live Requests"
            value={summary?.active_requests}
            icon="file-text"
            color={colors.warning}
          />
          <StatCard
            label="Contracts"
            value={summary?.completed_contracts}
            icon="check-circle"
            color={colors.success}
          />
          <StatCard
            label="Avg $/kg"
            value={summary?.avg_price_per_kg ? `$${summary.avg_price_per_kg}` : undefined}
            icon="trending-up"
            color="#6366F1"
          />
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Quick Actions</Text>
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={() => router.push("/new-request")}
          >
            <Feather name="plus-circle" size={20} color="#fff" />
            <Text style={styles.actionBtnText}>Submit Request</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={() => router.push("/operators")}
          >
            <Feather name="search" size={20} color={colors.foreground} />
            <Text style={[styles.actionBtnText, { color: colors.foreground }]}>Browse Operators</Text>
          </Pressable>
        </View>
      </View>

      {/* How It Works */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>How It Works</Text>
        <View style={[styles.howCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {HOW_IT_WORKS_STEPS.map((s, idx) => (
            <View
              key={s.n}
              style={[
                styles.howRow,
                idx < HOW_IT_WORKS_STEPS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
              ]}
            >
              <View style={[styles.howStep, { backgroundColor: colors.primary }]}>
                <Text style={styles.howStepText}>{s.n}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.howTitle, { color: colors.foreground }]}>{s.title}</Text>
                <Text style={[styles.howDesc, { color: colors.mutedForeground }]}>{s.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Market Snapshot */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Market Snapshot</Text>
          <Pressable onPress={() => Linking.openURL("https://lyodex.com/market-intelligence")}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>Full data</Text>
          </Pressable>
        </View>
        <View style={styles.kpiGrid}>
          {MARKET_KPIS.map((k) => (
            <View key={k.label} style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.kpiLabel, { color: colors.mutedForeground }]}>{k.label}</Text>
              <Text style={[styles.kpiValue, { color: colors.primary }]}>{k.value}</Text>
              <Text style={[styles.kpiTrend, { color: k.up ? colors.success : colors.warning }]}>{k.trend}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Activity</Text>
        <View style={[styles.activityCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {loadingActivity ? (
            <ActivityIndicator color={colors.primary} style={{ padding: 24 }} />
          ) : activity && activity.length > 0 ? (
            activity.slice(0, 8).map((item, idx) => (
              <View
                key={item.id}
                style={[
                  styles.activityRow,
                  idx < Math.min(activity.length, 8) - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <View style={[styles.activityDot, { backgroundColor: colors.primary }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.activityMsg, { color: colors.foreground }]}>{item.message}</Text>
                  <Text style={[styles.activityTime, { color: colors.mutedForeground }]}>
                    {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Feather name="activity" size={28} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No recent activity</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  brand: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  headerBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  loadingStats: {
    height: 120,
    justifyContent: "center",
    alignItems: "center",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 28,
  },
  statCard: {
    width: "47%",
    padding: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 14,
  },
  actions: {
    gap: 10,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    borderRadius: 12,
  },
  actionBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  activityCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
    flexShrink: 0,
  },
  activityMsg: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  activityTime: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 3,
  },
  emptyState: {
    padding: 32,
    alignItems: "center",
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  seeAll: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  howCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  howRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    padding: 14,
  },
  howStep: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  howStepText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  howTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 3,
  },
  howDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  kpiCard: {
    width: "47%",
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  kpiLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    lineHeight: 15,
  },
  kpiValue: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  kpiTrend: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
});
