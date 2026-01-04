
import React from 'react';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { useOptimization } from '../../context/OptimizationContext';
import { OptimizationMode } from '../../types';
import { AlertCircle, TrendingUp, DollarSign, MousePointerClick } from 'lucide-react';

import { CampaignMetrics } from '@/types/api';
import { api } from '@/services/api';

export default function Step4Campaigns({ onNext, onBack }: { onNext: () => void, onBack: () => void }) {
    const { config, updateCampaignAssignment, setCampaignAssignments } = useOptimization();
    const [campaignsList, setCampaignsList] = React.useState<CampaignMetrics[]>([]);
    const [loading, setLoading] = React.useState(true);

    // Fetch live campaigns on mount
    React.useEffect(() => {
        const fetchCampaigns = async () => {
            try {
                const response = await api.optimization.getCampaigns();
                if (response.data) {
                    setCampaignsList(response.data);

                    // Initialize context state
                    const initialAssignments = response.data.map(c => ({
                        id: c.id,
                        campaign_name: c.campaign_name,
                        objective: 'Conversions', // Default as metric doesn't have it explicitly yet
                        assigned_profile: c.assigned_profile || 'balanced'
                    }));
                    setCampaignAssignments(initialAssignments);
                }
            } catch (e) {
                console.warn("Failed to fetch campaigns", e);
                setCampaignsList([]);
            } finally {
                setLoading(false);
            }
        };
        fetchCampaigns();
    }, []);

    // Helper to handle assignments
    const handleProfileChange = (id: string, profile: OptimizationMode) => {
        updateCampaignAssignment(id, profile);
    };

    // Helper to get current assignment
    const getAssignment = (id: string) => {
        return config.campaign_assignments.find(c => c.id === id)?.assigned_profile || 'balanced';
    };

    return (
        <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-slate-800">Assign Strategy Profiles</h3>
                <p className="text-slate-500 mt-2">Tailor the strategy for each active campaign based in live performance.</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="w-[300px]">Campaign Name</TableHead>
                            <TableHead>Current Status</TableHead>
                            <TableHead className="text-right">Spend (7d) <DollarSign className="w-3 h-3 inline pb-0.5" /></TableHead>
                            <TableHead className="text-right">ROAS <TrendingUp className="w-3 h-3 inline pb-0.5" /></TableHead>
                            <TableHead className="w-[200px]">Optimization Profile</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-slate-500">Loading campaigns from ad account...</TableCell>
                            </TableRow>
                        ) : campaignsList.map((campaign) => (
                            <TableRow key={campaign.id} className="hover:bg-slate-50/50">
                                <TableCell className="font-medium text-slate-900">
                                    {campaign.campaign_name || campaign.id}
                                    <div className="text-[10px] text-slate-400 font-mono">{campaign.id}</div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0">{campaign.status}</Badge>
                                </TableCell>
                                <TableCell className="text-right font-mono text-slate-600">
                                    ${campaign.spend_7d.toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right font-mono font-medium text-emerald-600">
                                    {campaign.roas.toFixed(2)}x
                                </TableCell>
                                <TableCell>
                                    <Select
                                        value={getAssignment(campaign.id)} // Use helper to get from config context
                                        onValueChange={(val) => handleProfileChange(campaign.id, val as OptimizationMode)}
                                    >
                                        <SelectTrigger className="w-full bg-white border-slate-200">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="defensive">
                                                <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Defensive</span>
                                            </SelectItem>
                                            <SelectItem value="balanced">
                                                <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500" /> Balanced</span>
                                            </SelectItem>
                                            <SelectItem value="aggressive">
                                                <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-purple-500" /> Aggressive</span>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                {!loading && campaignsList.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground bg-slate-50">
                        No active campaigns found in this workspace.
                    </div>
                )}
            </div>

            <div className="mt-6 flex gap-3 text-sm text-slate-500 bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
                <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <p>
                    <strong>Pro Tip:</strong> Assign "Aggressive" only to campaigns with ROAS &gt; 3.0x. Use "Defensive" for mature campaigns where you want to maintain efficiency.
                </p>
            </div>

            <div className="flex justify-between pt-8">
                <Button variant="outline" onClick={onBack} size="lg">Back</Button>
                <Button onClick={onNext} size="lg" className="w-32">Review</Button>
            </div>
        </div>
    );
}
