import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
    ArrowLeft, Copy, CheckCircle2, Info, Webhook,
    RefreshCw, ExternalLink, Activity, Eye, EyeOff, LayoutGrid
} from "lucide-react";
import { api } from "../api";
import { PROVIDERS, ProviderId } from "../providers";
import { GlassCard } from "../components/ui/GlassCard";
import { useToast } from "@/hooks/use-toast";
import { Lead } from "../types";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { API_BASE_URL } from "@/config";

export default function IntegrationDetail() {
    const { providerId } = useParams<{ providerId: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<{
        totalLeads: number;
        lastSync: string | null;
        leadsOverTime: any[];
    }>({ totalLeads: 0, lastSync: null, leadsOverTime: [] });

    const [leads, setLeads] = useState<Lead[]>([]);
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [showKey, setShowKey] = useState(false);

    const provider = PROVIDERS.find(p => p.id === providerId);

    useEffect(() => {
        if (provider) {
            loadData();
        }
    }, [providerId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [fetchedLeads, fetchedSettings] = await Promise.all([
                api.getLeads(),
                api.getCRMSettings().catch(() => ({}))
            ]);

            setSettings(fetchedSettings || {});

            // Filter leads for this provider
            const providerLeads = (fetchedLeads || []).filter(l => {
                if (!providerId) return false;
                const src = (l.external_source || l.source || '').toLowerCase();
                const pid = providerId.toLowerCase();
                if (pid === 'meta_leadgen' && (src.includes('meta') || src.includes('facebook') || src.includes('fb') || src.includes('instagram'))) return true;
                if (pid === 'sheets' && (src.includes('sheet') || src.includes('google'))) return true;
                return src.includes(pid);
            });

            // Calculate stats
            const sortedLeads = [...providerLeads].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
            const lastLead = sortedLeads[0];

            // Chart Data (Last 7 days)
            const chartData = [];
            const now = new Date();
            for (let i = 6; i >= 0; i--) {
                const date = new Date(now);
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                const count = providerLeads.filter(l => (l.created_at || '').startsWith(dateStr)).length;
                chartData.push({ date: date.toLocaleDateString('en-US', { weekday: 'short' }), count });
            }

            setLeads(sortedLeads.slice(0, 10)); // Top 10 recent
            setStats({
                totalLeads: providerLeads.length,
                lastSync: lastLead ? (lastLead.last_sync_at || lastLead.created_at || null) : null,
                leadsOverTime: chartData
            });

        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to load integration details", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const getBackendUrl = () => `${API_BASE_URL}/api`;

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Copied", description: "Copied to clipboard" });
    };

    if (!provider) return <div className="p-10 text-center">Provider not found</div>;

    return (
        <div className="space-y-8 pb-10 max-w-7xl mx-auto px-4 sm:px-6 relative">
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-4">
                <button onClick={() => navigate('/crm/settings')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <ArrowLeft className="h-5 w-5 text-slate-500" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <span className={`p-1.5 rounded-lg ${provider.bg} ${provider.color}`}><provider.icon className="h-5 w-5" /></span>
                        {provider.label} Integration
                    </h1>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <div className={`px-3 py-1 rounded-full text-xs font-bold border ${stats.totalLeads > 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                        {stats.totalLeads > 0 ? 'Active Data Flow' : 'No Data Yet'}
                    </div>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content - Analytics & Activity */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Analytics Chart */}
                    <GlassCard>
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Activity className="h-5 w-5 text-violet-500" /> Leads Activity (Last 7 Days)
                        </h3>
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats.leadsOverTime}>
                                    <defs>
                                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} vertical={false} />
                                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                    <Area type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </GlassCard>

                    {/* Recent Leads Table */}
                    <GlassCard>
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <LayoutGrid className="h-5 w-5 text-slate-400" /> Recent Leads
                        </h3>
                        <div className="overflow-hidden rounded-xl border border-slate-100">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-bold border-b border-slate-100">
                                    <tr>
                                        <th className="px-4 py-3">Name</th>
                                        <th className="px-4 py-3">Email</th>
                                        <th className="px-4 py-3">Synced At</th>
                                        <th className="px-4 py-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {leads.length === 0 ? (
                                        <tr><td colSpan={4} className="p-4 text-center text-slate-400 italic">No recent leads found.</td></tr>
                                    ) : (
                                        leads.map(lead => (
                                            <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-4 py-3 font-medium text-slate-800">{lead.name}</td>
                                                <td className="px-4 py-3 text-slate-500">{lead.email}</td>
                                                <td className="px-4 py-3 text-slate-400 text-xs">{(lead.last_sync_at || lead.created_at) ? new Date(lead.last_sync_at || lead.created_at).toLocaleString() : '-'}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${lead.status === 'new' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                                                        {lead.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </GlassCard>
                </div>

                {/* Sidebar - Configuration */}
                <div className="space-y-6">
                    {/* Connection Config */}
                    <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl shadow-slate-900/10">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <Webhook className="h-5 w-5 text-violet-400" /> Connection Setup
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold uppercase text-slate-400 mb-1.5 block">Webhook URL</label>
                                <div className="flex gap-2">
                                    <code className="flex-1 bg-black/30 rounded-lg p-2.5 text-xs font-mono text-emerald-400 border border-white/10 break-all">
                                        {getBackendUrl()}{provider.endpoint}
                                    </code>
                                    <button onClick={() => copyToClipboard(`${getBackendUrl()}${provider.endpoint}`)} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors shrink-0">
                                        <Copy className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            {provider.id === 'meta_leadgen' && (
                                <div>
                                    <label className="text-xs font-bold uppercase text-slate-400 mb-1.5 block">Meta Verify Token</label>
                                    <div className="flex gap-2 items-center bg-black/30 rounded-lg p-2.5 border border-white/10">
                                        <code className="text-xs font-mono text-indigo-300 flex-1">
                                            {settings['meta_verify_token'] || "••••••••"}
                                        </code>
                                        <button onClick={() => copyToClipboard(settings['meta_verify_token'] || "")}>
                                            <Copy className="h-3.5 w-3.5 text-slate-400 hover:text-white" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="pt-4 border-t border-white/10">
                                <h4 className="font-bold text-sm mb-2">Instructions</h4>
                                <p className="text-xs text-slate-400 leading-relaxed mb-3">
                                    {provider.docs.usage}
                                </p>
                                {provider.docs.tips && (
                                    <ul className="space-y-1.5">
                                        {provider.docs.tips.map((tip, i) => (
                                            <li key={i} className="text-xs text-slate-500 flex items-start gap-1.5">
                                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                                <span>{tip}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Example Payload */}
                    <GlassCard className="bg-slate-50/50">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-sm text-slate-900">Example Payload</h3>
                            <span className="text-[10px] font-bold uppercase bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">JSON</span>
                        </div>
                        <pre className="text-[10px] font-mono bg-white p-3 rounded-xl border border-slate-200 text-slate-600 overflow-x-auto">
                            {JSON.stringify(provider.docs.payload, null, 2)}
                        </pre>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}
