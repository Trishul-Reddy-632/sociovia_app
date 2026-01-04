import { useState, useEffect } from "react";
import { Plus, Briefcase, DollarSign, Calendar, RefreshCw } from "lucide-react";
import { Deal } from "../../types";
import { api } from "../../api";
import { DealItem } from "./DealItem";

interface DealListProps {
    entityId: string;
    entityType: "contact" | "lead";
}

export function DealList({ entityId, entityType }: DealListProps) {
    const [deals, setDeals] = useState<Deal[]>([]);
    const [loading, setLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    // New Deal State
    const [newDealTitle, setNewDealTitle] = useState("");
    const [newDealValue, setNewDealValue] = useState<number>(0);
    const [newDealStage, setNewDealStage] = useState<Deal["stage"]>("discovery");

    useEffect(() => {
        if (entityId) {
            loadDeals();
        }
    }, [entityId]);

    const loadDeals = async () => {
        setLoading(true);
        try {
            const data = await api.getDeals(entityId);
            setDeals(data);
        } catch (error) {
            console.error("Failed to load deals", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateDeal = async () => {
        if (!newDealTitle.trim()) return;

        try {
            const newDeal: Partial<Deal> = {
                title: newDealTitle,
                value: newDealValue,
                currency: "USD",
                stage: newDealStage,
                probability: newDealStage === 'discovery' ? 20 : newDealStage === 'proposal' ? 50 : 80, // simple default logic
                entityId,
                entityType,
                createdAt: new Date().toISOString()
            };

            const created = await api.createDeal(newDeal);

            // If backend returns the object, append it. If not, reload.
            // For now, let's assume valid response or reload.
            // setDeals([created, ...deals]); 
            await loadDeals();

            setIsCreating(false);
            setNewDealTitle("");
            setNewDealValue(0);
            setNewDealStage("discovery");
        } catch (error) {
            console.error("Failed to create deal", error);
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <Briefcase className="h-4 w-4 text-slate-400" /> Deals ({deals.length})
                </h3>
                <button
                    onClick={() => setIsCreating(!isCreating)}
                    className="text-xs font-medium text-violet-600 hover:text-violet-700 flex items-center gap-1"
                >
                    <Plus className="h-3 w-3" /> Add Deal
                </button>
            </div>

            {isCreating && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                    <input
                        type="text"
                        placeholder="Deal Title (e.g. Q4 Marketing Contract)"
                        className="w-full text-sm px-3 py-2 rounded-md border border-slate-300 focus:outline-none focus:border-violet-500"
                        value={newDealTitle}
                        onChange={(e) => setNewDealTitle(e.target.value)}
                        autoFocus
                    />

                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                <DollarSign className="h-3 w-3" />
                            </div>
                            <input
                                type="number"
                                placeholder="Value"
                                className="w-full text-sm pl-8 pr-3 py-2 rounded-md border border-slate-300 focus:outline-none focus:border-violet-500"
                                value={newDealValue || ""}
                                onChange={(e) => setNewDealValue(parseFloat(e.target.value))}
                            />
                        </div>
                        <select
                            className="flex-1 text-sm px-3 py-2 rounded-md border border-slate-300 focus:outline-none focus:border-violet-500 bg-white"
                            value={newDealStage}
                            onChange={(e) => setNewDealStage(e.target.value as Deal["stage"])}
                        >
                            <option value="discovery">Discovery</option>
                            <option value="proposal">Proposal</option>
                            <option value="negotiation">Negotiation</option>
                            <option value="closed_won">Won</option>
                            <option value="closed_lost">Lost</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                        <button
                            onClick={() => setIsCreating(false)}
                            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCreateDeal}
                            disabled={!newDealTitle}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-md disabled:opacity-50"
                        >
                            Save Deal
                        </button>
                    </div>
                </div>
            )}

            <div className="space-y-2">
                {loading && <p className="text-xs text-slate-400 text-center py-2">Loading deals...</p>}

                {!loading && deals.length === 0 && !isCreating && (
                    <div className="text-center py-4 border-2 border-dashed border-slate-100 rounded-lg">
                        <p className="text-xs text-slate-400">No active deals.</p>
                        <button onClick={() => setIsCreating(true)} className="mt-1 text-xs text-violet-600 hover:underline">
                            Create one
                        </button>
                    </div>
                )}

                {deals.map(deal => (
                    <DealItem key={deal.id} deal={deal} />
                ))}
            </div>
        </div>
    );
}
