import { useState } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, Globe, Star, MapPin, ExternalLink, Factory, Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";

interface Review {
  id: number;
  reviewer_name: string;
  reviewer_company: string | null;
  rating: number;
  comment: string | null;
  verified_buyer: boolean;
  created_at: string;
}

interface ManufacturerDetail {
  id: number;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  website_url: string | null;
  country: string | null;
  city: string | null;
  founded_year: number | null;
  specialties: string[];
  market_focus: string[];
  featured: boolean;
  avg_rating: number;
  review_count: number;
  images: string[];
  reviews: Review[];
}

const COUNTRY_NAMES: Record<string, string> = {
  US: "United States", CA: "Canada", CN: "China", NZ: "New Zealand",
  DE: "Germany", ES: "Spain", FR: "France", JP: "Japan", GB: "United Kingdom",
};

const MARKET_COLORS: Record<string, string> = {
  Pharmaceutical: "bg-violet-100 text-violet-800",
  Biotech: "bg-blue-100 text-blue-800",
  Food: "bg-emerald-100 text-emerald-800",
  GMP: "bg-amber-100 text-amber-800",
  Industrial: "bg-slate-100 text-slate-700",
  Research: "bg-cyan-100 text-cyan-800",
};

function StarRow({ rating, interactive, onChange }: { rating: number; interactive?: boolean; onChange?: (r: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => {
        const active = i <= (interactive ? (hovered || rating) : Math.round(rating));
        return (
          <Star
            key={i}
            className={`w-5 h-5 transition-colors ${active ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"} ${interactive ? "cursor-pointer" : ""}`}
            onMouseEnter={() => interactive && setHovered(i)}
            onMouseLeave={() => interactive && setHovered(0)}
            onClick={() => interactive && onChange?.(i)}
          />
        );
      })}
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const date = new Date(review.created_at).toLocaleDateString("en-CA", { year: "numeric", month: "short" });
  return (
    <div className="border rounded-xl p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{review.reviewer_name}</span>
            {review.reviewer_company && (
              <span className="text-xs text-muted-foreground">· {review.reviewer_company}</span>
            )}
            {review.verified_buyer && (
              <span className="flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" /> Verified user
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground">{date}</span>
        </div>
        <StarRow rating={review.rating} />
      </div>
      {review.comment && (
        <p className="text-sm text-muted-foreground leading-relaxed">"{review.comment}"</p>
      )}
    </div>
  );
}

export default function ManufacturerProfile() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ reviewer_name: user?.name ?? "", reviewer_company: "", rating: 0, comment: "" });
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState("");

  const { data: mfr, isLoading, error } = useQuery<ManufacturerDetail>({
    queryKey: ["manufacturer", slug],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.BASE_URL}api/manufacturers/${slug}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!slug,
  });

  const submitReview = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch(`${import.meta.env.BASE_URL}api/manufacturers/${slug}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to submit review");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manufacturer", slug] });
      setSubmitted(true);
      setShowForm(false);
    },
    onError: (err: Error) => setFormError(err.message),
  });

  function handleReviewSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (form.rating === 0) { setFormError("Please select a star rating."); return; }
    if (form.comment.length < 10) { setFormError("Review must be at least 10 characters."); return; }
    submitReview.mutate(form);
  }

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !mfr) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-16 text-center">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Manufacturer not found</h2>
        <Link href="/manufacturers"><Button variant="outline">Back to Manufacturers</Button></Link>
      </div>
    );
  }

  const countryName = mfr.country ? (COUNTRY_NAMES[mfr.country] ?? mfr.country) : null;
  const ratingDistribution = [5, 4, 3, 2, 1].map(r => ({
    stars: r,
    count: mfr.reviews.filter(rv => rv.rating === r).length,
  }));

  return (
    <div className="flex flex-col min-h-screen">
      <section className="bg-[#0a1628] text-white py-10 px-4">
        <div className="container mx-auto max-w-4xl">
          <Link href="/manufacturers" className="inline-flex items-center text-sm text-gray-400 hover:text-white mb-5 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Manufacturers
          </Link>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
              <Factory className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{mfr.name}</h1>
                {mfr.featured && (
                  <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">Featured</Badge>
                )}
              </div>
              {mfr.tagline && <p className="text-gray-400 text-sm italic mb-2">"{mfr.tagline}"</p>}
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
                {(mfr.city || countryName) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {[mfr.city, countryName].filter(Boolean).join(", ")}
                  </span>
                )}
                {mfr.founded_year && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Est. {mfr.founded_year}
                  </span>
                )}
                {mfr.website_url && (
                  <a href={mfr.website_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors">
                    <Globe className="w-3.5 h-3.5" /> Website <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-4xl px-4 py-8 space-y-8">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {mfr.description && (
              <div className="border rounded-xl p-5 bg-card">
                <h2 className="font-semibold text-base mb-3">About {mfr.name}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{mfr.description}</p>
              </div>
            )}

            {mfr.specialties.length > 0 && (
              <div className="border rounded-xl p-5 bg-card">
                <h2 className="font-semibold text-base mb-3">Products & Specialties</h2>
                <ul className="space-y-2">
                  {mfr.specialties.map(s => (
                    <li key={s} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="border rounded-xl p-5 bg-card">
              <h2 className="font-semibold text-base mb-3">Market Focus</h2>
              <div className="flex flex-wrap gap-2">
                {mfr.market_focus.map(f => (
                  <span key={f}
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${MARKET_COLORS[f] ?? "bg-muted text-muted-foreground"}`}>
                    {f}
                  </span>
                ))}
              </div>
            </div>

            <div className="border rounded-xl p-5 bg-card">
              <h2 className="font-semibold text-base mb-1">Overall Rating</h2>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-4xl font-bold">{mfr.avg_rating > 0 ? mfr.avg_rating.toFixed(1) : "—"}</span>
                <span className="text-muted-foreground text-sm mb-1">/ 5</span>
              </div>
              <StarRow rating={mfr.avg_rating} />
              <p className="text-xs text-muted-foreground mt-1">{mfr.review_count} reviews</p>

              {mfr.review_count > 0 && (
                <div className="mt-3 space-y-1">
                  {ratingDistribution.map(({ stars, count }) => (
                    <div key={stars} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-3">{stars}</span>
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full"
                          style={{ width: `${mfr.review_count > 0 ? (count / mfr.review_count) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-3">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {mfr.website_url && (
              <a href={mfr.website_url} target="_blank" rel="noopener noreferrer" className="block">
                <Button variant="outline" className="w-full gap-2">
                  <Globe className="w-4 h-4" /> Visit Website
                </Button>
              </a>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              Reviews <span className="text-muted-foreground font-normal text-base">({mfr.review_count})</span>
            </h2>
            {!submitted && !showForm && (
              <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5">
                <Star className="w-3.5 h-3.5" /> Write a Review
              </Button>
            )}
          </div>

          {submitted && (
            <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-4 flex items-center gap-3 mb-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <p className="text-sm text-emerald-800 font-medium">Thank you — your review has been published.</p>
            </div>
          )}

          {showForm && (
            <form onSubmit={handleReviewSubmit} className="border rounded-xl p-5 bg-card space-y-4 mb-6">
              <h3 className="font-semibold text-base">Your Review of {mfr.name}</h3>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Rating <span className="text-destructive">*</span></Label>
                <StarRow rating={form.rating} interactive onChange={r => setForm(f => ({ ...f, rating: r }))} />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Your Name <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="Jane Smith"
                    value={form.reviewer_name}
                    onChange={e => setForm(f => ({ ...f, reviewer_name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Company (optional)</Label>
                  <Input
                    placeholder="Acme Pharma Inc."
                    value={form.reviewer_company}
                    onChange={e => setForm(f => ({ ...f, reviewer_company: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Review <span className="text-destructive">*</span></Label>
                <Textarea
                  placeholder="Share your experience with this manufacturer — equipment quality, support, delivery, etc."
                  value={form.comment}
                  onChange={e => setForm(f => ({ ...f, comment: e.target.value }))}
                  rows={4}
                  required
                />
              </div>

              {formError && (
                <p className="text-sm text-destructive flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> {formError}
                </p>
              )}

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={submitReview.isPending}>
                  {submitReview.isPending ? "Submitting..." : "Submit Review"}
                </Button>
              </div>
            </form>
          )}

          {mfr.reviews.length === 0 ? (
            <div className="text-center py-12 border rounded-xl bg-muted/30">
              <Star className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No reviews yet. Be the first to review {mfr.name}.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {mfr.reviews.map(rv => <ReviewCard key={rv.id} review={rv} />)}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
