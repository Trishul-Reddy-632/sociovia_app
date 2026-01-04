import { motion, AnimatePresence } from "framer-motion";
import { X, Phone, Mail, Building, MapPin, Tag, Clock, Calendar, MessageSquare, Linkedin, Twitter, Globe, Instagram, Save, Edit2, File as FileIcon } from "lucide-react";
import { Contact, ContactHistory } from "../../types";
import { AnimatedButton } from "../ui/AnimatedButton";
import { EditableField } from "../ui/EditableField";
import { TagInput } from "../ui/TagInput";
import { TaskList } from "../crm/TaskList";
import { FileList } from "../crm/FileList";
import { DealList } from "../crm/DealList";
import { useEffect, useState, useRef } from "react";
import { api } from "../../api";
import { formatDistanceToNow } from "date-fns";

interface ContactDrawerProps {
    contact: Contact | null;
    onClose: () => void;
    isOpen: boolean;
}

export function ContactDrawer({ contact: initialContact, onClose, isOpen }: ContactDrawerProps) {
    const [contact, setContact] = useState<Contact | null>(null);
    const [history, setHistory] = useState<ContactHistory[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [notes, setNotes] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [editMode, setEditMode] = useState(false);

    useEffect(() => {
        if (initialContact && isOpen) {
            setContact(initialContact);
            setNotes(initialContact.notes || "");
            loadHistory(initialContact.id);
            setEditMode(false);
        }
    }, [initialContact, isOpen]);

    const loadHistory = async (id: string) => {
        setLoadingHistory(true);
        try {
            const data = await api.getContactHistory(id);
            setHistory(data);
        } catch (error) {
            console.error("Failed to load history", error);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleUpdateField = async (field: keyof Contact, value: any) => {
        if (!contact) return;
        const updatedContact = { ...contact, [field]: value };
        setContact(updatedContact);
        setIsSaving(true);
        try {
            await api.updateContact(contact.id, { [field]: value });
        } catch (e) {
            console.error("Failed to auto-save field", field, e);
            alert("Failed to save changes");
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateSocial = async (platform: string, value: string) => {
        if (!contact) return;
        const updatedSocials = { ...contact.socials, [platform]: value };
        setContact({ ...contact, socials: updatedSocials });
        setIsSaving(true);
        try {
            await api.updateContact(contact.id, { socials: updatedSocials });
        } catch (e) {
            console.error("Failed to update social", e);
        } finally {
            setIsSaving(false);
        }
    }

    const handleAddTag = async (tag: string) => {
        if (!contact) return;
        const currentTags = contact.tags || [];
        if (!currentTags.includes(tag)) {
            const newTags = [...currentTags, tag];
            setContact({ ...contact, tags: newTags });
            setIsSaving(true);
            try {
                await api.updateContact(contact.id, { tags: newTags });
            } catch (e) {
                console.error("Failed to add tag", e);
            } finally {
                setIsSaving(false);
            }
        }
    };

    const handleRemoveTag = async (tagToRemove: string) => {
        if (!contact) return;
        const newTags = (contact.tags || []).filter(t => t !== tagToRemove);
        setContact({ ...contact, tags: newTags });
        setIsSaving(true);
        try {
            await api.updateContact(contact.id, { tags: newTags });
        } catch (e) {
            console.error("Failed to remove tag", e);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveNotes = async () => {
        if (!contact) return;
        setIsSaving(true);
        try {
            await api.updateContact(contact.id, { notes });
        } catch (error) {
            console.error("Failed to save notes", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleArchive = async () => {
        if (!contact) return;
        if (confirm("Are you sure you want to archive this contact?")) {
            try {
                await api.deleteContact(contact.id);
                onClose();
                window.location.reload();
            } catch (error) {
                console.error("Failed to archive contact", error);
            }
        }
    };

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !contact) return;

        try {
            // Upload file as an attachment first (or separate endpoint if we had one)
            // For now, reusing generic file upload which returns the file object with URL
            // Note: In a real app, we might want a specific 'uploadAvatar' endpoint to handle resizing/optimizing
            const uploadedFile = await api.uploadFile(file, contact.id, "contact");
            if (uploadedFile && uploadedFile.url) {
                await handleUpdateField("avatar", uploadedFile.url);
            }
        } catch (error) {
            console.error("Failed to upload avatar", error);
        }
    };

    if (!contact) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Hidden File Input for Avatar */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                    />

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
                        <div className="bg-slate-50 border-b border-slate-100 p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white border border-slate-200 text-2xl font-bold text-violet-600 shadow-sm overflow-hidden">
                                            {contact.avatar ? (
                                                <img src={contact.avatar} alt={contact.name} className="h-full w-full object-cover" />
                                            ) : (
                                                contact.name.charAt(0)
                                            )}
                                        </div>
                                        {/* Avatar uploader overlay */}
                                        <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Edit2 className="h-4 w-4 text-white" />
                                        </div>
                                    </div>
                                    <div>
                                        <EditableField
                                            value={contact.name}
                                            onSave={(v) => handleUpdateField("name", v)}
                                            className="text-xl font-bold text-slate-900"
                                            placeholder="Contact Name"
                                            isEditing={editMode}
                                        />
                                        <div className="text-sm text-slate-500 flex flex-col">
                                            <EditableField
                                                value={contact.role || ""}
                                                onSave={(v) => handleUpdateField("role", v)}
                                                placeholder="Role (e.g. CEO)"
                                                isEditing={editMode}
                                            />
                                            <EditableField
                                                value={contact.company || ""}
                                                onSave={(v) => handleUpdateField("company", v)}
                                                placeholder="Company"
                                                isEditing={editMode}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {isSaving && <span className="text-xs text-violet-500 font-medium animate-pulse">Saving...</span>}
                                    <button
                                        onClick={() => setEditMode(!editMode)}
                                        className={`rounded-full p-2 transition-colors ${editMode ? 'bg-violet-100 text-violet-600' : 'text-slate-400 hover:bg-slate-100'}`}
                                        title="Toggle Edit Mode"
                                    >
                                        <Edit2 className="h-5 w-5" />
                                    </button>
                                    <button
                                        onClick={onClose}
                                        className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">

                            {/* Quick Actions */}
                            <div className="flex gap-3">
                                <a href={`tel:${contact.phone}`} className={`flex-1 ${!contact.phone ? 'pointer-events-none opacity-50' : ''}`}>
                                    <AnimatedButton className="w-full justify-center bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-200">
                                        <Phone className="h-4 w-4 mr-2" /> Call
                                    </AnimatedButton>
                                </a>
                                <a href={`mailto:${contact.email}`} className="flex-1">
                                    <AnimatedButton className="w-full justify-center bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm">
                                        <Mail className="h-4 w-4 mr-2" /> Email
                                    </AnimatedButton>
                                </a>
                            </div>

                            {/* Tags Section */}
                            <div>
                                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-3">
                                    <Tag className="h-4 w-4 text-slate-400" /> Tags
                                </h3>
                                <TagInput
                                    tags={contact.tags || []}
                                    onAddTag={handleAddTag}
                                    onRemoveTag={handleRemoveTag}
                                />
                            </div>

                            {/* Social Links */}
                            <div className="grid grid-cols-2 gap-4">
                                <EditableField
                                    label="LinkedIn"
                                    value={contact.socials?.linkedin || ""}
                                    onSave={(v) => handleUpdateSocial("linkedin", v)}
                                    placeholder="LinkedIn URL"
                                    isEditing={editMode}
                                />
                                <EditableField
                                    label="Twitter / X"
                                    value={contact.socials?.twitter || ""}
                                    onSave={(v) => handleUpdateSocial("twitter", v)}
                                    placeholder="Twitter URL"
                                    isEditing={editMode}
                                />
                                <EditableField
                                    label="Website"
                                    value={contact.socials?.website || ""}
                                    onSave={(v) => handleUpdateSocial("website", v)}
                                    placeholder="Website URL"
                                    isEditing={editMode}
                                />
                                <EditableField
                                    label="Instagram"
                                    value={contact.socials?.instagram || ""}
                                    onSave={(v) => handleUpdateSocial("instagram", v)}
                                    placeholder="Instagram URL"
                                    isEditing={editMode}
                                />
                            </div>

                            <hr className="border-slate-100" />

                            {/* Tasks Section */}
                            <div>
                                <TaskList entityId={contact.id} entityType="contact" />
                            </div>

                            <hr className="border-slate-100" />

                            {/* Files Section */}
                            <div>
                                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-3">
                                    <FileIcon className="h-4 w-4 text-slate-400" /> Files
                                </h3>
                                <FileList entityId={contact.id} entityType="contact" />
                            </div>

                            <hr className="border-slate-100" />

                            {/* Deals Section */}
                            <div>
                                <DealList entityId={contact.id} entityType="contact" />
                            </div>

                            <hr className="border-slate-100" />

                            {/* Contact Info */}
                            <div>
                                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-3">
                                    <Building className="h-4 w-4 text-slate-400" /> Details
                                </h3>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <Mail className="h-4 w-4 text-slate-400" />
                                        <EditableField
                                            value={contact.email}
                                            onSave={(v) => handleUpdateField("email", v)}
                                            className="flex-1"
                                            isEditing={editMode}
                                        />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Phone className="h-4 w-4 text-slate-400" />
                                        <EditableField
                                            value={contact.phone || ""}
                                            onSave={(v) => handleUpdateField("phone", v)}
                                            placeholder="Add phone..."
                                            className="flex-1"
                                            isEditing={editMode}
                                        />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Calendar className="h-4 w-4 text-slate-400" />
                                        <span className="text-sm text-slate-600">Last Contacted: {contact.lastContacted}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Interaction History */}

                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                                        <Clock className="h-4 w-4 text-slate-400" /> Interaction History
                                    </h3>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => {
                                                const note = prompt("Enter call summary:");
                                                if (note) {
                                                    api.addContactHistory(contact.id, {
                                                        contact_id: contact.id,
                                                        type: 'call',
                                                        title: 'Logged Call',
                                                        description: note,
                                                        date: new Date().toISOString()
                                                    }).then(() => loadHistory(contact.id));
                                                }
                                            }}
                                            className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-2 py-1 rounded transition-colors"
                                        >
                                            + Call
                                        </button>
                                        <button
                                            onClick={() => {
                                                const note = prompt("Enter meeting summary:");
                                                if (note) {
                                                    api.addContactHistory(contact.id, {
                                                        contact_id: contact.id,
                                                        type: 'meeting',
                                                        title: 'Logged Meeting',
                                                        description: note,
                                                        date: new Date().toISOString()
                                                    }).then(() => loadHistory(contact.id));
                                                }
                                            }}
                                            className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-2 py-1 rounded transition-colors"
                                        >
                                            + Meeting
                                        </button>
                                    </div>
                                </div>
                                <div className="relative space-y-4 pl-6 before:absolute before:left-[7px] before:top-2 before:h-full before:w-[2px] before:bg-slate-100">
                                    {loadingHistory ? (
                                        <p className="text-xs text-slate-400">Loading history...</p>
                                    ) : history.length === 0 ? (
                                        <p className="text-xs text-slate-400">No interaction history.</p>
                                    ) : (
                                        history.map((item, idx) => (
                                            <div key={item.id || idx} className="relative">
                                                <span className={`absolute -left-[29px] top-1 h-4 w-4 rounded-full border-2 border-white shadow-sm ${item.type === 'meeting' ? 'bg-purple-500' :
                                                    item.type === 'proposal' ? 'bg-blue-500' :
                                                        item.type === 'call' ? 'bg-green-500' :
                                                            'bg-slate-300'
                                                    }`} />
                                                <p className="text-sm font-medium text-slate-800">{item.title}</p>
                                                <p className="text-xs text-slate-400">
                                                    {item.date ? formatDistanceToNow(new Date(item.date), { addSuffix: true }) : "Unknown date"}
                                                </p>
                                                {item.description && <p className="text-xs text-slate-500 mt-1">{item.description}</p>}
                                            </div>
                                        ))
                                    )}
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
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    onBlur={handleSaveNotes}
                                />
                                {isSaving && <p className="text-xs text-violet-500 mt-1">Saving...</p>}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="border-t border-slate-100 p-4 bg-slate-50">
                            <button
                                onClick={handleArchive}
                                className="w-full rounded-xl border border-slate-300 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                            >
                                Archive Contact
                            </button>
                        </div>
                    </motion.div>
                </>
            )
            }
        </AnimatePresence >
    );
}
