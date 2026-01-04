import { useState } from "react";
import { GlassCard } from "@/crm/components/ui/GlassCard";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from "recharts";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Activity, Zap, Server, Edit2, Plus, Save, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Mock Data for Charts
const data = [
    { name: '00:00', requests: 4000 },
    { name: '04:00', requests: 3000 },
    { name: '08:00', requests: 2000 },
    { name: '12:00', requests: 2780 },
    { name: '16:00', requests: 1890 },
    { name: '20:00', requests: 2390 },
    { name: '23:59', requests: 3490 },
];

type RateLimit = {
    id: string;
    scope: "global" | "user" | "plan";
    user_id: string;
    route: string;
    window_limit: string;
    window_seconds: string;
    daily_limit: string;
    enabled: string;
    created_at: string;
    plan: string;
};

const INITIAL_RATE_LIMITS: RateLimit[] = [
    {
        "id": "2",
        "scope": "global",
        "user_id": "",
        "route": "text_generate",
        "window_limit": "60",
        "window_seconds": "60",
        "daily_limit": "5000",
        "enabled": "true",
        "created_at": "2025-12-25T07:46:26.609159Z",
        "plan": ""
    },
    {
        "id": "3",
        "scope": "global",
        "user_id": "",
        "route": "image_generate",
        "window_limit": "10",
        "window_seconds": "60",
        "daily_limit": "500",
        "enabled": "true",
        "created_at": "2025-12-25T07:46:42.295315Z",
        "plan": ""
    },
    {
        "id": "1",
        "scope": "global",
        "user_id": "",
        "route": "ai_generate",
        "window_limit": "20",
        "window_seconds": "60",
        "daily_limit": "500",
        "enabled": "false",
        "created_at": "2025-12-25T07:27:42.150456Z",
        "plan": ""
    },
    {
        "id": "4",
        "scope": "user",
        "user_id": "8",
        "route": "text_generate",
        "window_limit": "40",
        "window_seconds": "60",
        "daily_limit": "1000",
        "enabled": "true",
        "created_at": "2025-12-25T08:38:52.23721Z",
        "plan": ""
    },
    {
        "id": "5",
        "scope": "user",
        "user_id": "8",
        "route": "image_generate",
        "window_limit": "5",
        "window_seconds": "60",
        "daily_limit": "20",
        "enabled": "true",
        "created_at": "2025-12-25T08:39:10.935905Z",
        "plan": ""
    },
    {
        "id": "6",
        "scope": "plan",
        "user_id": "",
        "route": "text_generate",
        "window_limit": "20",
        "window_seconds": "60",
        "daily_limit": "500",
        "enabled": "true",
        "created_at": "2025-12-25T08:39:30.195062Z",
        "plan": "starter"
    },
    {
        "id": "7",
        "scope": "plan",
        "user_id": "",
        "route": "text_generate",
        "window_limit": "60",
        "window_seconds": "60",
        "daily_limit": "2000",
        "enabled": "true",
        "created_at": "2025-12-25T08:39:48.622227Z",
        "plan": "growth"
    },
    {
        "id": "8",
        "scope": "plan",
        "user_id": "",
        "route": "image_generate",
        "window_limit": "10",
        "window_seconds": "60",
        "daily_limit": "200",
        "enabled": "true",
        "created_at": "2025-12-25T08:40:09.367712Z",
        "plan": "growth"
    },
    {
        "id": "9",
        "scope": "plan",
        "user_id": "",
        "route": "image_generate",
        "window_limit": "1000",
        "window_seconds": "60",
        "daily_limit": "100000",
        "enabled": "true",
        "created_at": "2025-12-25T08:40:38.770051Z",
        "plan": "enterprise"
    },
    {
        "id": "10",
        "scope": "plan",
        "user_id": "",
        "route": "text_generate",
        "window_limit": "1000",
        "window_seconds": "60",
        "daily_limit": "100000",
        "enabled": "true",
        "created_at": "2025-12-25T08:52:19.882548Z",
        "plan": "enterprise"
    },
    {
        "id": "11",
        "scope": "plan",
        "user_id": "",
        "route": "text_generate",
        "window_limit": "5",
        "window_seconds": "60",
        "daily_limit": "5000",
        "enabled": "true",
        "created_at": "2025-12-25T13:31:15.988867Z",
        "plan": "beta"
    }
];

export default function AdminAnalytics() {
    const [rateLimits, setRateLimits] = useState<RateLimit[]>(INITIAL_RATE_LIMITS);
    const [editingLimit, setEditingLimit] = useState<RateLimit | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const { toast } = useToast();

    const handleRefresh = () => {
        toast({ title: "Refreshing Data", description: "Fetching latest metrics..." });
        setTimeout(() => toast({ title: "Updated", description: "Data is up to date." }), 800);
    };

    const handleSaveLimit = () => {
        if (!editingLimit) return;
        setRateLimits(prev => {
            const index = prev.findIndex(r => r.id === editingLimit.id);
            if (index >= 0) {
                const newLimits = [...prev];
                newLimits[index] = editingLimit;
                return newLimits;
            } else {
                return [...prev, { ...editingLimit, id: Math.random().toString(), created_at: new Date().toISOString() }];
            }
        });
        setIsDialogOpen(false);
        setEditingLimit(null);
        toast({ title: "Configuration Saved", description: "Rate limit updated successfully." });
    };

    const handleAddNew = () => {
        setEditingLimit({
            id: "",
            scope: "global",
            user_id: "",
            route: "text_generate",
            window_limit: "60",
            window_seconds: "60",
            daily_limit: "1000",
            enabled: "true",
            created_at: "",
            plan: ""
        });
        setIsDialogOpen(true);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">System Monitor</h1>
                    <p className="text-slate-500 mt-1">Real-time performance and configuration.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleRefresh} className="hover:bg-slate-100">
                        <RotateCcw className="h-4 w-4 mr-2" /> Refresh
                    </Button>
                    <Button className="bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/20" onClick={handleAddNew}>
                        <Plus className="h-4 w-4 mr-2" /> Add Rule
                    </Button>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <GlassCard className="p-6 relative overflow-hidden group hover:shadow-lg transition-all duration-500">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-emerald-500/20 transition-all" />
                    <div className="flex items-center gap-4 relative">
                        <div className="p-4 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl shadow-lg shadow-emerald-500/20">
                            <Activity className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Total Requests</p>
                            <h3 className="text-3xl font-black text-slate-900 mt-1">145,203</h3>
                            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">+12.5% vs last hour</span>
                        </div>
                    </div>
                </GlassCard>
                <GlassCard className="p-6 relative overflow-hidden group hover:shadow-lg transition-all duration-500">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-violet-500/20 transition-all" />
                    <div className="flex items-center gap-4 relative">
                        <div className="p-4 bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-2xl shadow-lg shadow-violet-500/20">
                            <Zap className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Avg. Latency</p>
                            <h3 className="text-3xl font-black text-slate-900 mt-1">45<span className="text-lg text-slate-500 font-medium">ms</span></h3>
                            <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Optimal</span>
                        </div>
                    </div>
                </GlassCard>
                <GlassCard className="p-6 relative overflow-hidden group hover:shadow-lg transition-all duration-500">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-blue-500/20 transition-all" />
                    <div className="flex items-center gap-4 relative">
                        <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl shadow-lg shadow-blue-500/20">
                            <Server className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Active Nodes</p>
                            <h3 className="text-3xl font-black text-slate-900 mt-1">12<span className="text-lg text-slate-500 font-medium">/12</span></h3>
                            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Healthy</span>
                        </div>
                    </div>
                </GlassCard>
            </div>

            {/* Chart */}
            <GlassCard className="p-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">Live Traffic Monitor</h3>
                        <p className="text-sm text-slate-500">Real-time request volume across all endpoints</p>
                    </div>
                    <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50 px-3 py-1 animate-pulse">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2" /> Live
                    </Badge>
                </div>
                <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.5} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="name"
                                stroke="#94a3b8"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                dy={10}
                            />
                            <YAxis
                                stroke="#94a3b8"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                dx={-10}
                            />
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                    borderRadius: '16px',
                                    border: 'none',
                                    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                                    padding: '12px 20px'
                                }}
                                itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                                labelStyle={{ color: '#64748b', marginBottom: '8px', fontSize: '12px' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="requests"
                                stroke="#6366f1"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorRequests)"
                                animationDuration={1000}
                                activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </GlassCard>

            {/* Rate Limits Table */}
            <GlassCard className="p-0 overflow-hidden border border-slate-100 shadow-xl shadow-slate-200/40">
                <div className="p-6 border-b border-slate-100 bg-slate-50/30">
                    <h3 className="text-lg font-bold text-slate-900">Rate Limit Configuration</h3>
                    <p className="text-sm text-slate-500">Fine-tune API limits per user, plan, or globally.</p>
                </div>

                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent border-slate-100">
                                <TableHead className="w-[120px] pl-6 font-bold text-slate-700">Scope</TableHead>
                                <TableHead className="font-bold text-slate-700">Target</TableHead>
                                <TableHead className="font-bold text-slate-700">Route</TableHead>
                                <TableHead className="font-bold text-slate-700">Window</TableHead>
                                <TableHead className="font-bold text-slate-700">Daily Limit</TableHead>
                                <TableHead className="font-bold text-slate-700">Status</TableHead>
                                <TableHead className="text-right pr-6 font-bold text-slate-700">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rateLimits.map((limit) => (
                                <TableRow key={limit.id} className="hover:bg-slate-50 transition-colors border-slate-50 h-16">
                                    <TableCell className="pl-6">
                                        <Badge variant="outline" className={
                                            limit.scope === 'global' ? 'bg-purple-50 text-purple-700 border-purple-200 px-3 py-1' :
                                                limit.scope === 'plan' ? 'bg-blue-50 text-blue-700 border-blue-200 px-3 py-1' :
                                                    'bg-orange-50 text-orange-700 border-orange-200 px-3 py-1'
                                        }>
                                            {limit.scope}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-semibold text-slate-700">
                                        {limit.scope === 'global' ? 'All Users' :
                                            limit.scope === 'plan' ? <span className="capitalize">{limit.plan}</span> :
                                                `User #${limit.user_id}`}
                                    </TableCell>
                                    <TableCell>
                                        <code className="text-xs font-mono bg-slate-100 px-2 py-1 rounded-md text-slate-600">{limit.route}</code>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-700">{limit.window_limit}<span className="text-xs font-normal text-slate-400"> req</span></span>
                                            <span className="text-[10px] text-slate-400">per {limit.window_seconds}s</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium text-slate-600">{parseInt(limit.daily_limit).toLocaleString()}</TableCell>
                                    <TableCell>
                                        <div className={`flex items-center gap-2 ${limit.enabled === 'true' ? 'text-emerald-600' : 'text-slate-400'}`}>
                                            <div className={`h-2.5 w-2.5 rounded-full ring-4 ring-opacity-20 ${limit.enabled === 'true' ? 'bg-emerald-500 ring-emerald-500' : 'bg-slate-300 ring-slate-300'}`} />
                                            <span className="text-xs font-bold">{limit.enabled === 'true' ? 'Active' : 'Disabled'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setEditingLimit(limit);
                                                setIsDialogOpen(true);
                                            }}
                                            className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </GlassCard>

            {/* Edit Dialog - No visual changes needed here but keeping it consistent */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Rate Limit Rule</DialogTitle>
                    </DialogHeader>
                    {editingLimit && (
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Scope</Label>
                                    <Select
                                        value={editingLimit.scope}
                                        onValueChange={(val: any) => setEditingLimit({ ...editingLimit, scope: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="global">Global</SelectItem>
                                            <SelectItem value="plan">Plan</SelectItem>
                                            <SelectItem value="user">User</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Identifier</Label>
                                    {editingLimit.scope === 'plan' ? (
                                        <Select
                                            value={editingLimit.plan}
                                            onValueChange={(val) => setEditingLimit({ ...editingLimit, plan: val })}
                                        >
                                            <SelectTrigger><SelectValue placeholder="Select Plan" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="starter">Starter</SelectItem>
                                                <SelectItem value="growth">Growth</SelectItem>
                                                <SelectItem value="enterprise">Enterprise</SelectItem>
                                                <SelectItem value="beta">Beta</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    ) : editingLimit.scope === 'user' ? (
                                        <Input
                                            placeholder="User ID"
                                            value={editingLimit.user_id}
                                            onChange={e => setEditingLimit({ ...editingLimit, user_id: e.target.value })}
                                        />
                                    ) : (
                                        <Input disabled value="All Users" className="bg-slate-50" />
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Route</Label>
                                <Select
                                    value={editingLimit.route}
                                    onValueChange={(val) => setEditingLimit({ ...editingLimit, route: val })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="text_generate">text_generate</SelectItem>
                                        <SelectItem value="image_generate">image_generate</SelectItem>
                                        <SelectItem value="ai_generate">ai_generate</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Window Limit</Label>
                                    <Input
                                        type="number"
                                        value={editingLimit.window_limit}
                                        onChange={e => setEditingLimit({ ...editingLimit, window_limit: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Window (Seconds)</Label>
                                    <Input
                                        type="number"
                                        value={editingLimit.window_seconds}
                                        onChange={e => setEditingLimit({ ...editingLimit, window_seconds: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Daily Limit</Label>
                                <Input
                                    type="number"
                                    value={editingLimit.daily_limit}
                                    onChange={e => setEditingLimit({ ...editingLimit, daily_limit: e.target.value })}
                                />
                            </div>

                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                <Label htmlFor="enabled-mode" className="cursor-pointer">Rule Enabled</Label>
                                <Switch
                                    id="enabled-mode"
                                    checked={editingLimit.enabled === 'true'}
                                    onCheckedChange={(checked) => setEditingLimit({ ...editingLimit, enabled: checked ? 'true' : 'false' })}
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button className="bg-slate-900" onClick={handleSaveLimit}>
                            <Save className="h-4 w-4 mr-2" /> Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
