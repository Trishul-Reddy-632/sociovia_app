import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Save, Play, Pause, AlertCircle, Layers, CheckCircle, Percent, MousePointerClick, TrendingUp, Info } from "lucide-react";
import { api } from "../api";
import { Campaign } from "../types";
import { GlassCard } from "../components/ui/GlassCard";
import { AnimatedButton } from "../components/ui/AnimatedButton";

const TAB_VARIANTS = {
    active: { borderBottom: "2px solid #8b5cf6", color: "#6d28d9" },
    inactive: { borderBottom: "2px solid transparent", color: "#64748b" }
};

export default function CampaignDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"overview" | "adsets" | "ads">("overview");
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Partial<Campaign>>({});

    // Check if we are viewing a 'Live' campaign from parameters
    const queryParams = new URLSearchParams(location.search);
    const isLive = queryParams.get("source") === "live";

    useEffect(() => {
        if (!id) return;
        const fetchCampaign = async () => {
            setLoading(true);
            try {
                if (isLive) {
                    const data = await api.getLiveCampaignDetails(id);
                    setCampaign(data);
                    // Live campaigns might have different structure, ensure mapping if needed
                    // For now assuming backend returns compatible Campaign structure
                    setFormData(data || {});
                } else {
                    const data = await api.getCampaign(id);
                    setCampaign(data);
                    setFormData(data || {});
                }
            } catch (error) {
                console.error("Failed to fetch campaign", error);
            } finally {
                setLoading(false);
            }
        };
        fetchCampaign();
    }, [id, isLive]);

    const handleSave = async () => {
        if (!id || !campaign) return;
        setLoading(true);
        try {
            const updated = await api.updateCampaign(id, formData);
            setCampaign(updated);
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to update campaign", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" /></div>;
    if (!campaign) return <div className="flex h-screen items-center justify-center text-slate-500">Campaign not found</div>;

    return (
        <div className="min-h-screen bg-[#F1F5F9] p-6 lg:p-10 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate("/crm/campaigns")} className="p-2 hover:bg-white/50 rounded-full transition-colors text-slate-500">
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-3xl font-bold text-slate-900">{isEditing ? "Edit Campaign" : campaign.name}</h1>
                            {!isEditing && (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide border 
                                     ${campaign.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                                    {campaign.status}
                                </span>
                            )}
                        </div>
                        <p className="text-slate-500 text-sm">ID: {campaign.id}</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    {isEditing ? (
                        <>
                            <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-white/50 rounded-xl transition-colors">Cancel</button>
                            <AnimatedButton onClick={handleSave} className="bg-violet-600 text-white"><Save className="h-4 w-4 mr-2" /> Save Changes</AnimatedButton>
                        </>
                    ) : (
                        <>
                            <button onClick={() => navigate(`${location.pathname}/analytics`)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-sm transition-colors flex items-center gap-2">
                                <TrendingUp className="h-4 w-4" /> View Analytics
                            </button>
                            <AnimatedButton onClick={() => setIsEditing(true)} className="bg-white text-violet-700 border border-violet-100">Edit Campaign</AnimatedButton>
                        </>
                    )}
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Main Details */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex gap-6 border-b border-slate-200 pb-1">
                        {['overview', 'adsets', 'ads'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`pb-3 text-sm font-medium capitalize transition-all ${activeTab === tab ? 'text-violet-600 border-b-2 border-violet-600' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    <AnimatePresence mode="wait">
                        {activeTab === 'overview' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                                <GlassCard className="p-6">
                                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><Info className="h-4 w-4 text-violet-500" /> Campaign Configuration</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-400 uppercase">Campaign Name</label>
                                            {isEditing ? (
                                                <input className="w-full p-2 rounded-lg border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-violet-500 outline-none transition-all" value={formData.name || ""} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                            ) : (
                                                <p className="font-medium text-slate-800 text-lg">{campaign.name}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-400 uppercase">Objective</label>
                                            {isEditing ? (
                                                <select className="w-full p-2 rounded-lg border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-violet-500 outline-none transition-all" value={formData.objective || "Awareness"} onChange={e => setFormData({ ...formData, objective: e.target.value })}>
                                                    <option>Awareness</option><option>Traffic</option><option>Engagement</option><option>Leads</option><option>Sales</option>
                                                </select>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 bg-violet-100 rounded-lg text-violet-600"><Layers className="h-4 w-4" /></div>
                                                    <p className="font-medium text-slate-800">{campaign.objective}</p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-400 uppercase">Daily Budget</label>
                                            {isEditing ? (
                                                <input type="number" className="w-full p-2 rounded-lg border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-violet-500 outline-none transition-all" value={formData.budget || 0} onChange={e => setFormData({ ...formData, budget: Number(e.target.value) })} />
                                            ) : (
                                                <p className="font-medium text-emerald-600 text-lg">${Number(campaign.budget || 0).toLocaleString()}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-400 uppercase">Status</label>
                                            {isEditing ? (
                                                <select className="w-full p-2 rounded-lg border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-violet-500 outline-none transition-all" value={formData.status || "paused"} onChange={e => setFormData({ ...formData, status: e.target.value as any })}>
                                                    <option value="active">Active</option><option value="paused">Paused</option><option value="completed">Completed</option>
                                                </select>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    {campaign.status === 'active' ? <Play className="h-4 w-4 text-emerald-500" /> : <Pause className="h-4 w-4 text-amber-500" />}
                                                    <span className="capitalize font-medium text-slate-800">{campaign.status}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </GlassCard>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <MetricCard label="Spend" value={`$${campaign.spend.toLocaleString()}`} icon={AlertCircle} color="text-slate-600" bg="bg-slate-100" />
                                    <MetricCard label="Impressions" value={campaign.impressions.toLocaleString()} icon={Layers} color="text-blue-600" bg="bg-blue-100" />
                                    <MetricCard label="Clicks" value={campaign.clicks.toLocaleString()} icon={MousePointerClick} color="text-violet-600" bg="bg-violet-100" />
                                </div>
                            </motion.div>
                        )}
                        {activeTab === 'adsets' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                                {campaign.meta?.adsets?.length ? (
                                    campaign.meta.adsets.map((adset: any) => (
                                        <GlassCard key={adset.id} className="p-4 flex items-center justify-between group hover:bg-slate-50 transition-colors">
                                            <div>
                                                <h4 className="font-bold text-slate-900 text-lg">{adset.name}</h4>
                                                <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${adset.effective_status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                                        {adset.effective_status}
                                                    </span>
                                                    <span>Budget: ${adset.daily_budget || adset.lifetime_budget || 0}</span>
                                                    {adset.targeting?.geo_locations && (
                                                        <span>
                                                            Targeting: {
                                                                adset.targeting.geo_locations.countries?.join(", ") ||
                                                                adset.targeting.geo_locations.regions?.map((r: any) => r.name).join(", ") ||
                                                                adset.targeting.geo_locations.cities?.map((c: any) => c.name).join(", ") ||
                                                                "Custom"
                                                            }
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <button onClick={() => setActiveTab('ads')} className="text-xs bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-3 py-1.5 rounded-lg shadow-sm transition-colors">View Ads</button>
                                            </div>
                                        </GlassCard>
                                    ))
                                ) : (
                                    <div className="text-center py-10 text-slate-400">
                                        <Layers className="h-10 w-10 mx-auto mb-3 opacity-30" />
                                        <p>No ad sets found or not connected to Meta.</p>
                                    </div>
                                )}
                            </motion.div>
                        )}
                        {activeTab === 'ads' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                                <AdsList campaignId={campaign.id} isLive={isLive} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Right: Quick Actions / Helpers */}
                <div className="space-y-6">
                    <GlassCard>
                        <h3 className="font-bold text-slate-900 mb-4">Quick Optimization</h3>
                        <div className="space-y-3">
                            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex gap-3">
                                <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
                                <div>
                                    <h4 className="text-sm font-bold text-emerald-800">Scaling Opportunity</h4>
                                    <p className="text-xs text-emerald-600 mt-1">This campaign has a high ROAS ({campaign.roas}x). Consider increasing budget by 20%.</p>
                                </div>
                            </div>
                            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 flex gap-3">
                                <Percent className="h-5 w-5 text-blue-600 shrink-0" />
                                <div>
                                    <h4 className="text-sm font-bold text-blue-800">CTR is Healthy</h4>
                                    <p className="text-xs text-blue-600 mt-1">Click-through rate is above industry average.</p>
                                </div>
                            </div>
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}

function MetricCard({ label, value, icon: Icon, color, bg }: any) {
    return (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-lg ${bg} ${color}`}>
                <Icon className="h-5 w-5" />
            </div>
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase">{label}</p>
                <p className="text-xl font-bold text-slate-900">{value}</p>
            </div>
        </div>
    );
}

function AdsList({ campaignId, isLive }: { campaignId: string, isLive: boolean }) {
    const [ads, setAds] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [previewHtml, setPreviewHtml] = useState<string | null>(null);
    const [previewAdName, setPreviewAdName] = useState("");
    const [previewLoading, setPreviewLoading] = useState(false);

    useEffect(() => {
        const fetchAds = async () => {
            setLoading(true);
            try {
                if (isLive) {
                    const data = await api.getLiveCampaignAds(campaignId);
                    setAds(data);
                } else {
                    setAds([]);
                }
            } catch (error) {
                console.error("Failed to fetch ads", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAds();
    }, [campaignId, isLive]);

    const handlePreview = async (adId: string, adName: string) => {
        setPreviewLoading(true);
        setPreviewAdName(adName);
        setPreviewHtml(null);
        try {
            const html = await api.getAdPreview(adId);
            setPreviewHtml(html);
        } catch (error) {
            console.error("Failed to load preview", error);
            setPreviewHtml("<div style='padding:20px;text-align:center;'>Failed to load preview</div>");
        } finally {
            setPreviewLoading(false);
        }
    };

    const closePreview = () => {
        setPreviewHtml(null);
        setPreviewAdName("");
    };

    if (loading) return <div className="text-center py-10 text-slate-400">Loading ads...</div>;

    if (ads.length === 0) {
        return (
            <div className="text-center py-10 text-slate-400">
                <MousePointerClick className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No ads found for this campaign.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-4 relative">
            {ads.map((ad: any) => (
                <GlassCard key={ad.id} className="p-4 flex items-center gap-4 group hover:bg-slate-50 transition-colors">
                    <div className="h-16 w-16 bg-slate-100 rounded-lg overflow-hidden shrink-0 border border-slate-200">
                        {ad.creative?.thumbnail_url ? (
                            <img src={ad.creative.thumbnail_url} alt={ad.name} className="h-full w-full object-cover" />
                        ) : (
                            <div className="h-full w-full flex items-center justify-center text-slate-300"><Layers className="h-6 w-6" /></div>
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-900 truncate">{ad.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${ad.effective_status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                {ad.effective_status || ad.status}
                            </span>
                            <span className="text-xs text-slate-500 truncate">ID: {ad.id}</span>
                        </div>
                        {ad.creative?.title && <p className="text-xs font-medium text-slate-700 mt-1 truncate">{ad.creative.title}</p>}
                        {(ad.creative?.body || ad.creative?.object_story_spec?.link_data?.message) && (
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                                {ad.creative?.body || ad.creative?.object_story_spec?.link_data?.message}
                            </p>
                        )}
                    </div>

                    <div className="text-right">
                        <button onClick={() => handlePreview(ad.id, ad.name)} className="text-xs font-bold text-violet-600 hover:text-violet-800 border border-violet-100 px-3 py-1.5 rounded-lg hover:bg-violet-50 transition-colors">Preview</button>
                    </div>
                </GlassCard>
            ))}

            <AnimatePresence>
                {(previewHtml || previewLoading) && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={closePreview}>
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative" onClick={e => e.stopPropagation()}>
                            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <h3 className="font-bold text-slate-800 truncate pr-4">Preview: {previewAdName}</h3>
                                <button onClick={closePreview} className="p-1 hover:bg-slate-200 rounded-full transition-colors"><div className="h-5 w-5 rounded-full bg-slate-300 relative"><span className="absolute inset-0 m-auto h-0.5 w-3 bg-slate-500 rotate-45 transform origin-center top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></span><span className="absolute inset-0 m-auto h-0.5 w-3 bg-slate-500 -rotate-45 transform origin-center top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></span></div></button>
                            </div>
                            <div className="h-[750px] w-full bg-slate-100 flex items-center justify-center relative overflow-auto p-4">
                                {previewLoading ? (
                                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
                                ) : (
                                    <div
                                        className="preview-container shadow-lg rounded-lg overflow-hidden"
                                        dangerouslySetInnerHTML={{ __html: previewHtml || "" }}
                                    />
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
