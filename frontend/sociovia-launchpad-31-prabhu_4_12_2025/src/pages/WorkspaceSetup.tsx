import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Trash,
  ImageIcon,
  LayoutDashboard,
  Save,
  Wand2,
  Globe,
  MapPin,
  Briefcase,
  Users,
  Target,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Building2,
  Megaphone
} from "lucide-react";
import logoImg from "@/assets/sociovia_logo.png";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

// ---------- Types ---------- //
type Competitor = { id: string; name: string; website?: string };
type SocialLink = { id: string; platform: string; url: string };

type AddressInfo = {
  address_line: string;
  city: string;
  district: string;
  pin_code: string;
  country: string;
};

type WorkspaceForm = {
  business_name: string;
  business_type: "Pvt Ltd" | "Sole Proprietorship" | "Partnership" | "Public" | string;
  address: AddressInfo;
  b2b_b2c: "B2B" | "B2C";
  industry: string;
  describe_business: string;
  describe_audience: string;
  website?: string;
  direct_competitors: Competitor[];
  indirect_competitors: Competitor[];
  social_links: SocialLink[];
  usp: string;
  additional_remarks?: string;
};

// --------- Utilities ---------- //
const uid = () => String(Date.now()) + Math.random().toString(36).slice(2, 7);
const MIN_DESC_CHARS = 100;

function mapToBusinessType(candidate?: string | null): WorkspaceForm["business_type"] | null {
  if (!candidate) return null;
  const s = candidate.toString().toLowerCase();
  if (s.includes("private limited") || s.includes("pvt ltd")) return "Pvt Ltd";
  if (s.includes("proprietor")) return "Sole Proprietorship";
  if (s.includes("partnership")) return "Partnership";
  if (s.includes("public")) return "Public";
  return null;
}

function makeCompetitors(arr: any[] = []): Competitor[] {
  const items = Array.isArray(arr) && arr.length ? arr.slice() : [];
  while (items.length < 2) items.push({ name: "", website: "" });
  return items.map((it: any) => ({
    id: uid(),
    name: (it?.name || it?.title || "")?.toString() || "",
    website: it?.website || it?.url || ""
  }));
}

function guessPlatformFromUrl(url: string | undefined) {
  if (!url) return "Social";
  const u = url.toLowerCase();
  if (u.includes("youtube")) return "YouTube";
  if (u.includes("linkedin")) return "LinkedIn";
  if (u.includes("facebook")) return "Facebook";
  if (u.includes("twitter") || u.includes("x.com")) return "Twitter";
  if (u.includes("instagram")) return "Instagram";
  return "Social";
}

function mapSocials(links: any[] = []): SocialLink[] {
  if (!Array.isArray(links)) return [];
  return links.map((l) => ({
    id: uid(),
    platform: (l?.platform || guessPlatformFromUrl(l?.url || l?.website)).toString(),
    url: (l?.url || l?.website || "").toString()
  }));
}

async function fetchImageAsFile(url: string, filename = "logo.png"): Promise<File | null> {
  try {
    const resp = await fetch(url, { mode: "cors" });
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return new File([blob], filename, { type: blob.type || "image/png" });
  } catch (err) {
    console.warn("fetchImageAsFile failed", err);
    return null;
  }
}

const emptyWorkspaceForm = (): WorkspaceForm => ({
  business_name: "",
  business_type: "Pvt Ltd",
  address: { address_line: "", city: "", district: "", pin_code: "", country: "India" },
  b2b_b2c: "B2C",
  industry: "",
  describe_business: "",
  describe_audience: "",
  website: "",
  direct_competitors: [
    { id: uid(), name: "", website: "" },
    { id: uid(), name: "", website: "" },
  ],
  indirect_competitors: [
    { id: uid(), name: "", website: "" },
    { id: uid(), name: "", website: "" },
  ],
  social_links: [],
  usp: "",
  additional_remarks: "",
});

function parseWorkspaceToForm(ws: any): WorkspaceForm {
  const workspace = ws?.workspace ?? ws ?? {};
  const businessTypeCandidate = workspace?.business_type || workspace?.company_type || null;
  const mappedType = mapToBusinessType(businessTypeCandidate) ?? (workspace?.business_type === "Public Corporation" ? "Public" : "Pvt Ltd");

  const parseAddress = (): AddressInfo => {
    const addr = workspace?.address ?? {};
    return {
      address_line: addr?.address_line ?? workspace?.address_line ?? "",
      city: addr?.city ?? workspace?.city ?? "",
      district: addr?.district ?? workspace?.district ?? "",
      pin_code: addr?.pin_code ?? workspace?.pin_code ?? "",
      country: addr?.country ?? workspace?.country ?? "India",
    };
  };

  return {
    business_name: workspace?.business_name ?? workspace?.name ?? "",
    business_type: mappedType ?? "Pvt Ltd",
    address: parseAddress(),
    b2b_b2c: (workspace?.b2b_b2c ?? "B2C") as "B2B" | "B2C",
    industry: workspace?.industry ?? workspace?.sector ?? "",
    describe_business: workspace?.describe_business ?? workspace?.description ?? "",
    describe_audience: workspace?.describe_audience ?? workspace?.audience_description ?? "",
    website: workspace?.website ?? workspace?.site ?? "",
    direct_competitors: makeCompetitors(workspace?.direct_competitors ?? workspace?.competitors ?? []),
    indirect_competitors: makeCompetitors(workspace?.indirect_competitors ?? workspace?.indirect_competitors ?? []),
    social_links: mapSocials(workspace?.social_links ?? workspace?.social ?? []),
    usp: workspace?.usp ?? workspace?.one_sentence_tagline ?? "",
    additional_remarks: workspace?.additional_remarks ?? workspace?.remarks ?? ""
  };
}

// ---------- Main Component ---------- //

export default function WorkspaceSetup(): JSX.Element {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<WorkspaceForm>(emptyWorkspaceForm());

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [creatives, setCreatives] = useState<File[]>([]);
  const [creativePreviews, setCreativePreviews] = useState<string[]>([]);

  const [activeTab, setActiveTab] = useState("generals");

  const logoRef = useRef<HTMLInputElement | null>(null);
  const creativesRef = useRef<HTMLInputElement | null>(null);

  // AI State
  const [aiLoading, setAiLoading] = useState(false);

  // --- Effects --- //
  useEffect(() => {
    return () => {
      if (logoPreview && logoPreview.startsWith("blob:")) URL.revokeObjectURL(logoPreview);
      creativePreviews.forEach(u => { if (u.startsWith("blob:")) URL.revokeObjectURL(u); });
    };
  }, [logoPreview, creativePreviews]);

  const handleLogoSelect = (f?: File | null) => {
    if (f) {
      setLogoFile(f);
      const u = URL.createObjectURL(f);
      setLogoPreview(u);
    } else {
      setLogoFile(null);
      setLogoPreview(null);
    }
  };

  const handleCreativesSelect = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).slice(0, 8);
    setCreatives(arr);
    const urls = arr.map(f => URL.createObjectURL(f));
    setCreativePreviews(urls);
  };

  // --- Actions --- //
  const updateCompetitor = (which: "direct_competitors" | "indirect_competitors", id: string, patch: Partial<Competitor>) =>
    setForm(s => ({ ...s, [which]: s[which].map(c => c.id === id ? { ...c, ...patch } : c) }));

  const addCompetitor = (which: "direct_competitors" | "indirect_competitors") =>
    setForm(s => ({ ...s, [which]: [...s[which], { id: uid(), name: "", website: "" }] }));

  const removeCompetitor = (which: "direct_competitors" | "indirect_competitors", id: string) =>
    setForm(s => ({ ...s, [which]: s[which].filter(c => c.id !== id) }));

  const updateSocial = (id: string, patch: Partial<SocialLink>) =>
    setForm(s => ({ ...s, social_links: s.social_links.map(sl => sl.id === id ? { ...sl, ...patch } : sl) }));

  const addSocial = () => setForm(s => ({ ...s, social_links: [...s.social_links, { id: uid(), platform: "", url: "" }] }));
  const removeSocial = (id: string) => setForm(s => ({ ...s, social_links: s.social_links.filter(sl => sl.id !== id) }));

  const onChangeField = (k: keyof WorkspaceForm, v: any) => setForm(s => ({ ...s, [k]: v }));

  // --- AI Logic --- //
  const API_BASE = (import.meta.env.VITE_API_BASE ?? "").toString().replace(/\/$/, "");

  async function loadFromResponse(resp: any) {
    if (!resp) return;
    try {
      let workspaceObj: any = null;
      if (resp.parsed_json?.workspace) workspaceObj = resp.parsed_json.workspace;
      else if (resp.workspace) workspaceObj = resp.workspace;
      else if (resp.parsed_json?.product?.workspace) workspaceObj = resp.parsed_json.product.workspace;
      else if (resp.parsed_json && typeof resp.parsed_json === "object") workspaceObj = resp.parsed_json;
      else workspaceObj = resp;

      const parsedForm = parseWorkspaceToForm(workspaceObj);
      setForm(parsedForm);

      const candidateLogoUrl = workspaceObj?.logo_url || workspaceObj?.logo || (resp.snapshot_urls && resp.snapshot_urls[0]) || null;
      if (candidateLogoUrl && typeof candidateLogoUrl === "string" && candidateLogoUrl.startsWith("http")) {
        // Try fetch
        const fetched = await fetchImageAsFile(candidateLogoUrl, "imported-logo.png");
        if (fetched) {
          handleLogoSelect(fetched);
        } else {
          setLogoPreview(candidateLogoUrl); // Fallback to URL preview
          setLogoFile(null);
        }
      }
      toast({ title: "Analysis Complete", description: "Your workspace has been populated with AI insights.", className: "bg-green-50 border-green-200" });
    } catch (err) {
      console.warn("loadFromResponse failed", err);
      toast({ title: "Import warning", description: "Some fields couldn't be auto-filled.", variant: "destructive" });
    }
  }

  async function handleGenerateFromAI() {
    const url = (form.website || "").trim();
    if (!url) {
      toast({ title: "Input Required", description: "Please enter your business website URL.", variant: "destructive" });
      return;
    }
    setAiLoading(true);
    try {
      const res = await fetch(`${API_BASE}/generate_workspace`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, max_snapshots: 5 }),
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const body = await res.json();
      if (!body.ok) throw new Error(body.error || "Unknown error");
      await loadFromResponse(body);
    } catch (err) {
      console.error("AI Gen Error", err);
      toast({ title: "AI Analysis Failed", description: "We couldn't scrape that site. Please fill details manually.", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  }

  const validate = (): string | null => {
    if (!form.business_name.trim()) return "Business Name is required";
    if (!form.describe_business.trim() || form.describe_business.length < MIN_DESC_CHARS) return `Description is too short (min ${MIN_DESC_CHARS} chars)`;

    // Address Validation
    if (!form.address.address_line.trim()) return "Address Line is required";
    if (!form.address.city.trim()) return "City is required";
    if (!form.address.pin_code.trim()) return "Pin Code is required";

    // Competitor Validation
    const validDirect = form.direct_competitors.filter(c => c.name.trim().length > 0);
    if (validDirect.length < 2) return "Please list at least 2 direct competitors";

    const validIndirect = form.indirect_competitors.filter(c => c.name.trim().length > 0);
    if (validIndirect.length < 2) return "Please list at least 2 indirect competitors";

    return null;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const err = validate();
    if (err) {
      toast({ title: "Check Fields", description: err, variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      // Serialize objects
      fd.append("address", JSON.stringify(form.address));
      fd.append("direct_competitors", JSON.stringify(form.direct_competitors));
      fd.append("indirect_competitors", JSON.stringify(form.indirect_competitors));
      fd.append("social_links", JSON.stringify(form.social_links));

      // Scalar fields
      fd.append("business_name", form.business_name.trim());
      fd.append("business_type", form.business_type);
      fd.append("b2b_b2c", form.b2b_b2c);
      fd.append("industry", form.industry.trim());
      fd.append("describe_business", form.describe_business.trim());
      fd.append("describe_audience", form.describe_audience.trim());
      if (form.website) fd.append("website", form.website.trim());
      if (form.usp) fd.append("usp", form.usp.trim());
      if (form.additional_remarks) fd.append("additional_remarks", form.additional_remarks.trim());

      // Compatibility fields
      fd.append("description", form.describe_business.trim());
      fd.append("audience_description", form.describe_audience.trim());
      fd.append("remarks", form.additional_remarks || "");
      Object.entries(form.address).forEach(([k, v]) => fd.append(k, v));

      // User ID Check
      try {
        const u = localStorage.getItem("sv_user");
        if (u) {
          const parsed = JSON.parse(u);
          if (parsed.id) fd.append("user_id", String(parsed.id));
        }
      } catch { }

      // Files
      if (logoFile) fd.append("logo", logoFile, logoFile.name);
      creatives.forEach(c => fd.append("creatives", c, c.name));

      const res = await fetch(`${API_BASE}/api/workspace/setup`, {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Server ${res.status}: ${txt}`);
      }

      const body = await res.json();
      const newId = body.workspace?.id || body.id;

      toast({ title: "Success", description: "Workspace created successfully!" });
      // Verify data availability before navigating
      if (newId) {
        let verified = false;
        for (let i = 0; i < 5; i++) {
          try {
            // Simple check if workspace is readable
            const checkRes = await fetch(`${API_BASE}/api/workspaces/${newId}`); // Adjust endpoint as needed
            if (checkRes.ok) {
              verified = true;
              break;
            }
          } catch (e) {
            // ignore
          }
          await new Promise(r => setTimeout(r, 800)); // wait 800ms
        }
        if (!verified) {
          console.warn("Workspace created but not immediately readable. Navigating anyway.");
        }
        navigate(`/workspace/${newId}`);
      } else {
        navigate("/dashboard");
      }

    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to save workspace. Try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-safe">

      {/* --- Sticky Header (Mobile Optimized) --- */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3 md:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="-ml-2 md:hidden"
              onClick={() => navigate("/workspaces")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="hidden md:flex text-muted-foreground hover:text-foreground"
              onClick={() => navigate("/workspaces")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Workspaces
            </Button>

            <Separator orientation="vertical" className="h-6 hidden md:block" />

            <div className="flex items-center gap-2">
              <img src={logoImg} className="h-6 w-auto md:h-7" alt="Sociovia" />
              <span className="font-semibold text-base md:text-lg tracking-tight text-slate-800 hidden xs:block">Workspace Setup</span>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <Button variant="ghost" className="hidden md:flex" onClick={() => navigate("/dashboard")}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100 min-w-[100px]"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </div>
      </header>

      {/* --- Main Content --- */}
      <main className="px-4 py-6 md:px-8 md:py-10 max-w-7xl mx-auto">

        {/* AI Hero Section */}
        <div className="mb-8 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 text-white shadow-xl shadow-slate-900/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
            <Wand2 className="w-48 h-48 rotate-12" />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="max-w-xl">
              <div className="flex items-center gap-2 mb-3 bg-white/10 w-fit px-3 py-1 rounded-full border border-white/20">
                <Wand2 className="w-3.5 h-3.5 text-indigo-100" />
                <span className="text-xs font-semibold uppercase tracking-wide text-indigo-50">AI Powered Setup</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">Build your workspace in seconds</h1>
              <p className="text-indigo-100 text-sm md:text-base leading-relaxed">
                Enter your website URL and we'll auto-generate your competitor analysis, brand profile, and market positioning.
              </p>
            </div>

            <div className="w-full md:w-auto md:min-w-[380px] bg-white/10 p-1.5 rounded-xl border border-white/20 backdrop-blur-md">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Globe className="h-4 w-4 text-indigo-200" />
                  </div>
                  <input
                    className="w-full h-10 pl-10 pr-3 bg-transparent border-none text-white placeholder-indigo-200/70 focus:ring-0 focus:outline-none text-sm"
                    placeholder="https://yourwebsite.com"
                    value={form.website}
                    onChange={e => onChangeField("website", e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleGenerateFromAI}
                  disabled={aiLoading || !form.website}
                  className="h-10 px-5 bg-white text-indigo-600 hover:bg-indigo-50 font-medium rounded-lg text-sm border-none shadow-sm transition-all"
                >
                  {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generate"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Grid Layout: 2/3 Left, 1/3 Right */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start relative">

          {/* Left Column (Main Form) */}
          <div className="lg:col-span-2 space-y-8">

            {/* 1. Identity */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-slate-800 border-b border-slate-200 pb-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                <h2 className="font-semibold text-lg">Business Identity</h2>
              </div>

              <Card className="border shadow-sm bg-white">
                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Business Name <span className="text-red-500">*</span></Label>
                      <Input
                        className="h-10 bg-white"
                        placeholder="e.g. Acme Corp"
                        value={form.business_name}
                        onChange={e => onChangeField("business_name", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Industry Sector</Label>
                      <Input
                        className="h-10 bg-white"
                        placeholder="e.g. SaaS, Retail"
                        value={form.industry}
                        onChange={e => onChangeField("industry", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Legal Structure</Label>
                      <select
                        className="flex w-full h-10 items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={form.business_type}
                        onChange={e => onChangeField("business_type", e.target.value)}
                      >
                        <option>Pvt Ltd</option>
                        <option>Sole Proprietorship</option>
                        <option>Partnership</option>
                        <option>Public</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Business Model</Label>
                      <select
                        className="flex w-full h-10 items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={form.b2b_b2c}
                        onChange={e => onChangeField("b2b_b2c", e.target.value)}
                      >
                        <option>B2C</option>
                        <option>B2B</option>
                      </select>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <Label>Headquarters Address</Label>
                    <Input
                      className="h-10 bg-slate-50 border-input placeholder:text-muted-foreground/60"
                      placeholder="Street Address"
                      value={form.address.address_line}
                      onChange={e => setForm(s => ({ ...s, address: { ...s.address, address_line: e.target.value } }))}
                    />
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                      <Input className="md:col-span-3 h-10" placeholder="City" value={form.address.city} onChange={e => setForm(s => ({ ...s, address: { ...s.address, city: e.target.value } }))} />
                      <Input className="md:col-span-2 h-10" placeholder="State/Province" value={form.address.district} onChange={e => setForm(s => ({ ...s, address: { ...s.address, district: e.target.value } }))} />
                      <Input className="md:col-span-1 h-10" placeholder="Zip" value={form.address.pin_code} onChange={e => setForm(s => ({ ...s, address: { ...s.address, pin_code: e.target.value } }))} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* 2. Position */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-slate-800 border-b border-slate-200 pb-2">
                <Target className="w-5 h-5 text-blue-600" />
                <h2 className="font-semibold text-lg">Market Position</h2>
              </div>

              <Card className="border shadow-sm bg-white">
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-baseline">
                      <Label>Business Description</Label>
                      <span className={`text-xs ${form.describe_business.length >= MIN_DESC_CHARS ? "text-green-600 font-medium" : "text-amber-600"}`}>
                        {form.describe_business.length} / {MIN_DESC_CHARS} chars
                      </span>
                    </div>
                    <Textarea
                      rows={3}
                      className="bg-white resize-none"
                      placeholder="What does your business do? (e.g. We sell premium coffee...)"
                      value={form.describe_business}
                      onChange={e => onChangeField("describe_business", e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Target Audience</Label>
                      <Textarea
                        rows={4}
                        className="bg-white resize-none"
                        placeholder="Who are your customers?"
                        value={form.describe_audience}
                        onChange={e => onChangeField("describe_audience", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>USP (Unique Selling Point)</Label>
                      <Textarea
                        rows={4}
                        className="bg-white resize-none"
                        placeholder="Why do customers choose you?"
                        value={form.usp}
                        onChange={e => onChangeField("usp", e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* 3. Landscape */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-slate-800 border-b border-slate-200 pb-2">
                <Megaphone className="w-5 h-5 text-violet-600" />
                <h2 className="font-semibold text-lg">Competitive Landscape</h2>
              </div>

              <Card className="border shadow-sm bg-white">
                <CardContent className="p-0">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="bg-slate-50/50 border-b px-6 pt-2">
                      <TabsList className="bg-transparent h-auto gap-6 p-0 w-full justify-start rounded-none">
                        <TabsTrigger value="generals" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 rounded-none pb-3 pt-2 text-slate-600 font-medium">Competitors</TabsTrigger>
                        <TabsTrigger value="indirect" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 rounded-none pb-3 pt-2 text-slate-600 font-medium">Indirect</TabsTrigger>
                        <TabsTrigger value="socials" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 rounded-none pb-3 pt-2 text-slate-600 font-medium">Social Links</TabsTrigger>
                      </TabsList>
                    </div>

                    <div className="p-6 min-h-[250px]">
                      <TabsContent value="generals" className="mt-0 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {form.direct_competitors.map(c => (
                            <div key={c.id} className="group relative bg-slate-50 rounded-lg p-3 border border-slate-100 hover:border-indigo-200 transition-colors">
                              <div className="space-y-2">
                                <Input className="h-9 bg-white text-sm" placeholder="Competitor Name" value={c.name} onChange={e => updateCompetitor("direct_competitors", c.id, { name: e.target.value })} />
                                <Input className="h-9 bg-white text-sm text-muted-foreground" placeholder="Website URL" value={c.website} onChange={e => updateCompetitor("direct_competitors", c.id, { website: e.target.value })} />
                              </div>
                              <Button variant="ghost" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-white shadow-sm border opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeCompetitor("direct_competitors", c.id)}>
                                <Trash className="w-3 h-3 text-red-500" />
                              </Button>
                            </div>
                          ))}
                          <Button variant="outline" className="h-full min-h-[100px] border-dashed text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50" onClick={() => addCompetitor("direct_competitors")}>
                            <Plus className="w-5 h-5 mr-2" /> Add Competitor
                          </Button>
                        </div>
                      </TabsContent>

                      <TabsContent value="indirect" className="mt-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {form.indirect_competitors.map(c => (
                            <div key={c.id} className="flex gap-2 items-center">
                              <Input className="h-10" placeholder="Indirect Competitor Name" value={c.name} onChange={e => updateCompetitor("indirect_competitors", c.id, { name: e.target.value })} />
                              <Button variant="ghost" size="icon" onClick={() => removeCompetitor("indirect_competitors", c.id)}><Trash className="w-4 h-4 text-red-400" /></Button>
                            </div>
                          ))}
                          <Button variant="ghost" size="sm" className="w-fit text-indigo-600" onClick={() => addCompetitor("indirect_competitors")}><Plus className="w-4 h-4 mr-2" /> Add Another</Button>
                        </div>
                      </TabsContent>

                      <TabsContent value="socials" className="mt-0 space-y-4">
                        {form.social_links.map(s => (
                          <div key={s.id} className="flex gap-3">
                            <Input className="w-32 md:w-48 h-10" placeholder="Platform" value={s.platform} onChange={e => updateSocial(s.id, { platform: e.target.value })} />
                            <Input className="flex-1 h-10" placeholder="URL" value={s.url} onChange={e => updateSocial(s.id, { url: e.target.value })} />
                            <Button variant="ghost" size="icon" onClick={() => removeSocial(s.id)}><Trash className="w-4 h-4 text-red-400" /></Button>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={addSocial}><Plus className="w-4 h-4 mr-2" /> Add Social Link</Button>
                      </TabsContent>
                    </div>
                  </Tabs>
                </CardContent>
              </Card>
            </section>

          </div>

          {/* Right Column (Assets & Meta) */}
          <div className="space-y-6">

            <Card className="border shadow-md shadow-indigo-100/50 bg-white">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-white border-b pb-4">
                <CardTitle className="text-base text-indigo-900 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-indigo-600" /> Brand Assets
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-8">
                {/* Logo */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <Label className="uppercase text-xs font-bold tracking-wider text-slate-500">Logo</Label>
                    {logoPreview && <Button variant="link" size="sm" className="h-auto p-0 text-red-500 text-xs" onClick={(e) => { e.stopPropagation(); setLogoPreview(null); }}>Remove</Button>}
                  </div>
                  <div
                    className="group relative w-full aspect-[2/1] rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100 transition-all cursor-pointer flex flex-col items-center justify-center p-4 overflow-hidden"
                    onClick={() => logoRef.current?.click()}
                  >
                    {logoPreview ? (
                      <img src={logoPreview} className="h-full w-auto object-contain" />
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                          <ImageIcon className="w-6 h-6 text-slate-400" />
                        </div>
                        <span className="text-xs text-slate-500">Upload Logo</span>
                      </>
                    )}
                    <input ref={logoRef} type="file" className="hidden" accept="image/*" onChange={e => handleLogoSelect(e.target.files?.[0])} />
                  </div>
                </div>

                {/* Creatives */}
                <div>
                  <Label className="uppercase text-xs font-bold tracking-wider text-slate-500 mb-3 block">Color Palette / Creatives</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {creativePreviews.map((src, i) => (
                      <div key={i} className="aspect-square rounded-md border bg-white overflow-hidden relative shadow-sm">
                        <img src={src} className="w-full h-full object-cover" />
                      </div>
                    ))}
                    <button
                      className="aspect-square rounded-md border border-dashed border-slate-300 hover:border-indigo-500 hover:bg-indigo-50 transition-all flex items-center justify-center bg-transparent"
                      onClick={() => creativesRef.current?.click()}
                    >
                      <Plus className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                  <input ref={creativesRef} type="file" multiple className="hidden" accept="image/*" onChange={e => handleCreativesSelect(e.target.files)} />
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-sm bg-indigo-900 text-white">
              <CardContent className="p-6">
                <h3 className="font-semibold text-sm mb-2 opacity-90">Ready to launch?</h3>
                <p className="text-xs text-indigo-200 mb-4 leading-relaxed">
                  Ensure all fields are accurate. This data powers your AI agents and campaigns.
                </p>
                <Button onClick={handleSubmit} disabled={loading} className="w-full bg-white text-indigo-900 hover:bg-indigo-50 font-semibold border-none">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Workspace"}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-none shadow-none bg-transparent">
              <CardContent className="p-0">
                <Label className="mb-2 block text-xs">Internal Notes</Label>
                <Textarea
                  placeholder="Private notes..."
                  className="bg-white/50 border-slate-200 resize-none text-xs min-h-[80px]"
                  value={form.additional_remarks}
                  onChange={e => onChangeField("additional_remarks", e.target.value)}
                />
              </CardContent>
            </Card>
          </div>

        </div>

      </main>

    </div>
  );
}
