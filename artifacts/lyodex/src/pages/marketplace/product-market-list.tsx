import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/lib/i18n";
import { PackagePlus, CheckCircle, ChevronRight } from "lucide-react";

const CATEGORIES = [
  "fruits", "vegetables", "dairy", "powders", "mushrooms",
  "herbs_spices", "candy_snacks", "proteins", "specialty", "other",
];
const CERTS = ["HACCP", "GMP", "Organic", "USDA Organic", "CFIA", "FDA", "SQF", "Kosher", "Halal"];

export default function ProductMarketList() {
  const { t } = useLanguage();
  const pm = t.productMarket;
  const common = t.common;
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [newId, setNewId] = useState("");

  const [form, setForm] = useState({
    title: "", titleFr: "", category: "fruits",
    description: "", descriptionFr: "",
    origin: "", harvestDate: "",
    price: "", currency: "CAD", negotiable: false,
    quantityAvailableKg: "", minOrderKg: "",
    packagingType: "", shelfLifeMonths: "", waterActivity: "",
    certifications: [] as string[],
    tpc: "", coliform: "", ecoli: "", salmonella: "",
    listeria: "", yeastMold: "", lab: "", testedAt: "",
    sellerName: "", sellerCompany: "", sellerEmail: "", sellerPhone: "",
  });

  function set(field: string, value: string | boolean | string[]) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const body = {
        title: form.title, titleFr: form.titleFr,
        category: form.category,
        description: form.description, descriptionFr: form.descriptionFr,
        price: parseFloat(form.price), currency: form.currency, negotiable: form.negotiable,
        quantityAvailableKg: parseFloat(form.quantityAvailableKg),
        minOrderKg: parseFloat(form.minOrderKg),
        city: "", region: "", country: "CA",
        waterActivity: parseFloat(form.waterActivity),
        shelfLifeMonths: parseInt(form.shelfLifeMonths),
        microbiologyTests: {
          tpc: form.tpc, coliform: form.coliform, ecoli: form.ecoli,
          salmonella: form.salmonella, listeria: form.listeria, yeastMold: form.yeastMold,
          lab: form.lab, testedAt: form.testedAt,
        },
        certifications: form.certifications,
        origin: form.origin, packagingType: form.packagingType, harvestDate: form.harvestDate,
        images: [],
        sellerName: form.sellerName, sellerCompany: form.sellerCompany,
        sellerEmail: form.sellerEmail, sellerPhone: form.sellerPhone,
        isVerifiedSeller: false, isFeatured: false, status: "pending",
      };
      const res = await fetch("/api/product-market", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setNewId(data.listing?.id ?? "");
      setSuccess(true);
    } catch {
      // continue
    }
    setSubmitting(false);
  }

  const stepLabels = [pm.step1, pm.step2, pm.step3];

  if (success) {
    return (
      <div className="container mx-auto px-4 py-20 text-center max-w-md">
        <CheckCircle size={56} className="text-[#0F6E56] mx-auto mb-4" />
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">{pm.successTitle}</h1>
        <p className="text-gray-500 mb-6">{pm.successDesc}</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link
            href="/product-market"
            className="bg-[#0F6E56] text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-[#0a5843] transition-colors"
          >
            {pm.backToMarket}
          </Link>
          {newId && (
            <Link
              href={`/product-market/${newId}`}
              className="border border-gray-300 text-gray-700 font-semibold px-5 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t.productMarket.viewDetails}
            </Link>
          )}
        </div>
      </div>
    );
  }

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/30 bg-white";
  const labelCls = "block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5";

  return (
    <div className="container mx-auto px-4 py-10 max-w-xl">
      {/* Header */}
      <div className="text-center mb-8">
        <PackagePlus size={36} className="text-[#0F6E56] mx-auto mb-3" />
        <h1 className="text-2xl font-extrabold text-gray-900">{pm.listingTitle}</h1>
        <p className="text-gray-500 mt-2 text-sm leading-relaxed">{pm.listingSubtitle}</p>
      </div>

      {/* Step indicator */}
      <div className="flex rounded-xl overflow-hidden border border-gray-200 mb-8">
        {stepLabels.map((label, i) => (
          <div
            key={i}
            className={`flex-1 py-3 px-2 text-center text-xs font-semibold flex items-center justify-center gap-1.5 ${
              i < stepLabels.length - 1 ? "border-r border-gray-200" : ""
            } ${
              step === i + 1
                ? "bg-[#0F6E56] text-white"
                : step > i + 1
                ? "bg-[#e0f2fe] text-[#0e7490]"
                : "bg-gray-50 text-gray-400"
            }`}
          >
            {step > i + 1 && <CheckCircle size={12} />}
            {i + 1}. {label}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-7 flex flex-col gap-5">
        {/* Step 1: Product info */}
        {step === 1 && (
          <>
            <div>
              <label className={labelCls}>{pm.titleLabel} (EN)</label>
              <input value={form.title} onChange={e => set("title", e.target.value)} className={inputCls} placeholder="e.g. Freeze-Dried Strawberry Powder" />
            </div>
            <div>
              <label className={labelCls}>{pm.titleLabel} (FR)</label>
              <input value={form.titleFr} onChange={e => set("titleFr", e.target.value)} className={inputCls} placeholder="ex. Poudre de fraise lyophilisée" />
            </div>
            <div>
              <label className={labelCls}>{pm.categoryLabel}</label>
              <select value={form.category} onChange={e => set("category", e.target.value)} className={inputCls}>
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c.replace(/_/g, " & ")}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>{pm.descriptionLabel} (EN)</label>
              <textarea value={form.description} onChange={e => set("description", e.target.value)} className={inputCls} rows={4} placeholder="Describe the product, applications, processing method…" />
            </div>
            <div>
              <label className={labelCls}>{pm.descriptionLabel} (FR)</label>
              <textarea value={form.descriptionFr} onChange={e => set("descriptionFr", e.target.value)} className={inputCls} rows={3} />
            </div>
            <div>
              <label className={labelCls}>{pm.originLabel}</label>
              <input value={form.origin} onChange={e => set("origin", e.target.value)} className={inputCls} placeholder="e.g. Ontario, Canada" />
            </div>
            <div>
              <label className={labelCls}>{pm.harvestDateLabel}</label>
              <input type="date" value={form.harvestDate} onChange={e => set("harvestDate", e.target.value)} className={inputCls} />
            </div>
          </>
        )}

        {/* Step 2: Pricing & stock */}
        {step === 2 && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>{pm.priceLabel}</label>
                <input type="number" value={form.price} onChange={e => set("price", e.target.value)} className={inputCls} placeholder="0.00" min={0} step={0.01} />
              </div>
              <div>
                <label className={labelCls}>{pm.currencyLabel}</label>
                <select value={form.currency} onChange={e => set("currency", e.target.value)} className={inputCls}>
                  <option value="CAD">CAD</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.negotiable}
                onChange={e => set("negotiable", e.target.checked)}
                className="w-4 h-4 accent-[#0F6E56]"
              />
              {pm.negotiableLabel}
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>{pm.qtyLabel}</label>
                <input type="number" value={form.quantityAvailableKg} onChange={e => set("quantityAvailableKg", e.target.value)} className={inputCls} min={1} />
              </div>
              <div>
                <label className={labelCls}>{pm.minOrderLabel}</label>
                <input type="number" value={form.minOrderKg} onChange={e => set("minOrderKg", e.target.value)} className={inputCls} min={1} />
              </div>
            </div>
            <div>
              <label className={labelCls}>{pm.packagingLabel}</label>
              <input value={form.packagingType} onChange={e => set("packagingType", e.target.value)} className={inputCls} placeholder="e.g. 25kg kraft bags with poly liner" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>{pm.shelfLifeLabel}</label>
                <input type="number" value={form.shelfLifeMonths} onChange={e => set("shelfLifeMonths", e.target.value)} className={inputCls} min={1} max={120} />
              </div>
              <div>
                <label className={labelCls}>{pm.awLabel}</label>
                <input type="number" value={form.waterActivity} onChange={e => set("waterActivity", e.target.value)} className={inputCls} min={0} max={1} step={0.01} placeholder="0.08" />
                <p className="text-xs text-gray-400 mt-1">{pm.awHint}</p>
              </div>
            </div>
          </>
        )}

        {/* Step 3: Quality & contact */}
        {step === 3 && (
          <>
            <div>
              <label className={labelCls}>{pm.certsLabel}</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {CERTS.map(cert => (
                  <button
                    key={cert}
                    type="button"
                    onClick={() =>
                      set(
                        "certifications",
                        form.certifications.includes(cert)
                          ? form.certifications.filter(c => c !== cert)
                          : [...form.certifications, cert]
                      )
                    }
                    className={`px-3.5 py-1.5 rounded-full text-[0.8125rem] font-semibold border cursor-pointer transition-colors ${
                      form.certifications.includes(cert)
                        ? "bg-[#e0f2fe] border-[#0e7490] text-[#0e7490]"
                        : "bg-white border-gray-200 text-gray-600 hover:border-gray-400"
                    }`}
                  >
                    {cert}
                  </button>
                ))}
              </div>
            </div>

            <p className="font-bold text-gray-700 text-sm mb-1">{pm.microbiologyLabel}</p>
            <div className="grid grid-cols-2 gap-3">
              {([
                ["tpc", "TPC (e.g. <500 CFU/g)"],
                ["coliform", "Coliform"],
                ["ecoli", "E. coli"],
                ["salmonella", "Salmonella"],
                ["listeria", "Listeria"],
                ["yeastMold", "Yeast & Mold"],
              ] as [string, string][]).map(([field, ph]) => (
                <div key={field}>
                  <label className={labelCls}>{ph}</label>
                  <input
                    value={(form as unknown as Record<string, string>)[field]}
                    onChange={e => set(field, e.target.value)}
                    className={inputCls}
                    placeholder={ph}
                  />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>{pm.labNameLabel}</label>
                <input value={form.lab} onChange={e => set("lab", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{pm.testDateLabel}</label>
                <input type="date" value={form.testedAt} onChange={e => set("testedAt", e.target.value)} className={inputCls} />
              </div>
            </div>

            <hr className="border-gray-100" />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>{pm.sellerNameLabel}</label>
                <input value={form.sellerName} onChange={e => set("sellerName", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{pm.sellerCompanyLabel}</label>
                <input value={form.sellerCompany} onChange={e => set("sellerCompany", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{pm.sellerEmailLabel}</label>
                <input type="email" value={form.sellerEmail} onChange={e => set("sellerEmail", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{pm.sellerPhoneLabel}</label>
                <input type="tel" value={form.sellerPhone} onChange={e => set("sellerPhone", e.target.value)} className={inputCls} />
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-[0.8125rem] text-green-800">
              {pm.reviewNote}
            </div>
          </>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-2 gap-3">
          {step > 1 ? (
            <button
              onClick={() => setStep(s => s - 1)}
              className="border border-gray-300 text-gray-700 font-semibold px-5 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {common.back}
            </button>
          ) : (
            <button
              onClick={() => navigate("/product-market")}
              className="border border-gray-300 text-gray-700 font-semibold px-5 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {common.back}
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              className="bg-[#0F6E56] text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-[#0a5843] transition-colors flex items-center gap-2"
            >
              {common.next} <ChevronRight size={15} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-[#0F6E56] text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-[#0a5843] transition-colors disabled:opacity-60"
            >
              {submitting ? pm.submitting : pm.submitBtn}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
