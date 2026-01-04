import { motion, AnimatePresence } from "framer-motion";
import {
    X, Phone, Mail, Calendar, MapPin, Tag, Clock,
    CheckCircle, AlertCircle, MessageSquare, Briefcase,
    ArrowRight, DollarSign, Edit, Trash2, Ban, Archive
} from "lucide-react";
import { useState, useEffect } from "react";
import { Deal, LeadActivity } from "../types";
import { api } from "../api";

interface DealDetailsDrawerProps {
    deal: Deal | null;
    onClose: () => void;
    isOpen: boolean;
    onUpdate?: () => void;
}

const STAGES = [
    { id: "discovery", label: "Discovery" },
    { id: "proposal", label: "Proposal" },
    { id: "negotiation", label: "Negotiation" },
    { id: "closed_won", label: "Closed Won" },
    { id: "closed_lost", label: "Closed Lost" },
];

export function DealDetailsDrawer({ deal, onClose, isOpen, onUpdate }: DealDetailsDrawerProps) {
    const [activities, setActivities] = useState<any[]>([]);
    const [note, setNote] = useState("");
    const [loadingActivities, setLoadingActivities] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen && deal) {
            loadActivities();
        }
    }, [isOpen, deal]);

    const loadActivities = async () => {
        if (!deal) return;
        setLoadingActivities(true);
        try {
            const data = await api.getDealActivity(deal.id);
            setActivities(data || []);
        } catch (error) {
            console.error("Failed to load activities", error);
        } finally {
            setLoadingActivities(false);
        }
    };

    const handleAddNote = async () => {
        if (!deal || !note.trim()) return;
        setSaving(true);
        try {
            await api.addDealActivity(deal.id, {
                type: "note",
                description: note,
                title: "Note"
            });
            setNote("");
            loadActivities();
        } catch (error) {
            console.error("Failed to add note", error);
        } finally {
            setSaving(false);
        }
    };

    const handleStageChange = async (newStage: string) => {
        if (!deal) return;
        try {
            await api.changeDealStage(deal.id, newStage);
            if (onUpdate) onUpdate();
            // Optimistically update or just rely on parent refresh?
            // To be safe, we rely on parent refresh, but we could update local 'deal' prop if we controlled it.
            // Since 'deal' prop comes from parent, we can't mutate it easily without parent doing it.
            // But we can notify parent.
        } catch (error) {
            console.error("Failed to change stage", error);
        }
    };

    const handleDelete = async () => {
        if (!deal || !confirm("Are you sure you want to delete this deal?")) return;
        try {
            await api.deleteDeal(deal.id);
            onClose();
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Failed to delete deal", error);
        }
    };

    const handleCloseDeal = async (status: "won" | "lost") => {
        if (!deal) return;
        try {
            await api.closeDeal(deal.id, status, `Marked as ${status} via drawer`);
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error(`Failed to mark deal as ${status}`, error);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && deal && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[2px]"
                    />

                    {/* Floating Drawer Panel */}
                    <motion.div
                        initial={{ x: "100%", opacity: 0.5 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: "100%", opacity: 0 }}
                        transition={{ type: "spring", damping: 30, stiffness: 300, mass: 0.8 }}
                        className="fixed inset-y-2 right-2 z-50 w-full max-w-lg bg-white/95 backdrop-blur-xl shadow-2xl rounded-2xl border border-white/20 flex flex-col overflow-hidden ring-1 ring-black/5"
                    >
                        {/* Header Image/Gradient */}
                        <div className="h-40 bg-gradient-to-br from-violet-900 to-slate-900 relative shrink-0">
                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 rounded-full p-2 bg-white/10 hover:bg-white/20 text-white transition-colors backdrop-blur-sm z-10"
                            >
                                <X className="h-5 w-5" />
                            </button>

                            <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-slate-900/80 to-transparent">
                                <h2 className="text-2xl font-bold text-white tracking-tight drop-shadow-sm line-clamp-2">{deal.name}</h2>
                                <div className="flex items-center gap-3 mt-2 text-slate-300 text-sm font-medium">
                                    <span className="bg-white/20 px-2 py-0.5 rounded text-white text-xs uppercase tracking-wider backdrop-blur-md border border-white/10">
                                        {deal.stage.replace('_', ' ')}
                                    </span>
                                    {deal.company && (
                                        <span className="flex items-center gap-1">
                                            <Briefcase className="h-3 w-3" /> {deal.company}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto pt-6 px-6 pb-6 space-y-8 scrollbar-hide">

                            {/* Key Stats Row */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
                                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">Value</p>
                                    <p className="text-2xl font-bold text-slate-800 flex items-center gap-1">
                                        <DollarSign className="h-5 w-5 text-emerald-500" />
                                        {deal.value?.toLocaleString() || '0'}
                                    </p>
                                </div>
                                <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
                                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">Probability</p>
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${deal.probability > 70 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                                style={{ width: `${deal.probability}%` }}
                                            />
                                        </div>
                                        <span className="font-bold text-slate-700">{deal.probability}%</span>
                                    </div>
                                </div>
                            </div>

                            {/* Stage Selector */}
                            <div>
                                <label className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2 block">Current Stage</label>
                                <div className="grid grid-cols-1 gap-2">
                                    <select
                                        value={deal.stage}
                                        onChange={(e) => handleStageChange(e.target.value)}
                                        className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-medium outline-none focus:ring-2 focus:ring-violet-500/20"
                                    >
                                        {STAGES.map(s => (
                                            <option key={s.id} value={s.id}>{s.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="flex flex-wrap gap-3">
                                <button
                                    onClick={() => handleCloseDeal("won")}
                                    className="flex-1 min-w-[120px] py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                                >
                                    <CheckCircle className="h-4 w-4" /> Mark Won
                                </button>
                                <button
                                    onClick={() => handleCloseDeal("lost")}
                                    className="flex-1 min-w-[120px] py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                                >
                                    <Ban className="h-4 w-4" /> Mark Lost
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl font-bold transition-all flex items-center justify-center"
                                    title="Delete Deal"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>

                            <hr className="border-slate-100" />

                            {/* Activity Section */}
                            <div className="space-y-4">
                                <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm uppercase tracking-wide">
                                    <MessageSquare className="h-4 w-4 text-slate-400" /> Activity & Notes
                                </h3>

                                {/* Add Note */}
                                <div className="relative">
                                    <textarea
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        className="w-full rounded-2xl bg-amber-50/50 border border-amber-100 p-4 pb-12 text-sm text-slate-700 placeholder-slate-400 outline-none resize-none focus:ring-2 focus:ring-amber-200/50 transition-all"
                                        placeholder="Type a note about this deal..."
                                        rows={3}
                                    />
                                    <div className="absolute bottom-3 right-3">
                                        <button
                                            onClick={handleAddNote}
                                            disabled={saving || !note.trim()}
                                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {saving ? "Saving..." : "Add Note"}
                                        </button>
                                    </div>
                                </div>

                                {/* Activity List */}
                                <div className="relative pl-4 space-y-6 before:absolute before:left-[5px] before:top-2 before:bottom-0 before:w-[2px] before:bg-slate-100">
                                    {loadingActivities ? (
                                        <div className="pl-6 text-sm text-slate-400 italic">Loading activity...</div>
                                    ) : activities.length === 0 ? (
                                        <div className="pl-6 text-sm text-slate-400 italic">No activity recorded yet.</div>
                                    ) : (
                                        activities.map((act) => (
                                            <div key={act.id} className="relative pl-6 group">
                                                <div className={`absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-white ${act.type === 'note' ? 'bg-amber-400' : 'bg-violet-400'}`} />
                                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 group-hover:bg-white group-hover:shadow-sm transition-all">
                                                    <div className="flex justify-between items-start">
                                                        <p className="text-sm font-bold text-slate-800">{act.title || "Activity"}</p>
                                                        <span className="text-[10px] text-slate-400 font-medium">
                                                            {act.timestamp ? new Date(act.timestamp).toLocaleDateString() : ""}
                                                        </span>
                                                    </div>
                                                    {act.description && (
                                                        <p className="text-xs text-slate-500 mt-1 whitespace-pre-wrap">{act.description}</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
                            <span>Created: {new Date(deal.created_at).toLocaleDateString()}</span>
                            <span>ID: {deal.id.substring(0, 8)}...</span>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
