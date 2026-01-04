import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { motion, AnimatePresence } from "framer-motion";
import { X, Phone, Mail, Calendar, MapPin, Tag, Clock, CheckCircle, AlertCircle, MessageSquare, Briefcase, ArrowRight } from "lucide-react";
import { Lead } from "../types";
import { AnimatedButton } from "./ui/AnimatedButton";
import { GlassCard } from "./ui/GlassCard";

interface LeadDetailsDrawerProps {
    lead: Lead | null;
    onClose: () => void;
    isOpen: boolean;
}

export function LeadDetailsDrawer({ lead, onClose, isOpen }: LeadDetailsDrawerProps) {
    // We render null but rely on AnimatePresence in the parent or handle it here. 
    // The previous implementation used AnimatePresence *inside*. We will keep that pattern.

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
                            <div className="absolute bottom-0 left-0 p-6 translate-y-1/2 flex items-end gap-4">
                                <div className="h-20 w-20 rounded-2xl bg-white p-1 shadow-lg shadow-black/10">
                                    <div className="h-full w-full bg-gradient-to-br from-violet-100 to-indigo-50 rounded-xl flex items-center justify-center text-2xl font-bold text-violet-600">
                                        {lead.name.charAt(0)}
                                    </div>
                                </div>
                                <div className="mb-8">
                                    <h2 className="text-2xl font-bold text-white tracking-tight shadow-black/50 drop-shadow-sm">{lead.name}</h2>
                                    <p className="text-slate-300 text-sm font-medium flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${lead.status === 'new' ? 'bg-blue-400' : 'bg-emerald-400'}`} />
                                        {lead.email}
                                    </p>
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
                                    <p className="text-xl font-bold text-slate-700">${lead.value?.toLocaleString() || '0'}</p>
                                </div>
                                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Source</p>
                                    <p className="text-lg font-bold text-slate-700 capitalize">{lead.source}</p>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="flex gap-3">
                                <button className="flex-1 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-violet-200 transition-all flex items-center justify-center gap-2">
                                    <Phone className="h-4 w-4" /> Call Lead
                                </button>
                                <button className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2">
                                    <Mail className="h-4 w-4" /> Send Email
                                </button>
                            </div>

                            <hr className="border-slate-100" />

                            {/* Details Section */}
                            <div className="space-y-4">
                                <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm uppercase tracking-wide">
                                    <Briefcase className="h-4 w-4 text-slate-400" /> Interaction History
                                </h3>

                                <div className="relative pl-4 space-y-6 before:absolute before:left-[5px] before:top-2 before:bottom-0 before:w-[2px] before:bg-slate-100">
                                    <div className="relative pl-6">
                                        <div className="absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full bg-violet-500 ring-4 ring-white" />
                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                            <p className="text-sm font-bold text-slate-800">Deal Value Updated</p>
                                            <p className="text-xs text-slate-500 mt-0.5">Value increased to ${lead.value}</p>
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-300 mt-1 pl-1">Just now</p>
                                    </div>
                                    <div className="relative pl-6">
                                        <div className="absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full bg-slate-300 ring-4 ring-white" />
                                        <div className="p-1">
                                            <p className="text-sm font-medium text-slate-600">Lead Created from {lead.source}</p>
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-300 mt-1 pl-1">{lead.lastInteraction}</p>
                                    </div>
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
                                />
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
