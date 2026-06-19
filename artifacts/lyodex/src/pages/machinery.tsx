import { useState } from "react";
import { Search, Grid3X3, List, Plus } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/lib/i18n";

export default function Machinery() {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const { t } = useLanguage();
  const m = t.machinery;

  const [categoryIdx, setCategoryIdx] = useState("0");
  const [regionIdx, setRegionIdx] = useState("0");
  const [sortIdx, setSortIdx] = useState("0");

  return (
    <div className="flex flex-col min-h-screen">
      <section className="bg-[#0a1628] text-white py-10 px-4">
        <div className="container mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold tracking-widest uppercase text-primary mb-2">{m.tag}</div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
              {m.title}
            </h1>
            <p className="text-gray-400 text-sm max-w-xl leading-relaxed">
              {m.subtitle}
            </p>
          </div>
          <Link href="/machinery/list">
            <Button className="shrink-0 gap-2 font-semibold">
              <Plus className="w-4 h-4" /> {m.listEquipment}
            </Button>
          </Link>
        </div>
      </section>

      <section className="border-b bg-background sticky top-14 z-30">
        <div className="container mx-auto px-4 py-3 flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={m.searchPlaceholder}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={categoryIdx} onValueChange={setCategoryIdx}>
            <SelectTrigger className="w-auto min-w-36 h-9 text-sm">
              <SelectValue>{m.categories[parseInt(categoryIdx)]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {m.categories.map((c, i) => <SelectItem key={i} value={String(i)}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={regionIdx} onValueChange={setRegionIdx}>
            <SelectTrigger className="w-auto min-w-40 h-9 text-sm">
              <SelectValue>{m.regions[parseInt(regionIdx)]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {m.regions.map((r, i) => <SelectItem key={i} value={String(i)}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortIdx} onValueChange={setSortIdx}>
            <SelectTrigger className="w-auto min-w-36 h-9 text-sm">
              <SelectValue>{m.sortOptions[parseInt(sortIdx)]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {m.sortOptions.map((s, i) => <SelectItem key={i} value={String(i)}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex items-center border rounded-md overflow-hidden">
            <button
              onClick={() => setView("grid")}
              className={`p-2 transition-colors ${view === "grid" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("list")}
              className={`p-2 border-l transition-colors ${view === "list" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-6">
        <p className="text-sm text-muted-foreground mb-8">
          <span className="font-semibold text-foreground">0</span> {m.listingsCount} &nbsp;·&nbsp;
          <span className="text-primary font-medium">0 CA</span> &nbsp;·&nbsp;
          <span className="text-blue-500 font-medium">0 US</span>
        </p>

        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-full bg-muted/60 flex items-center justify-center mb-6">
            <Search className="w-9 h-9 text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-semibold mb-2">{m.noMatchTitle}</h3>
          <p className="text-muted-foreground text-sm max-w-xs">
            {m.noMatchDesc}
          </p>
        </div>
      </section>

      <section className="mt-auto bg-[#0a1628] text-white py-16 text-center">
        <div className="container mx-auto px-4 max-w-2xl">
          <h2 className="text-2xl font-bold mb-3">{m.ctaTitle}</h2>
          <p className="text-gray-400 text-sm mb-6">
            {m.ctaSubtitle}
          </p>
          <Link href="/machinery/list">
            <Button className="gap-2 font-semibold">
              <Plus className="w-4 h-4" /> {m.listEquipment}
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
