import { useState, useEffect } from "react";
import { Link, useParams, useLocation } from "wouter";
import { useLanguage } from "@/lib/i18n";
import {
  Package, MapPin, Droplets, Clock, ShieldCheck, ChevronRight,
  Phone, Mail, ArrowLeft, Award, AlertTriangle,
} from "lucide-react";

interface MicrobiologyTests {
  tpc: string; coliform: string; ecoli: string;
  salmonella: string; listeria: string; yeastMold: string;
  lab: string; testedAt: string;
}

interface FDListing {
  id: string;
  title: string; titleFr: string;
  category: string;
  description: string; descriptionFr: string;
  price: number; currency: "CAD" | "USD"; negotiable: boolean;
  quantityAvailableKg: number; minOrderKg: number;
  city: string; region: string; country: "CA" | "US";
  waterActivity: number; shelfLifeMonths: number;
  microbiologyTests: MicrobiologyTests;
  certifications: string[];
  origin: string; packagingType: string; harvestDate: string;
  sellerName: string; sellerCompany: string;
  sellerEmail: string; sellerPhone: string;
  isVerifiedSeller: boolean; isFeatured: boolean;
  viewCount: number; createdAt: string;
}

function awColor(aw: number) {
  if (aw <= 0.05) return "#16a34a";
  if (aw <= 0.15) return "#0F6E56";
  if (aw <= 0.30) return "#d97706";
  return "#dc2626";
}

function awLabel(aw: number, pm: { awExcellent: string; awGood: string; awFair: string; awCheck: string }) {
  if (aw <= 0.05) return pm.awExcellent;
  if (aw <= 0.15) return pm.awGood;
  if (aw <= 0.30) return pm.awFair;
  return pm.awCheck;
}

export default function ProductMarketDetail() {
  const { t, locale } = useLanguage();
  const pm = t.productMarket;
  const isFr = locale === "fr";
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [listing, setListing] = useState<FDListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    fetch(`/api/product-market?id=${params.id}`)
      .then(r => r.json())
      .then(d => {
        if (d.listing) setListing(d.listing);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20 text-center text-gray-400">
        {t.common.loading}
      </div>
    );
  }

  if (notFound || !listing) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <Package size={48} className="text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600 font-semibold mb-4">Product not found</p>
        <Link
          href="/product-market"
          className="inline-flex items-center gap-2 bg-[#0F6E56] text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-[#0a5843] transition-colors"
        >
          <ArrowLeft size={15} /> {pm.backToMarket}
        </Link>
      </div>
    );
  }

  const microbioRows = [
    { label: pm.tpc, value: listing.microbiologyTests.tpc },
    { label: pm.coliform, value: listing.microbiologyTests.coliform },
    { label: pm.ecoli, value: listing.microbiologyTests.ecoli },
    { label: pm.salmonella, value: listing.microbiologyTests.salmonella },
    { label: pm.listeria, value: listing.microbiologyTests.listeria },
    { label: pm.yeastMold, value: listing.microbiologyTests.yeastMold },
  ];

  const specRows = [
    {
      label: pm.waterActivity,
      value: (
        <span style={{ color: awColor(listing.waterActivity), fontWeight: 700 }}>
          {listing.waterActivity.toFixed(2)} — {awLabel(listing.waterActivity, pm)}
        </span>
      ),
    },
    { label: pm.shelfLife, value: `${listing.shelfLifeMonths} ${pm.months}` },
    {
      label: pm.harvestDate,
      value: new Date(listing.harvestDate).toLocaleDateString(locale === "fr" ? "fr-CA" : "en-CA"),
    },
    { label: pm.origin, value: listing.origin },
    { label: pm.packagingType, value: listing.packagingType },
    { label: pm.minOrder, value: `${listing.minOrderKg} kg` },
    {
      label: isFr ? "Stock disponible" : "Stock available",
      value: `${listing.quantityAvailableKg} kg`,
    },
  ];

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 pt-6 pb-16">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[0.8125rem] text-gray-400 mb-5">
          <Link href="/" className="hover:text-gray-600 transition-colors">
            {isFr ? "Accueil" : "Home"}
          </Link>
          <ChevronRight size={12} />
          <Link href="/product-market" className="hover:text-gray-600 transition-colors">
            {pm.label}
          </Link>
          <ChevronRight size={12} />
          <span className="text-gray-700">{isFr && listing.titleFr ? listing.titleFr : listing.title}</span>
        </nav>

        <button
          onClick={() => navigate("/product-market")}
          className="inline-flex items-center gap-1.5 text-[#0F6E56] font-semibold text-sm mb-6 hover:underline cursor-pointer"
        >
          <ArrowLeft size={15} /> {pm.backToMarket}
        </button>

        {/* Trust banner — non-verified seller */}
        {!listing.isVerifiedSeller && (
          <div className="mb-6 bg-amber-50 border border-amber-300 rounded-xl p-4 flex gap-3">
            <AlertTriangle size={20} className="text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold text-amber-800 text-sm mb-1">{pm.unverifiedTitle}</p>
              <p className="text-amber-700 text-[0.8125rem] leading-relaxed">{pm.unverifiedDisclaimer}</p>
            </div>
          </div>
        )}

        {/* Verified seller banner */}
        {listing.isVerifiedSeller && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
            <ShieldCheck size={20} className="text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold text-blue-800 text-sm mb-0.5">{pm.verifiedSeller}</p>
              <p className="text-blue-700 text-[0.8125rem] leading-relaxed">{pm.verifiedNote}</p>
            </div>
          </div>
        )}

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 items-start">
          {/* Left column */}
          <div className="flex flex-col gap-6">
            {/* Image */}
            <div className="h-64 bg-gradient-to-br from-[#e0f2fe] to-[#dcfce7] rounded-2xl flex items-center justify-center">
              <Package size={64} className="text-[#0F6E56] opacity-25" />
            </div>

            {/* Title + meta */}
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-3">
                {isFr && listing.titleFr ? listing.titleFr : listing.title}
              </h1>
              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} /> {listing.city}, {listing.region} · {listing.country}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={14} /> {listing.shelfLifeMonths}mo {pm.shelfLife.toLowerCase()}
                </span>
                <span
                  className="flex items-center gap-1.5 font-semibold"
                  style={{ color: awColor(listing.waterActivity) }}
                >
                  <Droplets size={14} /> AW {listing.waterActivity.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white border border-gray-100 rounded-xl p-5">
              <p className="text-gray-700 leading-relaxed">
                {isFr && listing.descriptionFr ? listing.descriptionFr : listing.description}
              </p>
            </div>

            {/* Technical specs */}
            <div className="border border-gray-100 rounded-xl overflow-hidden bg-white">
              <div className="bg-gray-50 px-5 py-3.5 flex items-center gap-2 border-b border-gray-100">
                <Award size={17} className="text-[#0F6E56]" />
                <h2 className="font-bold text-[0.9375rem] text-gray-900">{pm.technicalSpecs}</h2>
              </div>
              <table className="w-full">
                <tbody>
                  {specRows.map((row, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-5 py-3 text-[0.8125rem] text-gray-500 w-2/5">{row.label}</td>
                      <td className="px-5 py-3 text-sm text-gray-900 font-medium">{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Microbiology */}
            <div className="border border-gray-100 rounded-xl overflow-hidden bg-white">
              <div className="bg-gray-50 px-5 py-3.5 flex items-center gap-2 border-b border-gray-100">
                <span className="text-[#0F6E56] font-bold text-lg">M</span>
                <h2 className="font-bold text-[0.9375rem] text-gray-900">{pm.microbiologyTests}</h2>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-5 py-2.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wide">
                      {isFr ? "Paramètre" : "Parameter"}
                    </th>
                    <th className="px-5 py-2.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wide">
                      {isFr ? "Résultat" : "Result"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {microbioRows.map((row, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-5 py-3 text-[0.8125rem] text-gray-500">{row.label}</td>
                      <td className="px-5 py-3 text-sm text-gray-900 font-semibold">{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
                {pm.testedAt}: {listing.microbiologyTests.lab} · {new Date(listing.microbiologyTests.testedAt).toLocaleDateString()}
                <br />{pm.microbiologyNote}
              </div>
            </div>

            {/* Certifications */}
            {listing.certifications.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {listing.certifications.map(cert => (
                  <span
                    key={cert}
                    className="bg-[#e0f2fe] text-[#0e7490] font-bold text-[0.8125rem] px-3.5 py-1.5 rounded-full flex items-center gap-1.5"
                  >
                    <ShieldCheck size={13} /> {cert}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Right sticky column */}
          <div className="flex flex-col gap-4 lg:sticky lg:top-24">
            {/* Price card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-md">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-3xl font-extrabold text-gray-900">${listing.price}</span>
                <span className="text-gray-500 font-medium">{listing.currency}{pm.perKg}</span>
              </div>
              {listing.negotiable && (
                <p className="text-[#0F6E56] text-[0.8125rem] font-semibold mb-3">{pm.negotiable}</p>
              )}
              <div className="bg-gray-50 rounded-xl p-4 mb-4 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">{pm.minOrder}</span>
                  <span className="font-bold">{listing.minOrderKg} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{isFr ? "En stock" : "In stock"}</span>
                  <span
                    className="font-bold"
                    style={{
                      color: listing.quantityAvailableKg > 200
                        ? "#16a34a"
                        : listing.quantityAvailableKg > 50
                        ? "#d97706"
                        : "#dc2626",
                    }}
                  >
                    {listing.quantityAvailableKg} kg
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2.5">
                <Link
                  href={`/request?product=${encodeURIComponent(listing.title)}`}
                  className="block text-center w-full bg-[#0F6E56] text-white font-semibold py-2.5 rounded-lg hover:bg-[#0a5843] transition-colors"
                >
                  {pm.requestQuote}
                </Link>
                <a
                  href={`mailto:${listing.sellerEmail}?subject=Inquiry: ${listing.title}`}
                  className="block text-center w-full border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {pm.contactSeller}
                </a>
              </div>
            </div>

            {/* Seller card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#e0f2fe] flex items-center justify-center font-extrabold text-[#0F6E56] text-lg shrink-0">
                  {listing.sellerCompany[0]}
                </div>
                <div>
                  <p className="font-bold text-gray-900 flex items-center gap-1.5">
                    {listing.sellerCompany}
                    {listing.isVerifiedSeller && (
                      <ShieldCheck size={15} className="text-blue-500" />
                    )}
                    {!listing.isVerifiedSeller && (
                      <AlertTriangle size={15} className="text-amber-500" />
                    )}
                  </p>
                  <p className="text-[0.8125rem] text-gray-400">{listing.sellerName}</p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[0.8125rem] text-gray-500 flex items-center gap-1.5">
                  <MapPin size={13} /> {listing.city}, {listing.region}
                </p>
                <a
                  href={`tel:${listing.sellerPhone}`}
                  className="text-[0.8125rem] text-[#0F6E56] flex items-center gap-1.5 hover:underline"
                >
                  <Phone size={13} /> {listing.sellerPhone}
                </a>
                <a
                  href={`mailto:${listing.sellerEmail}`}
                  className="text-[0.8125rem] text-[#0F6E56] flex items-center gap-1.5 hover:underline break-all"
                >
                  <Mail size={13} /> {listing.sellerEmail}
                </a>
              </div>

              {/* Seller trust status */}
              {listing.isVerifiedSeller ? (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 flex items-center gap-2 text-xs font-semibold text-blue-700">
                  <ShieldCheck size={14} /> {pm.verifiedSeller}
                </div>
              ) : (
                <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-start gap-2 text-xs text-amber-700">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  <span className="font-semibold">{pm.unverifiedTitle}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
