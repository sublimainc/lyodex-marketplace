import { useState } from "react";
import { Link } from "wouter";
import { useListOperators } from "@workspace/api-client-react";
import { Search, Factory, AlertCircle, Package, Wrench } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLanguage } from "@/lib/i18n";
import { OperatorCard } from "@/components/operator-card";

type RoleFilter = "all" | "operator" | "ingredient_seller" | "service_provider";

const ROLE_TABS: { key: RoleFilter; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "all",               label: "All listings",         icon: Factory },
  { key: "operator",          label: "Freeze-Dry Operators", icon: Factory },
  { key: "ingredient_seller", label: "Ingredient Sellers",   icon: Package },
  { key: "service_provider",  label: "Service Providers",    icon: Wrench  },
];

export default function Operators() {
  const { data: operators, isLoading, error } = useListOperators();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const { t } = useLanguage();
  const o = t.operators;

  const filtered = (operators ?? []).filter((op) => {
    const types: string[] = (op as any).provider_types?.length ? (op as any).provider_types : [op.role];
    if (roleFilter !== "all" && !types.includes(roleFilter)) return false;
    const q = searchTerm.toLowerCase();
    if (!q) return true;
    return (
      op.name.toLowerCase().includes(q) ||
      op.location.toLowerCase().includes(q) ||
      (op.city ?? "").toLowerCase().includes(q) ||
      (op.country ?? "").toLowerCase().includes(q) ||
      op.certifications.some(c => c.toLowerCase().includes(q))
    );
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">{o.title}</h1>
          <p className="text-muted-foreground">{o.subtitle}</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={o.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            data-testid="input-search-operators"
          />
        </div>
      </div>

      {/* Role filter tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        {ROLE_TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setRoleFilter(tab.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                roleFilter === tab.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary/50"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
              {roleFilter === tab.key && operators && (
                <span className="ml-1 opacity-75">
                  ({tab.key === "all" ? operators.length : operators.filter(op => {
                    const types: string[] = (op as any).provider_types?.length ? (op as any).provider_types : [op.role];
                    return types.includes(tab.key);
                  }).length})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{o.errorLoad}</AlertDescription>
        </Alert>
      ) : isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-4"><Skeleton className="h-6 w-2/3" /><Skeleton className="h-4 w-1/3 mt-2" /></CardHeader>
              <CardContent><Skeleton className="h-20 w-full" /></CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((op) => (
            <OperatorCard
              key={op.id}
              op={op}
              viewDetailsLabel={o.viewDetails}
              capacityLabel={o.capacity}
              priceLabel={o.price}
              certsVerifiedLabel={o.certsVerified}
              data-testid={`card-operator-${op.id}`}
            />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              {o.noResults}
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-8 text-center">
        All listings are sourced from publicly available information.{" "}
        <Link href="/trust" className="underline hover:text-foreground transition-colors">
          See our data methodology
        </Link>
        {" "}for verification standards.
      </p>
    </div>
  );
}
