import React, { useMemo, useEffect, useState } from 'react';
import { Target, Heart, Users, MousePointer, ShoppingBag, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCampaignStore, ObjectiveType } from '@/store/campaignStore';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { API_BASE_URL } from '@/config';

/**
 * Single-file bundle (fixed):
 * - ObjectiveSelection component
 * - embedded suggestObjectives() helper (calls backend /api/workspace/:id/ai-suggest-objectives)
 * - Local fallback for aiSuggestedObjectives setter (so it won't error if store doesn't provide a setter)
 * - LIMIT AI SUGGESTIONS TO TOP 2 (only mark top 2 as AI Suggested)
 */

// ---------- Types ----------
type WorkspaceLite = {
  id?: string | number;
  business_name?: string;
  name?: string;
  industry?: string;
  sector?: string;
  logo?: string | null;
  logo_path?: string | null;
  website?: string | null;
  usp?: string | null;
  description?: string | null;
  creatives_path?: any[];
  created_at?: string;
  updated_at?: string;
  user_id?: number;
  audience_description?: string;
  [key: string]: any;
};

type AISuggestResponseShape = {
  success?: boolean;
  workspace_id?: number | string;
  model?: string;
  raw_text?: string;
  suggestions?: { suggestions?: string[]; reasons?: string[] } | string[];
  error?: string;
};

// ---------- Constants & Objective list ----------
const objectives = [
  {
    id: 'BRAND_AWARENESS' as ObjectiveType,
    title: 'Brand Awareness',
    description: 'Increase awareness of your brand',
    icon: Target,
    metaMapping: 'BRAND_AWARENESS',
    color: 'text-primary',
  },
  {
    id: 'REACH' as ObjectiveType,
    title: 'Reach',
    description: 'Show your ad to the maximum number of people',
    icon: Users,
    metaMapping: 'REACH',
    color: 'text-accent',
  },
  {
    id: 'ENGAGEMENT' as ObjectiveType,
    title: 'Engagement',
    description: 'Get more messages, video views, post engagement',
    icon: Heart,
    metaMapping: 'ENGAGEMENT',
    color: 'text-pink-500',
  },
  {
    id: 'LEAD_GENERATION' as ObjectiveType,
    title: 'Lead Generation',
    description: 'Collect leads for your business',
    icon: TrendingUp,
    metaMapping: 'LEAD_GENERATION',
    color: 'text-green-500',
  },
  {
    id: 'TRAFFIC' as ObjectiveType,
    title: 'Traffic',
    description: 'Send people to your website or app',
    icon: MousePointer,
    metaMapping: 'TRAFFIC',
    color: 'text-blue-500',
  },
  {
    id: 'CONVERSIONS' as ObjectiveType,
    title: 'Sales',
    description: 'Drive sales and conversions',
    icon: ShoppingBag,
    metaMapping: 'CONVERSIONS',
    color: 'text-orange-500',
  },
];

// ---------- Helper: API base (adjust env or fallback) ----------
const API_BASE = API_BASE_URL;

// ---------- Embedded suggestObjectives helper ----------
/**
 * Calls backend AI route to get suggested objectives.
 * - If workspace.id exists -> GET /api/workspace/:id/ai-suggest-objectives
 * - Else -> POST /api/workspace/0/ai-suggest-objectives with workspace JSON
 *
 * Returns: { ids: string[], reasons?: string[] }
 */
async function suggestObjectives(workspace: Record<string, any>): Promise<{ ids: string[]; reasons?: string[] }> {
  if (!workspace || typeof workspace !== "object") return { ids: [] };

  const id = workspace.id ?? workspace.workspace_id ?? null;

  const normalize = (raw: any): { ids: string[]; reasons?: string[] } => {
    if (!raw) return { ids: [] };

    // case: suggestions is top-level array
    if (Array.isArray(raw.suggestions)) {
      return { ids: raw.suggestions.map(String).slice(0, 2) };
    }

    // case: suggestions is object { suggestions: [...], reasons: [...] }
    if (raw.suggestions && typeof raw.suggestions === "object" && Array.isArray(raw.suggestions.suggestions)) {
      return { ids: raw.suggestions.suggestions.map(String).slice(0, 2), reasons: Array.isArray(raw.suggestions.reasons) ? raw.suggestions.reasons.map(String) : undefined };
    }

    // try parse raw_text if it's JSON
    if (typeof raw.raw_text === "string") {
      try {
        const parsed = JSON.parse(raw.raw_text);
        if (Array.isArray(parsed)) return { ids: parsed.map(String).slice(0, 2) };
        if (parsed?.suggestions && Array.isArray(parsed.suggestions)) {
          return { ids: parsed.suggestions.map(String).slice(0, 2), reasons: Array.isArray(parsed.reasons) ? parsed.reasons.map(String) : undefined };
        }
      } catch { /* ignore */ }
    }

    return { ids: [] };
  };

  try {
    let json: any = null;

    if (id) {
      // Try GET first
      try {
        const url = `${API_BASE}/api/workspace/${encodeURIComponent(String(id))}/ai-suggest-objectives`;
        const res = await fetch(url, { method: "GET", headers: { accept: "application/json" } });
        if (res.ok) {
          json = await res.json().catch(() => null);
        } else if (res.status === 404) {
          console.warn(`Workspace ${id} not found via GET, will try POST fallback`);
        } else {
          console.warn(`GET failed with status ${res.status}, trying POST fallback`);
        }
      } catch (e) {
        console.warn("GET request failed, will try POST fallback", e);
      }
    }

    // If GET didn’t work, do POST fallback
    if (!json) {
      const postUrl = `${API_BASE}/api/workspace/0/ai-suggest-objectives`;
      const res = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", accept: "application/json" },
        body: JSON.stringify(workspace),
      });
      json = await res.json().catch(() => null);
    }

    return normalize(json);
  } catch (err) {
    console.error("suggestObjectives failed", err);
    return { ids: [] };
  }
}

// ---------- Small status pill component ----------
function StatusPill({ text }: { text?: string }) {
  const t = (text || '').toLowerCase();
  const base = 'text-xs font-semibold px-2 py-0.5 rounded-full inline-block';
  if (t === 'active') return <span className={`${base} bg-emerald-100 text-emerald-800`}>{text}</span>;
  if (t === 'paused') return <span className={`${base} bg-yellow-100 text-yellow-800`}>{text}</span>;
  return <span className={`${base} bg-slate-100 text-slate-700`}>{text || '—'}</span>;
}

// ---------- Main component (export default) ----------
export default function ObjectiveSelection() {
  const {
    objective,
    setObjective,
    setStep,
    campaign,
    selectedImages,
    workspace,
    aiSuggestedObjectives, // may be undefined or array
    setAiSuggestedObjectives, // may be undefined OR not provided by store
  } = useCampaignStore();

  const navigate = useNavigate();
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // Local fallback for suggested objectives in case store doesn't provide setter
  const [aiSuggestedLocal, setAiSuggestedLocal] = useState<string[] | undefined>(undefined);

  // Helper to apply suggested ids to store if setter exists else local state
  const applySuggested = (ids: string[] | undefined) => {
    const topIds = (ids || []).slice(0, 2); // limit to top 2
    if (!topIds) return;
    if (typeof setAiSuggestedObjectives === 'function') {
      try {
        // Some stores expect different shape; we pass string[]
        setAiSuggestedObjectives(topIds);
      } catch (e) {
        console.warn('setAiSuggestedObjectives threw; falling back to local state', e);
        setAiSuggestedLocal(topIds);
      }
    } else {
      setAiSuggestedLocal(topIds);
    }
  };

  // Helper: Read workspace from localStorage (fallback)
  const readWorkspaceFromLocalStorageFallback = (): any | null => {
    try {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith('workspace_'));
      if (keys.length === 0) return null;
      const chosenKey = keys.sort().reverse()[0];
      const raw = localStorage.getItem(chosenKey);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('workspace fallback parse error', e);
      return null;
    }
  };

  // Workspace mapping with localStorage fallback
  const storedWorkspace: WorkspaceLite | null = useMemo(() => {
    // NEW: Prioritize selectedImages.workspace if available
    if (selectedImages?.workspace && typeof selectedImages.workspace === 'object') {
      const ws = selectedImages.workspace;
      return {
        id: ws.id,
        business_name: ws.business_name,
        logo_path: ws.logo_path,
        website: ws.website,
        usp: ws.usp,
        description: ws.description,
        audience_description: ws.audience_description,
        created_at: ws.created_at,
        updated_at: ws.updated_at,
        user_id: ws.user_id,
        creatives_path: ws.creatives_path || [],
      };
    }

    if (workspace && typeof workspace === 'object') {
      return {
        id: workspace.id,
        business_name: workspace.business_name,
        logo_path: workspace.logo_path,
        website: workspace.website,
        usp: workspace.usp,
        description: workspace.description,
        audience_description: workspace.audience_description,
        created_at: workspace.created_at,
        updated_at: workspace.updated_at,
        user_id: workspace.user_id,
        creatives_path: workspace.creatives_path || [],
      };
    }

    if (campaign?.workspace && typeof campaign.workspace === 'object') {
      return {
        id: campaign.workspace.id,
        business_name: campaign.workspace.business_name || campaign.workspace.name,
        logo_path: campaign.workspace.logo_path || campaign.workspace.logo,
        website: campaign.workspace.website,
        usp: campaign.workspace.usp,
        description: campaign.workspace.description,
        audience_description: campaign.workspace.audience_description,
        created_at: campaign.workspace.created_at,
        updated_at: campaign.workspace.updated_at,
        creatives_path: campaign.workspace.creatives_path || [],
      };
    }

    if (campaign && typeof campaign === 'object') {
      return {
        id: campaign.id,
        business_name: campaign.business_name || campaign.name,
        logo_path: campaign.logo_path || campaign.logo,
        website: campaign.website,
        usp: campaign.usp,
        description: campaign.description,
        audience_description: campaign.audience_description,
        created_at: campaign.created_at,
        updated_at: campaign.updated_at,
        creatives_path: campaign.creatives_path || [],
      };
    }

    const lsWorkspace = readWorkspaceFromLocalStorageFallback();
    if (lsWorkspace && typeof lsWorkspace === 'object') {
      const w = lsWorkspace.workspace ?? lsWorkspace;
      return {
        id: w.id ?? undefined,
        business_name: w.business_name ?? w.name ?? '',
        logo_path: w.logo_path ?? w.logo ?? null,
        website: w.website ?? '',
        usp: w.usp ?? '',
        description: w.description ?? '',
        audience_description: w.audience_description ?? '',
        created_at: w.created_at ?? '',
        updated_at: w.updated_at ?? '',
        creatives_path: Array.isArray(w.creatives_path) ? w.creatives_path : [],
        user_id: w.user_id ?? undefined,
      };
    }

    return null;
  }, [workspace, campaign, selectedImages]);

  const workspaceLogo = storedWorkspace?.logo_path ?? null;
  const workspaceTitle = storedWorkspace?.business_name ?? 'No workspace saved';
  const workspaceIndustry = storedWorkspace?.audience_description?.substring(0, 100) ?? '';
  const workspaceWebsite = storedWorkspace?.website ?? '';
  const workspaceUsp = storedWorkspace?.usp ?? '';
  const workspaceDescription = storedWorkspace?.description ?? '';
  const creativesCount =
    ((storedWorkspace?.creatives_path && Array.isArray(storedWorkspace.creatives_path) ? storedWorkspace.creatives_path.length : 0) as number) ||
    0;

  const selectedImagesCount = useMemo(
    () => (selectedImages && selectedImages.images ? selectedImages.images.length : 0),
    [selectedImages]
  );

  // effective suggestions used by UI (local first, then store) — LIMIT TO TOP 2
  const effectiveSuggested = (aiSuggestedLocal ?? (Array.isArray(aiSuggestedObjectives) ? aiSuggestedObjectives : []) ?? []).slice(0, 2);

  // Fetch AI suggestions on mount if workspace is available
  useEffect(() => {
    const fetchSuggestions = async () => {
      // Only fetch if we don't already have suggestions either in store or locally
      const haveExisting = Array.isArray(aiSuggestedObjectives) && aiSuggestedObjectives.length > 0;
      const haveLocal = aiSuggestedLocal && aiSuggestedLocal.length > 0;
      if (storedWorkspace && !haveExisting && !haveLocal) {
        setIsLoadingSuggestions(true);
        try {
          const { ids } = await suggestObjectives(storedWorkspace as Record<string, any>);
          applySuggested(ids);
        } catch (error) {
          console.error('❌ [ERROR] Failed to fetch AI suggestions:', error);
        } finally {
          setIsLoadingSuggestions(false);
        }
      }
    };
    fetchSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storedWorkspace]);

  const handleSelect = (objectiveId: ObjectiveType) => {
    setObjective(objectiveId);
  };

  const handleContinue = () => {
    if (objective) {
      setStep(2);
      navigate('/audience');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-fade-in">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Choose your ad objective</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Select what you want to achieve with your ad. This helps us optimize your campaign for the best results.
        </p>
        <Button
          variant="outline"
          onClick={async () => {
            if (!storedWorkspace) return;
            setIsLoadingSuggestions(true);
            try {
              const { ids } = await suggestObjectives(storedWorkspace as Record<string, any>);
              applySuggested(ids);
            } catch (error) {
              console.error('❌ [ERROR] Failed to fetch AI suggestions (manual):', error);
            } finally {
              setIsLoadingSuggestions(false);
            }
          }}
          disabled={isLoadingSuggestions || !storedWorkspace}
          className="mt-4"
        >
          {isLoadingSuggestions ? 'Loading AI Suggestions...' : 'Get AI Suggestions'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {objectives.map((obj) => {
          const Icon = obj.icon;
          const isSelected = objective === obj.id;
          const isSuggested = effectiveSuggested.includes(obj.id);

          return (
            <Card
              key={obj.id}
              className={cn(
                'cursor-pointer transition-all duration-200 hover:shadow-medium',
                // Tailwind class names must be valid; use conditional join instead of raw strings if your cn expects that
                isSelected ? 'ring-2 ring-primary shadow-large' : '',
                isSuggested && !isSelected ? 'border-2 border-blue-500' : ''
              )}
              onClick={() => handleSelect(obj.id)}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {obj.title}
                  {isSuggested && !isSelected && <span className="text-xs text-blue-500 font-medium">AI Suggested</span>}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="flex flex-col items-start">
                  <div className={cn('mb-4 p-3 rounded-lg bg-secondary', isSelected && 'bg-primary/10')}>
                    <Icon className={cn('w-8 h-8', isSelected ? 'text-primary' : obj.color)} />
                  </div>
                  <p className="text-muted-foreground mb-4 flex-grow">{obj.description}</p>
                  <div className="w-full pt-4 border-t border-border">
                    <span className="text-xs text-muted-foreground">Meta Objective</span>
                    <div className="text-sm font-mono font-medium text-primary mt-1">{obj.metaMapping}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      
      <div className="flex justify-center">
        <Button size="lg" onClick={handleContinue} disabled={!objective} className="min-w-[200px]">
          Continue to Audience
        </Button>
      </div>
    </div>
  );
}
