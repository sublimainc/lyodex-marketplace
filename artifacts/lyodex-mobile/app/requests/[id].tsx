import {
  useGetRequest,
  useListBidsForRequest,
  useCreateBid,
  useAcceptBid,
  getListBidsForRequestQueryKey,
  getGetRequestQueryKey,
  useListMessagesForRequest,
  usePostMessageForRequest,
  getListMessagesForRequestQueryKey,
} from "@workspace/api-client-react";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";

const STATUS_MAP: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "#FEF3C7", text: "#D97706", label: "Pending" },
  active: { bg: "#E6F4F0", text: "#0F6E56", label: "Active" },
  completed: { bg: "#F3F4F6", text: "#6B7280", label: "Completed" },
};

function BidCard({
  bid,
  colors,
  onAccept,
  accepting,
  accepted,
}: {
  bid: any;
  colors: ReturnType<typeof useColors>;
  onAccept?: () => void;
  accepting?: boolean;
  accepted?: boolean;
}) {
  return (
    <View
      style={[
        styles.bidCard,
        {
          backgroundColor: accepted ? colors.successLight : colors.card,
          borderColor: accepted ? colors.success + "60" : colors.border,
        },
      ]}
    >
      {accepted && (
        <View style={[styles.acceptedBanner, { backgroundColor: colors.success }]}>
          <Ionicons name="checkmark-circle" size={14} color="#fff" />
          <Text style={styles.acceptedBannerText}>Accepted</Text>
        </View>
      )}
      <View style={styles.bidHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.bidOperator, { color: colors.foreground }]}>{bid.operator_name}</Text>
          <Text style={[styles.bidDate, { color: colors.mutedForeground }]}>
            {format(new Date(bid.created_at), "MMM d, yyyy")}
          </Text>
        </View>
        <Text style={[styles.bidPrice, { color: colors.primary }]}>${bid.price_per_kg}/kg</Text>
      </View>
      <View style={styles.bidMeta}>
        <View style={styles.bidMetaItem}>
          <Feather name="clock" size={13} color={colors.mutedForeground} />
          <Text style={[styles.bidMetaText, { color: colors.mutedForeground }]}>
            {bid.turnaround_days} day turnaround
          </Text>
        </View>
      </View>
      {bid.notes && (
        <Text style={[styles.bidNotes, { color: colors.mutedForeground }]}>{bid.notes}</Text>
      )}
      {onAccept && !accepted && (
        <Pressable
          onPress={onAccept}
          disabled={accepting}
          style={({ pressed }) => [
            styles.acceptBtn,
            { backgroundColor: colors.primary, opacity: pressed || accepting ? 0.8 : 1 },
          ]}
        >
          {accepting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={15} color="#fff" />
              <Text style={styles.acceptBtnText}>Accept Bid</Text>
            </>
          )}
        </Pressable>
      )}
    </View>
  );
}

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const queryClient = useQueryClient();

  const requestId = parseInt(id ?? "0", 10);

  const { data: request, isLoading: loadingReq } = useGetRequest(requestId, {
    query: { enabled: !!requestId, queryKey: ["request", requestId] },
  });

  const { data: bids, isLoading: loadingBids } = useListBidsForRequest(requestId, {
    query: { enabled: !!requestId, queryKey: ["bids", requestId] },
  });

  const createBid = useCreateBid();
  const acceptBid = useAcceptBid();
  const [acceptingBidId, setAcceptingBidId] = useState<number | null>(null);
  const [acceptedBidId, setAcceptedBidId] = useState<number | null>(null);

  const handleAcceptBid = async (bidId: number) => {
    setAcceptingBidId(bidId);
    try {
      await acceptBid.mutateAsync({ id: bidId });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAcceptedBidId(bidId);
      queryClient.invalidateQueries({ queryKey: getListBidsForRequestQueryKey(requestId) });
      queryClient.invalidateQueries({ queryKey: getGetRequestQueryKey(requestId) });
      Alert.alert("Bid Accepted", "The operator will be notified. Proceed to contract to continue.");
    } catch {
      Alert.alert("Error", "Could not accept bid. Please try again.");
    } finally {
      setAcceptingBidId(null);
    }
  };

  const [pricePerKg, setPricePerKg] = useState("");
  const [turnaroundDays, setTurnaroundDays] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: messages, isLoading: loadingMsgs } = useListMessagesForRequest(requestId, {
    query: { enabled: !!requestId, queryKey: getListMessagesForRequestQueryKey(requestId) },
  });
  const postMessage = usePostMessageForRequest();
  const [msgText, setMsgText] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);

  const handleSendMessage = async () => {
    const body = msgText.trim();
    if (!body) return;
    setSendingMsg(true);
    try {
      await postMessage.mutateAsync({ id: requestId, data: { body } });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: getListMessagesForRequestQueryKey(requestId) });
      setMsgText("");
    } catch {
      Alert.alert("Error", "Could not send message. Please try again.");
    } finally {
      setSendingMsg(false);
    }
  };

  const handleSubmitBid = async () => {
    if (!pricePerKg || !turnaroundDays) {
      Alert.alert("Missing fields", "Please enter price and turnaround days.");
      return;
    }
    setSubmitting(true);
    try {
      await createBid.mutateAsync({
        data: {
          request_id: requestId,
          operator_id: 1,
          price_per_kg: parseFloat(pricePerKg),
          turnaround_days: parseInt(turnaroundDays, 10),
          notes,
        },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: getListBidsForRequestQueryKey(requestId) });
      setPricePerKg("");
      setTurnaroundDays("");
      setNotes("");
      Alert.alert("Bid Submitted", "Your bid has been placed successfully.");
    } catch {
      Alert.alert("Error", "Could not submit bid. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const bottomPad = isWeb ? 34 : insets.bottom + 20;

  if (loadingReq || !request) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const status = STATUS_MAP[request.status] ?? STATUS_MAP.pending;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ paddingBottom: bottomPad }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header Card */}
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={styles.heroTop}>
            <Text style={[styles.materialType, { color: colors.foreground }]}>{request.material_type}</Text>
            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
              <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
            </View>
          </View>
          <Text style={[styles.buyerEmail, { color: colors.mutedForeground }]}>{request.buyer_email}</Text>

          <View style={styles.specGrid}>
            <View style={styles.specItem}>
              <Feather name="package" size={16} color={colors.primary} />
              <Text style={[styles.specValue, { color: colors.foreground }]}>
                {request.quantity_kg?.toLocaleString()} kg
              </Text>
              <Text style={[styles.specLabel, { color: colors.mutedForeground }]}>Quantity</Text>
            </View>
            <View style={[styles.specDivider, { backgroundColor: colors.border }]} />
            <View style={styles.specItem}>
              <Feather name="calendar" size={16} color={colors.primary} />
              <Text style={[styles.specValue, { color: colors.foreground }]}>
                {format(new Date(request.deadline), "MMM d")}
              </Text>
              <Text style={[styles.specLabel, { color: colors.mutedForeground }]}>Deadline</Text>
            </View>
            <View style={[styles.specDivider, { backgroundColor: colors.border }]} />
            <View style={styles.specItem}>
              <Feather name="tag" size={16} color={colors.primary} />
              <Text style={[styles.specValue, { color: colors.foreground }]}>
                {request.budget_per_kg ? `$${request.budget_per_kg}` : "Open"}
              </Text>
              <Text style={[styles.specLabel, { color: colors.mutedForeground }]}>Budget/kg</Text>
            </View>
            <View style={[styles.specDivider, { backgroundColor: colors.border }]} />
            <View style={styles.specItem}>
              <Feather name="layers" size={16} color={colors.primary} />
              <Text style={[styles.specValue, { color: colors.primary }]}>{bids?.length ?? 0}</Text>
              <Text style={[styles.specLabel, { color: colors.mutedForeground }]}>Bids</Text>
            </View>
          </View>

          {request.special_requirements && (
            <View style={[styles.specialReqs, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Feather name="info" size={14} color={colors.mutedForeground} />
              <Text style={[styles.specialReqsText, { color: colors.mutedForeground }]}>
                {request.special_requirements}
              </Text>
            </View>
          )}
        </View>

        {/* Bids */}
        <View style={[styles.section, { paddingHorizontal: 16 }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Bids ({bids?.length ?? 0})
          </Text>
          {loadingBids ? (
            <ActivityIndicator color={colors.primary} />
          ) : bids && bids.length > 0 ? (
            bids.map((bid: any) => (
              <BidCard
                key={bid.id}
                bid={bid}
                colors={colors}
                accepted={acceptedBidId === bid.id || bid.status === "accepted"}
                accepting={acceptingBidId === bid.id}
                onAccept={request?.status !== "completed" ? () => handleAcceptBid(bid.id) : undefined}
              />
            ))
          ) : (
            <View style={styles.noBids}>
              <Feather name="inbox" size={28} color={colors.mutedForeground} />
              <Text style={[styles.noBidsText, { color: colors.mutedForeground }]}>
                No bids yet — be the first!
              </Text>
            </View>
          )}
        </View>

        {/* Submit Bid Form */}
        <View style={[styles.section, { paddingHorizontal: 16 }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Place a Bid</Text>
          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.formRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Price per kg ($)</Text>
                <TextInput
                  style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                  placeholder="e.g. 12.50"
                  placeholderTextColor={colors.mutedForeground}
                  value={pricePerKg}
                  onChangeText={setPricePerKg}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Turnaround (days)</Text>
                <TextInput
                  style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                  placeholder="e.g. 14"
                  placeholderTextColor={colors.mutedForeground}
                  value={turnaroundDays}
                  onChangeText={setTurnaroundDays}
                  keyboardType="number-pad"
                />
              </View>
            </View>
            <View>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Notes (optional)</Text>
              <TextInput
                style={[
                  styles.fieldInput,
                  styles.notesInput,
                  { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background },
                ]}
                placeholder="Additional details about your offer..."
                placeholderTextColor={colors.mutedForeground}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
              />
            </View>
            <Pressable
              onPress={handleSubmitBid}
              disabled={submitting || !pricePerKg || !turnaroundDays}
              style={({ pressed }) => [
                styles.submitBtn,
                {
                  backgroundColor:
                    !pricePerKg || !turnaroundDays ? colors.muted : colors.primary,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Feather name="send" size={16} color={!pricePerKg || !turnaroundDays ? colors.mutedForeground : "#fff"} />
                  <Text
                    style={[
                      styles.submitBtnText,
                      { color: !pricePerKg || !turnaroundDays ? colors.mutedForeground : "#fff" },
                    ]}
                  >
                    Submit Bid
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
        {/* Messages */}
        <View style={[styles.section, { paddingHorizontal: 16 }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Messages
          </Text>

          {/* Thread */}
          <View style={{ gap: 10, marginBottom: 14 }}>
            {loadingMsgs ? (
              <ActivityIndicator color={colors.primary} style={{ paddingVertical: 16 }} />
            ) : messages && messages.length > 0 ? (
              messages.map((m: any) => {
                const isBuyer = m.sender_role === "buyer";
                return (
                  <View
                    key={m.id}
                    style={[
                      styles.msgBubble,
                      isBuyer ? styles.msgBubbleBuyer : styles.msgBubbleOp,
                      {
                        backgroundColor: isBuyer ? colors.primary : colors.card,
                        borderColor: isBuyer ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.msgBody,
                        { color: isBuyer ? "#fff" : colors.foreground },
                      ]}
                    >
                      {m.body}
                    </Text>
                    <Text
                      style={[
                        styles.msgMeta,
                        { color: isBuyer ? "rgba(255,255,255,0.7)" : colors.mutedForeground },
                      ]}
                    >
                      {isBuyer ? "You" : "Operator"} ·{" "}
                      {format(new Date(m.created_at), "MMM d, h:mm a")}
                    </Text>
                  </View>
                );
              })
            ) : (
              <View style={styles.noMsgs}>
                <Feather name="message-circle" size={28} color={colors.mutedForeground} />
                <Text style={[styles.noMsgsText, { color: colors.mutedForeground }]}>
                  No messages yet. Start the conversation.
                </Text>
              </View>
            )}
          </View>

          {/* Compose */}
          <View style={[styles.composeRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <TextInput
              style={[styles.composeInput, { color: colors.foreground }]}
              placeholder="Type a message…"
              placeholderTextColor={colors.mutedForeground}
              value={msgText}
              onChangeText={setMsgText}
              multiline
            />
            <Pressable
              onPress={handleSendMessage}
              disabled={sendingMsg || !msgText.trim()}
              style={({ pressed }) => [
                styles.sendBtn,
                {
                  backgroundColor: !msgText.trim() ? colors.muted : colors.primary,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              {sendingMsg ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Feather name="send" size={16} color={!msgText.trim() ? colors.mutedForeground : "#fff"} />
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  heroCard: {
    padding: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  materialType: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
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
  buyerEmail: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
    marginBottom: 16,
  },
  specGrid: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  specItem: {
    flex: 1,
    alignItems: "center",
    gap: 5,
  },
  specDivider: {
    width: StyleSheet.hairlineWidth,
    height: 40,
  },
  specValue: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  specLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  specialReqs: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  specialReqsText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  section: {
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 14,
  },
  bidCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 10,
  },
  bidHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 8,
  },
  bidOperator: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  bidDate: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  bidPrice: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  bidMeta: {
    flexDirection: "row",
    gap: 14,
  },
  bidMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  bidMetaText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  bidNotes: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 8,
    lineHeight: 18,
  },
  acceptedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 10,
    alignSelf: "flex-start",
  },
  acceptedBannerText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  acceptBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  acceptBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  noBids: {
    paddingVertical: 32,
    alignItems: "center",
    gap: 10,
  },
  noBidsText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  formCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 14,
  },
  formRow: {
    flexDirection: "row",
    gap: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  notesInput: {
    height: 80,
    textAlignVertical: "top",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  submitBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  msgBubble: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    maxWidth: "85%",
    gap: 4,
  },
  msgBubbleBuyer: {
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  msgBubbleOp: {
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  msgBody: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  msgMeta: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  noMsgs: {
    paddingVertical: 28,
    alignItems: "center",
    gap: 10,
  },
  noMsgsText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  composeRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
  },
  composeInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    maxHeight: 100,
    paddingTop: 4,
    paddingBottom: 4,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
});
