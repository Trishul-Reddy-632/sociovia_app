
import { useState, useEffect, useMemo } from "react";
import {
    DndContext,
    closestCorners,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
    UniqueIdentifier,
} from "@dnd-kit/core";
import {
    SortableContext,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";
import { MoreVertical, Phone, Mail, DollarSign, Plus, LayoutGrid, List as ListIcon, Search, Filter, GripVertical, RefreshCcw, ExternalLink, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { GlassCard } from "../components/ui/GlassCard";
import { Lead } from "../types";
import { AnimatedButton } from "../components/ui/AnimatedButton";
import { LeadDrawer } from "../components/drawers/LeadDrawer";
import { api } from "../api";

// --- Types ---
type Status = Lead["status"];

const COLUMNS: { id: Status; label: string; color: string; indicator: string }[] = [
    { id: "new", label: "New Leads", color: "text-blue-600", indicator: "bg-blue-500" },
    { id: "contacted", label: "Contacted", color: "text-amber-600", indicator: "bg-amber-500" },
    { id: "qualified", label: "Qualified", color: "text-violet-600", indicator: "bg-violet-500" },
    { id: "proposal", label: "Proposal", color: "text-pink-600", indicator: "bg-pink-500" },
    { id: "closed", label: "Closed", color: "text-emerald-600", indicator: "bg-emerald-500" },
];

const LIST_PAGE_SIZE = 15;

export default function Leads() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [viewMode, setViewMode] = useState<"board" | "list">("board");
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

    // Performance / Pagination State
    const [boardLimit, setBoardLimit] = useState(15);
    const [listPage, setListPage] = useState(1);

    // Search State
    const [searchQuery, setSearchQuery] = useState("");

    // Sensors for drag detection
    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
    );

    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handleRefresh = () => {
        localStorage.removeItem("sv_crm_leads");
        setRefreshTrigger(prev => prev + 1);
    };

    useEffect(() => {
        const fetchLeads = async () => {
            setLoading(true);
            try {
                const cacheKey = "sv_crm_leads";
                const cached = localStorage.getItem(cacheKey);

                if (cached) {
                    try {
                        const parsed = JSON.parse(cached);
                        if (Date.now() - parsed.timestamp < 30 * 60 * 1000) {
                            console.log("Using cached leads");
                            setLeads(parsed.data || []);
                            setLoading(false);
                            return;
                        }
                    } catch (e) { }
                }

                const data = await api.getLeads();
                setLeads(data || []);

                try {
                    localStorage.setItem(cacheKey, JSON.stringify({
                        timestamp: Date.now(),
                        data: data
                    }));
                } catch (e) { }

            } catch (error) {
                console.error("Failed to fetch leads:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchLeads();
    }, [refreshTrigger]);

    // Derived filtered state
    const filteredLeads = useMemo(() => {
        if (!searchQuery) return leads;
        const q = searchQuery.toLowerCase();
        return leads.filter(l =>
            l.name.toLowerCase().includes(q) ||
            l.email.toLowerCase().includes(q) ||
            (l.company && l.company.toLowerCase().includes(q)) ||
            (l.external_source && l.external_source.toLowerCase().includes(q))
        );
    }, [leads, searchQuery]);

    // --- Drag & Drop Handlers ---

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id);
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        // Find items in master list (drag logic usually needs to know about all items or just visible? 
        // dnd-kit works with IDs. `activeId` is known. `overId` is known.)
        // We look up in `leads` (source of truth).
        const activeLead = leads.find(l => l.id === activeId);
        if (!activeLead) return;

        // Check if dropping over a column container directly
        const isOverColumn = COLUMNS.some(col => col.id === overId);

        let newStatus: Status | null = null;

        if (isOverColumn) {
            // Dragging over an empty column or container
            newStatus = overId as Status;
        } else {
            // Dragging over another item
            const overLead = leads.find(l => l.id === overId);
            if (overLead) {
                newStatus = overLead.status;
            }
        }

        if (newStatus && activeLead.status !== newStatus) {
            setLeads(prev => {
                return prev.map(l =>
                    l.id === activeId ? { ...l, status: newStatus as Status } : l
                );
            });
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const activeLeadId = active.id as string;
        const overId = over.id;

        // Determine the new status based on drop target
        let newStatus: Status | null = null;
        const isOverColumn = COLUMNS.some(col => col.id === overId);

        if (isOverColumn) {
            newStatus = overId as Status;
        } else {
            const overLead = leads.find(l => l.id === overId);
            if (overLead) newStatus = overLead.status;
        }

        if (newStatus) {
            // Optimistic update should have happened in DragOver, but we ensure backend sync here
            try {
                console.log(`Syncing lead ${activeLeadId} to status: ${newStatus}`);
                await api.updateLead(activeLeadId, { status: newStatus });
            } catch (err) {
                console.error("Failed to sync lead status", err);
            }
        }
    };

    const activeLead = useMemo(() => leads.find(l => l.id === activeId), [activeId, leads]);

    // Derived state for pagination (using filtered leads)
    const paginatedListLeads = useMemo(() => {
        if (viewMode !== 'list') return [];
        const start = (listPage - 1) * LIST_PAGE_SIZE;
        return filteredLeads.slice(start, start + LIST_PAGE_SIZE);
    }, [filteredLeads, listPage, viewMode]);

    const totalPages = Math.ceil(filteredLeads.length / LIST_PAGE_SIZE);

    if (loading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-8rem)] flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between px-1 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Leads Pipeline</h1>
                    <p className="text-slate-500 font-medium">Manage {filteredLeads.length} leads and track conversions.</p>
                </div>

                {/* Global Search Bar */}
                <div className="flex-1 max-w-md mx-4">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search leads..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all shadow-sm"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3">

                    <div className="flex rounded-xl bg-white p-1 border border-slate-200 shadow-sm">
                        <button
                            onClick={() => setViewMode("board")}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'board' ? 'bg-violet-100 text-violet-700 shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-violet-100 text-violet-700 shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                        >
                            <ListIcon className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="h-8 w-[1px] bg-slate-200 mx-1" />

                    <button
                        onClick={handleRefresh}
                        className="p-2 bg-white rounded-xl border border-slate-200 text-slate-500 hover:text-violet-600 hover:border-violet-200 shadow-sm transition-all"
                        title="Refresh Leads"
                    >
                        <RefreshCcw className="h-4 w-4" />
                    </button>

                    <AnimatedButton onClick={() => setIsCreateOpen(true)} className="bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-violet-500/20">
                        <Plus className="h-4 w-4 mr-1.5" /> Add Lead
                    </AnimatedButton>
                </div>
            </div>

            <CreateLeadModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onSuccess={(newLead) => {
                    setLeads([newLead, ...leads]);
                    setIsCreateOpen(false);
                }}
            />

            {/* Board Area */}
            <div className="relative flex-1 overflow-hidden min-h-0">
                {viewMode === "board" ? (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCorners}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDragEnd={handleDragEnd}
                    >
                        <div className="flex h-full gap-6 overflow-x-auto pb-6 pt-2 px-1 snap-x scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-200">
                            {COLUMNS.map((column) => {
                                const columnLeads = filteredLeads.filter(l => l.status === column.id);
                                const visibleColumnLeads = columnLeads.slice(0, boardLimit);
                                const hasMore = columnLeads.length > boardLimit;

                                return (
                                    <div key={column.id} className="flex h-full w-80 min-w-[20rem] flex-col rounded-2xl bg-slate-50/50 border border-slate-100/60 p-3 snap-center backdrop-blur-sm">
                                        {/* Column Header */}
                                        <div className="mb-4 flex items-center justify-between px-2 py-1">
                                            <div className="flex items-center gap-2">
                                                <div className={`h-2.5 w-2.5 rounded-full ${column.indicator} shadow-[0_0_8px_rgba(0,0,0,0.2)] shadow-${column.indicator.replace('bg-', '')}`} />
                                                <h3 className="font-bold text-slate-700">{column.label}</h3>
                                            </div>
                                            <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-slate-500 shadow-sm border border-slate-100">
                                                {columnLeads.length}
                                            </span>
                                        </div>

                                        {/* Droppable Area */}
                                        <SortableContext
                                            items={visibleColumnLeads.map(l => l.id)}
                                            strategy={verticalListSortingStrategy}
                                            id={column.id}
                                        >
                                            <div
                                                className="flex-1 space-y-3 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200"
                                            >
                                                <ColumnDroppable id={column.id}>
                                                    {visibleColumnLeads.map((lead) => (
                                                        <SortableLeadCard
                                                            key={lead.id}
                                                            lead={lead}
                                                            onClick={setSelectedLead}
                                                        />
                                                    ))}
                                                    {hasMore && (
                                                        <div className="pt-2 text-center">
                                                            <button
                                                                onClick={() => setBoardLimit(prev => prev + 15)}
                                                                className="text-xs font-semibold text-slate-400 hover:text-violet-600 transition-colors"
                                                            >
                                                                Show More ({columnLeads.length - boardLimit} hidden)
                                                            </button>
                                                        </div>
                                                    )}
                                                </ColumnDroppable>
                                            </div>
                                        </SortableContext>

                                        <button
                                            onClick={() => setIsCreateOpen(true)}
                                            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-2.5 text-sm font-medium text-slate-400 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50 transition-all opacity-60 hover:opacity-100"
                                        >
                                            <Plus className="h-4 w-4" /> Quick Add
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Drag Overlay */}
                        <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: "0.4" } } }) }}>
                            {activeLead ? (
                                <div className="rotate-2 scale-105 cursor-grabbing">
                                    <LeadCard lead={activeLead} isOverlay />
                                </div>
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                ) : (
                    <GlassCard className="h-full p-0 overflow-hidden flex flex-col border-slate-200 shadow-lg shadow-slate-200/50">
                        <ListView
                            leads={paginatedListLeads}
                            setSelectedLead={setSelectedLead}
                            page={listPage}
                            totalPages={totalPages}
                            setPage={setListPage}
                            totalItems={leads.length}
                            onUpdateStatus={async (id, status) => {
                                setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
                                try {
                                    await api.updateLead(id, { status });
                                    localStorage.removeItem("sv_crm_leads");
                                } catch (e) {
                                    console.error("Failed to update status", e);
                                    // Revert if needed, but for now simple optimistic is fine
                                }
                            }}
                        />
                    </GlassCard>
                )}
            </div>

            <LeadDrawer
                lead={selectedLead}
                isOpen={!!selectedLead}
                onClose={() => setSelectedLead(null)}
            />
        </div>
    );
}

// --- Subcomponents ---

// Droppable wrapper
function ColumnDroppable({ id, children }: { id: string; children: React.ReactNode }) {
    const { setNodeRef } = useSortable({ id: id, data: { type: 'Column' } });
    return <div ref={setNodeRef} className="flex flex-col gap-3 min-h-[100px]">{children}</div>;
}

// Sortable Card
function SortableLeadCard({ lead, onClick }: { lead: Lead; onClick: (l: Lead) => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: lead.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none outline-none">
            <LeadCard lead={lead} onClick={() => onClick(lead)} />
        </div>
    );
}

// Visual Card Component
function LeadCard({ lead, onClick, isOverlay }: { lead: Lead; onClick?: () => void; isOverlay?: boolean }) {
    return (
        <div
            onClick={onClick}
            className={`group relative flex w-full flex-col gap-3 rounded-xl bg-white p-4 transition-all duration-200 
                ${isOverlay ? 'shadow-2xl ring-2 ring-violet-500/20' : 'shadow-sm hover:shadow-md border border-slate-100/50 hover:border-violet-200'}
            `}
        >
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide
                        ${lead.source === 'fb' ? 'bg-blue-50 text-blue-600' :
                            lead.source === 'ig' ? 'bg-pink-50 text-pink-600' :
                                'bg-slate-100 text-slate-500'}
                    `}>
                        {lead.source}
                    </span>
                    {(lead.external_source || lead.sync_status) && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-100">
                            {lead.external_source && <span className="uppercase font-semibold">{lead.external_source}</span>}
                            {lead.sync_status === 'in_sync' && <RefreshCcw className="h-3 w-3 text-emerald-500" />}
                            {lead.sync_status === 'pending_push' && <RefreshCcw className="h-3 w-3 text-amber-500" />}
                            {lead.sync_status === 'failed' && <RefreshCcw className="h-3 w-3 text-red-500" />}
                        </div>
                    )}
                </div>
                <button className="text-slate-300 opacity-0 group-hover:opacity-100 hover:text-slate-600 transition-opacity">
                    <MoreVertical className="h-4 w-4" />
                </button>
            </div>

            <div>
                <h4 className="font-bold text-slate-800 leading-tight">{lead.name}</h4>
                <p className="text-xs text-slate-400 font-medium truncate mt-0.5">{lead.email}</p>
                {lead.company && <p className="text-xs text-slate-400 font-medium truncate mt-0.5 flex items-center gap-1"><ExternalLink className="h-3 w-3" /> {lead.company}</p>}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                {lead.value ? (
                    <span className="flex items-center gap-1 font-bold text-emerald-600 text-xs bg-emerald-50 px-2 py-1 rounded-md">
                        <DollarSign className="h-3 w-3" /> {lead.value.toLocaleString()}
                    </span>
                ) : <span />}

                <div className="flex items-center gap-1.5" title="Lead Score">
                    <div className="h-1.5 w-12 rounded-full bg-slate-100 overflow-hidden">
                        <div className={`h-full rounded-full ${lead.score > 80 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${lead.score}%` }} />
                    </div>
                    <span className={`text-[10px] font-bold ${lead.score > 80 ? 'text-emerald-500' : 'text-amber-500'}`}>{lead.score}</span>
                </div>
            </div>

            {lead.last_sync_at && (
                <div className="text-[9px] text-slate-300 mt-1 text-right">
                    Synced: {new Date(lead.last_sync_at).toLocaleDateString()}
                </div>
            )}
        </div>
    );
}

function ListView({
    leads,
    setSelectedLead,
    page,
    totalPages,
    setPage,
    totalItems,
    onUpdateStatus
}: {
    leads: Lead[];
    setSelectedLead: (l: Lead) => void;
    page: number;
    totalPages: number;
    setPage: (p: number) => void;
    totalItems: number;
    onUpdateStatus: (id: string, status: Status) => void;
}) {
    return (
        <>
            <div className="flex items-center justify-end gap-4 border-b border-slate-100 p-4 bg-white/50 backdrop-blur-xl z-10 sticky top-0">
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
                        <Filter className="h-4 w-4" /> Filter
                    </button>
                </div>
            </div>
            <div className="flex-1 overflow-auto bg-white/40 scrollbar-thin scrollbar-thumb-slate-200">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50/80 text-xs uppercase text-slate-500 sticky top-0 z-0 backdrop-blur-md">
                        <tr>
                            <th className="px-6 py-4 font-bold tracking-wider whitespace-nowrap">Name</th>
                            <th className="px-6 py-4 font-bold tracking-wider whitespace-nowrap">Status</th>
                            <th className="px-6 py-4 font-bold tracking-wider whitespace-nowrap">Score</th>
                            <th className="px-6 py-4 font-bold tracking-wider whitespace-nowrap">Source / Sync</th>
                            <th className="px-6 py-4 font-bold tracking-wider text-right whitespace-nowrap">Value</th>
                            <th className="px-6 py-4 font-bold tracking-wider whitespace-nowrap">Last Contact</th>
                            <th className="px-6 py-4 font-bold tracking-wider whitespace-nowrap"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {leads.map((lead) => (
                            <tr
                                key={lead.id}
                                onClick={() => setSelectedLead(lead)}
                                className="cursor-pointer hover:bg-slate-50/80 transition-colors group"
                            >
                                <td className="px-6 py-4 max-w-[250px]">
                                    <div className="font-bold text-slate-800 truncate" title={lead.name}>{lead.name}</div>
                                    <div className="text-xs text-slate-400 truncate" title={lead.email}>{lead.email}</div>
                                    {lead.company && <div className="text-xs text-slate-500 font-medium truncate" title={lead.company}>{lead.company} {lead.job_title ? `• ${lead.job_title}` : ''}</div>}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div onClick={(e) => e.stopPropagation()}>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger className="outline-none">
                                                <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold capitalize transition-all hover:brightness-95 active:scale-95
                                                    ${lead.status === 'qualified' ? 'bg-violet-100 text-violet-700' :
                                                        lead.status === 'new' ? 'bg-blue-100 text-blue-700' :
                                                            lead.status === 'closed' ? 'bg-emerald-100 text-emerald-700' :
                                                                lead.status === 'proposal' ? 'bg-pink-100 text-pink-700' :
                                                                    'bg-amber-100 text-amber-700'}
                                                `}>
                                                    {lead.status}
                                                    <ChevronDown className="h-3 w-3 opacity-50" />
                                                </div>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="start" className="w-[140px] p-1">
                                                <DropdownMenuItem onClick={() => onUpdateStatus(lead.id, 'new')} className="text-xs font-bold text-blue-600 focus:text-blue-700 focus:bg-blue-50">
                                                    <div className="w-2 h-2 rounded-full bg-blue-500 mr-2" /> New
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => onUpdateStatus(lead.id, 'contacted')} className="text-xs font-bold text-amber-600 focus:text-amber-700 focus:bg-amber-50">
                                                    <div className="w-2 h-2 rounded-full bg-amber-500 mr-2" /> Contacted
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => onUpdateStatus(lead.id, 'qualified')} className="text-xs font-bold text-violet-600 focus:text-violet-700 focus:bg-violet-50">
                                                    <div className="w-2 h-2 rounded-full bg-violet-500 mr-2" /> Qualified
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => onUpdateStatus(lead.id, 'proposal')} className="text-xs font-bold text-pink-600 focus:text-pink-700 focus:bg-pink-50">
                                                    <div className="w-2 h-2 rounded-full bg-pink-500 mr-2" /> Proposal
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => onUpdateStatus(lead.id, 'closed')} className="text-xs font-bold text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2" /> Closed
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                        <div className="h-1.5 w-16 rounded-full bg-slate-100 overflow-hidden">
                                            <div className={`h-full rounded-full ${lead.score > 80 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${lead.score}%` }} />
                                        </div>
                                        <span className="font-bold text-slate-600">{lead.score}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className="capitalize font-medium">{lead.source}</span>
                                            {lead.external_source && <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-slate-500">{lead.external_source}</span>}
                                        </div>
                                        {lead.sync_status && (
                                            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                                <RefreshCcw className={`h-3 w-3 ${lead.sync_status === 'in_sync' ? 'text-emerald-500' : lead.sync_status === 'failed' ? 'text-red-500' : 'text-amber-500'}`} />
                                                <span className="capitalize">{lead.sync_status.replace('_', ' ')}</span>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right font-bold text-slate-900 whitespace-nowrap">${lead.value?.toLocaleString() ?? '-'}</td>
                                <td className="px-6 py-4 font-medium text-slate-500 whitespace-nowrap">
                                    {lead.last_interaction_at ? new Date(lead.last_interaction_at).toLocaleDateString() : (lead.lastInteraction || '-')}
                                </td>
                                <td className="px-6 py-4 text-right whitespace-nowrap">
                                    <button className="p-2 text-slate-300 hover:text-slate-600 transition-colors">
                                        <MoreVertical className="h-4 w-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {/* Pagination Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 p-4 bg-slate-50/50 backdrop-blur text-sm shrink-0">
                <div className="text-slate-500 hidden sm:block">
                    Showing <span className="font-bold text-slate-700">{leads.length}</span> of <span className="font-bold text-slate-700">{totalItems}</span> leads
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                    <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors font-medium"
                    >
                        Previous
                    </button>
                    <span className="text-slate-600 font-medium px-2">
                        Page {page} of {totalPages || 1}
                    </span>
                    <button
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page === totalPages || totalPages === 0}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors font-medium"
                    >
                        Next
                    </button>
                </div>
            </div>
        </>
    );
}

// Modal Refactor
function CreateLeadModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: (lead: Lead) => void }) {
    const [formData, setFormData] = useState({ name: "", email: "", value: "", source: "fb" });
    const [saving, setSaving] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const lead = await api.createLead({
                name: formData.name,
                email: formData.email,
                value: Number(formData.value),
                source: formData.source as any,
                status: "new",
                score: 10,
                lastInteraction: new Date().toISOString(), // Legacy prop
                last_interaction_at: new Date().toISOString() // Backend prop
            });
            onSuccess(lead!);
            // Invalidate cache
            localStorage.removeItem("sv_crm_leads");
        } catch (error) {
            console.error("Failed to create lead", error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="relative w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl ring-1 ring-black/5"
                    >
                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-slate-900">Add New Lead</h2>
                            <p className="text-sm text-slate-500">Enter the details of the potential customer.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-slate-500 ml-1">Full Name</label>
                                <input
                                    required
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-500/10 transition-all"
                                    placeholder="e.g. John Doe"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-slate-500 ml-1">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-500/10 transition-all"
                                    placeholder="john@example.com"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase text-slate-500 ml-1">Deal Value</label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</div>
                                        <input
                                            type="number"
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-4 py-2.5 text-sm outline-none focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-500/10 transition-all font-medium"
                                            placeholder="0.00"
                                            value={formData.value}
                                            onChange={e => setFormData({ ...formData, value: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase text-slate-500 ml-1">Source</label>
                                    <select
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-500/10 transition-all appearance-none cursor-pointer"
                                        value={formData.source}
                                        onChange={e => setFormData({ ...formData, source: e.target.value })}
                                    >
                                        <option value="fb">Facebook</option>
                                        <option value="ig">Instagram</option>
                                        <option value="linkedin">LinkedIn</option>
                                        <option value="manual">Manual</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-3 justify-end mt-8 pt-2">
                                <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all">Cancel</button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-5 py-2.5 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-lg shadow-slate-900/20 disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    {saving ? "Creating..." : "Create Lead"}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
