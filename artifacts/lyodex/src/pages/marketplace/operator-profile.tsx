import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useGetOperator } from "@workspace/api-client-react";
import { getGetOperatorQueryKey } from "@workspace/api-client-react";
import { Factory, MapPin, Star, AlertCircle, ArrowLeft, ShieldCheck, Shield, Clock, DollarSign, CheckCircle2, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Link } from "wouter";
import { useLanguage } from "@/lib/i18n";

interface Review {
  id: number;
  name: string;
  company: string;
  rating: number;
  comment: string;
  date: string;
}

const SEED_REVIEWS: Review[] = [
  { id: 1, name: "Marc Tremblay", company: "Pharmalab Inc.", rating: 5, comment: "Excellent service from start to finish. The batch was processed on time and exactly to spec. Will definitely use again.", date: "April 2, 2026" },
  { id: 2, name: "Sarah O'Brien", company: "NutriTech Foods", rating: 4, comment: "Great quality and fast turnaround. Communication was clear and professional. Slight delay on paperwork but nothing major.", date: "March 18, 2026" },
];

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          className={`transition-colors ${onChange ? "cursor-pointer hover:scale-110" : "cursor-default"}`}
        >
          <Star className={`w-5 h-5 ${n <= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
        </button>
      ))}
    </div>
  );
}

export default function OperatorProfile() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const { t } = useLanguage();
  const p = t.operatorProfile;

  const { data: op, isLoading, error } = useGetOperator(id, {
    query: { enabled: !!id, queryKey: getGetOperatorQueryKey(id) }
  });

  const [auditStatus, setAuditStatus] = useState<string>("none");
  useEffect(() => {
    if (!id) return;
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    fetch(`${base}/api/operators/${id}/audit-status`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setAuditStatus(d.audit_status))
      .catch((err) => {
        console.warn("[operator-profile] Failed to fetch audit status:", err);
      });
  }, [id]);

  const [reviews, setReviews] = useState<Review[]>(SEED_REVIEWS);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ name: "", company: "", email: "", rating: 0, comment: "" });
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  function handleReviewSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (reviewForm.rating === 0) return;

    const newReview: Review = {
      id: Date.now(),
      name: reviewForm.name,
      company: reviewForm.company,
      rating: reviewForm.rating,
      comment: reviewForm.comment,
      date: new Date().toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" }),
    };
    setReviews(r => [newReview, ...r]);

    const subject = `New review for ${op?.name} on LyoDex`;
    const body = `New review submitted:\n\nOperator: ${op?.name}\nReviewer: ${reviewForm.name}${reviewForm.company ? " (" + reviewForm.company + ")" : ""}\nRating: ${reviewForm.rating}/5\n\n"${reviewForm.comment}"\n\nReviewer email: ${reviewForm.email}\nDate: ${newReview.date}`;
    const mailto = `mailto:reviews@lyodex.ca?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailto, "_blank");

    setReviewForm({ name: "", company: "", email: "", rating: 0, comment: "" });
    setReviewSubmitted(true);
    setShowReviewForm(false);
  }

  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "—";

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{p.errorLoad}</AlertDescription>
        </Alert>
        <Link href="/operators"><Button variant="ghost" className="mt-4"><ArrowLeft className="w-4 h-4 mr-2" /> {p.backToDirectory}</Button></Link>
      </div>
    );
  }

  if (isLoading || !op) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Skeleton className="h-8 w-32 mb-8" />
        <Skeleton className="h-32 w-full mb-8" />
        <div className="grid md:grid-cols-3 gap-8">
          <Skeleton className="col-span-2 h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <Link href="/operators" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" /> {p.backToDirectory}
      </Link>

      <div className="bg-card border rounded-xl shadow-sm overflow-hidden mb-8">
        <div className="p-8 md:p-10 border-b bg-muted/20">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{op.name}</h1>
                {auditStatus === "audited" && (
                  <Badge className="bg-primary gap-1 text-xs">
                    <ShieldCheck className="w-3 h-3" /> {p.verified}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {op.location}</span>
                <span className="flex items-center gap-1.5"><Star className="w-4 h-4 fill-yellow-400 text-yellow-400" /> {op.rating} ({op.review_count} {p.reviews})</span>
              </div>
            </div>
            <Link href={`/request?operator=${op.id}`}>
              <Button size="lg" className="w-full md:w-auto font-semibold">{p.requestQuote}</Button>
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x">
          <div className="p-6 flex flex-col items-center justify-center text-center">
            <Factory className="w-8 h-8 text-primary mb-3" />
            <div className="text-2xl font-bold">{op.capacity_kg} kg</div>
            <div className="text-sm text-muted-foreground uppercase tracking-wider font-medium mt-1">{p.monthlyCapacity}</div>
          </div>
          <div className="p-6 flex flex-col items-center justify-center text-center">
            <DollarSign className="w-8 h-8 text-primary mb-3" />
            <div className="text-2xl font-bold text-primary">${op.price_per_kg}</div>
            <div className="text-sm text-muted-foreground uppercase tracking-wider font-medium mt-1">{p.estPrice}</div>
          </div>
          <div className="p-6 flex flex-col items-center justify-center text-center">
            <Clock className="w-8 h-8 text-primary mb-3" />
            <div className="text-2xl font-bold">{op.turnaround_days} {p.days}</div>
            <div className="text-sm text-muted-foreground uppercase tracking-wider font-medium mt-1">{p.avgTurnaround}</div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4">{p.aboutFacility}</h2>
            <div className="prose dark:prose-invert max-w-none text-muted-foreground">
              <p>{op.description || p.defaultDescription}</p>
            </div>
          </section>

          <section id="certifications">
            <h2 className="text-2xl font-bold mb-3">{p.verifiedCerts}</h2>
            {(() => {
              const verified = op.verified_certifications ?? [];
              const total = op.certifications.length;
              const allVerified = total > 0 && verified.length === total;
              if (allVerified) {
                return (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium mb-4">
                    <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
                    {p.allCertsVerified}
                  </div>
                );
              }
              if (verified.length > 0) {
                return (
                  <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 mb-4">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    {verified.length}/{total} {p.certsVerifiedSummary}
                  </div>
                );
              }
              return null;
            })()}
            {(op.verified_certifications ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground italic mb-4">No certifications have been individually verified by LyoDex yet.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                {(op.verified_certifications ?? []).map(cert => {
                  const verifiedAt = (op.cert_verified_at as Record<string, string> | undefined)?.[cert];
                  const dateLabel = verifiedAt
                    ? new Date(verifiedAt).toLocaleDateString("en-CA", { month: "long", year: "numeric" })
                    : null;
                  return (
                    <div key={cert} className="flex items-center gap-3 p-4 border border-emerald-200 rounded-lg bg-emerald-50">
                      <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <span className="font-medium">{cert}</span>
                        <p className="text-xs text-emerald-700 mt-0.5">
                          {dateLabel ? `Verified ${dateLabel}` : "Verified by LyoDex"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {op.certifications.filter(c => !(op.verified_certifications ?? []).includes(c)).length > 0 && (
              <div>
                <h3 className="text-base font-semibold text-muted-foreground mb-3">Claimed (Pending Verification)</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {op.certifications
                    .filter(c => !(op.verified_certifications ?? []).includes(c))
                    .map(cert => (
                      <div
                        key={cert}
                        className="flex items-center gap-3 p-3.5 border border-dashed rounded-lg bg-background"
                        title="This certification has been claimed by the operator but has not yet been confirmed by LyoDex."
                      >
                        <Shield className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                        <div>
                          <span className="font-medium text-sm">{cert}</span>
                          <p className="text-xs text-muted-foreground mt-0.5">Claimed — not yet confirmed by LyoDex</p>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">{p.clientReviews}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <StarRating value={Math.round(Number(avgRating))} />
                  <span className="text-sm font-semibold">{avgRating}</span>
                  <span className="text-sm text-muted-foreground">({reviews.length} {p.reviews})</span>
                </div>
              </div>
              <Button
                variant={showReviewForm ? "outline" : "default"}
                size="sm"
                className="gap-2"
                onClick={() => { setShowReviewForm(s => !s); setReviewSubmitted(false); }}
              >
                <MessageSquare className="w-4 h-4" />
                {showReviewForm ? p.cancelReview : p.leaveReview}
              </Button>
            </div>

            {reviewSubmitted && (
              <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl mb-6 text-emerald-800 text-sm">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <div>
                  <span className="font-semibold">{p.reviewSubmittedTitle}</span> {p.reviewSubmittedDesc}
                </div>
              </div>
            )}

            {showReviewForm && (
              <form onSubmit={handleReviewSubmit} className="border rounded-xl p-6 bg-muted/10 mb-6 space-y-4">
                <h3 className="font-semibold text-sm">{p.yourReview}</h3>
                <div className="space-y-1">
                  <Label className="text-sm">{p.ratingLabel} <span className="text-destructive">*</span></Label>
                  <StarRating value={reviewForm.rating} onChange={r => setReviewForm(f => ({ ...f, rating: r }))} />
                  {reviewForm.rating === 0 && <p className="text-xs text-muted-foreground">{p.selectRating}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-sm">{p.nameLabel} <span className="text-destructive">*</span></Label>
                    <Input
                      placeholder={p.yourNamePlaceholder}
                      value={reviewForm.name}
                      onChange={e => setReviewForm(f => ({ ...f, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm">{p.companyLabel}</Label>
                    <Input
                      placeholder={p.yourCompanyPlaceholder}
                      value={reviewForm.company}
                      onChange={e => setReviewForm(f => ({ ...f, company: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">{p.emailVerification}</Label>
                  <Input
                    type="email"
                    placeholder={p.yourEmailPlaceholder}
                    value={reviewForm.email}
                    onChange={e => setReviewForm(f => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">{p.yourReview} <span className="text-destructive">*</span></Label>
                  <Textarea
                    placeholder={p.reviewPlaceholder}
                    value={reviewForm.comment}
                    onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))}
                    rows={4}
                    required
                  />
                </div>
                <Button type="submit" className="gap-2 w-full">
                  <Send className="w-4 h-4" /> {p.submitReview}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  {p.reviewNote}
                </p>
              </form>
            )}

            <div className="space-y-4">
              {reviews.map(review => (
                <div key={review.id} className="border rounded-xl p-5 bg-card">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                          {review.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
                        </div>
                        <div>
                          <span className="font-semibold text-sm">{review.name}</span>
                          {review.company && <span className="text-xs text-muted-foreground ml-1.5">· {review.company}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <StarRating value={review.rating} />
                      <p className="text-xs text-muted-foreground mt-1">{review.date}</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div>
          <div className="p-6 border rounded-xl bg-muted/10 sticky top-24">
            <h3 className="font-bold text-lg mb-4">{p.startContract}</h3>
            <p className="text-sm text-muted-foreground mb-6">{p.contractDesc}</p>
            <Link href={`/request?operator=${op.id}`}>
              <Button className="w-full mb-3">{p.draftRequest}</Button>
            </Link>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-4">
              <CheckCircle2 className="w-4 h-4" /> {p.noCommitment}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
