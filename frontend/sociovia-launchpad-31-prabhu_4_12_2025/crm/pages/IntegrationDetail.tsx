import { useParams, Link } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { PROVIDERS, ProviderConfig } from "../providers";
import { GlassCard } from "../components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Info, Webhook, Copy, Activity } from "lucide-react";
import { api } from "../api";
import { useToast } from "@/hooks/use-toast";
import { Lead } from "../types";

export default function IntegrationDetail() {
    const { providerId } = useParams();
    const { toast } = useToast();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);

    const provider = PROVIDERS.find((p) => p.id === providerId);

    useEffect(() => {
        async function loadStats() {
            try {
                const data = await api.getLeads();
                setLeads(Array.isArray(data) ? data : []);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        loadStats();
    }, []);

    const stats = useMemo(() => {
        if (!provider) return { count: 0, lastSync: null, status: 'inactive' };
        const pid = provider.id.toLowerCase();
        const matches = leads.filter(l => {
            const src = (l.external_source || l.source || '').toLowerCase();
            if (pid === 'meta_leadgen' && (src.includes('meta') || src.includes('facebook') || src.includes('fb') || src.includes('instagram'))) return true;
            if (pid === 'sheets' && (src.includes('sheet') || src.includes('google'))) return true;
            return src.includes(pid);
        });
        const lastLead = matches.length > 0 ? matches.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())[0] : null;
        return {
            count: matches.length,
            lastSync: lastLead ? (lastLead.last_sync_at || lastLead.created_at || null) : null,
            status: matches.length > 0 ? 'active' : 'inactive'
        };
    }, [leads, provider]);

    const getBackendUrl = () => "https://rlcslwgm-5000.inc1.devtunnels.ms";

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Copied", description: "Copied to clipboard" });
    };

    if (!provider) return <div className="p-8">Provider not found</div>;

    return (
        <div className="max-w-4xl mx-auto pb-10 space-y-8">
            <div className="flex items-center gap-4">
                <Link to="/crm/settings">
                    <Button variant="ghost" size="icon" className="rounded-full">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${provider.bg} ${provider.color}`}>
                            <provider.icon className="h-6 w-6" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">{provider.label} Integration</h1>
                    </div>
                </div>
            </div>

            <GlassCard>
                {/* Status Banner */}
                <div className={`p-4 rounded-xl border flex items-center gap-3 mb-8 ${stats.status === 'active' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                    {stats.status === 'active' ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Info className="h-5 w-5 text-slate-400" />}
                    <div className="flex-1">
                        <p className="text-sm font-bold">{stats.status === 'active' ? 'Connection Active' : 'Waiting for Data'}</p>
                        <p className="text-xs opacity-80">{stats.count} leads synced so far.</p>
                    </div>
                    {stats.lastSync && <div className="text-xs font-mono bg-white/50 px-2 py-1 rounded">Last: {new Date(stats.lastSync).toLocaleDateString()}</div>}
                </div>

                {/* Configuration */}
                <div className="space-y-8">
                    <div className="space-y-2">
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <Webhook className="h-5 w-5 text-violet-500" /> Webhook Endpoint
                        </h3>
                        <p className="text-sm text-slate-500">Paste this URL into the {provider.label} configuration.</p>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 bg-slate-900 text-slate-200 px-4 py-3 rounded-xl text-sm font-mono truncate border border-slate-800">
                                {getBackendUrl()}{provider.endpoint}
                            </code>
                            <Button variant="outline" onClick={() => copyToClipboard(`${getBackendUrl()}${provider.endpoint}`)}>
                                <Copy className="h-4 w-4 mr-2" /> Copy
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">Instructions</h3>
                        <div className="text-sm text-slate-600 space-y-4">
                            <p>{provider.docs.usage}</p>
                            {provider.docs.tips && (
                                <ul className="space-y-2">
                                    {provider.docs.tips.map((tip, i) => (
                                        <li key={i} className="flex items-start gap-2 bg-slate-50 p-2 rounded-lg">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                                            <span>{tip}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-slate-900 flex items-center justify-between">
                            <span>Payload Schema</span>
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-1 rounded">JSON</span>
                        </h3>
                        <div className="bg-slate-900 rounded-xl p-6 overflow-x-auto border border-slate-800 shadow-inner">
                            <pre className="text-xs font-mono text-emerald-400 leading-relaxed">
                                {JSON.stringify(provider.docs.payload, null, 2)}
                            </pre>
                        </div>
                    </div>
                </div>
            </GlassCard>
        </div>
    );
}
