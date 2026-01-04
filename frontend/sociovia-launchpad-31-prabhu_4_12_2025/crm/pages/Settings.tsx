import { GlassCard } from "../components/ui/GlassCard";
import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

export default function Settings() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);

    // Data
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [users, setUsers] = useState<any[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [workspaceId, setWorkspaceId] = useState("");

    // UI
    const [selectedProvider, setSelectedProvider] = useState<ProviderConfig | null>(null);
    const [inviteEmail, setInviteEmail] = useState("");
    const [isInviting, setIsInviting] = useState(false);
    const [showKey, setShowKey] = useState(false); // toggle visibility of main key

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [fetchedSettings, fetchedUsers, fetchedLeads, workspaceInfo] = await Promise.all([
                api.getCRMSettings().catch(() => ({})),
                api.getWorkspaceUsers().catch(() => []),
                api.getLeads().catch(() => []) as Promise<Lead[]>,
                api.getWorkspaceSettings().catch(() => ({} as any))
            ]);

            setSettings(fetchedSettings || {});
            setUsers(Array.isArray(fetchedUsers) ? fetchedUsers : []);
            setLeads(fetchedLeads || []);
            setWorkspaceId(workspaceInfo?.id || localStorage.getItem("sv_selected_workspace_id") || "");
        } catch (error) {
            console.error("Failed to load settings", error);
            toast({ title: "Error", description: "Failed to load configuration", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    // --- Actions ---

    const handleRegenerateKey = async (keyName: string, label: string) => {
        if (!confirm(`Are you sure you want to regenerate ${label}? \n\n⚠️ OLD KEYS WILL STOP WORKING IMMEDIATELY.\nYou will need to update all your external integrations.`)) return;
        try {
            const res = await api.regenerateCRMKey(keyName);
            setSettings(prev => ({ ...prev, [res.name]: res.key }));
            toast({ title: "Key Rotated", description: `${label} has been securely regenerated.` });
        } catch (error) {
            toast({ title: "Error", description: `Failed to regenerate ${label}`, variant: "destructive" });
        }
    };

    const handleInvite = async () => {
        if (!inviteEmail) return;
        setIsInviting(true);
        try {
            await api.inviteUser(inviteEmail, "member");
            setInviteEmail("");
            toast({ title: "Invited", description: `Invitation sent to ${inviteEmail}` });
            const userList = await api.getWorkspaceUsers();
            setUsers(Array.isArray(userList) ? userList : []);
        } catch (error) {
            toast({ title: "Error", description: "Failed to invite user", variant: "destructive" });
        } finally {
            setIsInviting(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Copied", description: "Copied to clipboard" });
    };

    const getBackendUrl = () => "https://rlcslwgm-5000.inc1.devtunnels.ms/api";

    // --- Stats Calculation ---
    const providerStats = useMemo(() => {
        const stats: Record<string, { count: number, lastSync: string | null, status: 'active' | 'inactive' }> = {};
        PROVIDERS.forEach(p => {
            const pid = p.id.toLowerCase();
            const matches = leads.filter(l => {
                const src = (l.external_source || l.source || '').toLowerCase();
                if (pid === 'meta_leadgen' && (src.includes('meta') || src.includes('facebook') || src.includes('fb') || src.includes('instagram'))) return true;
                if (pid === 'sheets' && (src.includes('sheet') || src.includes('google'))) return true;
                return src.includes(pid);
            });
            const lastLead = matches.length > 0 ? matches.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())[0] : null;
            stats[p.id] = {
                count: matches.length,
                lastSync: lastLead ? (lastLead.last_sync_at || lastLead.created_at || null) : null,
                status: matches.length > 0 ? 'active' : 'inactive'
            };
        });
        return stats;
    }, [leads]);

    const webhookApiKey = settings['webhook_api_key'] || "••••••••••••••••";
    const metaToken = settings['meta_verify_token'] || "••••••••";

    if (loading) return <div className="flex h-full items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent"></div></div>;

    return (
        <div className="space-y-8 pb-10 max-w-7xl mx-auto px-4 sm:px-6 relative">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Settings & Integrations</h1>
                <p className="text-slate-500 font-medium">Manage developer access, secure keys, and third-party data flows.</p>
            </motion.div>

            {/* --- Developer Console --- */}
            <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-2xl shadow-slate-900/20 text-slate-300 border border-slate-800">
                {/* Header */}
                <div className="bg-white/5 px-6 py-4 flex items-center justify-between border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-violet-500/20 rounded-lg text-violet-400">
                            <Terminal className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-white font-bold tracking-wide">Developer Console</h2>
                            <p className="text-xs text-slate-400 font-mono">API v1.0 • Secure Access</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Workspace ID</span>
                        <code className="bg-black/30 px-3 py-1.5 rounded-lg text-sm font-mono text-emerald-400 border border-white/5 flex items-center gap-2">
                            {workspaceId}
                            <button onClick={() => copyToClipboard(workspaceId)} className="hover:text-white transition-colors"><Copy className="h-3.5 w-3.5" /></button>
                        </code>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2">
                    {/* Keys Section */}
                    <div className="p-8 border-r border-white/10 space-y-8">
                        {/* Webhook API Key */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-xs font-bold uppercase tracking-wider text-violet-300">Webhook API Key</label>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setShowKey(!showKey)} className="text-slate-400 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors">
                                        {showKey ? <><EyeOff className="h-3.5 w-3.5" /> Hide</> : <><Eye className="h-3.5 w-3.5" /> Reveal</>}
                                    </button>
                                    <button onClick={() => handleRegenerateKey('webhook_api_key', 'Webhook Key')} className="text-red-400/80 hover:text-red-400 text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 transition-colors">
                                        <RefreshCw className="h-3.5 w-3.5" /> Regenerate
                                    </button>
                                </div>
                            </div>
                            <div className="relative group">
                                <div className="absolute inset-0 bg-violet-500/5 rounded-xl blur-xl group-hover:bg-violet-500/10 transition-all"></div>
                                <div className="relative bg-black/40 border border-white/10 rounded-xl p-4 flex items-center gap-3 font-mono text-sm text-white">
                                    <Key className="h-4 w-4 text-violet-500 flex-shrink-0" />
                                    <span className="flex-1 truncate">{showKey ? settings['webhook_api_key'] : webhookApiKey}</span>
                                    <button onClick={() => copyToClipboard(settings['webhook_api_key'] || "")} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white">
                                        <Copy className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            <p className="mt-3 text-xs text-slate-500">
                                Required in header <code className="text-violet-300 bg-white/5 px-1 rounded">X-Webhook-Key</code> for all requests.
                            </p>
                        </div>

                        {/* Meta Token (Compact) */}
                        <div className="pt-6 border-t border-white/5">
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Meta Verify Token</label>
                                <button onClick={() => handleRegenerateKey('meta_verify_token', 'Meta Token')} className="text-xs text-slate-500 hover:text-slate-300">Rotate</button>
                            </div>
                            <div className="flex items-center gap-2 font-mono text-xs text-slate-500">
                                <span className="text-slate-600">●●●●●●●●</span>
                                <span className="truncate max-w-[150px]">{metaToken.slice(-8)}</span>
                                <button onClick={() => copyToClipboard(settings['meta_verify_token'] || "")} className="ml-auto hover:text-white"><Copy className="h-3 w-3" /></button>
                            </div>
                        </div>
                    </div>

                    {/* Live Snippet Section */}
                    <div className="bg-black/50 p-6 font-mono text-xs relative group overflow-hidden">
                        <div className="absolute top-4 right-4 z-10">
                            <button onClick={() => copyToClipboard(`curl -X POST ${getBackendUrl()}/webhook/zapier \\\n  -H "Content-Type: application/json" \\\n  -H "X-Workspace-ID: ${workspaceId}" \\\n  -H "X-Webhook-Key: ${settings['webhook_api_key'] || 'YOUR_KEY'}" \\\n  -d '{"email": "test@example.com", "source": "API Test"}'`)}
                                className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide backdrop-blur-md transition-all">
                                Copy Snippet
                            </button>
                        </div>
                        <div className="text-slate-500 mb-2 select-none"># Quick Test (cURL)</div>
                        <div className="text-emerald-400/90 leading-relaxed break-all whitespace-pre-wrap">
                            <span className="text-purple-400">curl</span> -X POST {getBackendUrl()}/webhook/zapier <br />
                            &nbsp;&nbsp;-H <span className="text-amber-300">"Content-Type: application/json"</span> <br />
                            &nbsp;&nbsp;-H <span className="text-amber-300">"X-Workspace-ID: {workspaceId}"</span> <br />
                            &nbsp;&nbsp;-H <span className="text-amber-300">
                                "X-Webhook-Key: {showKey ? settings['webhook_api_key'] : '••••••••'}"
                            </span> <br />
                            &nbsp;&nbsp;-d <span className="text-amber-300">
                                `'{"{"}"email": "test@example.com", "source": "API Test"{"}"}'`
                            </span>
                        </div>

                    </div>
                </div>
            </div>

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
                                onClick={() => setSelectedProvider(p)}
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

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <div className="space-y-3">
                        {users.map((user, i) => (
                            <div key={user.id || i} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 hover:bg-slate-100/50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white border border-slate-200 text-sm font-bold text-slate-600 shadow-sm">
                                        {(user.name || user.email || "?").charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800 text-sm">{user.name || "Unknown"}</p>
                                        <p className="text-xs text-slate-500">{user.email}</p>
                                    </div>
                                </div>
                                <span className="px-2 py-1 bg-white rounded-md text-xs font-bold text-slate-500 border border-slate-200 uppercase tracking-wide">{user.role || "Member"}</span>
                            </div>
                        ))}
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                        <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><User className="h-4 w-4 text-slate-400" /> Invite Member</h4>
                        <div className="flex gap-2">
                            <input
                                type="email"
                                placeholder="colleague@company.com"
                                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                                value={inviteEmail}
                                onChange={e => setInviteEmail(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleInvite()}
                            />
                            <button
                                onClick={handleInvite}
                                disabled={isInviting || !inviteEmail}
                                className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 disabled:opacity-50 transition-all shadow-lg shadow-slate-900/10"
                            >
                                {isInviting ? "Sending..." : "Invite"}
                            </button>
                        </div>
                    </div>
                </div>
            </GlassCard>

            {/* --- Detail Modal / Slide-over --- */}
            <AnimatePresence>
                {selectedProvider && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedProvider(null)}
                            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
                        />
                        <motion.div
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl z-50 overflow-y-auto"
                        >
                            <div className="p-8 space-y-8">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-2xl ${selectedProvider.bg} ${selectedProvider.color}`}>
                                            <selectedProvider.icon className="h-8 w-8" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-slate-900">{selectedProvider.label}</h2>
                                            <p className="text-slate-500 text-sm">Integration Guide</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setSelectedProvider(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                        <X className="h-6 w-6 text-slate-400" />
                                    </button>
                                </div>

                                {/* Status Banner */}
                                <div className={`p-4 rounded-xl border flex items-center gap-3 ${providerStats[selectedProvider.id].status === 'active' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                                    {providerStats[selectedProvider.id].status === 'active' ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Info className="h-5 w-5 text-slate-400" />}
                                    <div className="flex-1">
                                        <p className="text-sm font-bold">{providerStats[selectedProvider.id].status === 'active' ? 'Connection Active' : 'Waiting for Data'}</p>
                                        <p className="text-xs opacity-80">{providerStats[selectedProvider.id].count} leads synced so far.</p>
                                    </div>
                                </div>

                                {/* Webhook Endpoint */}
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                        <Webhook className="h-4 w-4 text-violet-500" /> Webhook Endpoint
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 bg-slate-900 text-slate-200 px-4 py-3 rounded-xl text-sm font-mono truncate border border-slate-800">
                                            {getBackendUrl()}{selectedProvider.endpoint}
                                        </code>
                                        <button
                                            onClick={() => copyToClipboard(`${getBackendUrl()}${selectedProvider.endpoint}`)}
                                            className="p-3 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-slate-600 font-bold"
                                        >
                                            Copy
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-500">Paste this URL into the destination configuration of {selectedProvider.label}.</p>
                                </div>

                                {/* Usage & Tips */}
                                <div className="space-y-4">
                                    <h3 className="font-bold text-slate-900 text-lg border-b border-slate-100 pb-2">Setup Instructions</h3>
                                    <p className="text-sm text-slate-600 leading-relaxed">{selectedProvider.docs.usage}</p>

                                    {selectedProvider.docs.tips && (
                                        <ul className="space-y-2">
                                            {selectedProvider.docs.tips.map((tip, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                                                    <span>{tip}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                                {/* Payload Example */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-bold text-slate-900 text-lg">Example Payload</h3>
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-1 rounded">JSON</span>
                                    </div>
                                    <div className="bg-slate-900 rounded-xl p-5 overflow-x-auto border border-slate-800 shadow-inner">
                                        <pre className="text-xs font-mono text-emerald-400 leading-relaxed">
                                            {JSON.stringify(selectedProvider.docs.payload, null, 2)}
                                        </pre>
                                    </div>
                                    <p className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                                        <Info className="h-3 w-3" />
                                        <span>Ensure generic providers (Zapier/Sheets) match this structure where possible.</span>
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
