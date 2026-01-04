
import { motion, AnimatePresence } from "framer-motion";
import { X, Phone, Mail, Building, MapPin, Tag, Clock, Calendar, MessageSquare } from "lucide-react";
import { Contact } from "../types";
import { AnimatedButton } from "./ui/AnimatedButton";

interface ContactDetailsDrawerProps {
    contact: Contact | null;
    onClose: () => void;
    isOpen: boolean;
}

export function ContactDetailsDrawer({ contact, onClose, isOpen }: ContactDetailsDrawerProps) {
    if (!contact) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed inset-y-0 right-0 z-50 w-full bg-white shadow-2xl sm:w-[500px] border-l border-slate-100 flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 p-6">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-slate-600">
                                    {contact.name.charAt(0)}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900">{contact.name}</h2>
                                    <p className="text-sm text-slate-500">{contact.role} at {contact.company}</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">

                            {/* Quick Actions */}
                            <div className="flex gap-3">
                                <AnimatedButton className="flex-1 justify-center bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-200">
                                    <Phone className="h-4 w-4 mr-2" /> Call
                                </AnimatedButton>
                                <AnimatedButton className="flex-1 justify-center bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm">
                                    <Mail className="h-4 w-4 mr-2" /> Email
                                </AnimatedButton>
                            </div>

                            {/* Contact Info */}
                            <div>
                                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-3">
                                    <Tag className="h-4 w-4 text-slate-400" /> Contact Information
                                </h3>
                                <div className="space-y-3 pl-6 border-l-2 border-slate-100">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Email</span>
                                        <span className="font-medium text-slate-800">{contact.email}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Company</span>
                                        <span className="font-medium text-slate-800">{contact.company}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Last Contacted</span>
                                        <span className="font-medium text-slate-800">{contact.lastContacted}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Interaction History */}
                            <div>
                                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-3">
                                    <Clock className="h-4 w-4 text-slate-400" /> Interaction History
                                </h3>
                                <div className="relative space-y-4 pl-6 before:absolute before:left-[7px] before:top-2 before:h-full before:w-[2px] before:bg-slate-100">
                                    <div className="relative">
                                        <span className="absolute -left-[29px] top-1 h-4 w-4 rounded-full border-2 border-white bg-emerald-500 shadow-sm" />
                                        <p className="text-sm font-medium text-slate-800">Meeting Scheduled</p>
                                        <p className="text-xs text-slate-400">Yesterday</p>
                                    </div>
                                    <div className="relative">
                                        <span className="absolute -left-[29px] top-1 h-4 w-4 rounded-full border-2 border-white bg-blue-500 shadow-sm" />
                                        <p className="text-sm font-medium text-slate-800">Sent Proposal</p>
                                        <p className="text-xs text-slate-400">3 days ago</p>
                                    </div>
                                    <div className="relative">
                                        <span className="absolute -left-[29px] top-1 h-4 w-4 rounded-full border-2 border-white bg-slate-300 shadow-sm" />
                                        <p className="text-sm font-medium text-slate-800">Contact Added</p>
                                        <p className="text-xs text-slate-400">1 week ago</p>
                                    </div>
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-3">
                                    <MessageSquare className="h-4 w-4 text-slate-400" /> Private Notes
                                </h3>
                                <textarea
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none"
                                    rows={3}
                                    placeholder="Add private notes about this contact..."
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="border-t border-slate-100 p-4 bg-slate-50">
                            <button className="w-full rounded-xl border border-slate-300 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors">
                                Archive Contact
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
