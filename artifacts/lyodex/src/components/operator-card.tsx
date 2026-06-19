import { Link } from "wouter";
import { MapPin, Factory, ShieldCheck, Globe, Package, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export interface OperatorCardData {
  id?: number | null;
  name: string;
  location: string;
  city?: string | null;
  country?: string | null;
  available?: boolean | null;
  role?: string | null;
  verification_status?: string | null;
  description?: string | null;
  capacity_kg?: number | null;
  price_per_kg?: number | null;
  certifications?: string[];
  verified_certifications?: string[];
  website_url?: string | null;
}

const VERIFICATION_BADGE: Record<string, { label: string; className: string }> = {
  verified:           { label: "Verified",           className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  partially_verified: { label: "Partially Verified", className: "bg-amber-100 text-amber-800 border-amber-200"   },
  not_verified:       { label: "Not Verified",       className: "bg-slate-100 text-slate-600 border-slate-200"   },
};

const ROLE_LABEL: Record<string, string> = {
  operator:           "Freeze-Dry Operator",
  ingredient_seller:  "Ingredient Seller",
  machinery_supplier: "Service Provider",
  service_provider:   "Service Provider",
};

interface Props {
  op: OperatorCardData;
  viewDetailsLabel?: string;
  availableLabel?: string;
  capacityLabel?: string;
  priceLabel?: string;
  certsVerifiedLabel?: string;
  preview?: boolean;
  "data-testid"?: string;
}

export function OperatorCard({
  op,
  viewDetailsLabel   = "View Details",
  availableLabel     = "Available",
  capacityLabel      = "Capacity",
  priceLabel         = "Base Price",
  certsVerifiedLabel = "certs verified",
  preview            = false,
  "data-testid": dataTestId,
}: Props) {
  const verif        = VERIFICATION_BADGE[op.verification_status ?? "not_verified"] ?? VERIFICATION_BADGE.not_verified;
  const isMachinery  = op.role === "machinery_supplier";
  const isIngredient = op.role === "ingredient_seller";
  const certs        = op.certifications ?? [];
  const verifiedCerts = op.verified_certifications ?? [];

  return (
    <Card
      data-testid={dataTestId}
      className={`flex flex-col ${preview ? "" : "hover:border-primary/50 transition-colors"}`}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg mb-1 leading-snug">
              {op.name || <span className="text-muted-foreground italic">Facility name</span>}
            </CardTitle>
            <div className="flex items-center text-sm text-muted-foreground gap-1">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {op.city ? `${op.city}, ` : ""}
                {(op.country ?? op.location) || <span className="italic">Location</span>}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {op.available && !isMachinery && !isIngredient ? (
              <Badge variant="default" className="bg-emerald-600 text-[10px]">{availableLabel}</Badge>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <Badge className={`border text-[10px] px-1.5 py-0.5 ${verif.className}`}>
            {op.verification_status === "verified" && <ShieldCheck className="w-3 h-3 mr-0.5 inline" />}
            {verif.label}
          </Badge>
          {op.role && op.role !== "operator" && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 text-muted-foreground">
              {ROLE_LABEL[op.role] ?? op.role}
            </Badge>
          )}
          {op.country && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 text-muted-foreground">
              {op.country}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 pb-3">
        {op.description && (
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{op.description}</p>
        )}

        {!isMachinery && !isIngredient && (op.capacity_kg ?? 0) > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
            <div>
              <div className="text-muted-foreground mb-0.5 text-xs">{capacityLabel}</div>
              <div className="font-semibold flex items-center gap-1">
                <Factory className="h-3.5 w-3.5 text-primary" /> {op.capacity_kg} kg
              </div>
            </div>
            <div>
              <div className="text-muted-foreground mb-0.5 text-xs">{priceLabel}</div>
              <div className="font-semibold text-primary">${op.price_per_kg}/kg</div>
            </div>
          </div>
        )}

        {certs.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {certs.map(cert => (
              <Badge key={cert} variant="outline" className="text-xs bg-muted/50">{cert}</Badge>
            ))}
          </div>
        )}

        {verifiedCerts.length > 0 && op.id && !preview && (
          <Link
            href={`/operators/${op.id}#certifications`}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 transition-colors"
          >
            <ShieldCheck className="h-3 w-3 shrink-0" />
            {verifiedCerts.length}/{certs.length} {certsVerifiedLabel}
          </Link>
        )}

        {verifiedCerts.length > 0 && preview && (
          <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
            <ShieldCheck className="h-3 w-3 shrink-0" />
            {verifiedCerts.length}/{certs.length} {certsVerifiedLabel}
          </span>
        )}

        {op.website_url && (() => {
          try {
            const hostname = new URL(op.website_url).hostname.replace(/^www\./, "");
            return (
              <a
                href={op.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                onClick={e => e.stopPropagation()}
              >
                <Globe className="h-3 w-3 shrink-0" />
                {hostname}
              </a>
            );
          } catch {
            return null;
          }
        })()}
      </CardContent>

      <CardFooter className="pt-0 border-t mt-auto">
        {preview || !op.id ? (
          <Button variant="secondary" className="w-full mt-4" disabled>
            {viewDetailsLabel}
          </Button>
        ) : (
          <Link href={`/operators/${op.id}`} className="w-full mt-4" data-testid={dataTestId ? `link-operator-${op.id}` : undefined}>
            <Button variant="secondary" className="w-full">{viewDetailsLabel}</Button>
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}
