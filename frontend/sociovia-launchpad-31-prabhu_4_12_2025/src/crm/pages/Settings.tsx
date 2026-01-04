import { GlassCard } from "../components/ui/GlassCard";
import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
    Shield, Key, Webhook, Copy, User, RefreshCw,
    Facebook, CheckCircle2, AlertCircle, ArrowRight, Activity,
    Zap, FileSpreadsheet, FileText, Network, KanbanSquare, Info,
    ChevronRight, Terminal, X, Lock, Eye, EyeOff, Globe
} from "lucide-react";
import { api } from "../api";
import { useToast } from "@/hooks/use-toast";
import { Lead } from "../types";

// --- Types & Configuration ---

type ProviderId = 'meta_leadgen' | 'zapier' | 'sheets' | 'typeform' | 'hubspot' | 'pipedrive';

interface ProviderConfig {
    id: ProviderId;
    label: string;
    icon: any;
    color: string;
    bg: string;
    endpoint: string;
    description: string;
    docs: {
        usage: string;
        payload: object;
        tips?: string[];
    };
}

const PROVIDERS: ProviderConfig[] = [
    {
        id: 'zapier',
        label: 'Zapier',
        icon: Zap,
        color: 'text-orange-600',
        bg: 'bg-orange-50',
        endpoint: '/webhook/zapier',
        description: 'Connect with 5,000+ apps.',
        docs: {
            usage: "Use the 'Webhooks by Zapier' (Custom Request) action.",
            payload: {
                "name": "John Doe",
                "email": "john@example.com",
                "phone": "+15550123",
                "company": "Acme Inc",
                "source": "Zapier"
            },
            tips: ["Select 'POST' method", "Set 'JSON' as Payload Type"]
        }
    },
    {
        id: 'sheets',
        label: 'Google Sheets',
        icon: FileSpreadsheet,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        endpoint: '/webhook/sheets',
        description: 'Sync new rows automatically.',
        docs: {
            usage: "Send a row object. Works best with Apps Script or Zapier Sheets triggers.",
            payload: {
                "row": {
                    "name": "Jane User",
                    "email": "jane@example.com",
                    "phone": "555-0199",
                    "company": "Global Corp"
                }
            }
        }
    },
    {
        id: 'typeform',
        label: 'Typeform',
        icon: FileText,
        color: 'text-stone-800',
        bg: 'bg-stone-100',
        endpoint: '/webhook/typeform',
        description: 'Import form responses.',
        docs: {
            usage: "Add this URL as a Webhook in your Typeform Connect settings.",
            payload: {
                "form_response": {
                    "form_id": "AbCdEf",
                    "submitted_at": "2024-01-01T10:00:00Z",
                    "answers": ["..."]
                }
            },
            tips: ["We automatically map email, phone, and name fields."]
        }
    },
    {
        id: 'meta_leadgen',
        label: 'Meta LeadGen',
        icon: Facebook,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        endpoint: '/webhook/meta-lead',
        description: 'Facebook & Instagram Instant Forms.',
        docs: {
            usage: "Configure in Meta App Dashboard > Webhooks.",
            payload: {
                "object": "page",
                "entry": [{
                    "changes": [{
                        "field": "leadgen",
                        "value": { "leadgen_id": "44444444" }
                    }]
                }]
            },
            tips: ["Requires 'Meta Verify Token' (see Security Keys)."]
        }
    },
    {
        id: 'hubspot',
        label: 'HubSpot',
        icon: Network,
        color: 'text-orange-500',
        bg: 'bg-orange-50/50',
        endpoint: '/webhook/hubspot',
        description: 'Sync contacts from HubSpot.',
        docs: {
            usage: "Use HubSpot Workflows to send a webhook on contact creation.",
            payload: {
                "objectId": 12345,
                "properties": {
                    "firstname": "Alice",
                    "email": "alice@hubspot.com",
                    "company": "HubSpotter"
                }
            }
        }
    },
    {
        id: 'pipedrive',
        label: 'Pipedrive',
        icon: KanbanSquare,
        color: 'text-green-600',
        bg: 'bg-green-50',
        endpoint: '/webhook/pipedrive',
        description: 'Sync persons/deals.',
        docs: {
            usage: "Create a Webhook in Pipedrive Tools > Webhooks.",
            payload: {
                "current": {
                    "person_name": "Bob Builder",
                    "person_email": "bob@build.com",
                    "org_name": "Construction Co"
                }
            }
        }
    },
];

// ... imports ...
import { useNavigate } from "react-router-dom";
// ... imports ...

export default function Settings() {
    const { toast } = useToast();
    const navigate = useNavigate(); // Add this
    const [loading, setLoading] = useState(true);

    // Data
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [users, setUsers] = useState<any[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [workspaceId, setWorkspaceId] = useState("");

    // UI
    const [inviteEmail, setInviteEmail] = useState("");
    const [isInviting, setIsInviting] = useState(false);
    const [showKey, setShowKey] = useState(false);

    // ... loadData and useEffect ...

    // ... handleRegenerateKey, handleInvite, copyToClipboard, getBackendUrl ...

    // ... providerStats calculation ...

    // ... render logic ... 

    // In Grid:
    // onClick={() => navigate(`/crm/settings/${p.id}`)}

    // Remove Detail Modal entirely
    const webhookApiKey = useMemo(() => {
        if (!settings['webhook_api_key']) return '••••••••••••••••••••••••••••••••';
        return showKey ? settings['webhook_api_key'] : '••••••••••••••••••••••••••••••••';
    }, [settings, showKey]);

    const metaToken = useMemo(() => {
        if (!settings['meta_verify_token']) return '••••••••';
        return settings['meta_verify_token'];
    }, [settings]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            toast({
                title: "Copied!",
                description: "Content copied to clipboard.",
                duration: 2000,
            });
        }).catch(err => {
            console.error('Failed to copy: ', err);
            toast({
                title: "Copy Failed",
                description: "Could not copy to clipboard.",
                variant: "destructive",
                duration: 2000,
            });
        });
    };

    const getBackendUrl = () => {
        return import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const [settingsRes, usersRes, leadsRes] = await Promise.all([
                api.getCRMSettings(),
                api.getWorkspaceUsers(),
                api.getLeads(),
            ]);
            setSettings(settingsRes || {});
            setUsers(usersRes || []);
            setLeads(leadsRes || []);
            setWorkspaceId(settingsRes?.workspace_id || "");
        } catch (error) {
            console.error("Failed to load settings data:", error);
            toast({
                title: "Error",
                description: "Failed to load settings data.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleRegenerateKey = async (keyName: string, displayKeyName: string) => {
        if (!confirm(`Are you sure you want to regenerate the ${displayKeyName}? This will invalidate the old key.`)) {
            return;
        }
        try {
            const res = await api.regenerateCRMKey(keyName);
            setSettings(prev => ({ ...prev, [keyName]: res.key }));
            toast({
                title: "Key Regenerated",
                description: `${displayKeyName} has been successfully regenerated.`,
            });
        } catch (error) {
            console.error(`Failed to regenerate ${keyName}:`, error);
            toast({
                title: "Error",
                description: `Failed to regenerate ${displayKeyName}.`,
                variant: "destructive",
            });
        }
    };

    const handleInvite = async () => {
        if (!inviteEmail) {
            toast({
                title: "Missing Email",
                description: "Please enter an email address to invite.",
                variant: "destructive",
            });
            return;
        }
        setIsInviting(true);
        try {
            await api.post('/users/invite', { email: inviteEmail });
            toast({
                title: "Invitation Sent",
                description: `An invitation has been sent to ${inviteEmail}.`,
            });
            setInviteEmail("");
            loadData(); // Refresh user list
        } catch (error: any) {
            console.error("Failed to send invitation:", error);
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to send invitation.",
                variant: "destructive",
            });
        } finally {
            setIsInviting(false);
        }
    };

    const providerStats = useMemo(() => {
        const stats: Record<ProviderId, { count: number; lastSync: string | null; status: 'active' | 'inactive' }> =
            PROVIDERS.reduce((acc, p) => ({
                ...acc,
                [p.id]: { count: 0, lastSync: null, status: 'inactive' }
            }), {} as Record<ProviderId, { count: number; lastSync: string | null; status: 'active' | 'inactive' }>);

        const normalizeSource = (s: string | null | undefined): ProviderId | null => {
            if (!s) return null;
            const lower = s.toLowerCase();
            if (lower.includes('meta') || lower.includes('facebook') || lower.includes('fb') || lower.includes('instagram') || lower.includes('ig')) return 'meta_leadgen';
            if (lower.includes('sheet') || lower.includes('google')) return 'sheets';
            if (lower.includes('zapier')) return 'zapier';
            if (lower.includes('hubspot')) return 'hubspot';
            if (lower.includes('typeform')) return 'typeform';
            if (lower.includes('pipedrive')) return 'pipedrive';
            return null;
        };

        leads.forEach(lead => {
            const externalId = normalizeSource(lead.external_source);
            const sourceId = normalizeSource(lead.source);
            const providerId = externalId || sourceId;

            if (providerId && stats[providerId]) {
                stats[providerId].count++;
                if (!stats[providerId].lastSync || (lead.created_at && new Date(lead.created_at) > new Date(stats[providerId].lastSync!))) {
                    stats[providerId].lastSync = lead.created_at;
                }
                stats[providerId].status = 'active';
            }
        });

        return stats;
    }, [leads]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <RefreshCw className="h-8 w-8 animate-spin text-violet-500" />
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-10 max-w-7xl mx-auto px-4 sm:px-6 relative">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Settings & Integrations</h1>
                <p className="text-slate-500 font-medium">Manage developer access, secure keys, and third-party data flows.</p>
            </motion.div>

            {/* --- API & Security --- */}
            <GlassCard className="mb-8">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-violet-100 rounded-lg text-violet-600">
                            <Key className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">API & Security</h2>
                            <p className="text-sm text-slate-500">Manage your workspace access keys.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                        <span className="font-semibold">Workspace ID:</span>
                        <code className="font-mono">{workspaceId}</code>
                        <button onClick={() => copyToClipboard(workspaceId)} className="hover:text-slate-900"><Copy className="h-3 w-3" /></button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Webhook API Key */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-semibold text-slate-700">Webhook API Key</label>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setShowKey(!showKey)} className="text-xs text-slate-500 hover:text-slate-800 font-medium">
                                    {showKey ? "Hide" : "Show"}
                                </button>
                                <span className="text-slate-300">|</span>
                                <button onClick={() => handleRegenerateKey('webhook_api_key', 'Webhook Key')} className="text-xs text-red-500 hover:text-red-600 font-medium">
                                    Regenerate
                                </button>
                            </div>
                        </div>
                        <div className="relative group">
                            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                                <Key className="h-4 w-4 text-slate-400" />
                                <code className="flex-1 font-mono text-sm text-slate-600 truncate">
                                    {showKey ? settings['webhook_api_key'] : webhookApiKey}
                                </code>
                                <button onClick={() => copyToClipboard(settings['webhook_api_key'] || "")} className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-400 hover:text-slate-600">
                                    <Copy className="h-4 w-4" />
                                </button>
                            </div>
                            <p className="mt-2 text-xs text-slate-500">
                                Include as <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">X-Webhook-Key</code> header in your requests.
                            </p>
                        </div>
                    </div>

                    {/* Meta Verify Token */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-semibold text-slate-700">Meta Verify Token</label>
                            <button onClick={() => handleRegenerateKey('meta_verify_token', 'Meta Token')} className="text-xs text-slate-500 hover:text-slate-800 font-medium">
                                Rotate
                            </button>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                            <Shield className="h-4 w-4 text-slate-400" />
                            <code className="flex-1 font-mono text-sm text-slate-600 truncate">
                                {settings['meta_verify_token'] || "••••••••"}
                            </code>
                            <button onClick={() => copyToClipboard(settings['meta_verify_token'] || "")} className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-400 hover:text-slate-600">
                                <Copy className="h-4 w-4" />
                            </button>
                        </div>
                        <p className="mt-2 text-xs text-slate-500">
                            Used for verifying webhooks from Meta (Facebook/Instagram).
                        </p>
                    </div>
                </div>
            </GlassCard>

            {/* --- Integrations Grid --- */}
            <div>
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Globe className="h-5 w-5 text-slate-400" /> Connected Providers
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {PROVIDERS.map((p) => {
                        const stat = providerStats[p.id];
                        return (
                            <motion.button
                                key={p.id}
                                onClick={() => navigate(`/crm/settings/${p.id}`)}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="text-left"
                            >
                                <GlassCard className="h-full border-l-4 relative group overflow-hidden" style={{ borderLeftColor: p.color.replace('text-', '') }}>
                                    <div className="flex items-start justify-between mb-4">
                                        <div className={`p-3 rounded-2xl ${p.bg} ${p.color} shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                                            <p.icon className="h-6 w-6" />
                                        </div>
                                        <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${stat.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                            {stat.status === 'active' ? 'Active' : 'Inactive'}
                                        </div>
                                    </div>
                                    <h4 className="font-bold text-slate-900 text-lg mb-1">{p.label}</h4>
                                    <p className="text-sm text-slate-500 mb-4 h-10 line-clamp-2">{p.description}</p>

                                    <div className="flex items-center gap-4 text-xs font-medium text-slate-400 pt-4 border-t border-slate-100">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase font-bold text-slate-300">Leads Sync</span>
                                            <span className="text-slate-700 font-bold text-sm">{stat.count}</span>
                                        </div>
                                        <div className="w-px h-6 bg-slate-100"></div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase font-bold text-slate-300">Last Activity</span>
                                            <span className="text-slate-600">{stat.lastSync ? new Date(stat.lastSync).toLocaleDateString() : '-'}</span>
                                        </div>
                                        <ArrowRight className="h-4 w-4 ml-auto text-slate-300 group-hover:text-violet-500 transition-colors" />
                                    </div>
                                </GlassCard>
                            </motion.button>
                        );
                    })}
                </div>
            </div>

            {/* --- User Management Section (Preserved) --- */}
            <GlassCard className="mt-8">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600">
                            <Shield className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Team Access</h3>
                            <p className="text-sm text-slate-500">Manage workspace members.</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-center justify-center py-16 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    <div className="h-16 w-16 bg-white rounded-full shadow-sm border border-slate-100 flex items-center justify-center mb-6">
                        <Lock className="h-8 w-8 text-slate-300" />
                    </div>
                    <div className="max-w-md space-y-2">
                        <h3 className="text-xl font-bold text-slate-900">Advanced Board Management Coming Soon</h3>
                        <p className="text-slate-500">
                            We're building granular role-based access control, team permissions, and audit logs. Stay tuned for the update!
                        </p>
                    </div>
                    <div className="mt-8 flex gap-3">
                        <div className="px-3 py-1 bg-violet-100 text-violet-700 text-xs font-bold rounded-full uppercase tracking-wide">
                            In Development
                        </div>
                    </div>
                </div>
            </GlassCard>
        </div>
    );
}
