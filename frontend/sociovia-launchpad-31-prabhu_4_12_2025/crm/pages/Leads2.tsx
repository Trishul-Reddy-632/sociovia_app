import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search, Plus, Filter, MoreVertical, Phone, Mail,
    Calendar, Tag, ArrowRight, User, Building, MapPin
} from "lucide-react";
import { api } from "../api";
import { Lead } from "../types";
import { AnimatedButton } from "../components/ui/AnimatedButton";

// Master-Detail Split View for High Volume Lead Processing
export default function Leads2() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLeads();
    }, []);

    const fetchLeads = async () => {
        setLoading(true);
        try {
            const data = await api.getLeads();
            setLeads(data || []);
            // Auto-select first lead if available
            if (data && data.length > 0 && !selectedLeadId) {
                setSelectedLeadId(data[0].id);
            }
        } catch (error) {
            console.error("Failed to fetch leads:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredLeads = leads.filter(l =>
        l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const selectedLead = leads.find(l => l.id === selectedLeadId);

    const handleStatusUpdate = async (newStatus: string) => {
        if (!selectedLead) return;
        try {
            // Optimistic update
            const updatedLead = { ...selectedLead, status: newStatus as any };
            setLeads(leads.map(l => l.id === selectedLead.id ? updatedLead : l));

            await api.updateLead(selectedLead.id, { status: newStatus as any });
        } catch (error) {
            console.error("Status update failed:", error);
            fetchLeads(); // Revert on error
        }
    };

    return (
        <div className="flex h-[calc(100vh-100px)] gap-6 overflow-hidden">
            {/* LEFT PANEL: LIST */}
            <div className="w-1/3 min-w-[320px] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Search Header */}
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search leads..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                        />
                    </div>
                    <div className="flex items-center justify-between mt-3">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            {filteredLeads.length} Leads
                        </span>
                        <div className="flex gap-2">
                            <button className="p-1.5 hover:bg-slate-200 rounded-md text-slate-500 transition-colors">
                                <Filter className="h-4 w-4" />
                            </button>
                            <button className="p-1.5 hover:bg-slate-200 rounded-md text-slate-500 transition-colors">
                                <Plus className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto scrollbar-thin">
                    {loading ? (
                        <div className="p-8 text-center text-slate-400">Loading...</div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {filteredLeads.map(lead => (
                                <div
                                    key={lead.id}
                                    onClick={() => setSelectedLeadId(lead.id)}
                                    className={`p-4 cursor-pointer transition-all hover:bg-slate-50 ${selectedLeadId === lead.id
                                            ? "bg-violet-50/60 border-l-4 border-violet-500 pl-[12px]"
                                            : "border-l-4 border-transparent"
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className={`font-semibold text-sm ${selectedLeadId === lead.id ? "text-violet-900" : "text-slate-900"}`}>
                                            {lead.name}
                                        </h4>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wide ${getStatusColor(lead.status)
                                            }`}>
                                            {lead.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 truncate mb-2">{lead.email}</p>
                                    <div className="flex items-center gap-3 text-xs text-slate-400">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            <span>{new Date(lead.lastInteraction).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Tag className="h-3 w-3" />
                                            <span>Score: {lead.score}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT PANEL: DETAIL */}
            <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                {selectedLead ? (
                    <>
                        {/* Detail Header */}
                        <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/30">
                            <div className="flex items-start gap-4">
                                <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center text-xl font-bold text-slate-500 border-2 border-white shadow-sm">
                                    {selectedLead.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900">{selectedLead.name}</h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-sm text-slate-500">{selectedLead.email}</span>
                                        <span className="h-1 w-1 bg-slate-300 rounded-full" />
                                        <span className="text-sm text-slate-500">{leadSourceLabel(selectedLead.source)}</span>
                                    </div>
                                    <div className="flex gap-2 mt-3">
                                        {['new', 'contacted', 'qualified', 'proposal', 'closed'].map((step) => (
                                            <button
                                                key={step}
                                                onClick={() => handleStatusUpdate(step)}
                                                className={`px-3 py-1 text-xs rounded-full border transition-all ${selectedLead.status === step
                                                        ? "bg-slate-900 text-white border-slate-900 shadow-md"
                                                        : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                                                    }`}
                                            >
                                                {step.charAt(0).toUpperCase() + step.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <AnimatedButton onClick={() => { }} className="bg-white text-slate-700 border border-slate-200 hover:bg-slate-50">
                                    <Phone className="h-4 w-4 mr-2" /> Call
                                </AnimatedButton>
                                <AnimatedButton>
                                    <Mail className="h-4 w-4 mr-2" /> Email
                                </AnimatedButton>
                            </div>
                        </div>

                        {/* Detail Body */}
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/10">
                            <div className="grid grid-cols-2 gap-6 mb-8">
                                <DetailCard title="Contact Info" icon={User}>
                                    <InfoRow label="Phone" value={selectedLead.phone} />
                                    <InfoRow label="Email" value={selectedLead.email} />
                                    <InfoRow label="Company" value="Acme Corp (Mock)" />
                                    <InfoRow label="Position" value="Marketing Manager" />
                                </DetailCard>
                                <DetailCard title="Location & System" icon={MapPin}>
                                    <InfoRow label="Address" value="123 Tech Blvd, San Francisco, CA" />
                                    <InfoRow label="Source" value={leadSourceLabel(selectedLead.source)} />
                                    <InfoRow label="Lead Score" value={selectedLead.score.toString()} />
                                    <InfoRow label="ID" value={selectedLead.id} />
                                </DetailCard>
                            </div>

                            {/* Activity Section Placeholder */}
                            <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4">Activity History</h3>
                                <div className="space-y-6">
                                    {/* Mock Activity Thread */}
                                    <div className="flex gap-4">
                                        <div className="flex flex-col items-center">
                                            <div className="h-2 w-2 rounded-full bg-slate-300 mt-2" />
                                            <div className="w-[1px] h-full bg-slate-200 my-1" />
                                        </div>
                                        <div className="pb-4">
                                            <p className="text-sm text-slate-800 font-medium">Lead Created</p>
                                            <p className="text-xs text-slate-500">Mar 1, 2024 at 10:00 AM</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex flex-col items-center">
                                            <div className="h-2 w-2 rounded-full bg-violet-500 mt-2 shadow-[0_0_0_4px_rgba(139,92,246,0.2)]" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-800 font-medium">Status changed to <span className="text-violet-600 font-bold">{selectedLead.status}</span></p>
                                            <p className="text-xs text-slate-500">Just now</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <User className="h-16 w-16 mb-4 opacity-20" />
                        <p>Select a lead to view details</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// Helpers
function getStatusColor(status: string) {
    switch (status) {
        case "new": return "bg-blue-100 text-blue-700";
        case "contacted": return "bg-amber-100 text-amber-700";
        case "qualified": return "bg-violet-100 text-violet-700";
        case "proposal": return "bg-pink-100 text-pink-700";
        case "closed": return "bg-emerald-100 text-emerald-700";
        default: return "bg-slate-100 text-slate-700";
    }
}

function leadSourceLabel(source: string) {
    return source === 'fb' ? 'Facebook Ads' : source === 'ig' ? 'Instagram Ads' : source;
}

function DetailCard({ title, icon: Icon, children }: { title: string, icon: any, children: React.ReactNode }) {
    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4 text-slate-400">
                <Icon className="h-4 w-4" />
                <h4 className="text-xs font-bold uppercase tracking-wider">{title}</h4>
            </div>
            <div className="space-y-3">
                {children}
            </div>
        </div>
    );
}

function InfoRow({ label, value }: { label: string, value: string }) {
    return (
        <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">{label}</span>
            <span className="font-medium text-slate-800">{value}</span>
        </div>
    );
}
