// src/pages/Settings.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

/**
 * Settings page — improved:
 * - includes upload helpers (Cloudinary optional) and base64 fallback
 * - robustly handles missing /api/workspace/list by falling back to localStorage or an empty list
 * - avoids rendering any SelectItem with an empty string value (fixes Radix error)
 * - saves profile and per-workspace updates with graceful fallbacks
 */

/* Endpoints (replace with your real endpoints if needed) */
const API_ME = "https://sociovia-py.onrender.com/api/me";
const API_UPDATE = "https://sociovia-py.onrender.com/api/me/update";
const API_WORKSPACES = "https://sociovia-py.onrender.com/api/workspace/list";
const API_WORKSPACE_UPDATE = (id: number) => `https://sociovia-py.onrender.com/api/workspace/${id}`;

/* Optional Cloudinary unsigned upload — replace with real values or leave placeholders to use base64 fallback */
const CLOUDINARY_UPLOAD_URL = "https://api.cloudinary.com/v1_1/<your-cloud-name>/upload";
const CLOUDINARY_UPLOAD_PRESET = "<unsigned-preset>";

/* Types */
type WorkspaceRow = {
  id: number;
  business_name: string;
  sector?: string;
  logo?: string | null;
};

/* Helpers */

// Convert a File to base64 string (useful fallback)
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// Upload to Cloudinary (unsigned preset). If placeholders are present, this will throw and the caller should fallback.
async function uploadToCloudinary(file: File): Promise<string> {
  // basic guard — if user didn't set cloudinary info, throw so caller falls back to base64
  if (!CLOUDINARY_UPLOAD_URL || CLOUDINARY_UPLOAD_URL.includes("<") || !CLOUDINARY_UPLOAD_PRESET || CLOUDINARY_UPLOAD_PRESET.includes("<")) {
    throw new Error("Cloudinary not configured");
  }

  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const res = await fetch(CLOUDINARY_UPLOAD_URL, { method: "POST", body: fd });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error("Cloud upload failed: " + txt);
  }
  const body = await res.json();
  if (!body?.secure_url) throw new Error("Cloudinary response missing secure_url");
  return body.secure_url;
}

/* Component */
export default function Settings(): JSX.Element {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingWorkspace, setSavingWorkspace] = useState(false);

  // profile state
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    business_name: "",
    registration_number: "",
    vat_number: "",
    billing_email: "",
    address: "",
    plan: "",
    default_workspace_id: null as number | null,
    avatar_url: "" as string | null,
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // workspaces
  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([]);
  const [workspaceLogoFile, setWorkspaceLogoFile] = useState<Record<number, File | null>>({});
  const [workspacePreview, setWorkspacePreview] = useState<Record<number, string | null>>({});

  // Load profile + workspaces (with fallback)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        // Attempt parallel fetch for /api/me and /api/workspace/list
        const [meRes, wsRes] = await Promise.allSettled([
          fetch(API_ME, { credentials: "include" }),
          fetch(API_WORKSPACES, { credentials: "include" }),
        ]);

        // Profile
        if (meRes.status === "fulfilled" && meRes.value.ok) {
          try {
            const body = await meRes.value.json().catch(() => ({}));
            const u = body.user ?? body;
            if (!cancelled && u) {
              setProfile((prev) => ({
                ...prev,
                name: u.name ?? prev.name,
                email: u.email ?? prev.email,
                phone: u.phone ?? prev.phone,
                business_name: u.business_name ?? prev.business_name,
                registration_number: u.registration_number ?? prev.registration_number,
                vat_number: u.vat_number ?? prev.vat_number,
                billing_email: u.billing_email ?? prev.billing_email,
                address: u.address ?? prev.address,
                plan: u.plan ?? prev.plan,
                default_workspace_id: u.default_workspace_id ?? prev.default_workspace_id,
                avatar_url: u.avatar ?? prev.avatar_url ?? null,
              }));
              if ((body.user ?? body)?.avatar) setAvatarPreview((body.user ?? body).avatar);
            }
          } catch (err) {
            console.warn("Failed to parse /api/me response", err);
          }
        } else {
          // Try local cache fallback
          try {
            const raw = localStorage.getItem("sv_user");
            if (raw) {
              const u = JSON.parse(raw);
              setProfile((prev) => ({
                ...prev,
                name: u.name ?? prev.name,
                email: u.email ?? prev.email,
                phone: u.phone ?? prev.phone,
                business_name: u.business_name ?? prev.business_name,
                default_workspace_id: u.default_workspace_id ?? prev.default_workspace_id,
                avatar_url: u.avatar ?? prev.avatar_url ?? null,
              }));
              if (u.avatar) setAvatarPreview(u.avatar);
            }
          } catch { }
        }

        // Workspaces: if endpoint exists and returned array or {workspaces: []}
        if (wsRes.status === "fulfilled" && wsRes.value.ok) {
          try {
            const body = await wsRes.value.json().catch(() => ({}));
            const list: WorkspaceRow[] =
              Array.isArray(body) ? body : Array.isArray(body?.workspaces) ? body.workspaces : [];
            if (!cancelled) {
              setWorkspaces(list);
              const initialPreview: Record<number, string | null> = {};
              list.forEach((w) => (initialPreview[w.id] = w.logo ?? null));
              setWorkspacePreview(initialPreview);
            }
          } catch (err) {
            console.warn("Failed to parse workspaces response", err);
          }
        } else {
          // fallback to localStorage demo/workspaces if backend missing
          try {
            const raw = localStorage.getItem("sv_workspaces");
            if (raw) {
              const list = JSON.parse(raw) as WorkspaceRow[];
              if (Array.isArray(list) && list.length > 0) {
                setWorkspaces(list);
                const initialPreview: Record<number, string | null> = {};
                list.forEach((w) => (initialPreview[w.id] = w.logo ?? null));
                setWorkspacePreview(initialPreview);
              }
            }
          } catch { }
        }
      } catch (err) {
        console.error("Settings load failed", err);
        toast({ title: "Load failed", description: "Could not load profile or workspaces", variant: "destructive" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  // Avatar preview effect
  useEffect(() => {
    if (!avatarFile) return;
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  // Workspace logo previews whenever a file is chosen
  useEffect(() => {
    const revokeList: string[] = [];
    Object.entries(workspaceLogoFile).forEach(([idStr, file]) => {
      if (!file) return;
      const id = Number(idStr);
      const url = URL.createObjectURL(file);
      setWorkspacePreview((p) => ({ ...p, [id]: url }));
      revokeList.push(url);
    });
    return () => revokeList.forEach((u) => URL.revokeObjectURL(u));
  }, [workspaceLogoFile]);

  // Simple profile validation
  const validateProfile = () => {
    if (!profile.name.trim()) {
      toast({ title: "Validation", description: "Name is required", variant: "destructive" });
      return false;
    }
    if (!profile.email.trim()) {
      toast({ title: "Validation", description: "Email is required", variant: "destructive" });
      return false;
    }
    return true;
  };

  // Save profile handler (uploads avatar if provided)
  const handleSaveProfile = async () => {
    if (!validateProfile()) return;
    setSavingProfile(true);
    try {
      let avatarUrl: string | undefined = profile.avatar_url ?? undefined;

      if (avatarFile) {
        // try Cloudinary first, then fallback to base64 inline
        try {
          avatarUrl = await uploadToCloudinary(avatarFile);
        } catch (err) {
          console.warn("Cloudinary upload failed, using base64 fallback", err);
          avatarUrl = await fileToBase64(avatarFile);
        }
      }

      const payload: any = {
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        business_name: profile.business_name,
        registration_number: profile.registration_number,
        vat_number: profile.vat_number,
        billing_email: profile.billing_email,
        address: profile.address,
        plan: profile.plan,
        default_workspace_id: profile.default_workspace_id,
      };

      if (avatarUrl) payload.avatar = avatarUrl;

      const res = await fetch(API_UPDATE, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || `Failed to update profile (status ${res.status})`);
      }

      // update mock cache for frontend convenience
      try {
        const cached = localStorage.getItem("sv_user");
        const parsed = cached ? JSON.parse(cached) : {};
        const merged = { ...parsed, ...payload, avatar: avatarUrl ?? parsed.avatar };
        localStorage.setItem("sv_user", JSON.stringify(merged));
      } catch { }

      toast({ title: "Saved", description: "Profile updated" });
    } catch (err: any) {
      console.error("Save profile failed", err);
      toast({ title: "Error", description: err?.message || "Could not update profile", variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  // Save single workspace (logo + business_name). Uses Cloudinary if available, else base64.
  const handleSaveWorkspace = async (ws: WorkspaceRow) => {
    setSavingWorkspace(true);
    try {
      const file = workspaceLogoFile[ws.id];
      let logoUrl = ws.logo ?? undefined;

      if (file) {
        try {
          logoUrl = await uploadToCloudinary(file);
        } catch (err) {
          console.warn("Cloud upload failed for workspace logo; using base64 fallback", err);
          logoUrl = await fileToBase64(file);
        }
      }

      const payload: any = {
        business_name: ws.business_name,
      };
      if (logoUrl) payload.logo = logoUrl;

      // Try backend update if available
      try {
        const res = await fetch(API_WORKSPACE_UPDATE(ws.id), {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          // non-fatal for frontend-first prototyping; log and continue
          const body = await res.json().catch(() => ({}));
          console.warn("Workspace update responded with non-ok", res.status, body);
        }
      } catch (err) {
        console.warn("Workspace update failed (backend missing?)", err);
      }

      // update UI
      setWorkspaces((prev) => prev.map((p) => (p.id === ws.id ? { ...p, business_name: ws.business_name, logo: logoUrl ?? p.logo } : p)));
      if (logoUrl) setWorkspacePreview((p) => ({ ...p, [ws.id]: logoUrl }));
      setWorkspaceLogoFile((s) => ({ ...s, [ws.id]: null }));

      // update localStorage demo list if any
      try {
        const localRaw = localStorage.getItem("sv_workspaces");
        const localList: WorkspaceRow[] = localRaw ? JSON.parse(localRaw) : null;
        if (Array.isArray(localList)) {
          const updated = localList.map((p) => (p.id === ws.id ? { ...p, business_name: ws.business_name, logo: logoUrl ?? p.logo } : p));
          localStorage.setItem("sv_workspaces", JSON.stringify(updated));
        }
      } catch { }

      toast({ title: "Saved", description: `${ws.business_name} updated` });
    } catch (err: any) {
      console.error(err);
      toast({ title: "Error", description: err?.message || "Could not update workspace", variant: "destructive" });
    } finally {
      setSavingWorkspace(false);
    }
  };

  // derived: current default workspace
  const defaultWorkspace = useMemo(() => workspaces.find((w) => w.id === profile.default_workspace_id) ?? null, [workspaces, profile.default_workspace_id]);

  if (loading) {
    return <div className="p-6 max-w-3xl mx-auto">Loading settings…</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Account & Workspace Settings</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile & Registration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* profile fields */}
            <div>
              <label className="text-xs text-muted-foreground">Full name</label>
              <Input value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Email</label>
              <Input value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} />
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Phone</label>
              <Input value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} />
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Business name</label>
              <Input value={profile.business_name} onChange={(e) => setProfile((p) => ({ ...p, business_name: e.target.value }))} />
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Registration number</label>
              <Input value={profile.registration_number} onChange={(e) => setProfile((p) => ({ ...p, registration_number: e.target.value }))} />
            </div>

            <div>
              <label className="text-xs text-muted-foreground">VAT / GST number</label>
              <Input value={profile.vat_number} onChange={(e) => setProfile((p) => ({ ...p, vat_number: e.target.value }))} />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground">Address</label>
              <Textarea value={profile.address} onChange={(e) => setProfile((p) => ({ ...p, address: e.target.value }))} />
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Billing email</label>
              <Input value={profile.billing_email} onChange={(e) => setProfile((p) => ({ ...p, billing_email: e.target.value }))} />
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Plan</label>
              <Input value={profile.plan} onChange={(e) => setProfile((p) => ({ ...p, plan: e.target.value }))} placeholder="e.g., Free, Pro, Enterprise" />
            </div>

            <div className="md:col-span-2 flex items-center gap-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-2">Avatar (PNG/JPG/WebP &lt; 2.5MB)</label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer rounded-md border px-3 py-2 text-sm bg-muted/5">
                    Choose file
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      setAvatarFile(f);
                    }} />
                  </label>

                  <div className="h-20 w-20 rounded-md overflow-hidden border">
                    {avatarPreview ? <img src={avatarPreview} alt="avatar" className="h-full w-full object-cover" /> : <div className="flex items-center justify-center h-full text-xs text-muted-foreground">No avatar</div>}
                  </div>
                </div>
              </div>

              <div className="ml-auto">
                <label className="text-xs text-muted-foreground block mb-2">Default workspace</label>

                {/* IMPORTANT: When there are no workspaces we render an inline message instead of a SelectItem with value="" */}
                <Select
                  value={profile.default_workspace_id ? String(profile.default_workspace_id) : ""}
                  onValueChange={(v: string) => setProfile((p) => ({ ...p, default_workspace_id: v ? Number(v) : null }))}
                >
                  <SelectTrigger className="w-56">
                    <SelectValue placeholder="Select default workspace" />
                  </SelectTrigger>

                  <SelectContent>
                    {workspaces.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">No workspaces available</div>
                    ) : (
                      workspaces.map((w) => (
                        <SelectItem key={w.id} value={String(w.id)}>
                          {w.business_name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>

                {defaultWorkspace && <div className="text-xs text-muted-foreground mt-2">Current default: {defaultWorkspace.business_name}</div>}
              </div>
            </div>

            <div className="md:col-span-2 flex justify-end gap-2">
              <Button variant="outline" onClick={() => navigate("/")}>Cancel</Button>
              <Button onClick={handleSaveProfile} disabled={savingProfile}>{savingProfile ? "Saving…" : "Save profile"}</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workspaces</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {workspaces.length === 0 ? (
            <div className="text-sm text-muted-foreground">No workspaces found for your account.</div>
          ) : (
            workspaces.map((ws) => (
              <div key={ws.id} className="flex items-center gap-4 p-3 border rounded">
                <div className="h-16 w-16 rounded overflow-hidden border">
                  {workspacePreview[ws.id] ? <img src={workspacePreview[ws.id] ?? ""} alt={ws.business_name} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">No logo</div>}
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                  <div>
                    <Input value={ws.business_name} onChange={(e) => setWorkspaces(prev => prev.map(p => p.id === ws.id ? { ...p, business_name: e.target.value } : p))} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Logo (PNG/JPG/WebP)</label>
                    <label className="cursor-pointer rounded-md border px-3 py-2 text-sm bg-muted/5">
                      Choose file
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                        const f = e.target.files?.[0];
                        setWorkspaceLogoFile((s) => ({ ...s, [ws.id]: f ?? null }));
                      }} />
                    </label>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="outline" onClick={() => { setWorkspaceLogoFile(s => ({ ...s, [ws.id]: null })); setWorkspacePreview(p => ({ ...p, [ws.id]: ws.logo ?? null })); }}>Revert</Button>
                    <Button size="sm" onClick={() => handleSaveWorkspace(ws)} disabled={savingWorkspace}>{savingWorkspace ? "Saving…" : "Save"}</Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
