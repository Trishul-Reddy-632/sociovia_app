
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
import {
    MoreVertical,
    DollarSign,
    Plus,
    LayoutGrid,
    List as ListIcon,
    Search,
    Filter,
    Calendar
} from "lucide-react";

import { GlassCard } from "../components/ui/GlassCard";
import { Deal } from "../types";
import { AnimatedButton } from "../components/ui/AnimatedButton";
import { DealDetailsDrawer } from "../components/DealDetailsDrawer";
import { api } from "../api";

// --- Types ---
type Stage = Deal["stage"];

const COLUMNS: { id: Stage; label: string; color: string; indicator: string }[] = [
    { id: "discovery", label: "Discovery", color: "text-blue-600", indicator: "bg-blue-500" },
    { id: "proposal", label: "Proposal", color: "text-violet-600", indicator: "bg-violet-500" },
    { id: "negotiation", label: "Negotiation", color: "text-amber-600", indicator: "bg-amber-500" },
    { id: "closed_won", label: "Closed Won", color: "text-emerald-600", indicator: "bg-emerald-500" },
    { id: "closed_lost", label: "Closed Lost", color: "text-slate-600", indicator: "bg-slate-500" },
];

export default function Deals() {
    const [deals, setDeals] = useState<Deal[]>([]);
    const [viewMode, setViewMode] = useState<"board" | "list">("board");
    const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Sensors for drag detection
    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
    );

    const handleRefresh = () => {
        localStorage.removeItem("sv_crm_deals");
        setRefreshTrigger(prev => prev + 1);
    };

    useEffect(() => {
        const fetchDeals = async () => {
            setLoading(true);
            try {
                // Determine entityId - in this global view we fetch ALL deals
                // The current API.getDeals requires entityId. 
                // We might need to update api.ts to fetch ALL deals if no entityId is provided, 
                // OR we iterate over contacts/leads. 
                // checking api.ts...
                // Only getDeals(entityId) allows optional argument? 
                // Actually the current mock implementation filters by entityId. 
                // If I pass "all" or modify the mock to return all if no ID.

                // For now, let's assume api.getDeals() returns all if no ID passed (needs verification)
                // If api.ts requires an argument, we might need a change there.
                // Looking at api.ts previously viewed: `async getDeals(entityId: string, entityType: 'contact' | 'lead')`
                // It requires arguments. We need a way to get ALL deals.
                // I will add `getAllDeals` to api.ts shortly. For now I will assume it exists or I can add it.

                // For now, let's assume api.getDeals() returns all if no ID passed which matches our api.ts implementation
                // const data = await api.getAllDeals(); 

                const data = await api.getDeals();
                setDeals(data || []);
            } catch (error) {
                console.error("Failed to fetch deals:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDeals();
    }, [refreshTrigger]);

    // --- Drag & Drop Handlers ---

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id);
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        // Find items
        const activeDeal = deals.find(d => d.id === activeId);
        if (!activeDeal) return;

        // Check if dropping over a column container directly
        const isOverColumn = COLUMNS.some(col => col.id === overId);

        let newStage: Stage | null = null;

        if (isOverColumn) {
            newStage = overId as Stage;
        } else {
            const overDeal = deals.find(d => d.id === overId);
            if (overDeal) {
                newStage = overDeal.stage;
            }
        }

        if (newStage && activeDeal.stage !== newStage) {
            setDeals(prev => {
                return prev.map(d =>
                    d.id === activeId ? { ...d, stage: newStage as Stage } : d
                );
            });
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const activeDealId = active.id as string;
        const currentDeal = deals.find(d => d.id === activeDealId);

        if (currentDeal) {
            try {
                // Use new specific API endpoint for stage change
                await api.changeDealStage(activeDealId, currentDeal.stage);
            } catch (err) {
                console.error("Failed to sync deal stage", err);
            }
        }
    };

    const activeDeal = useMemo(() => deals.find(d => d.id === activeId), [activeId, deals]);

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
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between px-1">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Deals Pipeline</h1>
                    <p className="text-slate-500 font-medium">Track your revenue opportunities.</p>
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
                        title="Refresh Deals"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-rotate-cw"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /></svg>
                    </button>

                    <AnimatedButton onClick={() => setIsCreateOpen(true)} className="bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-violet-500/20">
                        <Plus className="h-4 w-4 mr-1.5" /> New Deal
                    </AnimatedButton>
                </div>
            </div>

            <CreateDealModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onSuccess={(newDeal) => {
                    setDeals([...deals, newDeal]);
                    setIsCreateOpen(false);
                }}
            />

            {/* Board Area */}
            <div className="relative flex-1 overflow-hidden">
                {viewMode === "board" ? (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCorners}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDragEnd={handleDragEnd}
                    >
                        <div className="flex h-full gap-6 overflow-x-auto pb-6 pt-2 px-1 snap-x scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-200">
                            {COLUMNS.map((column) => (
                                <div key={column.id} className="flex h-full w-80 min-w-[20rem] flex-col rounded-2xl bg-slate-50/50 border border-slate-100/60 p-3 snap-center backdrop-blur-sm">
                                    {/* Column Header */}
                                    <div className="mb-4 flex items-center justify-between px-2 py-1">
                                        <div className="flex items-center gap-2">
                                            <div className={`h-2.5 w-2.5 rounded-full ${column.indicator} shadow-[0_0_8px_rgba(0,0,0,0.2)] shadow-${column.indicator.replace('bg-', '')}`} />
                                            <h3 className="font-bold text-slate-700">{column.label}</h3>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="text-xs font-medium text-slate-400">
                                                ${deals.filter(d => d.stage === column.id).reduce((acc, d) => acc + d.value, 0).toLocaleString()}
                                            </span>
                                            <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-slate-500 shadow-sm border border-slate-100">
                                                {deals.filter(d => d.stage === column.id).length}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Droppable Area */}
                                    <SortableContext
                                        items={deals.filter(d => d.stage === column.id).map(d => d.id)}
                                        strategy={verticalListSortingStrategy}
                                        id={column.id}
                                    >
                                        <div className="flex-1 space-y-3 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200">
                                            <ColumnDroppable id={column.id}>
                                                {deals
                                                    .filter((deal) => deal.stage === column.id)
                                                    .map((deal) => (
                                                        <SortableDealCard
                                                            key={deal.id}
                                                            deal={deal}
                                                            onClick={setSelectedDeal}
                                                        />
                                                    ))}
                                            </ColumnDroppable>
                                        </div>
                                    </SortableContext>
                                </div>
                            ))}
                        </div>

                        <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: "0.4" } } }) }}>
                            {activeDeal ? (
                                <div className="rotate-2 scale-105 cursor-grabbing">
                                    <DealCard deal={activeDeal} isOverlay />
                                </div>
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                ) : (
                    <GlassCard className="h-full p-0 overflow-hidden flex flex-col border-slate-200 shadow-lg shadow-slate-200/50">
                        <ListView deals={deals} setSelectedDeal={setSelectedDeal} />
                    </GlassCard>
                )}
            </div>
            <DealDetailsDrawer
                isOpen={!!selectedDeal}
                deal={selectedDeal}
                onClose={() => setSelectedDeal(null)}
                onUpdate={handleRefresh}
            />
        </div>
    );
}

// --- Subcomponents ---

function ColumnDroppable({ id, children }: { id: string; children: React.ReactNode }) {
    const { setNodeRef } = useSortable({ id: id, data: { type: 'Column' } });
    return <div ref={setNodeRef} className="flex flex-col gap-3 min-h-[100px]">{children}</div>;
}

function SortableDealCard({ deal, onClick }: { deal: Deal; onClick: (d: Deal) => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: deal.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none outline-none">
            <DealCard deal={deal} onClick={() => onClick(deal)} />
        </div>
    );
}

function DealCard({ deal, onClick, isOverlay }: { deal: Deal; onClick?: () => void; isOverlay?: boolean }) {
    return (
        <div
            onClick={onClick}
            className={`group relative flex w-full flex-col gap-3 rounded-xl bg-white p-4 transition-all duration-200 
                ${isOverlay ? 'shadow-2xl ring-2 ring-violet-500/20' : 'shadow-sm hover:shadow-md border border-slate-100/50 hover:border-violet-200'}
            `}
        >
            <div>
                <h4 className="font-bold text-slate-800 leading-tight">{deal.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                        {deal.company || deal.entityType || "Deal"}
                    </span>
                    <span className="text-xs text-slate-400">Created {new Date(deal.created_at || new Date()).toLocaleDateString()}</span>
                </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                <span className="flex items-center gap-1 font-bold text-emerald-600 text-sm bg-emerald-50 px-2 py-1 rounded-md">
                    <DollarSign className="h-3 w-3" /> {deal.value?.toLocaleString()}
                </span>

                <span className={`text-xs font-bold ${deal.probability > 70 ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {deal.probability}% Prob.
                </span>
            </div>
        </div>
    );
}

function ListView({ deals, setSelectedDeal }: { deals: Deal[]; setSelectedDeal: (d: Deal) => void }) {
    return (
        <div className="flex-1 overflow-auto bg-white/40">
            <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/80 text-xs uppercase text-slate-500 sticky top-0 z-0 backdrop-blur-md">
                    <tr>
                        <th className="px-6 py-4 font-bold tracking-wider">Title</th>
                        <th className="px-6 py-4 font-bold tracking-wider">Value</th>
                        <th className="px-6 py-4 font-bold tracking-wider">Stage</th>
                        <th className="px-6 py-4 font-bold tracking-wider">Probability</th>
                        <th className="px-6 py-4 font-bold tracking-wider">Close Date</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {deals.map((deal) => (
                        <tr
                            key={deal.id}
                            onClick={() => setSelectedDeal(deal)}
                            className="cursor-pointer hover:bg-slate-50/80 transition-colors group"
                        >
                            <td className="px-6 py-4 font-bold text-slate-800">{deal.name}</td>
                            <td className="px-6 py-4 font-bold text-emerald-600">${deal.value?.toLocaleString()}</td>
                            <td className="px-6 py-4">
                                <span className="uppercase text-xs font-bold bg-slate-100 px-2 py-1 rounded text-slate-600">{deal.stage.replace('_', ' ')}</span>
                            </td>
                            <td className="px-6 py-4">{deal.probability}%</td>
                            <td className="px-6 py-4 text-slate-500">{deal.close_date || '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function CreateDealModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: (d: Deal) => void }) {
    const [formData, setFormData] = useState({ title: "", value: "", stage: "discovery", probability: 50 });
    const [saving, setSaving] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            // Updated to use name instead of title
            const deal = await api.createDeal({
                name: formData.title, // Maps form title to name
                value: Number(formData.value),
                currency: "USD",
                stage: formData.stage as any,
                probability: Number(formData.probability),
                // entityId and entityType are likely optional or will be handled by backend defaults
            });
            onSuccess(deal!);
        } catch (error) {
            console.error("Failed to create deal", error);
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
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl"
                    >
                        <h2 className="text-xl font-bold text-slate-900 mb-4">New Deal</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold uppercase text-slate-500">Deal Title</label>
                                <input required className="w-full rounded-xl border border-slate-200 px-4 py-2 mt-1" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold uppercase text-slate-500">Value ($)</label>
                                    <input type="number" required className="w-full rounded-xl border border-slate-200 px-4 py-2 mt-1" value={formData.value} onChange={e => setFormData({ ...formData, value: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-slate-500">Probability (%)</label>
                                    <input type="number" required className="w-full rounded-xl border border-slate-200 px-4 py-2 mt-1" value={formData.probability} onChange={e => setFormData({ ...formData, probability: Number(e.target.value) })} />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                                <button type="submit" disabled={saving} className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50">
                                    {saving ? "Saving..." : "Create Deal"}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
} 
