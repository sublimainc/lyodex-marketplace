import { useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Package, Wrench, CheckCircle2, Upload, X, ImageIcon, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useLanguage } from "@/lib/i18n";

type ListingType = "machine" | "parts";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border rounded-xl p-6 bg-card space-y-4">
      <h3 className="font-semibold text-base border-b pb-3">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

export default function MachineryListingForm() {
  const [, navigate] = useLocation();
  const [type, setType] = useState<ListingType>("machine");
  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">("kg");
  const [negotiable, setNegotiable] = useState<"yes" | "no">("yes");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contactEmail, setContactEmail] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();
  const mf = t.machineryForm;

  const [form, setForm] = useState({
    machineName: "",
    capacity: "",
    numTrays: "",
    refrigerantSpecs: "",
    heatingSystem: "",
    heatingSystemOther: "",
    defrostMethod: "",
    defrostOther: "",
    serialNumber: "",
    machineLocation: "",
    compressorBrand: "",
    compressorSpecs: "",
    vacuumPumpSpecs: "",
    boosterSpecs: "",
    condenserSpecs: "",
    batchCapacity: "",
    yearManufacturing: "",
    moreDetails: "",
    priceAsked: "",
    partName: "",
    partBrand: "",
    partYear: "",
    partPrice: "",
    partDescription: "",
    partLocation: "",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));
  const setVal = (k: keyof typeof form) => (v: string) =>
    setForm(f => ({ ...f, [k]: v }));

  function handleImageAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setImages(prev => {
      const combined = [...prev, ...files];
      return combined.slice(0, 10);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeImage(idx: number) {
    setImages(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    // The listing is created with status `pending`; it becomes publicly visible
    // only after an admin approves it in the admin panel.
    const isMachine = type === "machine";

    // Free-text technical fields are stored in technical_specs rather than
    // dropped into an email body, so admins and buyers can actually read them.
    const specs: Record<string, string> = isMachine
      ? {
          capacity: form.capacity ? `${form.capacity} ${weightUnit}/batch` : "",
          batch_capacity: form.batchCapacity ? `${form.batchCapacity} ${weightUnit}` : "",
          trays: form.numTrays,
          refrigerant: form.refrigerantSpecs,
          heating: [form.heatingSystem, form.heatingSystemOther].filter(Boolean).join(" — "),
          defrost: [form.defrostMethod, form.defrostOther].filter(Boolean).join(" — "),
          serial_number: form.serialNumber,
          compressor: [form.compressorBrand, form.compressorSpecs].filter(Boolean).join(" — "),
          vacuum_pump: form.vacuumPumpSpecs,
          booster: form.boosterSpecs,
          condenser: form.condenserSpecs,
          negotiable,
          location: form.machineLocation,
        }
      : {
          brand: form.partBrand,
          negotiable,
          location: form.partLocation,
        };

    // Drop empty values so the specs table stays clean.
    const technical_specs = Object.fromEntries(
      Object.entries(specs).filter(([, v]) => v && v.trim() !== ""),
    );

    const priceRaw = isMachine ? form.priceAsked : form.partPrice;
    const yearRaw = isMachine ? form.yearManufacturing : form.partYear;
    const parsedPrice = parseFloat(String(priceRaw).replace(/[^0-9.]/g, ""));
    const parsedYear = parseInt(String(yearRaw), 10);

    try {
      const res = await fetch(`${BASE}/api/machinery`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: isMachine ? form.machineName : form.partName,
          category: isMachine ? "freeze_dryers" : "parts",
          condition: "used",
          description: isMachine ? form.moreDetails : form.partDescription,
          price: Number.isFinite(parsedPrice) ? parsedPrice : null,
          currency: "CAD",
          manufacturer_name: isMachine ? form.compressorBrand : form.partBrand,
          model_number: isMachine ? form.serialNumber : undefined,
          year_manufactured: Number.isFinite(parsedYear) ? parsedYear : null,
          technical_specs,
          contact_email: contactEmail,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : mf.submitError);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-xl text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold mb-3">{mf.submittedTitle}</h2>
        <p className="text-muted-foreground mb-6">
          {mf.submittedDesc}
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/machinery">
            <Button variant="outline">{mf.backBtn}</Button>
          </Link>
          <Button onClick={() => setSubmitted(false)}>{mf.submitAnother}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <section className="bg-[#0a1628] text-white py-8 px-4">
        <div className="container mx-auto max-w-3xl">
          <Link href="/machinery" className="inline-flex items-center text-sm text-gray-400 hover:text-white mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> {mf.backToMachinery}
          </Link>
          <h1 className="text-3xl font-bold tracking-tight mb-2">{mf.title}</h1>
          <p className="text-gray-400 text-sm">
            {mf.subtitle}
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex gap-3 mb-8">
          {([["machine", mf.typeMachine, Package], ["parts", mf.typeParts, Wrench]] as const).map(([val, label, Icon]) => (
            <button
              key={val}
              type="button"
              onClick={() => setType(val)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 font-semibold text-sm transition-all ${type === val ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {type === "machine" ? (
            <>
              <FieldGroup title={mf.sectionMachineId}>
                <Field label={mf.machineName} required>
                  <Input placeholder={mf.machineNamePlaceholder} value={form.machineName} onChange={set("machineName")} required />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label={mf.capacityPerBatch} required>
                    <div className="flex gap-2">
                      <Input type="number" placeholder="e.g. 80" value={form.capacity} onChange={set("capacity")} required className="flex-1" />
                      <Select value={weightUnit} onValueChange={(v: "kg" | "lbs") => setWeightUnit(v)}>
                        <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kg">kg</SelectItem>
                          <SelectItem value="lbs">lbs</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-muted-foreground">{mf.capacityNote}</p>
                  </Field>
                  <Field label={mf.numTrays} required>
                    <Input type="number" placeholder={mf.numTraysPlaceholder} value={form.numTrays} onChange={set("numTrays")} required />
                  </Field>
                </div>
                <Field label={mf.serialNumber}>
                  <Input placeholder={mf.serialPlaceholder} value={form.serialNumber} onChange={set("serialNumber")} />
                </Field>
                <Field label={mf.yearManufacturing} required>
                  <Input type="number" placeholder={mf.yearPlaceholder} min="1970" max={new Date().getFullYear()} value={form.yearManufacturing} onChange={set("yearManufacturing")} required />
                </Field>
                <Field label={mf.machineLocation} required>
                  <Input placeholder={mf.machineLocationPlaceholder} value={form.machineLocation} onChange={set("machineLocation")} required />
                </Field>
              </FieldGroup>

              <FieldGroup title={mf.sectionTechSpecs}>
                <Field label={mf.refrigerantSpecs}>
                  <Input placeholder={mf.refrigerantPlaceholder} value={form.refrigerantSpecs} onChange={set("refrigerantSpecs")} />
                </Field>
                <Field label={mf.heatingSystem} required>
                  <Select value={form.heatingSystem} onValueChange={setVal("heatingSystem")} required>
                    <SelectTrigger><SelectValue placeholder={mf.heatingSystemPlaceholder} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="electric">{mf.heatingElectric}</SelectItem>
                      <SelectItem value="oil">{mf.heatingOil}</SelectItem>
                      <SelectItem value="microwave">{mf.heatingMicrowave}</SelectItem>
                      <SelectItem value="steam">{mf.heatingSteam}</SelectItem>
                      <SelectItem value="other">{mf.heatingOther}</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.heatingSystem === "other" && (
                    <Input className="mt-2" placeholder={mf.specifyHeating} value={form.heatingSystemOther} onChange={set("heatingSystemOther")} />
                  )}
                </Field>
                <Field label={mf.defrostMethod} required>
                  <Select value={form.defrostMethod} onValueChange={setVal("defrostMethod")} required>
                    <SelectTrigger><SelectValue placeholder={mf.defrostPlaceholder} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="water">{mf.defrostWater}</SelectItem>
                      <SelectItem value="electric">{mf.defrostElectric}</SelectItem>
                      <SelectItem value="reverse_cycle">{mf.defrostReverse}</SelectItem>
                      <SelectItem value="other">{mf.defrostOther}</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.defrostMethod === "other" && (
                    <Input className="mt-2" placeholder={mf.specifyDefrost} value={form.defrostOther} onChange={set("defrostOther")} />
                  )}
                </Field>
              </FieldGroup>

              <FieldGroup title={mf.sectionComponents}>
                <div className="grid grid-cols-2 gap-4">
                  <Field label={mf.compressorBrand}>
                    <Select value={form.compressorBrand} onValueChange={setVal("compressorBrand")}>
                      <SelectTrigger><SelectValue placeholder={mf.compressorBrandPlaceholder} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bitzer">Bitzer</SelectItem>
                        <SelectItem value="refcomp">Refcomp</SelectItem>
                        <SelectItem value="copeland">Copeland</SelectItem>
                        <SelectItem value="carlyle">Carlyle</SelectItem>
                        <SelectItem value="dorin">Dorin</SelectItem>
                        <SelectItem value="mycom">Mycom</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label={mf.compressorSpecs}>
                    <Input placeholder={mf.compressorSpecsPlaceholder} value={form.compressorSpecs} onChange={set("compressorSpecs")} />
                  </Field>
                </div>
                <Field label={mf.vacuumPump}>
                  <Input placeholder={mf.vacuumPumpPlaceholder} value={form.vacuumPumpSpecs} onChange={set("vacuumPumpSpecs")} />
                </Field>
                <Field label={mf.booster}>
                  <Input placeholder={mf.boosterPlaceholder} value={form.boosterSpecs} onChange={set("boosterSpecs")} />
                </Field>
                <Field label={mf.condenser}>
                  <Input placeholder={mf.condenserPlaceholder} value={form.condenserSpecs} onChange={set("condenserSpecs")} />
                </Field>
              </FieldGroup>

              <FieldGroup title={mf.sectionAdditional}>
                <Field label={mf.batchProductCapacity}>
                  <div className="flex gap-2">
                    <Input type="number" placeholder="e.g. 150" value={form.batchCapacity} onChange={set("batchCapacity")} className="flex-1" />
                    <div className="flex items-center text-sm text-muted-foreground px-2">{weightUnit} {mf.ofProduct}</div>
                  </div>
                </Field>
                <Field label={mf.detailedDescription}>
                  <Textarea
                    placeholder={mf.detailedDescriptionPlaceholder}
                    value={form.moreDetails}
                    onChange={set("moreDetails")}
                    rows={5}
                  />
                </Field>
              </FieldGroup>

              <FieldGroup title={mf.sectionPricing}>
                <Field label={mf.askingPrice} required>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input type="number" placeholder="0" className="pl-7" value={form.priceAsked} onChange={set("priceAsked")} required />
                  </div>
                </Field>
                <Field label={mf.priceNegotiable}>
                  <RadioGroup value={negotiable} onValueChange={(v: "yes" | "no") => setNegotiable(v)} className="flex gap-6">
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="yes" id="neg-yes" />
                      <Label htmlFor="neg-yes" className="font-normal">{mf.yes}</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="no" id="neg-no" />
                      <Label htmlFor="neg-no" className="font-normal">{mf.no}</Label>
                    </div>
                  </RadioGroup>
                </Field>
              </FieldGroup>
            </>
          ) : (
            <FieldGroup title={mf.sectionParts}>
              <Field label={mf.partName} required>
                <Input placeholder={mf.partNamePlaceholder} value={form.partName} onChange={set("partName")} required />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label={mf.brandManufacturer} required>
                  <Input placeholder={mf.brandPlaceholder} value={form.partBrand} onChange={set("partBrand")} required />
                </Field>
                <Field label={mf.year} required>
                  <Input type="number" placeholder={mf.yearPlaceholder} min="1970" max={new Date().getFullYear()} value={form.partYear} onChange={set("partYear")} required />
                </Field>
              </div>
              <Field label={mf.askingPrice} required>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input type="number" placeholder="0" className="pl-7" value={form.partPrice} onChange={set("partPrice")} required />
                </div>
              </Field>
              <Field label={mf.partDescription} required>
                <Textarea
                  placeholder={mf.partDescriptionPlaceholder}
                  value={form.partDescription}
                  onChange={set("partDescription")}
                  rows={5}
                  required
                />
              </Field>
              <Field label={mf.partLocation} required>
                <Input placeholder={mf.partLocationPlaceholder} value={form.partLocation} onChange={set("partLocation")} required />
              </Field>
              <Field label={mf.priceNegotiable}>
                <RadioGroup value={negotiable} onValueChange={(v: "yes" | "no") => setNegotiable(v)} className="flex gap-6">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="yes" id="pneg-yes" />
                    <Label htmlFor="pneg-yes" className="font-normal">{mf.yes}</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="no" id="pneg-no" />
                    <Label htmlFor="pneg-no" className="font-normal">{mf.no}</Label>
                  </div>
                </RadioGroup>
              </Field>
            </FieldGroup>
          )}

          <div className="border rounded-xl p-6 bg-card space-y-4">
            <h3 className="font-semibold text-base border-b pb-3 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-muted-foreground" /> Photos
            </h3>
            <p className="text-xs text-muted-foreground">
              Upload up to 10 photos of your {type === "machine" ? "machine" : "part"} (exterior, interior, components, condition). Accepted: JPG, PNG, WEBP.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleImageAdd}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={images.length >= 10}
              className="w-full border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center gap-2 hover:border-primary/50 hover:bg-muted/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Upload className="w-6 h-6 text-muted-foreground" />
              <span className="text-sm font-medium">{images.length >= 10 ? "Maximum 10 photos reached" : "Click to select photos"}</span>
              <span className="text-xs text-muted-foreground">{images.length}/10 selected</span>
            </button>
            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {images.map((file, idx) => (
                  <div key={idx} className="relative group border rounded-lg overflow-hidden bg-muted/40">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="w-full h-24 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <p className="text-[10px] text-muted-foreground truncate px-1.5 py-1">{file.name}</p>
                  </div>
                ))}
              </div>
            )}
            {images.length > 0 && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                {mf.photoFollowUpNote}
              </p>
            )}
          </div>

          <FieldGroup title={mf.sectionContact}>
            <Field label={mf.contactEmail} required>
              <Input
                type="email"
                placeholder={mf.contactEmailPlaceholder}
                value={contactEmail}
                onChange={e => setContactEmail(e.target.value)}
                required
              />
            </Field>
          </FieldGroup>

          {error && (
            <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Link href="/machinery" className="flex-1">
              <Button type="button" variant="outline" className="w-full" disabled={submitting}>{mf.cancel}</Button>
            </Link>
            <Button type="submit" className="flex-1 font-semibold gap-2" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? mf.submitting : mf.submitListing}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {mf.submitNote}
          </p>
        </form>
      </section>
    </div>
  );
}
