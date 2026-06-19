import { useGetDashboardSummary, useGetRecentActivity } from "@workspace/api-client-react";
import { Feather, Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  Pressable,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatDistanceToNow } from "date-fns";
import Svg, { Polyline, Circle, Line } from "react-native-svg";

import { useColors } from "@/hooks/useColors";

// ─── Static market data (mirrors web market-intelligence page) ───────────────

const MONTHS = ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr"];
const FOOD_PRICES = [7.8, 8.1, 8.4, 8.9, 9.2, 8.9];
const VOLUME_DATA = [3800, 4100, 4500, 4800, 5100, 4900];
const RFQ_DATA = [18, 22, 28, 31, 35, 30];

const CATEGORY_DATA = [
  { name: "Fruits & Berries",      strictMin: 6.20, avg: 8.90,  max: 13.50 },
  { name: "Vegetables",            strictMin: 4.10, avg: 6.20,  max: 9.80  },
  { name: "Nutraceuticals",        strictMin: 24.0, avg: 32.50, max: 48.00 },
  { name: "Pet Food",              strictMin: 16.0, avg: 22.00, max: 31.00 },
  { name: "Pharmaceutical",        strictMin: 62.0, avg: 87.50, max: 125.00 },
  { name: "Probiotics",            strictMin: 36.0, avg: 48.00, max: 68.00 },
];

const AREA_DATA = [
  { area: "Ontario",     country: "CA", operators: 12, floor: 6.80, avg: 9.20,  demand: 0.82 },
  { area: "Quebec",      country: "CA", operators: 8,  floor: 7.10, avg: 9.80,  demand: 0.74 },
  { area: "BC",          country: "CA", operators: 6,  floor: 7.40, avg: 10.10, demand: 0.68 },
  { area: "Alberta",     country: "CA", operators: 4,  floor: 7.00, avg: 9.40,  demand: 0.61 },
  { area: "California",  country: "US", operators: 18, floor: 7.20, avg: 9.60,  demand: 0.91 },
  { area: "Colorado",    country: "US", operators: 9,  floor: 6.90, avg: 9.10,  demand: 0.78 },
  { area: "Wisconsin",   country: "US", operators: 7,  floor: 6.50, avg: 8.70,  demand: 0.65 },
  { area: "Texas",       country: "US", operators: 5,  floor: 6.60, avg: 8.80,  demand: 0.59 },
  { area: "Netherlands", country: "EU", operators: 22, floor: 8.40, avg: 11.20, demand: 0.88 },
  { area: "Germany",     country: "EU", operators: 15, floor: 8.10, avg: 10.80, demand: 0.80 },
];

const CERT_DATA = [
  { cert: "HACCP",     pct: 68 },
  { cert: "GMP",       pct: 34 },
  { cert: "Organic",   pct: 28 },
  { cert: "FDA Reg.",  pct: 22 },
  { cert: "ISO 22000", pct: 15 },
  { cert: "Kosher",    pct: 8  },
  { cert: "Halal",     pct: 6  },
];

const CERT_COLORS: Record<string, string> = {
  HACCP: "#2563EB", GMP: "#0F6E56", Organic: "#059669",
  "FDA Reg.": "#7C3AED", "ISO 22000": "#D97706", Kosher: "#0891B2", Halal: "#9333EA",
};

const COUNTRY_FLAGS: Record<string, string> = { CA: "CA", US: "US", EU: "EU" };
const COUNTRY_COLORS: Record<string, string> = { CA: "#DC2626", US: "#1D4ED8", EU: "#7C3AED" };

const ACTIVITY_ICONS: Record<string, React.ComponentProps<typeof Feather>["name"]> = {
  bid: "tag", request: "file-text", operator: "users", contract: "check-circle",
};

// ─── Sparkline component (react-native-svg) ──────────────────────────────────

function Sparkline({
  data, width, height, color, fillColor,
}: {
  data: number[]; width: number; height: number; color: string; fillColor?: string;
}) {
  if (data.length < 2) return null;
  const pad = 6;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * w;
    const y = pad + ((max - v) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const lastPt = pts[pts.length - 1].split(",");

  return (
    <Svg width={width} height={height}>
      <Polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <Circle cx={parseFloat(lastPt[0])} cy={parseFloat(lastPt[1])} r={4} fill={color} />
    </Svg>
  );
}

// ─── Mini bar chart ──────────────────────────────────────────────────────────

function MiniBarChart({
  data, labels, color, height, colors,
}: {
  data: number[]; labels: string[]; color: string; height: number;
  colors: ReturnType<typeof useColors>;
}) {
  const max = Math.max(...data);
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4, height: height + 18 }}>
      {data.map((v, i) => {
        const barH = Math.max(4, Math.round((v / max) * height));
        return (
          <View key={i} style={{ flex: 1, alignItems: "center", gap: 4 }}>
            <View style={{ width: "100%", height, justifyContent: "flex-end" }}>
              <View style={{ height: barH, backgroundColor: color, borderRadius: 3 }} />
            </View>
            <Text style={{ fontSize: 9, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>
              {labels[i]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Metric card ─────────────────────────────────────────────────────────────

function MetricCard({
  label, value, sub, icon, accent, colors,
}: {
  label: string; value: string | number | undefined; sub: string;
  icon: React.ComponentProps<typeof Feather>["name"]; accent: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.metricHeader}>
        <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <View style={[styles.metricIcon, { backgroundColor: accent + "18" }]}>
          <Feather name={icon} size={16} color={accent} />
        </View>
      </View>
      <Text style={[styles.metricValue, { color: colors.foreground }]}>{value ?? "—"}</Text>
      <Text style={[styles.metricSub, { color: colors.mutedForeground }]}>{sub}</Text>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

type RegionTab = "CA" | "US" | "EU";

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [regionTab, setRegionTab] = useState<RegionTab>("CA");
  const [refreshing, setRefreshing] = useState(false);

  const { data: summary, isLoading: loadingSummary, refetch: refetchSummary } = useGetDashboardSummary();
  const { data: activity, isLoading: loadingActivity, refetch: refetchActivity } = useGetRecentActivity();

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchSummary(), refetchActivity()]);
    setRefreshing(false);
  };

  const topPad = isWeb ? 67 : insets.top;

  const metrics = [
    { label: "Network Operators", value: summary?.total_operators,       sub: "Active & verified",    icon: "users"         as const, accent: colors.primary },
    { label: "Live Requests",     value: summary?.active_requests,       sub: "In bidding",           icon: "file-text"     as const, accent: "#F59E0B" },
    { label: "Completed",         value: summary?.completed_contracts,   sub: "Contracts delivered",  icon: "check-circle"  as const, accent: "#10B981" },
    { label: "Bids This Week",    value: summary?.total_bids_this_week,  sub: "New submissions",      icon: "tag"           as const, accent: "#6366F1" },
  ];

  const regionOperators = AREA_DATA.filter((a) => a.country === regionTab);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.topBar, { paddingTop: topPad + 16, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>Market</Text>
        <Text style={[styles.screenSubtitle, { color: colors.mutedForeground }]}>
          Lyophilization market intelligence
        </Text>
        {summary?.avg_price_per_kg && (
          <View style={[styles.avgPill, { backgroundColor: colors.successLight }]}>
            <Feather name="trending-up" size={13} color={colors.success} />
            <Text style={[styles.avgPillText, { color: colors.success }]}>
              Avg ${summary.avg_price_per_kg}/kg across categories
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingTop: 16, paddingBottom: isWeb ? 34 + 84 : insets.bottom + 90 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* ── Metrics grid ─────────────────────────────────────────────── */}
        {loadingSummary ? (
          <View style={styles.loadingArea}><ActivityIndicator color={colors.primary} size="large" /></View>
        ) : (
          <View style={styles.metricsGrid}>
            {metrics.map((m) => <MetricCard key={m.label} {...m} colors={colors} />)}
          </View>
        )}

        {/* ── Price trend & volume charts ──────────────────────────────── */}
        <View style={[styles.section, { paddingHorizontal: 16 }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Price Trend — 6 Months</Text>
          <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.chartRow}>
              {/* Line sparkline */}
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                  <Text style={[styles.chartLabel, { color: colors.mutedForeground }]}>Food avg $/kg</Text>
                  <View style={[styles.trendPill, { backgroundColor: colors.successLight }]}>
                    <Feather name="trending-up" size={11} color={colors.success} />
                    <Text style={[styles.trendPillText, { color: colors.success }]}>+14%</Text>
                  </View>
                </View>
                <Sparkline data={FOOD_PRICES} width={160} height={56} color={colors.primary} />
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                  {MONTHS.map((m) => (
                    <Text key={m} style={[styles.axisLabel, { color: colors.mutedForeground }]}>{m}</Text>
                  ))}
                </View>
              </View>
              {/* RFQ mini bars */}
              <View style={{ width: 110 }}>
                <Text style={[styles.chartLabel, { color: colors.mutedForeground, marginBottom: 6 }]}>RFQ volume</Text>
                <MiniBarChart data={RFQ_DATA} labels={MONTHS} color={colors.primary + "80"} height={50} colors={colors} />
              </View>
            </View>
          </View>
        </View>

        {/* ── Volume chart ─────────────────────────────────────────────── */}
        <View style={[styles.section, { paddingHorizontal: 16 }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Monthly Volume (kg)</Text>
          <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MiniBarChart data={VOLUME_DATA} labels={MONTHS} color="#6366F1" height={64} colors={colors} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
              <Text style={[styles.chartLabel, { color: colors.mutedForeground }]}>
                Peak: {Math.max(...VOLUME_DATA).toLocaleString()} kg
              </Text>
              <Text style={[styles.chartLabel, { color: colors.mutedForeground }]}>
                Avg: {Math.round(VOLUME_DATA.reduce((a, b) => a + b) / VOLUME_DATA.length).toLocaleString()} kg
              </Text>
            </View>
          </View>
        </View>

        {/* ── Category pricing table ──────────────────────────────────── */}
        <View style={[styles.section, { paddingHorizontal: 16 }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Pricing by Category</Text>
          <View style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Header */}
            <View style={[styles.tableHeader, { borderBottomColor: colors.border, backgroundColor: colors.muted }]}>
              <Text style={[styles.thCategory, { color: colors.mutedForeground }]}>Category</Text>
              <Text style={[styles.thCol, { color: colors.mutedForeground }]}>Floor</Text>
              <Text style={[styles.thCol, { color: colors.mutedForeground }]}>Avg</Text>
              <Text style={[styles.thCol, { color: colors.mutedForeground }]}>Max</Text>
            </View>
            {CATEGORY_DATA.map((row, idx) => (
              <View
                key={row.name}
                style={[
                  styles.tableRow,
                  idx < CATEGORY_DATA.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                ]}
              >
                <Text style={[styles.tdCategory, { color: colors.foreground }]} numberOfLines={2}>{row.name}</Text>
                <Text style={[styles.tdCol, { color: colors.mutedForeground }]}>${row.strictMin}</Text>
                <Text style={[styles.tdCol, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>${row.avg}</Text>
                <Text style={[styles.tdCol, { color: colors.mutedForeground }]}>${row.max}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Regional pricing ─────────────────────────────────────────── */}
        <View style={[styles.section, { paddingHorizontal: 16 }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Regional Pricing</Text>
          {/* Region tabs */}
          <View style={[styles.regionTabs, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            {(["CA", "US", "EU"] as RegionTab[]).map((tab) => (
              <Pressable
                key={tab}
                onPress={() => setRegionTab(tab)}
                style={[
                  styles.regionTab,
                  regionTab === tab && { backgroundColor: colors.primary },
                ]}
              >
                <Text style={[styles.regionTabText, { color: regionTab === tab ? "#fff" : colors.mutedForeground }]}>
                  {tab === "CA" ? "Canada" : tab === "US" ? "USA" : "Europe"}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.tableHeader, { borderBottomColor: colors.border, backgroundColor: colors.muted }]}>
              <Text style={[styles.thRegion, { color: colors.mutedForeground }]}>Region</Text>
              <Text style={[styles.thCol, { color: colors.mutedForeground }]}>Ops</Text>
              <Text style={[styles.thCol, { color: colors.mutedForeground }]}>Floor</Text>
              <Text style={[styles.thCol, { color: colors.mutedForeground }]}>Avg</Text>
              <Text style={[styles.thDemand, { color: colors.mutedForeground }]}>Demand</Text>
            </View>
            {regionOperators.map((row, idx) => (
              <View
                key={row.area}
                style={[
                  styles.tableRow,
                  idx < regionOperators.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                ]}
              >
                <View style={styles.thRegionCell}>
                  <Text style={[styles.tdRegion, { color: colors.foreground }]}>{row.area}</Text>
                </View>
                <Text style={[styles.tdCol, { color: colors.mutedForeground }]}>{row.operators}</Text>
                <Text style={[styles.tdCol, { color: colors.mutedForeground }]}>${row.floor}</Text>
                <Text style={[styles.tdCol, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>${row.avg}</Text>
                {/* Demand bar */}
                <View style={styles.demandCell}>
                  <View style={[styles.demandBar, { backgroundColor: colors.muted }]}>
                    <View
                      style={[
                        styles.demandFill,
                        {
                          width: `${Math.round(row.demand * 100)}%` as any,
                          backgroundColor: row.demand > 0.8 ? "#10B981" : row.demand > 0.6 ? "#F59E0B" : "#6B7280",
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.demandPct, { color: colors.mutedForeground }]}>
                    {Math.round(row.demand * 100)}%
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── Certification market share ────────────────────────────────── */}
        <View style={[styles.section, { paddingHorizontal: 16 }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Certification Coverage</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>
            Share of operators holding each certification
          </Text>
          <View style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {CERT_DATA.map((row, idx) => {
              const color = CERT_COLORS[row.cert] ?? colors.primary;
              return (
                <View
                  key={row.cert}
                  style={[
                    styles.certRow,
                    idx < CERT_DATA.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                  ]}
                >
                  <View style={{ width: 80 }}>
                    <Text style={[styles.certName, { color: colors.foreground }]}>{row.cert}</Text>
                  </View>
                  <View style={styles.certBarWrap}>
                    <View style={[styles.certBarBg, { backgroundColor: colors.muted }]}>
                      <View
                        style={[
                          styles.certBarFill,
                          { width: `${row.pct}%` as any, backgroundColor: color },
                        ]}
                      />
                    </View>
                  </View>
                  <Text style={[styles.certPct, { color: color }]}>{row.pct}%</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Network Activity ────────────────────────────────────────── */}
        <View style={[styles.section, { paddingHorizontal: 16 }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Network Activity</Text>
          <View style={[styles.activityContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {loadingActivity ? (
              <ActivityIndicator color={colors.primary} style={{ padding: 24 }} />
            ) : activity && activity.length > 0 ? (
              activity.map((item, idx) => {
                const iconName = ACTIVITY_ICONS[item.type] ?? "activity";
                return (
                  <View
                    key={item.id}
                    style={[
                      styles.activityItem,
                      idx < activity.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                    ]}
                  >
                    <View style={[styles.activityIconWrap, { backgroundColor: colors.muted }]}>
                      <Feather name={iconName} size={14} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.activityMsg, { color: colors.foreground }]}>{item.message}</Text>
                      <Text style={[styles.activityTime, { color: colors.mutedForeground }]}>
                        {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                      </Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyActivity}>
                <Feather name="activity" size={28} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No recent activity</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  screenTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  screenSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular" },
  avgPill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, marginTop: 6, alignSelf: "flex-start",
  },
  avgPillText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  loadingArea: { height: 160, justifyContent: "center", alignItems: "center" },
  metricsGrid: {
    flexDirection: "row", flexWrap: "wrap",
    paddingHorizontal: 16, gap: 10, marginBottom: 28,
  },
  metricCard: {
    width: "47%", padding: 16, borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth, gap: 6,
  },
  metricHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  metricLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.4, flex: 1 },
  metricIcon: { width: 30, height: 30, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  metricValue: { fontSize: 28, fontFamily: "Inter_700Bold" },
  metricSub: { fontSize: 12, fontFamily: "Inter_400Regular" },

  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  sectionSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 10 },

  chartCard: {
    borderRadius: 14, borderWidth: StyleSheet.hairlineWidth,
    padding: 14, overflow: "hidden",
  },
  chartRow: { flexDirection: "row", gap: 16, alignItems: "flex-start" },
  chartLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  trendPill: {
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20,
  },
  trendPillText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  axisLabel: { fontSize: 9, fontFamily: "Inter_400Regular" },

  tableCard: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  tableHeader: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thCategory: { flex: 2, fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase" },
  thCol: { width: 52, fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", textAlign: "right" },
  thRegion: { flex: 1.4, fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase" },
  thDemand: { width: 70, fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", textAlign: "right" },
  tableRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 11 },
  tdCategory: { flex: 2, fontSize: 13, fontFamily: "Inter_500Medium" },
  tdCol: { width: 52, fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "right" },
  tdRegion: { fontSize: 13, fontFamily: "Inter_500Medium" },
  thRegionCell: { flex: 1.4 },

  regionTabs: {
    flexDirection: "row", borderRadius: 10, borderWidth: StyleSheet.hairlineWidth,
    padding: 3, marginBottom: 10,
  },
  regionTab: { flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: "center" },
  regionTabText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  demandCell: { width: 70, flexDirection: "row", alignItems: "center", gap: 5, justifyContent: "flex-end" },
  demandBar: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  demandFill: { height: "100%", borderRadius: 3 },
  demandPct: { width: 26, fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "right" },

  certRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 11, gap: 10 },
  certName: { fontSize: 13, fontFamily: "Inter_500Medium" },
  certBarWrap: { flex: 1 },
  certBarBg: { height: 8, borderRadius: 4, overflow: "hidden" },
  certBarFill: { height: "100%", borderRadius: 4 },
  certPct: { width: 36, fontSize: 13, fontFamily: "Inter_700Bold", textAlign: "right" },

  activityContainer: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  activityItem: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14 },
  activityIconWrap: { width: 32, height: 32, borderRadius: 10, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  activityMsg: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  activityTime: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 3 },
  emptyActivity: { padding: 32, alignItems: "center", gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
