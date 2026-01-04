import { GlassCard } from "../components/ui/GlassCard";
import { AnimatedButton } from "../components/ui/AnimatedButton";
import { Campaign } from "../types";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight, Play, AlertCircle, Plus, Globe, Database } from "lucide-react";
import { api } from "../api";

export default function Campaigns() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [expandedRows, setExpandedRows] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewSource, setViewSource] = useState<"crm" | "live">("live");
    const navigate = useNavigate();

    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handleRefresh = () => {
        const cacheKey = `sv_crm_campaigns_${viewSource}`;
        localStorage.removeItem(cacheKey);
        setRefreshTrigger(prev => prev + 1);
    };

    useEffect(() => {
        const fetchCampaigns = async () => {
            setLoading(true);
            try {
                const cacheKey = `sv_crm_campaigns_${viewSource}`;
                const cached = localStorage.getItem(cacheKey);

                // 1. Check Cache
                if (cached) {
                    try {
                        const parsed = JSON.parse(cached);
                        const age = Date.now() - parsed.timestamp;
                        if (age < 30 * 60 * 1000) {
                            console.log(`Using cached ${viewSource} campaigns`);
                            setCampaigns(parsed.data || []);
                            setLoading(false);
                            return;
                        }
                    } catch (e) {
                        console.warn("Cache parse failed", e);
                    }
                }

                // 2. Fetch from API
                const response = viewSource === "crm"
                    ? await api.getCampaigns()
                    : await api.getLiveCampaigns();
                const data = response.data || [];
                setCampaigns(data);

                // 3. Save to Cache
                try {
                    localStorage.setItem(cacheKey, JSON.stringify({
                        timestamp: Date.now(),
                        data: data
                    }));
                } catch (e) { console.warn("Cache save failed", e); }

            } catch (error) {
                console.error("Failed to fetch campaigns:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchCampaigns();
    }, [viewSource, refreshTrigger]);

    const toggleRow = (id: string) => {
        setExpandedRows((prev) =>
            prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
        );
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const styles: Record<string, string> = {
            active: "bg-emerald-100 text-emerald-600 border-emerald-200",
            paused: "bg-amber-100 text-amber-600 border-amber-200",
            completed: "bg-blue-100 text-blue-600 border-blue-200",
            archived: "bg-slate-100 text-slate-500 border-slate-200",
            processing: "bg-blue-50 text-blue-500 border-blue-100"
        };

        // Fallback for unknown statuses
        const style = styles[status?.toLowerCase()] || "bg-slate-100 text-slate-600 border-slate-200";

        return (
            <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${style}`}
            >
                {status?.toLowerCase() === "active" && <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>}
                <span className="capitalize">{status}</span>
            </span>
        );
    };

    return (
        <div className="space-y-8 pb-10">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                    <h1 className="text-3xl font-bold text-slate-900">Campaigns</h1>
                    <p className="text-slate-500">
                        {viewSource === 'crm' ? 'Manage your internal CRM campaigns.' : 'View live campaigns directly from Meta.'}
                    </p>
                </motion.div>

                <div className="flex items-center gap-4">
                    {/* Source Toggle */}
                    <div className="flex p-1 bg-white border border-slate-200 rounded-xl shadow-sm">

                        <button
                            onClick={() => setViewSource("crm")}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${viewSource === 'crm' ? 'bg-violet-100 text-violet-700' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Database className="h-4 w-4" /> CRM
                        </button>
                        <button
                            onClick={() => setViewSource("live")}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${viewSource === 'live' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Globe className="h-4 w-4" /> Live Meta
                        </button>
                    </div>

                    <button
                        onClick={handleRefresh}
                        className="p-2 bg-white rounded-xl border border-slate-200 text-slate-500 hover:text-violet-600 hover:border-violet-200 shadow-sm transition-all"
                        title="Refresh List"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-rotate-cw"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /></svg>
                    </button>

                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                        <AnimatedButton>
                            <Plus className="h-4 w-4" /> New Campaign
                        </AnimatedButton>
                    </motion.div>
                </div>
            </div>

            {loading ? (
                <div className="flex h-60 w-full items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent"></div>
                        <p className="text-sm font-medium text-slate-400">Loading campaigns...</p>
                    </div>
                </div>
            ) : (
                <GlassCard className="p-0 overflow-visible text-slate-900">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4 font-bold">Campaign Name</th>
                                    <th className="px-6 py-4 font-bold">Status</th>
                                    <th className="px-6 py-4 font-bold text-right">Spend</th>
                                    <th className="px-6 py-4 font-bold text-right">Impr.</th>
                                    <th className="px-6 py-4 font-bold text-right">Clicks</th>
                                    <th className="px-6 py-4 font-bold text-right">Leads</th>
                                    <th className="px-6 py-4 font-bold text-right">ROAS</th>
                                    <th className="px-6 py-4 font-bold"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {campaigns.map((campaign) => {
                                    // Robust ID resolution for Live vs CRM campaigns
                                    const campaignId = campaign.id || (campaign as any).campaign_id || (campaign as any).id;

                                    if (!campaignId) return null; // Skip invalid rows

                                    return (
                                        <div key={campaignId} className="contents group">
                                            <tr
                                                className="cursor-pointer transition-colors hover:bg-slate-50"
                                                onClick={() => navigate(`/crm/campaigns/${campaignId}?source=${viewSource}`)}
                                            >
                                                <td className="px-6 py-4 font-bold text-slate-900 flex items-center gap-3">
                                                    <div className={`rounded-lg p-2 ${viewSource === 'crm' ? 'bg-violet-100 text-violet-600' : 'bg-blue-100 text-blue-600'}`}>
                                                        {campaign.objective === "Sales" ? <AlertCircle className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                                    </div>
                                                    <div>
                                                        {campaign.name}
                                                        {viewSource === 'live' && <span className="block text-[10px] text-slate-400 font-normal mt-0.5">ID: {campaignId}</span>}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <StatusBadge status={campaign.status} />
                                                </td>
                                                <td className="px-6 py-4 text-right font-medium">₹{campaign.spend?.toLocaleString() ?? 0}</td>
                                                <td className="px-6 py-4 text-right">{campaign.impressions?.toLocaleString() ?? 0}</td>
                                                <td className="px-6 py-4 text-right">{campaign.clicks?.toLocaleString() ?? 0}</td>
                                                <td className="px-6 py-4 text-right text-emerald-600 font-bold">{campaign.leads ?? 0}</td>
                                                <td className="px-6 py-4 text-right font-bold text-violet-600">{campaign.roas ?? 0}x</td>
                                                <td className="px-6 py-4 text-right">
                                                    <ChevronRight className="ml-auto h-4 w-4 text-slate-400 group-hover:text-slate-600" />
                                                </td>
                                            </tr>
                                            {/* Expanded Row Content */}
                                            <AnimatePresence>
                                                {expandedRows.includes(campaignId) && (
                                                    <tr className="bg-slate-50 shadow-inner">
                                                        <td colSpan={8} className="p-0">
                                                            <motion.div
                                                                initial={{ height: 0, opacity: 0 }}
                                                                animate={{ height: "auto", opacity: 1 }}
                                                                exit={{ height: 0, opacity: 0 }}
                                                                transition={{ duration: 0.3 }}
                                                                className="overflow-hidden"
                                                            >
                                                                <div className="p-6">
                                                                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                                                                        <h4 className="mb-4 font-bold text-slate-800">Ad Sets & Ad Details</h4>
                                                                        <div className="text-center text-slate-400 py-4">
                                                                            Ad set details for {campaign.name} would be fetched here via API drill-down.
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    );
                                })}
                            </tbody>
                        </table>
                        {campaigns.length === 0 && (
                            <div className="text-center py-10 text-slate-400">
                                <p>No {viewSource === 'crm' ? 'CRM' : 'live'} campaigns found.</p>
                            </div>
                        )}
                    </div>
                </GlassCard>
            )}
        </div>
    );
}
