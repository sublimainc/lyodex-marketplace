import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Package, Search, Mail, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Product {
  id: number;
  operator_name: string;
  name: string;
  material_type: string;
  weight_kg: number;
  moisture_pct?: number | null;
  price_per_unit: number;
  moq: number;
  description?: string | null;
  contact_email: string;
  available: boolean;
}

const MATERIAL_FILTERS = [
  "all", "Berries", "Coffee", "Pharmaceutical", "Biotech", "Food", "Herbs", "Dairy"
];

function InquiryModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", quantity: "", message: "" });
  const [sent, setSent] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();
  const s = t.shop;

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSend = () => {
    if (!form.name || !form.email || !form.quantity) {
      toast({ title: s.fillRequired, variant: "destructive" });
      return;
    }
    const subject = encodeURIComponent(`Inquiry: ${product.name}`);
    const body = encodeURIComponent(
      `Hello,\n\nI am interested in purchasing ${product.name}.\n\nQuantity requested: ${form.quantity} unit(s)\nContact name: ${form.name}\nContact email: ${form.email}\n\nAdditional notes:\n${form.message || "(none)"}\n\nPlease get in touch to discuss pricing and availability.\n\nThank you.`
    );
    window.open(`mailto:${product.contact_email}?subject=${subject}&body=${body}`, "_blank");
    setSent(true);
    toast({ title: s.inquirySentToast, description: `${s.inquirySentToastDesc} ${product.operator_name}.` });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="font-bold text-lg">{s.inquiryTitle}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{product.name} {s.by} {product.operator_name}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X className="w-5 h-5" /></button>
        </div>

        {sent ? (
          <div className="p-8 text-center">
            <Mail className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">{s.inquirySentTitle}</h3>
            <p className="text-sm text-muted-foreground mb-6">{s.inquirySentDesc} {product.operator_name} {s.at} {product.contact_email}.</p>
            <Button onClick={onClose} className="w-full">{s.done}</Button>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">{s.yourName} *</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder={s.namePlaceholder}
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{s.yourEmail} *</label>
                <input
                  type="email"
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder={s.contactEmailPlaceholder}
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{s.quantityUnits} *</label>
              <input
                type="number"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder={`Min ${product.moq} ${product.moq !== 1 ? s.units : s.unit}`}
                value={form.quantity}
                onChange={(e) => set("quantity", e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">{s.minOrderNote} {product.moq} {product.moq !== 1 ? s.units : s.unit} · ${product.price_per_unit}{s.perUnit}</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{s.messageOptional}</label>
              <textarea
                rows={3}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                placeholder={s.messagePlaceholder}
                value={form.message}
                onChange={(e) => set("message", e.target.value)}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="ghost" className="flex-1" onClick={onClose}>{s.cancel}</Button>
              <Button className="flex-1 gap-2" onClick={handleSend}>
                <Mail className="w-4 h-4" /> {s.sendInquiry}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProductCard({ product, onInquire }: { product: Product; onInquire: () => void }) {
  const { t } = useLanguage();
  const s = t.shop;

  return (
    <Card className="hover:border-primary/40 transition-colors overflow-hidden flex flex-col">
      <div className="bg-muted/40 h-36 flex items-center justify-center border-b">
        <Package className="w-14 h-14 text-muted-foreground/30" />
      </div>
      <CardContent className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold leading-tight">{product.name}</h3>
          <Badge variant="outline" className="text-[10px] shrink-0">{product.material_type}</Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-3">{product.operator_name}</p>
        {product.description && (
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{product.description}</p>
        )}
        <div className="mt-auto space-y-2">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <span className="font-bold text-primary">${product.price_per_unit}<span className="text-xs font-normal text-muted-foreground">{s.perUnit}</span></span>
            <span className="text-muted-foreground">{product.weight_kg} {s.kgPerUnit}</span>
            {product.moisture_pct != null && <span className="text-muted-foreground">{product.moisture_pct}{s.moisture}</span>}
          </div>
          <p className="text-xs text-muted-foreground">{s.minOrder} {product.moq} {product.moq !== 1 ? s.units : s.unit}</p>
          <Button className="w-full gap-2 mt-1" size="sm" onClick={onInquire}>
            <Mail className="w-3.5 h-3.5" /> {s.inquire}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Shop() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [inquiryProduct, setInquiryProduct] = useState<Product | null>(null);
  const { t } = useLanguage();
  const s = t.shop;

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/login");
    }
  }, [user, authLoading]);

  const fetchProducts = (material: string) => {
    setLoading(true);
    const qs = material !== "all" ? `?material=${encodeURIComponent(material)}` : "";
    fetch(`${BASE}/api/marketplace/products${qs}`)
      .then((r) => r.json())
      .then(setProducts)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProducts(filter); }, [filter]);

  const visible = products.filter((p) =>
    search
      ? p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.operator_name.toLowerCase().includes(search.toLowerCase()) ||
        p.material_type.toLowerCase().includes(search.toLowerCase())
      : true
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {inquiryProduct && <InquiryModal product={inquiryProduct} onClose={() => setInquiryProduct(null)} />}

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-1">{s.title}</h1>
        <p className="text-muted-foreground">{s.subtitle}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={s.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {MATERIAL_FILTERS.map((m, i) => (
            <button
              key={m}
              onClick={() => setFilter(m)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors capitalize ${filter === m ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:border-primary"}`}
            >
              {s.materialFilters[i]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-72" />)}
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-20 border rounded-xl bg-muted/10">
          <Package className="w-14 h-14 text-muted-foreground mx-auto mb-4 opacity-30" />
          <h3 className="font-semibold text-lg mb-2">{s.noProductsTitle}</h3>
          <p className="text-muted-foreground text-sm">
            {search || filter !== "all" ? s.noProductsFiltered : s.noProductsEmpty}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {visible.map((p) => (
            <ProductCard key={p.id} product={p} onInquire={() => setInquiryProduct(p)} />
          ))}
        </div>
      )}
    </div>
  );
}
