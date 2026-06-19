import { useListRequests } from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { format } from "date-fns";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "#FEF3C7", text: "#D97706", label: "Pending" },
  active: { bg: "#E6F4F0", text: "#0F6E56", label: "Active" },
  completed: { bg: "#F3F4F6", text: "#6B7280", label: "Done" },
};

function RequestCard({ req, colors }: { req: any; colors: ReturnType<typeof useColors> }) {
  const status = STATUS_STYLES[req.status] ?? STATUS_STYLES.pending;

  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        router.push(`/requests/${req.id}`);
      }}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.9 : 1 },
      ]}
    >
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.materialType, { color: colors.foreground }]} numberOfLines={1}>
            {req.material_type}
          </Text>
          <View style={styles.metaRow}>
            <Feather name="package" size={12} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              {req.quantity_kg?.toLocaleString()} kg
            </Text>
            <Text style={[styles.metaDot, { color: colors.border }]}>·</Text>
            <Feather name="calendar" size={12} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              Due {format(new Date(req.deadline), "MMM d, yyyy")}
            </Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
        </View>
      </View>

      <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
        <View style={styles.bidCount}>
          <Text style={[styles.bidNumber, { color: colors.primary }]}>
            {req.bid_count ?? 0}
          </Text>
          <Text style={[styles.bidLabel, { color: colors.mutedForeground }]}>Bids</Text>
        </View>
        {req.budget_per_kg && (
          <View style={styles.budget}>
            <Text style={[styles.budgetLabel, { color: colors.mutedForeground }]}>Budget</Text>
            <Text style={[styles.budgetValue, { color: colors.foreground }]}>
              ${req.budget_per_kg}/kg
            </Text>
          </View>
        )}
        <View style={[styles.viewBtn, { backgroundColor: colors.muted }]}>
          <Feather name="arrow-right" size={16} color={colors.foreground} />
        </View>
      </View>
    </Pressable>
  );
}

export default function RequestsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const { data: requests, isLoading, error, refetch } = useListRequests();

  const topPad = isWeb ? 67 : insets.top;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.topBar, { paddingTop: topPad + 16, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.screenTitle, { color: colors.foreground }]}>Requests</Text>
            <Text style={[styles.screenSubtitle, { color: colors.mutedForeground }]}>
              Active freeze-dry bids
            </Text>
          </View>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/new-request");
            }}
            style={({ pressed }) => [
              styles.newBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Feather name="plus" size={20} color="#fff" />
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Feather name="alert-circle" size={32} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>Could not load requests</Text>
          <Pressable onPress={() => refetch()} style={[styles.retryBtn, { borderColor: colors.border }]}>
            <Text style={[styles.retryText, { color: colors.foreground }]}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={requests ?? []}
          keyExtractor={(item: any) => String(item.id)}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: isWeb ? 34 + 84 : insets.bottom + 90,
            gap: 12,
          }}
          renderItem={({ item }) => <RequestCard req={item} colors={colors} />}
          scrollEnabled={!!(requests && requests.length > 0)}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="file-text" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No requests yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                Submit a freeze-dry request to get bids
              </Text>
              <Pressable
                onPress={() => router.push("/new-request")}
                style={[styles.emptyAction, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.emptyActionText}>Submit Request</Text>
              </Pressable>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  screenTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  screenSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  newBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  retryText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    gap: 12,
  },
  materialType: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 5,
    flexWrap: "wrap",
  },
  metaText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  metaDot: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 16,
  },
  bidCount: {
    alignItems: "center",
  },
  bidNumber: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  bidLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  budget: {
    flex: 1,
    gap: 2,
  },
  budgetLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  budgetValue: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  viewBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    paddingTop: 60,
    alignItems: "center",
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 32,
  },
  emptyAction: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyActionText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
});
