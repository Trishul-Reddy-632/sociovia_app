 // src/pages/WorkspaceEdit.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Upload, Save } from "lucide-react";

const API_BASE = (import.meta.env.VITE_API_BASE ?? "").toString().replace(/\/$/, "");

/* ---------- helpers ---------- */
function buildUserHintHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  try {
    const rv = localStorage.getItem("sv_user");
    if (rv) {
      const u = JSON.parse(rv);
      if (u?.id) headers["X-User-Id"] = String(u.id);
      if (u?.email) headers["X-User-Email"] = String(u.email);
    }
  } catch {
    /* ignore */
  }
  return headers;
}

type Workspace = {
  id: number;
  business_name: string;
  industry?: string;
  business_type?: string;
  website?: string;
  usp?: string;
  description?: string;
  audience_description?: string;
  created_at?: string | null;
  updated_at?: string | null;
  logo?: string | null;
  logo_path?: string | null;
};

function normalizeWorkspace(raw: any): Workspace | null {
  if (!raw) return null;
  const id = typeof raw.id === "string" ? Number(raw.id) : Number(raw.id ?? 0);
  const logo = raw.logo ?? raw.logo_path ?? null;
  return {
    id: Number.isFinite(id) ? id : 0,
    business_name: raw.business_name ?? "",
    industry: raw.industry ?? "",
    business_type: raw.business_type ?? "",
    website: raw.website ?? "",
    usp: raw.usp ?? "",
    description: raw.description ?? "",
    audience_description: raw.audience_description ?? "",
    created_at: raw.created_at ?? null,
    updated_at: raw.updated_at ?? null,
    logo,
    logo_path: raw.logo_path ?? null,
  };
}

/**
 * Fetch single workspace using /api/workspace?workspace_id=...&user_id=...
 * (Your /api/workspace GET route returns { success, workspace, ... } for single fetch)
 */
async function fetchWorkspaceByIdApi(id: number, userId?: number) {
  const qs = new URLSearchParams();
  qs.set("workspace_id", String(id));
  if (userId != null) qs.set("user_id", String(userId));

  const url = `${API_BASE}/api/workspace?${qs.toString()}`;

  const res = await fetch(url, {
    credentials: "include",
    headers: { Accept: "application/json", ...buildUserHintHeaders() },
  });

  if (!res.ok) {
    if (res.status === 404) return null; // soft-fail -> UI shows not found
    throw new Error(`Failed to load workspace (${res.status})`);
  }

  const body = await res.json().catch(() => ({}));
  const w = body?.workspace ?? body;
  return normalizeWorkspace(w);
}

type UpdatePayload = {
  business_name?: string;
  industry?: string;
  business_type?: string;
  website?: string;
  usp?: string;
  description?: string;
  audience_description?: string;
};

/**
 * Update via PUT /api/workspace/:id
 * - Sends FormData if file present; otherwise JSON.
 */
async function updateWorkspaceApi(
  id: number,
  userId: number | undefined,
  payload: UpdatePayload,
  file?: File,
) {
  const url = `${API_BASE}/api/workspace/${id}${userId ? `?user_id=${encodeURIComponent(userId)}` : ""}`;

  if (file) {
    const fd = new FormData();
    fd.append("logo", file); // backend expects "logo"
    for (const [k, v] of Object.entries(payload)) {
      if (v !== undefined && v !== null) fd.append(k, String(v));
    }
    const res = await fetch(url, {
      method: "PUT",
      credentials: "include",
      body: fd,
      headers: { Accept: "application/json", ...buildUserHintHeaders() },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body?.message || body?.error || `Update failed (${res.status})`);
    const w = body?.success ? body.workspace : body?.workspace ?? body;
    return normalizeWorkspace(w);
  } else {
    const res = await fetch(url, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json", ...buildUserHintHeaders() },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body?.message || body?.error || `Update failed (${res.status})`);
    const w = body?.success ? body.workspace : body?.workspace ?? body;
    return normalizeWorkspace(w);
  }
}

/* ------------------ Edit Component ------------------ */
export default function WorkspaceEdit() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { id: routeId } = useParams();
  const workspaceId = routeId ? Number(routeId) : null;

  const [user, setUser] = useState<{ id: number } | null>(null);

  // Form state
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [website, setWebsite] = useState("");
  const [usp, setUsp] = useState("");
  const [description, setDescription] = useState("");
  const [audienceDescription, setAudienceDescription] = useState("");

  // logo file + preview
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [existingLogoUrl, setExistingLogoUrl] = useState<string | null>(null);

  // load user
  useEffect(() => {
    try {
      const raw = localStorage.getItem("sv_user");
      if (raw) setUser(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  // React Query v5: use object form
  const {
    data: workspace,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["workspace-by-id", user?.id, workspaceId],
    queryFn: () => (workspaceId && user ? fetchWorkspaceByIdApi(workspaceId, user.id) : Promise.resolve(null)),
    enabled: !!workspaceId && !!user,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });

  // hydrate form on load
  useEffect(() => {
    if (!workspace) return;
    setBusinessName(workspace.business_name ?? "");
    setIndustry(workspace.industry ?? "");
    setBusinessType(workspace.business_type ?? "");
    setWebsite(workspace.website ?? "");
    setUsp(workspace.usp ?? "");
    setDescription(workspace.description ?? "");
    setAudienceDescription(workspace.audience_description ?? "");
    setExistingLogoUrl(workspace.logo ?? workspace.logo_path ?? null);
  }, [workspace]);

  // cleanup preview URL
  useEffect(() => {
    if (!logoFile) {
      setLogoPreview(null);
      return;
    }
    const url = URL.createObjectURL(logoFile);
    setLogoPreview(url);
    return () => {
      URL.revokeObjectURL(url);
      setLogoPreview(null);
    };
  }, [logoFile]);

  // Mutation variables type
  type UpdateVars = { payload: UpdatePayload; file?: File };

  const updateMutation = useMutation<Workspace | null, Error, UpdateVars>({
    mutationFn: ({ payload, file }) =>
      updateWorkspaceApi(workspaceId as number, user?.id, payload, file),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["workspaces"] });
      await qc.cancelQueries({ queryKey: ["workspace", user?.id] });
      await qc.cancelQueries({ queryKey: ["workspace-by-id", user?.id, workspaceId] });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspaces"] });
      qc.invalidateQueries({ queryKey: ["workspace", user?.id] });
      qc.invalidateQueries({ queryKey: ["workspace-by-id", user?.id, workspaceId] });
      toast({ title: "Saved", description: "Workspace updated successfully." });
      navigate(`/workspace/${workspaceId}`);
    },
    onError: (err) => {
      toast({
        title: "Save failed",
        description: (err as Error)?.message || "Could not update workspace",
        variant: "destructive",
      });
    },
  });

  if (!workspaceId) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Invalid workspace</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Missing workspace id in the route.</p>
            <Button onClick={() => navigate("/workspace")}>Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Not logged in</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Please log in to edit workspaces.</p>
            <Button onClick={() => navigate("/login")}>Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) return <div className="p-6">Loading...</div>;
  if (isError || !workspace) return <div className="p-6">Workspace not found.</div>;

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (f) setLogoFile(f);
  }

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmedName = businessName.trim();
    if (!trimmedName) {
      toast({ title: "Validation", description: "Business name is required", variant: "destructive" });
      return;
    }
    const payload: UpdatePayload = {
      business_name: businessName,
      industry,
      business_type: businessType,
      website,
      usp,
      description,
      audience_description: audienceDescription,
    };
    updateMutation.mutate({ payload, file: logoFile ?? undefined });
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <h1 className="text-2xl font-bold">Edit Workspace</h1>
      </div>

      {/* hero header: logo on top */}
      <div className="rounded-2xl border bg-card text-card-foreground shadow-sm p-6 flex flex-col items-center mb-6">
        <div className="mb-3">
          {logoPreview ? (
            <img src={logoPreview} alt="Logo preview" className="h-20 w-20 rounded-xl object-cover border" />
          ) : existingLogoUrl ? (
            <img src={existingLogoUrl} alt="Current workspace logo" className="h-20 w-20 rounded-xl object-cover border" />
          ) : (
            <div className="h-20 w-20 rounded-xl border grid place-items-center text-xs text-muted-foreground">
              No Logo
            </div>
          )}
        </div>

        <div className="w-full grid gap-3">
          <div className="flex items-center gap-2 text-sm">
            <input
              type="file"
              accept="image/*"
              onChange={onFileChange}
              id="logoInput"
              aria-label="Upload logo"
              title="Upload logo"
              className="hidden"
            />
            <label
              htmlFor="logoInput"
              className="cursor-pointer inline-flex items-center gap-2 px-3 py-1 rounded border"
            >
              <Upload className="w-4 h-4" /> {logoFile ? "Change logo" : "Upload logo"}
            </label>
            {logoFile && <span className="text-xs text-muted-foreground ml-2">{logoFile.name}</span>}
          </div>
        </div>

        <div className="mt-4 w-full text-center">
          <h2 className="text-lg font-semibold">{businessName || "Edit workspace"}</h2>
          <div className="mt-2 flex gap-2 justify-center">
            {industry && <Badge variant="outline">{industry}</Badge>}
            {businessType && <Badge variant="secondary">{businessType}</Badge>}
          </div>
        </div>
      </div>

      {/* form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic Info</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div>
              <label className="text-sm block mb-1" htmlFor="businessName">Business name</label>
              <Input id="businessName" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Acme Inc." />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm block mb-1" htmlFor="industry">Industry</label>
                <Input id="industry" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="SaaS" />
              </div>
              <div>
                <label className="text-sm block mb-1" htmlFor="businessType">Business Type</label>
                <Input id="businessType" value={businessType} onChange={(e) => setBusinessType(e.target.value)} placeholder="Pvt Ltd" />
              </div>
            </div>

            <div>
              <label className="text-sm block mb-1" htmlFor="website">Website</label>
              <Input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="example.com" />
            </div>

            <div>
              <label className="text-sm block mb-1" htmlFor="usp">USP</label>
              <Input id="usp" value={usp} onChange={(e) => setUsp(e.target.value)} placeholder="Your unique value" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div>
              <label className="text-sm block mb-1" htmlFor="description">Description</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                className="w-full rounded border px-3 py-2"
                placeholder="Describe your business..."
              />
            </div>

            <div>
              <label className="text-sm block mb-1" htmlFor="audience">Audience Description</label>
              <textarea
                id="audience"
                value={audienceDescription}
                onChange={(e) => setAudienceDescription(e.target.value)}
                rows={4}
                className="w-full rounded border px-3 py-2"
                placeholder="Who is your audience?"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={updateMutation.isPending}>
            <Save className="w-4 h-4 mr-2" /> {updateMutation.isPending ? "Saving..." : "Save"}
          </Button>
          <Button variant="outline" type="button" onClick={() => navigate(`/workspace/${workspaceId}`)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
