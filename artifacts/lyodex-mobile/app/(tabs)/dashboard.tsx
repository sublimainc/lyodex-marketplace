import { getBaseUrl, useGetDashboardSummary, useGetRecentActivity } from "@workspace/api-client-react";
import { Feather, Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatDistanceToNow } from "date-fns";
import Svg, { Polyline, Circle, Line } from "react-native-svg";

import { useColors } from "@/hooks/useColors";

// ─── Live market data ─────────────────────────────────────────────────────────
// Everything below is computed server-side from real platform activity by
// GET /api/market/analytics (MarketDataAggregationService). Nulls mean the
// figure is withheld because fewer than `min_cohort` observations exist —
// they must render as "—", never as zero or an invented placeholder.

interface CategoryStat {
  category: string;
  avg_quoted_price: number | null;
  min_price: number | null;
  max_price: number | null;
  quote_count: number;
  accepted_count: number;
}

interface RegionStat {
  country: string;
  operator_count: number;
  available_count: number;
  avg_price_per_kg: number | null;
  avg_turnaround_days: number | null;
}

interface CertStat {
  certification: string;
  operator_count: number;
  pct_of_operators: number;
  verified_count: number;
}

interface TrendPoint {
  month: string;
  rfq_count: number;
  bid_count: number;
  avg_bid_price: number | null;
}

interface MarketSnapshot {
  category_stats: CategoryStat[];
  regions: RegionStat[];
  certifications: CertStat[];
  monthly_trends: TrendPoint[];
  platform: {
    total_requests: number;
    total_quotes: number;
    total_operators: number;
    available_operators: number;
    avg_quoted_price: number | null;
    avg_turnaround_days: number | null;
  };
  min_cohort: number;
  generated_at: string;
}

const CERT_PALETTE = ["#2563EB", "#0F6E56", "#059669", "#7C3AED", "#D97706", "#0891B2", "#9333EA"];

function certColor(name: string, idx: number): string {
  return CERT_PALETTE[idx % CERT_PALETTE.length] ?? "#0F6E56";
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return ym;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-CA", { month: "short", timeZone: "UTC" });
}

const money = (v: number | null) => (v === null ? "—" : `$${v.toFixed(2)}`);

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

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [refreshing, setRefreshing] = useState(false);

  const { data: summary, isLoading: loadingSummary, refetch: refetchSummary } = useGetDashboardSummary();
  const { data: activity, isLoading: loadingActivity, refetch: refetchActivity } = useGetRecentActivity();

  // No generated hook exists for /market/analytics (it is not in the OpenAPI
  // spec), so this is a hand-rolled fetch against the same base URL.
  const [market, setMarket] = useState<MarketSnapshot | null>(null);
  const [loadingMarket, setLoadingMarket] = useState(true);

  const fetchMarket = React.useCallback(async () => {
    try {
      const res = await fetch(`${getBaseUrl()}/api/market/analytics`);
      if (!res.ok) throw new Error(String(res.status));
      setMarket((await res.json()) as MarketSnapshot);
    } catch {
      setMarket(null);
    } finally {
      setLoadingMarket(false);
    }
  }, []);

  useEffect(() => {
    void fetchMarket();
  }, [fetchMarket]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchSummary(), refetchActivity(), fetchMarket()]);
    setRefreshing(false);
  };

  const trends = market?.monthly_trends ?? [];
  const monthLabels = trends.map((p) => monthLabel(p.month));
  const priceSeries = trends.map((p) => p.avg_bid_price).filter((v): v is number => v !== null);

  const topPad = isWeb ? 67 : insets.top;

  const metrics = [
    { label: "Network Operators", value: summary?.total_operators,       sub: "Active & verified",    icon: "users"         as const, accent: colors.primary },
    { label: "Live Requests",     value: summary?.active_requests,       sub: "In bidding",           icon: "file-text"     as const, accent: "#F59E0B" },
    { label: "Completed",         value: summary?.completed_contracts,   sub: "Contracts delivered",  icon: "check-circle"  as const, accent: "#10B981" },
    { label: "Bids This Week",    value: summary?.total_bids_this_week,  sub: "New submissions",      icon: "tag"           as const, accent: "#6366F1" },
  ];

  const EmptyMarket = ({ label }: { label: string }) => (
    <View style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.border, padding: 20 }]}>
      <Text style={[styles.chartLabel, { color: colors.mutedForeground, textAlign: "center" }]}>{label}</Text>
    </View>
  );

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

        {/* ── Price trend & RFQ charts ─────────────────────────────────── */}
        <View style={[styles.section, { paddingHorizontal: 16 }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Quoted Price — 6 Months</Text>
          {loadingMarket ? (
            <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ActivityIndicator color={colors.primary} style={{ padding: 20 }} />
            </View>
          ) : trends.length === 0 ? (
            <EmptyMarket label="No platform activity yet" />
          ) : (
            <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.chartRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.chartLabel, { color: colors.mutedForeground, marginBottom: 6 }]}>
                    Avg bid $/kg
                  </Text>
                  {priceSeries.length >= 2 ? (
                    <Sparkline data={priceSeries} width={160} height={56} color={colors.primary} />
                  ) : (
                    <Text style={[styles.axisLabel, { color: colors.mutedForeground, paddingVertical: 20 }]}>
                      Not enough data yet
                    </Text>
                  )}
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                    {monthLabels.map((m, i) => (
                      <Text key={`${m}-${i}`} style={[styles.axisLabel, { color: colors.mutedForeground }]}>{m}</Text>
                    ))}
                  </View>
                </View>
                <View style={{ width: 110 }}>
                  <Text style={[styles.chartLabel, { color: colors.mutedForeground, marginBottom: 6 }]}>RFQ volume</Text>
                  <MiniBarChart
                    data={trends.map((p) => p.rfq_count)}
                    labels={monthLabels}
                    color={colors.primary + "80"}
                    height={50}
                    colors={colors}
                  />
                </View>
              </View>
            </View>
          )}
        </View>

        {/* ── Bids received ────────────────────────────────────────────── */}
        {!loadingMarket && trends.length > 0 && (
          <View style={[styles.section, { paddingHorizontal: 16 }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Bids Received per Month</Text>
            <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <MiniBarChart
                data={trends.map((p) => p.bid_count)}
                labels={monthLabels}
                color="#6366F1"
                height={64}
                colors={colors}
              />
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                <Text style={[styles.chartLabel, { color: colors.mutedForeground }]}>
                  Peak: {Math.max(...trends.map((p) => p.bid_count), 0)}
                </Text>
                <Text style={[styles.chartLabel, { color: colors.mutedForeground }]}>
                  Total: {trends.reduce((s, p) => s + p.bid_count, 0)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Category pricing table ──────────────────────────────────── */}
        <View style={[styles.section, { paddingHorizontal: 16 }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Pricing by Material</Text>
          {loadingMarket ? (
            <EmptyMarket label="Loading…" />
          ) : !market || market.category_stats.length === 0 ? (
            <EmptyMarket label={`Benchmarks appear once ${market?.min_cohort ?? 3}+ bids exist per material`} />
          ) : (
            <View style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.tableHeader, { borderBottomColor: colors.border, backgroundColor: colors.muted }]}>
                <Text style={[styles.thCategory, { color: colors.mutedForeground }]}>Material</Text>
                <Text style={[styles.thCol, { color: colors.mutedForeground }]}>Min</Text>
                <Text style={[styles.thCol, { color: colors.mutedForeground }]}>Avg</Text>
                <Text style={[styles.thCol, { color: colors.mutedForeground }]}>Max</Text>
              </View>
              {market.category_stats.map((row, idx) => (
                <View
                  key={row.category}
                  style={[
                    styles.tableRow,
                    idx < market.category_stats.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                  ]}
                >
                  <Text style={[styles.tdCategory, { color: colors.foreground }]} numberOfLines={2}>{row.category}</Text>
                  <Text style={[styles.tdCol, { color: colors.mutedForeground }]}>{money(row.min_price)}</Text>
                  <Text style={[styles.tdCol, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>{money(row.avg_quoted_price)}</Text>
                  <Text style={[styles.tdCol, { color: colors.mutedForeground }]}>{money(row.max_price)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── Operator supply by country ───────────────────────────────── */}
        <View style={[styles.section, { paddingHorizontal: 16 }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Operator Supply by Country</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>
            Operators listed on LyoDex and their published rates
          </Text>
          {loadingMarket ? (
            <EmptyMarket label="Loading…" />
          ) : !market || market.regions.length === 0 ? (
            <EmptyMarket label="No operators listed yet" />
          ) : (
            <View style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.tableHeader, { borderBottomColor: colors.border, backgroundColor: colors.muted }]}>
                <Text style={[styles.thRegion, { color: colors.mutedForeground }]}>Country</Text>
                <Text style={[styles.thCol, { color: colors.mutedForeground }]}>Ops</Text>
                <Text style={[styles.thCol, { color: colors.mutedForeground }]}>Avail</Text>
                <Text style={[styles.thCol, { color: colors.mutedForeground }]}>Avg</Text>
                <Text style={[styles.thCol, { color: colors.mutedForeground }]}>Days</Text>
              </View>
              {market.regions.map((row, idx) => (
                <View
                  key={row.country}
                  style={[
                    styles.tableRow,
                    idx < market.regions.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                  ]}
                >
                  <View style={styles.thRegionCell}>
                    <Text style={[styles.tdRegion, { color: colors.foreground }]}>{row.country}</Text>
                  </View>
                  <Text style={[styles.tdCol, { color: colors.mutedForeground }]}>{row.operator_count}</Text>
                  <Text style={[styles.tdCol, { color: "#10B981" }]}>{row.available_count}</Text>
                  <Text style={[styles.tdCol, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>{money(row.avg_price_per_kg)}</Text>
                  <Text style={[styles.tdCol, { color: colors.mutedForeground }]}>
                    {row.avg_turnaround_days === null ? "—" : row.avg_turnaround_days}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── Certification coverage ───────────────────────────────────── */}
        <View style={[styles.section, { paddingHorizontal: 16 }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Certification Coverage</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>
            Share of listed operators holding each certification
          </Text>
          {loadingMarket ? (
            <EmptyMarket label="Loading…" />
          ) : !market || market.certifications.length === 0 ? (
            <EmptyMarket label="No certifications recorded yet" />
          ) : (
            <View style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {market.certifications.map((row, idx) => {
                const color = certColor(row.certification, idx);
                return (
                  <View
                    key={row.certification}
                    style={[
                      styles.certRow,
                      idx < market.certifications.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                    ]}
                  >
                    <View style={{ width: 80 }}>
                      <Text style={[styles.certName, { color: colors.foreground }]} numberOfLines={1}>
                        {row.certification}
                      </Text>
                    </View>
                    <View style={styles.certBarWrap}>
                      <View style={[styles.certBarBg, { backgroundColor: colors.muted }]}>
                        <View
                          style={[
                            styles.certBarFill,
                            { width: `${row.pct_of_operators}%` as any, backgroundColor: color },
                          ]}
                        />
                      </View>
                    </View>
                    <Text style={[styles.certPct, { color }]}>{row.pct_of_operators}%</Text>
                  </View>
                );
              })}
            </View>
          )}
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
  tableRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 11 },
  tdCategory: { flex: 2, fontSize: 13, fontFamily: "Inter_500Medium" },
  tdCol: { width: 52, fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "right" },
  tdRegion: { fontSize: 13, fontFamily: "Inter_500Medium" },
  thRegionCell: { flex: 1.4 },

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
