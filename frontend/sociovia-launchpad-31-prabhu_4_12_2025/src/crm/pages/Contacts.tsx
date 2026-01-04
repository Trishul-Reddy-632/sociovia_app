import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search, Plus, Filter, MoreVertical, Phone, Mail,
    Calendar, User, Building, MapPin, ArrowUpRight,
    RefreshCw, Trash2, Edit2
} from "lucide-react";
import { Contact } from "../types";
import { api } from "../api";
import { ContactDrawer } from "../components/drawers/ContactDrawer";
import { AnimatedButton } from "../components/ui/AnimatedButton";
import { formatDistanceToNow } from "date-fns";

export default function Contacts() {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    useEffect(() => {
        fetchContacts();
    }, [refreshTrigger]);

    useEffect(() => {
        const lowerQuery = searchQuery.toLowerCase();
        setFilteredContacts(
            contacts.filter(c =>
                (c.name || "").toLowerCase().includes(lowerQuery) ||
                (c.email || "").toLowerCase().includes(lowerQuery) ||
                (c.company || "").toLowerCase().includes(lowerQuery)
            )
        );
    }, [searchQuery, contacts]);

    const fetchContacts = async () => {
        setLoading(true);
        try {
            const cacheKey = "sv_crm_contacts";
            // Simple cache strategy
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Date.now() - parsed.timestamp < 5 * 60 * 1000) { // 5 min cache
                    setContacts(parsed.data || []);
                    setLoading(false);
                }
            }

            const data = await api.getContacts();
            setContacts(data || []);
            localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data }));
        } catch (error) {
            console.error("Failed to fetch contacts", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        localStorage.removeItem("sv_crm_contacts");
        setRefreshTrigger(prev => prev + 1);
    };

    const handleDeleteContact = async (id: string) => {
        if (!confirm("Are you sure you want to delete this contact? This action cannot be undone.")) return;

        try {
            await api.deleteContact(id);
            setContacts(prev => prev.filter(c => c.id !== id));
            localStorage.removeItem("sv_crm_contacts");
        } catch (error) {
            console.error("Failed to delete contact", error);
            alert("Failed to delete contact. Please try again.");
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-50/50">
            {/* Header */}
            <div className="flex-none px-4 md:px-8 py-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Contacts</h1>
                        <p className="text-slate-500 text-sm mt-1">Manage relationships with your key stakeholders.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleRefresh}
                            className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-violet-600 hover:border-violet-200 transition-all shadow-sm"
                            title="Refresh Data"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <AnimatedButton onClick={() => setIsCreateOpen(true)} className="bg-violet-600 text-white hover:bg-violet-700 shadow-lg shadow-violet-200">
                            <Plus className="h-4 w-4 mr-2" /> Add Contact
                        </AnimatedButton>
                    </div>
                </div>

                {/* Search & Filter Bar */}
                <div className="flex flex-col md:flex-row md:items-center gap-4 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
                    {/* ... (Search input code remains same, omitted for brevity in replace block if possible, but replace_file_content needs context. I will perform multi_replace to handle function add and button add separately if needed, but replace_file_content is safer for big blocks. Let's try multi_replace for precision.) */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by name, email, or company..."
                            className="w-full pl-10 pr-4 py-2 text-sm bg-transparent border-none outline-none placeholder:text-slate-400 text-slate-900"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="w-[1px] h-6 bg-slate-100" />
                    <div className="flex items-center gap-2 pr-2">
                        <span className="text-xs font-medium text-slate-500 hidden sm:inline-block px-2">
                            {filteredContacts.length} Contacts
                        </span>
                        <button className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-100 transition-all flex items-center gap-2">
                            <Filter className="h-3 w-3" /> Filter
                        </button>
                    </div>
                </div>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-hidden px-4 md:px-8 pb-8">
                <div className="h-full bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                    {/* Table Header */}
                    <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b border-slate-100 bg-slate-50/50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        <div className="col-span-4 pl-2">Name</div>
                        <div className="col-span-3">Contact Info</div>
                        <div className="col-span-3">Role & Company</div>
                        <div className="col-span-2 text-right pr-4">Actions</div>
                    </div>

                    {/* Table Body */}
                    <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-40">
                                <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent mb-2"></div>
                                <p className="text-xs text-slate-400">Loading contacts...</p>
                            </div>
                        ) : filteredContacts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-center">
                                <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                    <User className="h-8 w-8 text-slate-300" />
                                </div>
                                <h3 className="text-sm font-bold text-slate-900">No contacts found</h3>
                                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                                    {searchQuery ? "Try adjusting your search terms." : "Get started by adding your first contact."}
                                </p>
                                {!searchQuery && (
                                    <button
                                        onClick={() => setIsCreateOpen(true)}
                                        className="mt-4 text-xs font-bold text-violet-600 hover:text-violet-700 hover:underline"
                                    >
                                        Create Contact
                                    </button>
                                )}
                            </div>
                        ) : (
                            filteredContacts.map((contact) => (
                                <div
                                    key={contact.id}
                                    onClick={() => setSelectedContact(contact)}
                                    className="group flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-4 p-4 items-start md:items-center border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors relative"
                                >
                                    {/* Name Column */}
                                    <div className="w-full md:w-auto md:col-span-4 flex items-center gap-3 md:pl-2">
                                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-100 to-fuchsia-50 border border-violet-100 flex items-center justify-center text-sm font-bold text-violet-700 shrink-0">
                                            {contact.avatar ? (
                                                <img src={contact.avatar} alt={contact.name} className="h-full w-full object-cover rounded-full" />
                                            ) : (
                                                (contact.name || "?").charAt(0).toUpperCase()
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="text-sm font-bold text-slate-900 truncate group-hover:text-violet-700 transition-colors">
                                                {contact.name || "Unknown Contact"}
                                            </h4>
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                <span className={`w-1.5 h-1.5 rounded-full ${contact.status === 'archived' ? 'bg-slate-300' : 'bg-emerald-400'}`}></span>
                                                <span className="capitalize">{contact.status || 'Active'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Contact Info Column */}
                                    <div className="w-full md:w-auto md:col-span-3 flex flex-col justify-center gap-1 pl-[52px] md:pl-0">
                                        <div className="flex items-center gap-2 text-sm text-slate-600 truncate">
                                            <Mail className="h-3.5 w-3.5 text-slate-400" />
                                            <span className="truncate">{contact.email}</span>
                                        </div>
                                        {contact.phone && (
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <Phone className="h-3.5 w-3.5 text-slate-400" />
                                                <span>{contact.phone}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Role & Company Column */}
                                    <div className="w-full md:w-auto md:col-span-3 flex flex-col justify-center pl-[52px] md:pl-0">
                                        {contact.role && <span className="text-sm font-medium text-slate-900 truncate">{contact.role}</span>}
                                        {contact.company && (
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                                                <Building className="h-3.5 w-3.5 text-slate-300" />
                                                <span className="truncate">{contact.company}</span>
                                            </div>
                                        )}
                                        {!contact.role && !contact.company && <span className="text-xs text-slate-400 hidden md:inline">-</span>}
                                    </div>

                                    {/* Actions Column */}
                                    <div className="absolute top-4 right-4 md:static md:col-span-2 flex items-center justify-end gap-2 md:pr-2 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); window.location.href = `mailto:${contact.email}`; }}
                                            className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors border border-slate-100 md:border-transparent bg-white md:bg-transparent shadow-sm md:shadow-none"
                                            title="Send Email"
                                        >
                                            <Mail className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteContact(contact.id); }}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-slate-100 md:border-transparent bg-white md:bg-transparent shadow-sm md:shadow-none"
                                            title="Delete Contact"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setSelectedContact(contact); }}
                                            className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-100 md:border-transparent bg-white md:bg-transparent shadow-sm md:shadow-none"
                                            title="View Details"
                                        >
                                            <ArrowUpRight className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Preserving Contact Drawer Integration */}
            <ContactDrawer
                contact={selectedContact}
                isOpen={!!selectedContact}
                onClose={() => setSelectedContact(null)}
            />

            <CreateContactModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onSuccess={(newContact) => {
                    setContacts(prev => [newContact, ...prev]);
                    setIsCreateOpen(false);
                }}
            />
        </div>
    );
}

function CreateContactModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: (c: Contact) => void }) {
    const [formData, setFormData] = useState({ name: "", email: "", company: "", role: "", phone: "" });
    const [saving, setSaving] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const contact = await api.createContact({
                ...formData,
                last_contacted: new Date().toISOString(),
                status: 'active'
            });
            localStorage.removeItem("sv_crm_contacts");
            onSuccess(contact!);
        } catch (error) {
            console.error("Failed to create contact", error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
            >
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-slate-900">Add New Contact</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><div className="h-5 w-5 rounded-full border border-slate-300 flex items-center justify-center font-serif text-xs">✕</div></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Full Name</label>
                            <input
                                required
                                className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-900 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all placeholder:text-slate-300"
                                placeholder="e.g. Jane Doe"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-900 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all placeholder:text-slate-300"
                                    placeholder="jane@example.com"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Phone</label>
                                <input
                                    type="tel"
                                    className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-900 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all placeholder:text-slate-300"
                                    placeholder="+1 (555) ..."
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Company</label>
                                <div className="relative">
                                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                                    <input
                                        className="w-full h-10 rounded-xl border border-slate-200 pl-9 pr-3 text-sm text-slate-900 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all placeholder:text-slate-300"
                                        placeholder="Acme Inc."
                                        value={formData.company}
                                        onChange={e => setFormData({ ...formData, company: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Role</label>
                                <input
                                    className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-900 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all placeholder:text-slate-300"
                                    placeholder="e.g. CEO"
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 text-sm font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-[2] py-2.5 text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-xl shadow-lg shadow-violet-200 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                        >
                            {saving && <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                            {saving ? "Saving..." : "Create Contact"}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
