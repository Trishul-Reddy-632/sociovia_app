
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Zap, FileText, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDecisionTraces } from '@/hooks/useOptimizationQueries';

export default function TraceLogViewer() {
    const { data: traces = [], isLoading: loading, refetch } = useDecisionTraces();

    return (
        <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b bg-slate-50/50">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-800">
                            <FileText className="w-5 h-5 text-blue-600" />
                            System Trace Logs
                        </CardTitle>
                        <CardDescription>
                            Detailed audit trail of automated decisions.
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={loading}>
                            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                        <Badge variant="outline" className="bg-white">
                            {traces.length} recent traces
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50 hover:bg-slate-50">
                                <TableHead className="w-[180px]">Timestamp</TableHead>
                                <TableHead>Case ID</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Metrics</TableHead>
                                <TableHead>Decision</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {traces.map((trace) => (
                                <TableRow key={trace.id} className="hover:bg-slate-50/50">
                                    <TableCell className="font-mono text-xs text-slate-500">
                                        {new Date(trace.timestamp).toLocaleTimeString()}
                                    </TableCell>
                                    <TableCell className="font-medium text-slate-700">
                                        {trace.case_id}
                                        <div className="text-xs text-slate-400 font-normal">{trace.account_id}</div>
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={trace.status} />
                                    </TableCell>
                                    <TableCell className="text-xs space-y-1">
                                        <div className={trace.metrics.roas < 1.0 ? 'text-red-500 font-bold' : 'text-slate-600'}>
                                            ROAS: {trace.metrics.roas.toFixed(2)}
                                        </div>
                                        <div className="text-slate-500">
                                            Fatigue: {trace.metrics.fatigue.toFixed(2)}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {trace.consensus.agent_votes.length > 0 ? (
                                            <div className="space-y-1">
                                                <Badge variant="secondary" className="text-xs font-normal">
                                                    {trace.consensus.vote} ({Math.round(trace.consensus.confidence * 100)}%)
                                                </Badge>
                                                <div className="text-[10px] text-slate-400">
                                                    {trace.consensus.agent_votes.join(', ')}
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-slate-400 text-xs italic">Routine Monitor</span>
                                        )}

                                        {trace.gen_ai_reason && (
                                            <div className="mt-2 text-[10px] bg-indigo-50 text-indigo-700 px-2 py-1 rounded border border-indigo-100 flex items-center gap-1">
                                                <Zap className="w-3 h-3" />
                                                GenAI: {trace.gen_ai_reason}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                            {trace.action_taken}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

function StatusBadge({ status }: { status: string }) {
    if (status === 'FATIGUED') {
        return <Badge variant="destructive" className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-orange-200">Fatigued</Badge>;
    }
    if (status === 'WINNER') {
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">Winner</Badge>;
    }
    if (status === 'SCALED_AGGRESSIVE') {
        return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-purple-200">Aggressive</Badge>;
    }
    return <Badge variant="secondary" className="bg-slate-100 text-slate-500">Normal</Badge>;
}
