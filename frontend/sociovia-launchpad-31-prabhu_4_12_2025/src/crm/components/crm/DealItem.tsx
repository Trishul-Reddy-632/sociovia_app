import { Deal } from "../../types";
import { formatDistanceToNow } from "date-fns";
import { DollarSign, Calendar, TrendingUp } from "lucide-react";

interface DealItemProps {
    deal: Deal;
}

export function DealItem({ deal }: DealItemProps) {
    const stageColors = {
        discovery: "bg-blue-100 text-blue-700 border-blue-200",
        proposal: "bg-purple-100 text-purple-700 border-purple-200",
        negotiation: "bg-orange-100 text-orange-700 border-orange-200",
        closed_won: "bg-emerald-100 text-emerald-700 border-emerald-200",
        closed_lost: "bg-slate-100 text-slate-700 border-slate-200"
    };

    const stageLabels = {
        discovery: "Discovery",
        proposal: "Proposal",
        negotiation: "Negotiation",
        closed_won: "Won",
        closed_lost: "Lost"
    };

    return (
        <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 hover:border-violet-200 transition-colors group">
            <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${stageColors[deal.stage]}`}>
                        {stageLabels[deal.stage]}
                    </span>
                    <h4 className="text-sm font-semibold text-slate-900 truncate">{deal.title}</h4>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        <span className="font-medium text-slate-700">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: deal.currency || 'USD' }).format(deal.value)}
                        </span>
                    </div>
                    {deal.expectedCloseDate && (
                        <div className="flex items-center gap-1" title={`Expected Close: ${deal.expectedCloseDate}`}>
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(deal.expectedCloseDate).toLocaleDateString()}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        <span>{deal.probability}%</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
