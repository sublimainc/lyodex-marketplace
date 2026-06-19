import { useState, useRef, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useGetRequest, 
  getGetRequestQueryKey,
  useListBidsForRequest, 
  getListBidsForRequestQueryKey,
  useCreateBid,
  useAcceptBid,
  useListMessagesForRequest,
  getListMessagesForRequestQueryKey,
  usePostMessageForRequest,
} from "@workspace/api-client-react";
import { format, formatDistanceToNow } from "date-fns";
import { ArrowLeft, FileText, Calendar, Building, CheckCircle2, ShieldCheck, DollarSign, Clock, MessageSquare, AlertTriangle, Send, Lock, Scale, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";

// Detects potential off-platform contact info in messages.
// We warn but never block — users have the right to communicate freely.
const OFF_PLATFORM_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b|(\+?1?\s*[-.]?\s*)?(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})|\b(whatsapp|telegram|signal|wechat|viber|skype)\b/i;

export default function RequestDetails() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const { toast } = useToast();
  const { t } = useLanguage();
  const rd = t.requestDetails;
  const ROLE_LABEL: Record<string, string> = {
    buyer: rd.roleBuyer,
    operator: rd.roleOperator,
    admin: rd.roleAdmin,
  };
  const { user } = useAuth();

  const { data: request, isLoading: loadingReq } = useGetRequest(id, {
    query: { enabled: !!id, queryKey: getGetRequestQueryKey(id) }
  });

  const { data: bids, isLoading: loadingBids } = useListBidsForRequest(id, {
    query: { enabled: !!id, queryKey: getListBidsForRequestQueryKey(id) }
  });

  const { data: messages, isLoading: loadingMessages, isError: messagesError } = useListMessagesForRequest(id, {
    query: { enabled: !!id, queryKey: getListMessagesForRequestQueryKey(id) }
  });

  const createBid = useCreateBid();
  const acceptBid = useAcceptBid();
  const postMessage = usePostMessageForRequest();
  const queryClient = useQueryClient();

  const isBuyerOwner = user?.role === "buyer" && request?.buyer_email === user?.email;
  const isOperator = user?.role === "operator";
  const isAdmin = user?.role === "admin";
  const canSeeAllBids = isBuyerOwner || isAdmin;

  // Has this operator already submitted a quote?
  const myBid = isOperator && bids && bids.length > 0 ? bids[0] : null;

  const handleAcceptBid = (bidId: number) => {
    acceptBid.mutate(
      { id: bidId },
      {
        onSuccess: (data) => {
          queryClient.invalidateQueries({ queryKey: getListBidsForRequestQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getGetRequestQueryKey(id) });
          if (data.checkout_url) {
            toast({ title: rd.bidAccepted, description: rd.bidAcceptedStripe });
            window.location.href = data.checkout_url;
          } else {
            toast({ title: rd.error, description: rd.errorAccept, variant: "destructive" });
          }
        },
        onError: () => {
          toast({ title: rd.error, description: rd.errorAccept, variant: "destructive" });
        },
      }
    );
  };

  const [pricePerKg, setPricePerKg] = useState("");
  const [turnaroundDays, setTurnaroundDays] = useState("");
  const [notes, setNotes] = useState("");
  const [disclaimerDismissed, setDisclaimerDismissed] = useState(false);
  // Advanced pricing fields — optional, captured for market intelligence
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [currency, setCurrency] = useState("CAD");
  const [moq, setMoq] = useState("");
  const [productFormat, setProductFormat] = useState("");
  const [setupFee, setSetupFee] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");

  // Fetch operator's own profile to check audit status for the disclaimer
  const [operatorAuditStatus, setOperatorAuditStatus] = useState<string | null>(null);
  useEffect(() => {
    if (!user || user.role !== "operator") return;
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    fetch(`${base}/api/dashboard/operator`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.operator?.audit_status) setOperatorAuditStatus(d.operator.audit_status);
      })
      .catch(() => {});
  }, [user]);
  const [messageBody, setMessageBody] = useState("");

  // Dispute form state
  const [disputeOpenForBidId, setDisputeOpenForBidId] = useState<number | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeEvidence, setDisputeEvidence] = useState("");
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
  const [disputedBidIds, setDisputedBidIds] = useState<Set<number>>(new Set());

  const submitDispute = async (bidId: number) => {
    if (disputeReason.trim().length < 20) {
      toast({ title: "Reason too short", description: "Please provide at least 20 characters describing the issue.", variant: "destructive" });
      return;
    }
    setDisputeSubmitting(true);
    try {
      await fetch(`${BASE}/api/disputes`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: id,
          bid_id: bidId,
          reason: disputeReason.trim(),
          evidence: disputeEvidence.trim() || undefined,
        }),
      }).then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      });
      setDisputedBidIds(prev => new Set([...prev, bidId]));
      setDisputeOpenForBidId(null);
      setDisputeReason("");
      setDisputeEvidence("");
      toast({ title: "Dispute submitted", description: "The LyoDex team will review your dispute and follow up by email." });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit dispute";
      toast({ title: "Could not submit dispute", description: msg, variant: "destructive" });
    } finally {
      setDisputeSubmitting(false);
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  useEffect(() => {
    if (messages && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (!id || !user) return;
    fetch(`${BASE}/api/requests/${id}/mark-read`, {
      method: "POST",
      credentials: "include",
    }).catch(() => {});
  }, [id, user]);

  const handleBidSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pricePerKg || !turnaroundDays) return;

    createBid.mutate(
      { 
        data: { 
          request_id: id,
          operator_id: 1, // backend ignores this and uses the authenticated user's id
          price_per_kg: parseFloat(pricePerKg),
          turnaround_days: parseInt(turnaroundDays, 10),
          notes 
        } 
      },
      {
        onSuccess: (bid) => {
          toast({ title: rd.bidSubmitted, description: rd.bidPlaced });
          queryClient.invalidateQueries({ queryKey: getListBidsForRequestQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getGetRequestQueryKey(id) });
          // Enrich the market intelligence record with optional advanced pricing fields (non-blocking)
          const hasAdvanced = currency !== "CAD" || moq || productFormat || setupFee || paymentTerms;
          if (hasAdvanced && bid?.id) {
            const base = import.meta.env.BASE_URL.replace(/\/$/, "");
            fetch(`${base}/api/bids/${bid.id}/price-details`, {
              method: "PATCH",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                currency,
                moq:            moq        ? parseInt(moq, 10)      : undefined,
                product_format: productFormat || undefined,
                setup_fee:      setupFee   ? parseFloat(setupFee) : undefined,
                payment_terms:  paymentTerms || undefined,
              }),
            }).catch(() => {});
          }
          setPricePerKg(""); setTurnaroundDays(""); setNotes("");
          setCurrency("CAD"); setMoq(""); setProductFormat(""); setSetupFee(""); setPaymentTerms("");
          setShowAdvanced(false);
        },
        onError: () => {
          toast({ title: rd.error, description: rd.errorBid, variant: "destructive" });
        }
      }
    );
  };

  const handleMessageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageBody.trim() || !user) return;

    const hasOffPlatformContent = OFF_PLATFORM_RE.test(messageBody);

    postMessage.mutate(
      { id, data: { body: messageBody.trim() } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMessagesForRequestQueryKey(id) });
          setMessageBody("");
          if (hasOffPlatformContent) {
            toast({
              title: "Keep communication on LyoDex",
              description: "Your message may contain off-platform contact details. Staying on LyoDex preserves payment protection and dispute eligibility.",
              variant: "destructive",
            });
          } else {
            toast({ title: rd.messageSent });
          }
        },
        onError: () => {
          toast({ title: rd.error, description: rd.errorMessage, variant: "destructive" });
        }
      }
    );
  };

  if (loadingReq || !request) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Skeleton className="h-8 w-32 mb-8" />
        <Skeleton className="h-40 w-full mb-8" />
        <div className="grid md:grid-cols-3 gap-8">
          <Skeleton className="col-span-2 h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  const requestClosed = request.status === "closed" || request.status === "removed";

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <Link href="/requests" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" /> {rd.backToMarketplace}
      </Link>

      {request.status === "removed" && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-5 py-4">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-destructive text-sm">{rd.requestRemoved}</p>
            {request.moderation_note && (
              <p className="text-sm text-muted-foreground mt-1">{rd.reasonLabel} {request.moderation_note}</p>
            )}
          </div>
        </div>
      )}

      {request.status === "closed" && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-300/40 bg-amber-50/60 dark:bg-amber-900/10 px-5 py-4">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-700 dark:text-amber-400 text-sm">{rd.requestClosed}</p>
            {request.moderation_note && (
              <p className="text-sm text-muted-foreground mt-1">{rd.noteLabel} {request.moderation_note}</p>
            )}
          </div>
        </div>
      )}

      <div className="bg-card border rounded-xl shadow-sm overflow-hidden mb-8">
        <div className="p-8 border-b bg-muted/10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold tracking-tight">{request.material_type}</h1>
                <Badge variant={request.status === 'pending' ? 'secondary' : request.status === 'active' ? 'default' : 'outline'} className="uppercase text-[10px] tracking-wider">
                  {request.status}
                </Badge>
              </div>
              {request.buyer_email && (
                <p className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Building className="w-4 h-4" /> {rd.postedBy} {request.buyer_email}
                </p>
              )}
            </div>
            <div className="text-left md:text-right">
              <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider mb-1">{rd.status}</div>
              <div className="text-xl font-bold text-primary flex items-center gap-2">
                {request.bid_count} {rd.activeBids}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x">
          <div className="p-6 flex flex-col justify-center">
            <div className="text-sm text-muted-foreground flex items-center gap-1.5 mb-1"><FileText className="w-4 h-4" /> {rd.quantity}</div>
            <div className="text-xl font-bold">{request.quantity_kg} kg</div>
          </div>
          <div className="p-6 flex flex-col justify-center">
            <div className="text-sm text-muted-foreground flex items-center gap-1.5 mb-1"><Calendar className="w-4 h-4" /> {rd.deadline}</div>
            <div className="text-xl font-bold">{format(new Date(request.deadline), "MMM d, yyyy")}</div>
          </div>
          <div className="p-6 flex flex-col justify-center">
            <div className="text-sm text-muted-foreground flex items-center gap-1.5 mb-1"><DollarSign className="w-4 h-4" /> {rd.targetBudget}</div>
            <div className="text-xl font-bold">{request.budget_per_kg ? `$${request.budget_per_kg}/kg` : rd.open}</div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <section>
            <h2 className="text-xl font-bold mb-4">{rd.requirementsTitle}</h2>
            <Card>
              <CardContent className="p-6">
                {request.special_requirements ? (
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap">{request.special_requirements}</p>
                ) : (
                  <p className="text-muted-foreground italic">{rd.noRequirements}</p>
                )}
              </CardContent>
            </Card>
          </section>

          {/* ── Quotes section — role-aware sealed-bid rendering ── */}
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              {canSeeAllBids ? rd.activeBidsTitle : isOperator ? "Your Quote" : rd.activeBidsTitle}
            </h2>

            {/* Operator view — sealed: only their own quote + aggregate count */}
            {isOperator && (
              <div className="space-y-4">
                {loadingBids ? (
                  <Skeleton className="h-24 w-full" />
                ) : myBid ? (
                  <Card className="overflow-hidden border-primary/30 bg-primary/5">
                    <div className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm mb-1 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-primary" /> Your submitted quote
                          <Badge variant="outline" className="text-xs">{myBid.status}</Badge>
                        </div>
                        {myBid.notes && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2"><MessageSquare className="w-3.5 h-3.5 inline mr-1" /> {myBid.notes}</p>
                        )}
                      </div>
                      <div className="flex sm:flex-col items-center sm:items-end gap-6 sm:gap-1 text-right shrink-0">
                        <div>
                          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">{rd.price}</div>
                          <div className="text-xl font-bold text-primary">${myBid.price_per_kg}/kg</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1 mt-2">{rd.turnaround}</div>
                          <div className="text-sm font-semibold flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {myBid.turnaround_days} {rd.days}</div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      No quote submitted yet.
                    </CardContent>
                  </Card>
                )}

                {/* Confidentiality notice with aggregate count */}
                {(request.bid_count ?? 0) > 0 && (
                  <div className="flex items-start gap-2.5 rounded-lg border bg-muted/40 px-4 py-3">
                    <Lock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">{request.bid_count} quote{request.bid_count !== 1 ? "s" : ""} received.</span>{" "}
                      Operator pricing is confidential — each provider submits their true best price independently. The buyer reviews all quotes and selects the best fit.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Buyer / Admin view — see all quotes */}
            {canSeeAllBids && (
              <>
                {loadingBids ? (
                  <div className="space-y-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                ) : bids && bids.length > 0 ? (
                  <div className="space-y-4">
                    {bids.map(bid => (
                      <Card key={bid.id} className={`overflow-hidden transition-colors ${bid.status === "accepted" ? "border-primary/40 bg-primary/5" : ""}`}>
                        <div className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-lg mb-1 flex items-center gap-2 flex-wrap">
                              {bid.operator_name}
                              <Badge
                                variant={bid.status === "accepted" ? "default" : "outline"}
                                className={`text-xs ${bid.status === "accepted" ? "bg-primary text-primary-foreground" : ""}`}
                              >
                                {bid.status === "accepted" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                {bid.status}
                              </Badge>
                              {bid.operator_audit_status && bid.operator_audit_status !== "audited" && (
                                <Badge
                                  variant="outline"
                                  className="text-xs border-amber-300 text-amber-700 bg-amber-50 gap-1"
                                  title="This operator has not yet been audited by LyoDex. Their certification claims have not been independently verified."
                                >
                                  <AlertTriangle className="w-3 h-3" /> Unverified operator
                                </Badge>
                              )}
                            </div>
                            {bid.notes && (
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-2"><MessageSquare className="w-3.5 h-3.5 inline mr-1" /> {bid.notes}</p>
                            )}
                            {isBuyerOwner && bid.status === "pending" && !requestClosed && (
                              <div className="mt-3">
                                <p className="text-xs text-muted-foreground mb-2">{rd.feeNote}</p>
                                <Button
                                  size="sm"
                                  onClick={() => handleAcceptBid(bid.id)}
                                  disabled={acceptBid.isPending}
                                  className="gap-1.5"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  {acceptBid.isPending ? rd.accepting : rd.acceptBid}
                                </Button>
                              </div>
                            )}
                            {isBuyerOwner && bid.status === "accepted" && (
                              <div className="mt-3">
                                {disputedBidIds.has(bid.id) ? (
                                  <p className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Dispute submitted — our team will review it.
                                  </p>
                                ) : disputeOpenForBidId === bid.id ? (
                                  <div className="border border-destructive/30 bg-destructive/5 rounded-lg p-4 space-y-3">
                                    <p className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                                      <Scale className="w-3.5 h-3.5" /> Open a Dispute
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">Describe the issue clearly. LyoDex will review and follow up within 2 business days.</p>
                                    <div>
                                      <label className="text-xs font-medium mb-1 block">Reason <span className="text-destructive">*</span></label>
                                      <Textarea
                                        rows={3}
                                        placeholder="Describe the issue (min. 20 characters)…"
                                        value={disputeReason}
                                        onChange={e => setDisputeReason(e.target.value)}
                                        className="text-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs font-medium mb-1 block">Supporting evidence <span className="text-muted-foreground">(optional)</span></label>
                                      <Textarea
                                        rows={2}
                                        placeholder="Order numbers, dates, communications, photos, etc."
                                        value={disputeEvidence}
                                        onChange={e => setDisputeEvidence(e.target.value)}
                                        className="text-sm"
                                      />
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => submitDispute(bid.id)}
                                        disabled={disputeSubmitting}
                                        className="gap-1.5"
                                      >
                                        <Scale className="w-3.5 h-3.5" />
                                        {disputeSubmitting ? "Submitting…" : "Submit Dispute"}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => { setDisputeOpenForBidId(null); setDisputeReason(""); setDisputeEvidence(""); }}
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">
                                      Note: Opening a dispute does not automatically pause any payment release. Contact support immediately if you believe fraud has occurred.
                                    </p>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setDisputeOpenForBidId(bid.id)}
                                    className="text-xs text-destructive/70 hover:text-destructive hover:underline flex items-center gap-1 mt-1 transition-colors"
                                  >
                                    <Scale className="w-3 h-3" /> Open a dispute
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex sm:flex-col items-center sm:items-end gap-6 sm:gap-1 text-right shrink-0">
                            <div>
                              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">{rd.price}</div>
                              <div className="text-xl font-bold text-primary">${bid.price_per_kg}/kg</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1 mt-2">{rd.turnaround}</div>
                              <div className="text-sm font-semibold flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {bid.turnaround_days} {rd.days}</div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      {rd.noBids}
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* Guest / non-participant */}
            {!user && (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Lock className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">
                    <Link href="/login" className="font-medium text-primary hover:underline">{rd.logIn}</Link>
                    {" "}to view quotes for this request.
                  </p>
                </CardContent>
              </Card>
            )}
          </section>

          {/* Messages Thread */}
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" /> {rd.messagesTitle}
            </h2>
            <Card>
              <CardContent className="p-0">
                {/* Platform protection reminder */}
                <div className="px-4 py-2.5 bg-primary/5 border-b flex items-start gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Keep all communication and payments on LyoDex to maintain payment protection, dispute support, and certification eligibility.
                  </p>
                </div>

                {/* Messages list */}
                <div className="divide-y max-h-[480px] overflow-y-auto">
                  {loadingMessages ? (
                    <div className="p-6 space-y-4">
                      <Skeleton className="h-14 w-full" />
                      <Skeleton className="h-14 w-full" />
                    </div>
                  ) : messagesError ? (
                    <div className="p-8 text-center text-muted-foreground text-sm italic">
                      {user ? rd.noThreadAccess : rd.loginToMessage}
                    </div>
                  ) : messages && messages.length > 0 ? (
                    <>
                      {messages.map(msg => (
                        <div key={msg.id} className="px-5 py-4 flex gap-3 items-start">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-xs font-bold text-primary">
                              {msg.sender_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-sm">{msg.sender_name}</span>
                              <Badge variant="outline" className="text-[10px] uppercase px-1.5 py-0">
                                {ROLE_LABEL[msg.sender_role] ?? msg.sender_role}
                              </Badge>
                              <span className="text-xs text-muted-foreground ml-auto shrink-0">
                                {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">{msg.body}</p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground text-sm italic">
                      {rd.noMessages}
                    </div>
                  )}
                </div>

                {/* Message compose area */}
                <div className="border-t p-4">
                  {user && !messagesError ? (
                    <form onSubmit={handleMessageSubmit} className="flex gap-2">
                      <Input
                        placeholder={rd.messagePlaceholder}
                        value={messageBody}
                        onChange={e => setMessageBody(e.target.value)}
                        className="flex-1"
                        disabled={postMessage.isPending}
                        maxLength={5000}
                      />
                      <Button
                        type="submit"
                        size="sm"
                        disabled={postMessage.isPending || !messageBody.trim()}
                        className="shrink-0 gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {postMessage.isPending ? rd.sendingMessage : rd.sendMessage}
                      </Button>
                    </form>
                  ) : (
                    <div className="flex items-center justify-center gap-2 py-2">
                      <MessageSquare className="w-4 h-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {rd.loginToMessage}{" "}
                        <Link href="/login" className="font-medium text-primary hover:underline">{rd.logIn}</Link>
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>
        </div>

        {/* ── Sidebar ── */}
        <div>
          {requestClosed ? (
            <Card className="sticky top-24 border-muted">
              <CardContent className="p-6 text-center">
                <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-sm font-medium text-muted-foreground">
                  {request.status === "closed" ? rd.requestIsClosedMsg : rd.requestIsRemovedMsg}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{rd.biddingUnavailable}</p>
              </CardContent>
            </Card>
          ) : isOperator ? (
            myBid ? (
              /* Operator already submitted — confirmation card */
              <Card className="sticky top-24 border-primary/20 shadow-md">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-6 h-6 text-primary" />
                  </div>
                  <p className="font-semibold text-sm mb-1">Quote submitted</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Your quote is sealed and confidential. The buyer will reach out through this thread if they select you.
                  </p>
                  <div className="mt-4 pt-4 border-t text-left space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{rd.price}</span>
                      <span className="font-semibold text-primary">${myBid.price_per_kg}/kg</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{rd.turnaround}</span>
                      <span className="font-semibold">{myBid.turnaround_days} {rd.days}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              /* Operator quote submission form */
              <Card className="sticky top-24 border-primary/20 shadow-md">
                <CardHeader className="bg-muted/10 border-b">
                  <CardTitle className="text-lg">{rd.submitBidTitle}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                    <Lock className="w-3 h-3" /> Your quote is sealed — other operators cannot see your price.
                  </p>
                </CardHeader>
                {operatorAuditStatus !== null && operatorAuditStatus !== "audited" && !disclaimerDismissed && (
                  <div className="mx-4 mt-4 rounded-lg border border-amber-300/60 bg-amber-50 dark:bg-amber-900/10 px-4 py-3">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-amber-800 dark:text-amber-400 mb-1">Unverified operator</p>
                        <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                          You are submitting as an unverified operator. LyoDex does not guarantee the accuracy of unverified certification claims. You bear sole responsibility for product quality and regulatory compliance.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDisclaimerDismissed(true)}
                        className="text-amber-500 hover:text-amber-700 shrink-0 ml-1"
                        aria-label="Dismiss"
                      >
                        <span className="text-lg leading-none">&times;</span>
                      </button>
                    </div>
                  </div>
                )}
                <form onSubmit={handleBidSubmit}>
                  <CardContent className="p-6 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="price">{rd.pricePerKg}</Label>
                      <Input id="price" type="number" step="0.01" placeholder="45.00" value={pricePerKg} onChange={e => setPricePerKg(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="turnaround">{rd.turnaroundDays}</Label>
                      <Input id="turnaround" type="number" placeholder="14" value={turnaroundDays} onChange={e => setTurnaroundDays(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">{rd.notes}</Label>
                      <Textarea id="notes" placeholder={rd.notesPlaceholder} className="h-24 text-sm" value={notes} onChange={e => setNotes(e.target.value)} />
                    </div>

                    {/* Optional advanced pricing — enriches market intelligence data */}
                    <div className="border-t pt-3">
                      <button
                        type="button"
                        onClick={() => setShowAdvanced(v => !v)}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
                      >
                        {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        Advanced pricing details (optional)
                      </button>
                      {showAdvanced && (
                        <div className="mt-3 space-y-3">
                          <p className="text-[10px] text-muted-foreground leading-relaxed">
                            These fields help build market intelligence benchmarks. All data is anonymized — your company name is never shared publicly.
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label htmlFor="currency" className="text-xs">Currency</Label>
                              <select
                                id="currency"
                                value={currency}
                                onChange={e => setCurrency(e.target.value)}
                                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                              >
                                <option value="CAD">CAD</option>
                                <option value="USD">USD</option>
                              </select>
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="moq" className="text-xs">Min. order (kg)</Label>
                              <Input id="moq" type="number" min="1" placeholder="100" value={moq} onChange={e => setMoq(e.target.value)} className="text-sm" />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="productFormat" className="text-xs">Product format</Label>
                            <select
                              id="productFormat"
                              value={productFormat}
                              onChange={e => setProductFormat(e.target.value)}
                              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                              <option value="">Select format…</option>
                              <option value="powder">Powder</option>
                              <option value="whole">Whole</option>
                              <option value="sliced">Sliced</option>
                              <option value="diced">Diced</option>
                              <option value="crumble">Crumble</option>
                              <option value="pieces">Pieces</option>
                              <option value="granules">Granules</option>
                            </select>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label htmlFor="setupFee" className="text-xs">Setup fee ($)</Label>
                              <Input id="setupFee" type="number" step="0.01" min="0" placeholder="0.00" value={setupFee} onChange={e => setSetupFee(e.target.value)} className="text-sm" />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="paymentTerms" className="text-xs">Payment terms</Label>
                              <Input id="paymentTerms" type="text" placeholder="Net 30" value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} className="text-sm" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="p-6 pt-0">
                    <Button type="submit" className="w-full" disabled={createBid.isPending}>
                      {createBid.isPending ? rd.submitting : rd.submitBid}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            )
          ) : !user ? (
            /* Guest prompt */
            <Card className="sticky top-24">
              <CardContent className="p-6 text-center">
                <Lock className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Are you a freeze-dry operator?{" "}
                  <Link href="/login" className="font-medium text-primary hover:underline">{rd.logIn}</Link>
                  {" "}to submit a confidential quote.
                </p>
              </CardContent>
            </Card>
          ) : null /* buyers don't see a quote form */ }
        </div>
      </div>
    </div>
  );
}
