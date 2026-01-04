import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { motion, AnimatePresence } from "framer-motion";
import { X, Phone, Mail, Calendar, MapPin, Tag, Clock, CheckCircle, AlertCircle, MessageSquare, Briefcase, ArrowRight, Edit2, Linkedin, Twitter, Globe, Facebook } from "lucide-react";
import { Lead, LeadActivity } from "../../types";
import { AnimatedButton } from "../ui/AnimatedButton";
import { GlassCard } from "../ui/GlassCard";
import { EditableField } from "../ui/EditableField";
import { TagInput } from "../ui/TagInput";
import { TaskList } from "../crm/TaskList";
import { FileList } from "../crm/FileList";
import { DealList } from "../crm/DealList";
import { useEffect, useState } from "react";
import { api } from "../../api";
import { formatDistanceToNow } from "date-fns";

interface LeadDrawerProps {
    lead: Lead | null;
    onClose: () => void;
    isOpen: boolean;
}

export function LeadDrawer({ lead: initialLead, onClose, isOpen }: LeadDrawerProps) {
    const [lead, setLead] = useState<Lead | null>(null);
    const [activity, setActivity] = useState<LeadActivity[]>([]);
    const [loadingActivity, setLoadingActivity] = useState(false);
    const [notes, setNotes] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [editMode, setEditMode] = useState(false);

    useEffect(() => {
        if (initialLead && isOpen) {
            setLead(initialLead);
            setNotes(initialLead.notes || "");
            loadActivity(initialLead.id);
            setEditMode(false);
        }
    }, [initialLead, isOpen]);

    const loadActivity = async (id: string) => {
        setLoadingActivity(true);
        try {
            const data = await api.getLeadActivity(id);
            setActivity(data);
        } catch (error) {
            console.error("Failed to load activity", error);
        } finally {
            setLoadingActivity(false);
        }
    };

    const handleUpdateField = async (field: keyof Lead, value: any) => {
        if (!lead) return;
        const updatedLead = { ...lead, [field]: value };
        setLead(updatedLead);
        try {
            await api.updateLead(lead.id, { [field]: value });
        } catch (e) {
            console.error("Failed to auto-save field", field, e);
        }
    };

    const handleUpdateSocial = async (platform: string, value: string) => {
        if (!lead) return;
        const updatedSocials = { ...lead.socials, [platform]: value };
        setLead({ ...lead, socials: updatedSocials });
        try {
            await api.updateLead(lead.id, { socials: updatedSocials });
        } catch (e) {
            console.error("Failed to update social", e);
        }
    }

    const handleAddTag = async (tag: string) => {
        if (!lead) return;
        const currentTags = lead.tags || [];
        if (!currentTags.includes(tag)) {
            const newTags = [...currentTags, tag];
            setLead({ ...lead, tags: newTags });
            try {
                await api.updateLead(lead.id, { tags: newTags });
            } catch (e) {
                console.error("Failed to add tag", e);
            }
        }
    };

    const handleRemoveTag = async (tagToRemove: string) => {
        if (!lead) return;
        const newTags = (lead.tags || []).filter(t => t !== tagToRemove);
        setLead({ ...lead, tags: newTags });
        try {
            await api.updateLead(lead.id, { tags: newTags });
        } catch (e) {
            console.error("Failed to remove tag", e);
        }
    };

    const handleSaveNotes = async () => {
        if (!lead) return;
        setIsSaving(true);
        try {
            await api.updateLead(lead.id, { notes });
        } catch (error) {
            console.error("Failed to save notes", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && lead && (
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
                        <div className="h-32 bg-gradient-to-br from-slate-900 to-slate-800 relative shrink-0">
                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                            <div className="absolute bottom-0 left-0 p-6 translate-y-1/2 flex items-end gap-4 w-full pr-6">
                                <div className="h-20 w-20 rounded-2xl bg-white p-1 shadow-lg shadow-black/10 shrink-0">
                                    <div className="h-full w-full bg-gradient-to-br from-violet-100 to-indigo-50 rounded-xl flex items-center justify-center text-2xl font-bold text-violet-600">
                                        {lead.name.charAt(0)}
                                    </div>
                                </div>
                                <div className="mb-0 flex-1 min-w-0 pb-1"> {/* Adjusted padding */}
                                    <h2 className="text-2xl font-bold text-white tracking-tight shadow-black/50 drop-shadow-sm truncate">{lead.name}</h2>
                                    <div className="flex items-center gap-3 text-slate-300 text-sm font-medium">
                                        <div className="flex items-center gap-2 bg-white/10 px-2 py-0.5 rounded-lg border border-white/10">
                                            <div className={`w-2 h-2 rounded-full ${lead.status === 'new' ? 'bg-blue-400' : lead.status === 'closed' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                                            <select
                                                value={lead.status}
                                                onChange={(e) => handleUpdateField("status", e.target.value)}
                                                className="bg-transparent border-none text-white text-xs font-bold uppercase focus:ring-0 cursor-pointer [&>option]:text-slate-900"
                                            >
                                                <option value="new">New</option>
                                                <option value="contacted">Contacted</option>
                                                <option value="qualified">Qualified</option>
                                                <option value="proposal">Proposal</option>
                                                <option value="closed">Closed</option>
                                            </select>
                                        </div>
                                        <span className="truncate opacity-80">{lead.email}</span>
                                    </div>

                                </div>
                                <div className="mb-4">
                                    <button
                                        onClick={() => setEditMode(!editMode)}
                                        className={`rounded-full p-2.5 transition-colors shadow-sm ${editMode ? 'bg-white text-violet-600' : 'bg-white/10 text-white hover:bg-white/20'}`}
                                        title="Toggle Edit Mode"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 rounded-full p-2 bg-white/10 hover:bg-white/20 text-white transition-colors backdrop-blur-sm"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto pt-14 px-8 pb-6 space-y-8 scrollbar-hide">

                            {/* Key Stats Row */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Score</p>
                                    <p className={`text-xl font-bold ${lead.score > 80 ? 'text-emerald-600' : 'text-slate-700'}`}>{lead.score}</p>
                                </div>
                                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Value</p>
                                    <EditableField
                                        value={lead.value?.toString() || "0"}
                                        onSave={(v) => handleUpdateField("value", parseFloat(v) || 0)}
                                        isEditing={editMode}
                                        className="justify-center"
                                    />
                                </div>
                                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Source</p>
                                    <EditableField
                                        value={lead.source}
                                        onSave={(v) => handleUpdateField("source", v)}
                                        isEditing={editMode}
                                        className="justify-center capitalize"
                                    />
                                </div>
                            </div>

                            {/* Editable Main Info */}
                            {editMode && (
                                <div className="bg-slate-50 p-4 rounded-2xl space-y-3 border border-slate-100">
                                    <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Edit Basic Info</h3>
                                    <EditableField
                                        label="Name"
                                        value={lead.name}
                                        onSave={(v) => handleUpdateField("name", v)}
                                        isEditing={true}
                                    />
                                    <EditableField
                                        label="Email"
                                        value={lead.email}
                                        onSave={(v) => handleUpdateField("email", v)}
                                        isEditing={true}
                                    />
                                    <EditableField
                                        label="Phone"
                                        value={lead.phone || ""}
                                        onSave={(v) => handleUpdateField("phone", v)}
                                        placeholder="Add Phone"
                                        isEditing={true}
                                    />
                                    <div className="grid grid-cols-2 gap-3">
                                        <EditableField
                                            label="Company"
                                            value={lead.company || ""}
                                            onSave={(v) => handleUpdateField("company", v)}
                                            placeholder="Company"
                                            isEditing={true}
                                        />
                                        <EditableField
                                            label="Role"
                                            value={lead.role || ""}
                                            onSave={(v) => handleUpdateField("role", v)}
                                            placeholder="Role"
                                            isEditing={true}
                                        />
                                    </div>
                                </div>
                            )}


                            {/* Quick Actions */}
                            <div className="flex gap-3">
                                <a
                                    href={`tel:${lead.phone}`}
                                    className={`flex-1 ${!lead.phone ? 'pointer-events-none opacity-50' : ''}`}
                                >
                                    <button className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-violet-200 transition-all flex items-center justify-center gap-2">
                                        <Phone className="h-4 w-4" /> Call Lead
                                    </button>
                                </a>
                                <a
                                    href={`mailto:${lead.email}`}
                                    className="flex-1"
                                >
                                    <button className="w-full py-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2">
                                        <Mail className="h-4 w-4" /> Send Email
                                    </button>
                                </a>
                            </div>

                            {/* Tags Section */}
                            <div>
                                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-3">
                                    <Tag className="h-4 w-4 text-slate-400" /> Tags
                                </h3>
                                <TagInput
                                    tags={lead.tags || []}
                                    onAddTag={handleAddTag}
                                    onRemoveTag={handleRemoveTag}
                                    suggestions={["Hot", "Cold", "Qualified", "New", "Referral", "Enterprise"]}
                                />
                            </div>

                            {/* Social Links */}
                            <div className="grid grid-cols-2 gap-4">
                                <EditableField
                                    label="LinkedIn"
                                    value={lead.socials?.linkedin || ""}
                                    onSave={(v) => handleUpdateSocial("linkedin", v)}
                                    placeholder="LinkedIn URL"
                                    isEditing={editMode}
                                />
                                <EditableField
                                    label="Twitter / X"
                                    value={lead.socials?.twitter || ""}
                                    onSave={(v) => handleUpdateSocial("twitter", v)}
                                    placeholder="Twitter URL"
                                    isEditing={editMode}
                                />
                                <EditableField
                                    label="Website"
                                    value={lead.socials?.website || ""}
                                    onSave={(v) => handleUpdateSocial("website", v)}
                                    placeholder="Website URL"
                                    isEditing={editMode}
                                />
                                <EditableField
                                    label="Facebook"
                                    value={lead.socials?.facebook || ""}
                                    onSave={(v) => handleUpdateSocial("facebook", v)}
                                    placeholder="Facebook URL"
                                    isEditing={editMode}
                                />
                            </div>


                            <hr className="border-slate-100" />

                            {/* Tasks Section */}
                            <div>
                                <TaskList entityId={lead.id} entityType="lead" />
                            </div>

                            <hr className="border-slate-100" />

                            {/* Files Section */}
                            <div>
                                <FileList entityId={lead.id} entityType="lead" />
                            </div>

                            <hr className="border-slate-100" />

                            {/* Deals Section */}
                            <div>
                                <DealList entityId={lead.id} entityType="lead" />
                            </div>

                            <hr className="border-slate-100" />

                            {/* Details Section */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm uppercase tracking-wide">
                                        <Briefcase className="h-4 w-4 text-slate-400" /> Interaction History
                                    </h3>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => {
                                                const note = prompt("Enter call summary:");
                                                if (note) {
                                                    api.addLeadActivity(lead.id, {
                                                        lead_id: lead.id,
                                                        type: 'call',
                                                        description: note,
                                                        created_at: new Date().toISOString()
                                                    }).then(() => loadActivity(lead.id));
                                                }
                                            }}
                                            className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-2 py-1 rounded transition-colors"
                                        >
                                            + Call
                                        </button>
                                        <button
                                            onClick={() => {
                                                const note = prompt("Enter note:");
                                                if (note) {
                                                    api.addLeadActivity(lead.id, {
                                                        lead_id: lead.id,
                                                        type: 'note',
                                                        description: note,
                                                        created_at: new Date().toISOString()
                                                    }).then(() => loadActivity(lead.id));
                                                }
                                            }}
                                            className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-2 py-1 rounded transition-colors"
                                        >
                                            + Note
                                        </button>
                                    </div>
                                </div>

                                <div className="relative pl-4 space-y-6 before:absolute before:left-[5px] before:top-2 before:bottom-0 before:w-[2px] before:bg-slate-100">
                                    {loadingActivity ? (
                                        <p className="text-xs text-slate-400 pl-4">Loading activity...</p>
                                    ) : activity.length === 0 ? (
                                        <p className="text-xs text-slate-400 pl-4">No activity recorded.</p>
                                    ) : (
                                        activity.map((item, idx) => (
                                            <div key={item.id || idx} className="relative pl-6">
                                                <div className={`absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-white ${item.type === 'deal_value' ? 'bg-violet-500' :
                                                    item.type === 'status_change' ? 'bg-amber-500' : 'bg-slate-300'
                                                    }`} />
                                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                    <p className="text-sm font-bold text-slate-800 capitalize">{item.type.replace('_', ' ')}</p>
                                                    <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                                                </div>
                                                <p className="text-[10px] font-bold text-slate-300 mt-1 pl-1">
                                                    {item.created_at ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true }) : "Just now"}
                                                </p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm uppercase tracking-wide">
                                    <MessageSquare className="h-4 w-4 text-slate-400" /> Internal Notes
                                </h3>
                                <textarea
                                    className="w-full rounded-2xl bg-amber-50 border border-amber-100 p-4 text-sm text-amber-900 placeholder-amber-400/70 outline-none resize-none focus:ring-2 focus:ring-amber-200/50"
                                    placeholder="Type a note..."
                                    rows={4}
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    onBlur={handleSaveNotes}
                                />
                                {isSaving && <p className="text-xs text-amber-500 mt-1">Saving...</p>}
                            </div>

                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-400">ID: {lead.id.substring(0, 8)}...</span>
                            <button className="flex items-center gap-2 text-sm font-bold text-violet-600 hover:text-violet-700">
                                View Full Profile <ArrowRight className="h-4 w-4" />
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
