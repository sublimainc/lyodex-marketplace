import { useListOperators } from "@workspace/api-client-react";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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

const CERT_COLORS: Record<string, string> = {
  GMP: "#0F6E56",
  HACCP: "#2563EB",
  FDA: "#7C3AED",
  Organic: "#059669",
  ISO: "#D97706",
};

const CERT_FILTERS = ["GMP", "HACCP", "FDA", "Organic", "ISO"];

function CertBadge({ cert, colors }: { cert: string; colors: ReturnType<typeof useColors> }) {
  const bg = CERT_COLORS[cert] ?? colors.primary;
  return (
    <View style={[styles.certBadge, { backgroundColor: bg + "18", borderColor: bg + "40" }]}>
      <Text style={[styles.certText, { color: bg }]}>{cert}</Text>
    </View>
  );
}

function OperatorCard({ op, colors }: { op: any; colors: ReturnType<typeof useColors> }) {
  return (
    <Pressable
      onPress={() => router.push(`/operators/${op.id}`)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.9 : 1 },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardName, { color: colors.foreground }]} numberOfLines={1}>
            {op.name}
          </Text>
          <View style={styles.cardLocation}>
            <Feather name="map-pin" size={12} color={colors.mutedForeground} />
            <Text style={[styles.cardLocationText, { color: colors.mutedForeground }]}>{op.location}</Text>
          </View>
        </View>
        <View style={styles.cardRight}>
          <View style={[styles.availBadge, { backgroundColor: op.available ? colors.successLight : colors.muted }]}>
            <Text style={[styles.availText, { color: op.available ? colors.success : colors.mutedForeground }]}>
              {op.available ? "Available" : "Unavailable"}
            </Text>
          </View>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={12} color="#FBBF24" />
            <Text style={[styles.ratingText, { color: colors.foreground }]}>{op.rating?.toFixed(1)}</Text>
            <Text style={[styles.reviewCount, { color: colors.mutedForeground }]}>({op.review_count})</Text>
          </View>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.specs}>
        <View style={styles.specItem}>
          <Text style={[styles.specLabel, { color: colors.mutedForeground }]}>Capacity</Text>
          <Text style={[styles.specValue, { color: colors.foreground }]}>{op.capacity_kg?.toLocaleString()} kg</Text>
        </View>
        <View style={styles.specItem}>
          <Text style={[styles.specLabel, { color: colors.mutedForeground }]}>Price</Text>
          <Text style={[styles.specValue, { color: colors.primary }]}>${op.price_per_kg}/kg</Text>
        </View>
        <View style={styles.specItem}>
          <Text style={[styles.specLabel, { color: colors.mutedForeground }]}>Turnaround</Text>
          <Text style={[styles.specValue, { color: colors.foreground }]}>{op.turnaround_days}d</Text>
        </View>
      </View>

      {op.certifications?.length > 0 && (
        <View style={styles.certs}>
          {op.certifications.map((c: string) => (
            <CertBadge key={c} cert={c} colors={colors} />
          ))}
          {(op.verified_certifications?.length ?? 0) > 0 && (
            <View style={[styles.verifiedChip, { backgroundColor: "#0F6E5610", borderColor: "#0F6E5640" }]}>
              <Ionicons name="shield-checkmark" size={11} color="#0F6E56" />
              <Text style={[styles.verifiedChipText, { color: "#0F6E56" }]}>
                {op.verified_certifications.length}/{op.certifications.length} verified
              </Text>
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}

export default function OperatorsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [search, setSearch] = useState("");
  const [certFilter, setCertFilter] = useState<string | null>(null);

  const { data: operators, isLoading, error, refetch } = useListOperators();

  const filtered = operators?.filter((op: any) => {
    const matchSearch =
      !search ||
      op.name.toLowerCase().includes(search.toLowerCase()) ||
      op.location.toLowerCase().includes(search.toLowerCase()) ||
      op.certifications?.some((c: string) => c.toLowerCase().includes(search.toLowerCase()));
    const matchCert = !certFilter || op.certifications?.includes(certFilter);
    return matchSearch && matchCert;
  }) ?? [];

  const topPad = isWeb ? 67 : insets.top;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.topBar, { paddingTop: topPad + 16, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>Operators</Text>
        <Text style={[styles.screenSubtitle, { color: colors.mutedForeground }]}>
          {filtered.length} facilit{filtered.length !== 1 ? "ies" : "y"} found
        </Text>

        <View style={[styles.searchBar, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
            placeholder="Search by name, location, cert..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChips}
        >
          <Pressable
            onPress={() => { setCertFilter(null); Haptics.selectionAsync(); }}
            style={[
              styles.filterChip,
              certFilter === null
                ? { backgroundColor: colors.primary, borderColor: colors.primary }
                : { backgroundColor: colors.muted, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.filterChipText, { color: certFilter === null ? "#fff" : colors.mutedForeground }]}>
              All
            </Text>
          </Pressable>
          {CERT_FILTERS.map((cert) => {
            const active = certFilter === cert;
            const bg = CERT_COLORS[cert] ?? colors.primary;
            return (
              <Pressable
                key={cert}
                onPress={() => { setCertFilter(active ? null : cert); Haptics.selectionAsync(); }}
                style={[
                  styles.filterChip,
                  active
                    ? { backgroundColor: bg, borderColor: bg }
                    : { backgroundColor: bg + "12", borderColor: bg + "40" },
                ]}
              >
                <Text style={[styles.filterChipText, { color: active ? "#fff" : bg }]}>{cert}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Feather name="alert-circle" size={32} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>Could not load operators</Text>
          <Pressable onPress={() => refetch()} style={[styles.retryBtn, { borderColor: colors.border }]}>
            <Text style={[styles.retryText, { color: colors.foreground }]}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item: any) => String(item.id)}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: isWeb ? 34 + 84 : insets.bottom + 90,
            gap: 12,
          }}
          renderItem={({ item }) => <OperatorCard op={item} colors={colors} />}
          scrollEnabled={!!filtered.length}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="business-outline" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No operators found</Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                {certFilter ? `No operators with ${certFilter} certification` : "Try adjusting your search"}
              </Text>
              {certFilter && (
                <Pressable onPress={() => setCertFilter(null)} style={[styles.retryBtn, { borderColor: colors.border, marginTop: 4 }]}>
                  <Text style={[styles.retryText, { color: colors.foreground }]}>Clear filter</Text>
                </Pressable>
              )}
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
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  screenTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  screenSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 8 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  filterChips: { paddingBottom: 4, gap: 8, paddingRight: 4 },
  filterChip: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  errorText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, borderWidth: 1, marginTop: 4 },
  retryText: { fontFamily: "Inter_500Medium", fontSize: 14 },
  card: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", padding: 16, gap: 12 },
  cardName: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  cardLocation: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  cardLocationText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  cardRight: { alignItems: "flex-end", gap: 6 },
  availBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  availText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  ratingText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  reviewCount: { fontSize: 12, fontFamily: "Inter_400Regular" },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  specs: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 12 },
  specItem: { flex: 1, alignItems: "center", gap: 3 },
  specLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  specValue: { fontSize: 14, fontFamily: "Inter_700Bold" },
  certs: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 16, paddingBottom: 14 },
  certBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  certText: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.3 },
  verifiedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  verifiedChipText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  emptyState: { paddingTop: 60, alignItems: "center", gap: 10 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
