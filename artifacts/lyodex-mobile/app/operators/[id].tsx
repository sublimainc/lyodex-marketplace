import { useGetOperator } from "@workspace/api-client-react";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

interface Review {
  id: number;
  name: string;
  company: string;
  rating: number;
  comment: string;
  date: string;
}

const SEED_REVIEWS: Review[] = [
  { id: 1, name: "Marc Tremblay", company: "Pharmalab Inc.", rating: 5, comment: "Excellent service from start to finish. Batch processed on time and exactly to spec.", date: "Apr 2, 2026" },
  { id: 2, name: "Sarah O'Brien", company: "NutriTech Foods", rating: 4, comment: "Great quality and fast turnaround. Communication was clear and professional.", date: "Mar 18, 2026" },
];

function StarRow({ value, onChange, size = 18, colors }: { value: number; onChange?: (v: number) => void; size?: number; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={{ flexDirection: "row", gap: 4 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => { Haptics.selectionAsync(); onChange?.(n); }}>
          <Ionicons name={n <= value ? "star" : "star-outline"} size={size} color={n <= value ? "#FBBF24" : colors.border} />
        </Pressable>
      ))}
    </View>
  );
}

const CERT_COLORS: Record<string, string> = {
  GMP: "#0F6E56",
  HACCP: "#2563EB",
  FDA: "#7C3AED",
  Organic: "#059669",
  ISO: "#D97706",
};

function InfoRow({
  icon,
  label,
  value,
  colors,
  accent,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  value: string | number;
  colors: ReturnType<typeof useColors>;
  accent?: string;
}) {
  return (
    <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.infoIconWrap, { backgroundColor: colors.muted }]}>
        <Feather name={icon} size={16} color={accent ?? colors.mutedForeground} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: accent ?? colors.foreground }]}>{value}</Text>
      </View>
    </View>
  );
}

export default function OperatorProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const operatorId = parseInt(id ?? "0", 10);
  const { data: op, isLoading, error } = useGetOperator(operatorId, {
    query: { enabled: !!operatorId, queryKey: ["operator", operatorId] },
  });

  const [reviews, setReviews] = useState<Review[]>(SEED_REVIEWS);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ name: "", company: "", rating: 0, comment: "" });
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  const handleReviewSubmit = () => {
    if (!reviewForm.name.trim() || reviewForm.rating === 0 || !reviewForm.comment.trim()) {
      Alert.alert("Missing fields", "Please add your name, a rating, and a comment.");
      return;
    }
    const newReview: Review = {
      id: Date.now(),
      name: reviewForm.name.trim(),
      company: reviewForm.company.trim(),
      rating: reviewForm.rating,
      comment: reviewForm.comment.trim(),
      date: new Date().toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" }),
    };
    setReviews((prev) => [newReview, ...prev]);
    setReviewForm({ name: "", company: "", rating: 0, comment: "" });
    setShowReviewForm(false);
    setReviewSubmitted(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Review Submitted", "Thank you for your feedback!");
  };

  const bottomPad = isWeb ? 34 : insets.bottom + 20;

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (error || !op) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={36} color={colors.destructive} />
        <Text style={[styles.errorText, { color: colors.mutedForeground }]}>Operator not found</Text>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { borderColor: colors.border }]}>
          <Text style={[styles.backBtnText, { color: colors.foreground }]}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: bottomPad }}
    >
      {/* Hero */}
      <View style={[styles.hero, { backgroundColor: colors.primary }]}>
        <View style={styles.heroAvatar}>
          <Text style={styles.heroAvatarText}>{op.name?.charAt(0)}</Text>
        </View>
        <Text style={styles.heroName}>{op.name}</Text>
        <View style={styles.heroLocation}>
          <Feather name="map-pin" size={13} color="rgba(255,255,255,0.8)" />
          <Text style={styles.heroLocationText}>{op.location}</Text>
        </View>
        <View style={styles.heroMeta}>
          <View style={styles.heroMetaItem}>
            <Ionicons name="star" size={14} color="#FBBF24" />
            <Text style={styles.heroMetaValue}>{op.rating?.toFixed(1)}</Text>
            <Text style={styles.heroMetaSub}>({op.review_count} reviews)</Text>
          </View>
          <View
            style={[
              styles.heroAvailBadge,
              { backgroundColor: op.available ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.12)" },
            ]}
          >
            <Text style={styles.heroAvailText}>{op.available ? "Available" : "Unavailable"}</Text>
          </View>
        </View>
      </View>

      {/* Description */}
      {op.description && (
        <View style={[styles.section, { borderBottomColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>About</Text>
          <Text style={[styles.description, { color: colors.mutedForeground }]}>{op.description}</Text>
        </View>
      )}

      {/* Key Specs */}
      <View style={[styles.section, { borderBottomColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Specifications</Text>
        <View style={[styles.specsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <InfoRow
            icon="package"
            label="Max Capacity"
            value={`${op.capacity_kg?.toLocaleString()} kg per batch`}
            colors={colors}
          />
          <InfoRow
            icon="dollar-sign"
            label="Price"
            value={`$${op.price_per_kg}/kg`}
            colors={colors}
            accent={colors.primary}
          />
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <View style={[styles.infoIconWrap, { backgroundColor: colors.muted }]}>
              <Feather name="clock" size={16} color={colors.mutedForeground} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Turnaround</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>{op.turnaround_days} days</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Certifications */}
      {op.certifications?.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Certifications</Text>
          {(() => {
            const verified: string[] = op.verified_certifications ?? [];
            const allVerified = verified.length > 0 && verified.length === op.certifications.length;
            return (
              <>
                {allVerified && (
                  <View style={[styles.allVerifiedBanner, { backgroundColor: "#D1FAE5", borderColor: "#6EE7B7" }]}>
                    <Ionicons name="shield-checkmark" size={15} color="#059669" />
                    <Text style={[styles.allVerifiedText, { color: "#059669" }]}>
                      All certifications verified by LyoDex
                    </Text>
                  </View>
                )}
                {!allVerified && verified.length > 0 && (
                  <View style={[styles.partVerifiedBanner, { borderColor: colors.border }]}>
                    <Ionicons name="shield-checkmark" size={13} color="#059669" />
                    <Text style={[styles.partVerifiedText, { color: colors.mutedForeground }]}>
                      {verified.length}/{op.certifications.length} certifications verified
                    </Text>
                  </View>
                )}
              </>
            );
          })()}
          {/* Verified certs */}
          {(op.verified_certifications ?? []).length > 0 && (
            <>
              <Text style={[styles.certGroupLabel, { color: colors.mutedForeground }]}>Verified by LyoDex</Text>
              <View style={styles.certsGrid}>
                {(op.verified_certifications as string[]).map((cert: string) => {
                  const color = CERT_COLORS[cert] ?? "#059669";
                  const verifiedAt = (op.cert_verified_at as Record<string, string> | undefined)?.[cert];
                  const dateLabel = verifiedAt
                    ? new Date(verifiedAt).toLocaleDateString("en-CA", { month: "short", year: "numeric" })
                    : null;
                  return (
                    <View
                      key={cert}
                      style={[styles.certCardVerified, { backgroundColor: "#D1FAE5", borderColor: "#6EE7B7" }]}
                    >
                      <Ionicons name="shield-checkmark" size={16} color="#059669" />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.certName, { color: "#065F46" }]}>{cert}</Text>
                        <Text style={[styles.certVerifiedDate, { color: "#059669" }]}>
                          {dateLabel ? `Verified ${dateLabel}` : "Verified"}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          )}
          {/* Claimed (unverified) certs */}
          {op.certifications.filter((c: string) => !(op.verified_certifications ?? []).includes(c)).length > 0 && (
            <>
              {(op.verified_certifications ?? []).length > 0 && (
                <Text style={[styles.certGroupLabel, { color: colors.mutedForeground, marginTop: 12 }]}>
                  Claimed — pending verification
                </Text>
              )}
              <View style={styles.certsGrid}>
                {op.certifications
                  .filter((cert: string) => !(op.verified_certifications ?? []).includes(cert))
                  .map((cert: string) => {
                    const color = CERT_COLORS[cert] ?? colors.primary;
                    return (
                      <View
                        key={cert}
                        style={[styles.certCardClaimed, { backgroundColor: colors.card, borderColor: colors.border }]}
                      >
                        <Feather name="shield" size={14} color={colors.mutedForeground} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.certName, { color: colors.foreground }]}>{cert}</Text>
                          <Text style={[styles.certSub, { color: colors.mutedForeground }]}>Not yet confirmed</Text>
                        </View>
                      </View>
                    );
                  })}
              </View>
            </>
          )}
          {/* Fallback: no verified_certifications at all — show simple grid */}
          {(op.verified_certifications ?? []).length === 0 && (
            <View style={styles.certsGrid}>
              {op.certifications.map((cert: string) => {
                const color = CERT_COLORS[cert] ?? colors.primary;
                return (
                  <View
                    key={cert}
                    style={[styles.certCard, { backgroundColor: color + "12", borderColor: color + "35" }]}
                  >
                    <View style={[styles.certDot, { backgroundColor: color }]} />
                    <Text style={[styles.certName, { color: color }]}>{cert}</Text>
                    <Text style={[styles.certSub, { color: color + "AA" }]}>Certified</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* Reviews */}
      <View style={[styles.section, { borderBottomColor: colors.border }]}>
        <View style={styles.reviewsHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Reviews</Text>
            <View style={styles.ratingRow}>
              <StarRow value={Math.round(avgRating)} size={15} colors={colors} />
              <Text style={[styles.avgRatingText, { color: colors.foreground }]}>
                {avgRating.toFixed(1)}
              </Text>
              <Text style={[styles.reviewCountText, { color: colors.mutedForeground }]}>
                ({reviews.length})
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => setShowReviewForm((v) => !v)}
            style={({ pressed }) => [
              styles.addReviewBtn,
              { borderColor: colors.primary, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Feather name="edit-2" size={14} color={colors.primary} />
            <Text style={[styles.addReviewBtnText, { color: colors.primary }]}>Review</Text>
          </Pressable>
        </View>

        {showReviewForm && (
          <View style={[styles.reviewForm, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.reviewFormTitle, { color: colors.foreground }]}>Write a Review</Text>
            <View style={{ gap: 3 }}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Your Rating *</Text>
              <StarRow value={reviewForm.rating} onChange={(v) => setReviewForm((f) => ({ ...f, rating: v }))} size={22} colors={colors} />
            </View>
            <TextInput
              style={[styles.reviewInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder="Your name *"
              placeholderTextColor={colors.mutedForeground}
              value={reviewForm.name}
              onChangeText={(t) => setReviewForm((f) => ({ ...f, name: t }))}
            />
            <TextInput
              style={[styles.reviewInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder="Company (optional)"
              placeholderTextColor={colors.mutedForeground}
              value={reviewForm.company}
              onChangeText={(t) => setReviewForm((f) => ({ ...f, company: t }))}
            />
            <TextInput
              style={[styles.reviewInput, styles.reviewTextArea, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder="Share your experience *"
              placeholderTextColor={colors.mutedForeground}
              value={reviewForm.comment}
              onChangeText={(t) => setReviewForm((f) => ({ ...f, comment: t }))}
              multiline
              numberOfLines={3}
            />
            <View style={styles.reviewFormBtns}>
              <Pressable onPress={() => setShowReviewForm(false)} style={[styles.reviewCancelBtn, { borderColor: colors.border }]}>
                <Text style={[styles.reviewCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleReviewSubmit}
                style={({ pressed }) => [styles.reviewSubmitBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={styles.reviewSubmitText}>Submit</Text>
              </Pressable>
            </View>
          </View>
        )}

        <View style={{ gap: 12 }}>
          {reviews.map((r) => (
            <View key={r.id} style={[styles.reviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.reviewCardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.reviewerName, { color: colors.foreground }]}>{r.name}</Text>
                  {r.company ? (
                    <Text style={[styles.reviewerCompany, { color: colors.mutedForeground }]}>{r.company}</Text>
                  ) : null}
                </View>
                <View style={styles.reviewMeta}>
                  <StarRow value={r.rating} size={13} colors={colors} />
                  <Text style={[styles.reviewDate, { color: colors.mutedForeground }]}>{r.date}</Text>
                </View>
              </View>
              <Text style={[styles.reviewComment, { color: colors.mutedForeground }]}>{r.comment}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* CTA */}
      <View style={[styles.ctaSection, { paddingHorizontal: 20 }]}>
        <Pressable
          onPress={() => router.push("/new-request")}
          style={({ pressed }) => [
            styles.ctaBtn,
            { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Feather name="send" size={18} color="#fff" />
          <Text style={styles.ctaBtnText}>Submit a Request</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
  },
  errorText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  backBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  hero: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 28,
    alignItems: "center",
    gap: 8,
  },
  heroAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  heroAvatarText: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  heroName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    textAlign: "center",
  },
  heroLocation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  heroLocationText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
  },
  heroMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  heroMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  heroMetaValue: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  heroMetaSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
  },
  heroAvailBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  heroAvailText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 14,
  },
  description: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  specsCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  infoValue: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginTop: 2,
  },
  certsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  certCard: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: "center",
    gap: 6,
    minWidth: 80,
  },
  certDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  certName: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  certSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  allVerifiedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  allVerifiedText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  partVerifiedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
    borderWidth: 0,
  },
  partVerifiedText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  certGroupLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 8,
    marginTop: 4,
  },
  certCardVerified: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flex: 1,
    minWidth: "45%",
  },
  certVerifiedDate: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  certCardClaimed: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: "dashed",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flex: 1,
    minWidth: "45%",
  },
  ctaSection: {
    paddingTop: 24,
    paddingBottom: 8,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
  },
  ctaBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  reviewsHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  avgRatingText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  reviewCountText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  addReviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  addReviewBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  reviewForm: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
    marginBottom: 16,
  },
  reviewFormTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  reviewInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  reviewTextArea: {
    height: 72,
    textAlignVertical: "top",
  },
  reviewFormBtns: {
    flexDirection: "row",
    gap: 10,
  },
  reviewCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  reviewCancelText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  reviewSubmitBtn: {
    flex: 2,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  reviewSubmitText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  reviewCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 8,
  },
  reviewCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  reviewerName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  reviewerCompany: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  reviewMeta: {
    alignItems: "flex-end",
    gap: 4,
  },
  reviewDate: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  reviewComment: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
});
