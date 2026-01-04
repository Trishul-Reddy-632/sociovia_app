import { useState } from "react";
import { GlassCard } from "@/crm/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog";
import { Edit2, Save, Rocket, Sparkles, Building2, Check, X, Shield, Zap, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type PlanConfig = {
    id: string;
    name: string;
    icon: any;
    description: string;
    prices: {
        monthly: number;
        quarterly: number;
        annual: number;
        currency: string;
    };
    limits: {
        workspaces: number | "Unlimited";
        adSpend: number;
        tokens: "Low" | "High" | "Unlimited";
        images: number | "Unlimited";
    };
    features: {
        whatsappAutomation: boolean;
        aiAdOptimization: boolean;
        analyticsChatbot: boolean;
        agenticWorkflows: boolean;
        prioritySupport: boolean;
        customIntegrations: boolean;
    };
    active: boolean;
};

const INITIAL_PLANS: PlanConfig[] = [
    {
        id: "starter",
        name: "Starter",
        icon: Rocket,
        description: "Entry-level plan for small teams.",
        prices: { monthly: 5000, quarterly: 4500, annual: 4000, currency: "₹" },
        limits: { workspaces: 1, adSpend: 100000, tokens: "Low", images: 0 },
        features: {
            whatsappAutomation: true,
            aiAdOptimization: true,
            analyticsChatbot: false,
            agenticWorkflows: false,
            prioritySupport: false,
            customIntegrations: false,
        },
        active: true
    },
    {
        id: "growth",
        name: "Growth",
        icon: Sparkles,
        description: "Scaling solution for growing businesses.",
        prices: { monthly: 10000, quarterly: 9000, annual: 8000, currency: "₹" },
        limits: { workspaces: 3, adSpend: 500000, tokens: "High", images: 200 },
        features: {
            whatsappAutomation: true,
            aiAdOptimization: true,
            analyticsChatbot: true,
            agenticWorkflows: false,
            prioritySupport: false,
            customIntegrations: false,
        },
        active: true
    },
    {
        id: "enterprise",
        name: "Enterprise",
        icon: Building2,
        description: "Full-scale solution for organizations.",
        prices: { monthly: 0, quarterly: 0, annual: 0, currency: "₹" }, // 0 implies Custom
        limits: { workspaces: "Unlimited", adSpend: 0, tokens: "Unlimited", images: "Unlimited" },
        features: {
            whatsappAutomation: true,
            aiAdOptimization: true,
            analyticsChatbot: true,
            agenticWorkflows: true,
            prioritySupport: true,
            customIntegrations: true,
        },
        active: true
    }
];

export default function AdminPricing() {
    const [plans, setPlans] = useState<PlanConfig[]>(INITIAL_PLANS);
    const [editingPlan, setEditingPlan] = useState<PlanConfig | null>(null);
    const { toast } = useToast();

    const handleSave = () => {
        if (!editingPlan) return;
        setPlans(plans.map(p => p.id === editingPlan.id ? editingPlan : p));
        setEditingPlan(null);
        toast({ title: "Plan Configuration Updated", description: `${editingPlan.name} settings have been saved.` });
    };

    return (
        <div className="space-y-10 animate-in fade-in duration-500 pb-20">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Plan Configuration</h1>
                <p className="text-slate-500 mt-2 text-lg">Control pricing, limits, and feature sets for all subscription tiers.</p>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {plans.map((plan) => (
                    <div key={plan.id} className="relative group">
                        {/* Connection Line Visual */}
                        <div className="absolute -left-3 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-slate-200 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                        <GlassCard className="p-0 overflow-hidden border border-slate-200 hover:border-slate-300 transition-all duration-300 shadow-sm hover:shadow-xl">
                            {/* Plan Header */}
                            <div className="p-8 border-b border-slate-100 bg-white/50 backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex items-center gap-6">
                                    <div className={`h-16 w-16 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-slate-200 ring-4 ring-white ${plan.id === 'starter' ? 'bg-gradient-to-br from-blue-500 to-cyan-400' :
                                            plan.id === 'growth' ? 'bg-gradient-to-br from-violet-600 to-fuchsia-500' : 'bg-gradient-to-br from-emerald-500 to-teal-400'
                                        }`}>
                                        <plan.icon className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-2xl font-bold text-slate-900">{plan.name}</h3>
                                            <Badge variant="outline" className={plan.active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500"}>
                                                {plan.active ? "Active" : "Archived"}
                                            </Badge>
                                        </div>
                                        <p className="text-slate-500 font-medium mt-1">{plan.description}</p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <div className="text-right">
                                        <span className="text-3xl font-black text-slate-900 tracking-tight">
                                            {plan.prices.monthly > 0 ? `${plan.prices.currency}${plan.prices.monthly.toLocaleString()}` : "Custom"}
                                        </span>
                                        <span className="text-slate-400 text-sm font-medium"> / month</span>
                                    </div>
                                    <Button onClick={() => setEditingPlan(plan)} variant="outline" className="border-slate-200 hover:bg-slate-50 text-slate-900">
                                        <Edit2 className="h-4 w-4 mr-2" /> Modify Configuration
                                    </Button>
                                </div>
                            </div>

                            {/* Configuration Details */}
                            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100 bg-slate-50/30">
                                {/* Limits Section */}
                                <div className="p-8">
                                    <div className="flex items-center gap-2 mb-6">
                                        <Shield className="h-4 w-4 text-blue-500" />
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Resource Allocations</h4>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center group/item hover:bg-slate-50 p-2 -mx-2 rounded transition-colors">
                                            <span className="text-sm font-semibold text-slate-600">Ad Spend Cap</span>
                                            <span className="font-mono font-bold text-slate-900 bg-white px-2 py-1 rounded border border-slate-100 shadow-sm">
                                                {typeof plan.limits.adSpend === 'number' && plan.limits.adSpend > 0
                                                    ? `${plan.prices.currency}${plan.limits.adSpend.toLocaleString()}`
                                                    : "Unlimited"}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center group/item hover:bg-slate-50 p-2 -mx-2 rounded transition-colors">
                                            <span className="text-sm font-semibold text-slate-600">Workspaces</span>
                                            <span className="font-mono font-bold text-slate-900 bg-white px-2 py-1 rounded border border-slate-100 shadow-sm">{plan.limits.workspaces}</span>
                                        </div>
                                        <div className="flex justify-between items-center group/item hover:bg-slate-50 p-2 -mx-2 rounded transition-colors">
                                            <span className="text-sm font-semibold text-slate-600">AI Images</span>
                                            <span className="font-mono font-bold text-slate-900 bg-white px-2 py-1 rounded border border-slate-100 shadow-sm">{plan.limits.images === 0 ? "Disabled" : plan.limits.images}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Features Grid */}
                                <div className="p-8 col-span-2">
                                    <div className="flex items-center gap-2 mb-6">
                                        <Zap className="h-4 w-4 text-violet-500" />
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Enabled Capabilities</h4>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        {Object.entries(plan.features).map(([key, enabled]) => (
                                            <div
                                                key={key}
                                                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${enabled
                                                        ? "bg-white border-emerald-100 shadow-sm text-slate-900"
                                                        : "bg-slate-50 border-transparent text-slate-400 opacity-60"
                                                    }`}
                                            >
                                                <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${enabled ? "bg-emerald-100 text-emerald-600" : "bg-slate-200 text-slate-400"
                                                    }`}>
                                                    {enabled ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                                                </div>
                                                <span className="text-sm font-semibold capitalize">
                                                    {key.replace(/([A-Z])/g, ' $1')}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </GlassCard>
                    </div>
                ))}
            </div>

            {/* Edit Configuration Dialog */}
            <Dialog open={!!editingPlan} onOpenChange={(open) => !open && setEditingPlan(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0 overflow-hidden bg-[#F8FAFC]">
                    <div className="p-6 bg-white border-b border-slate-100">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <Edit2 className="h-5 w-5 text-slate-400" />
                                Configure {editingPlan?.name}
                            </DialogTitle>
                            <DialogDescription>
                                Advanced configuration for pricing tiers, usage limits, and core system features.
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    {editingPlan && (
                        <div className="p-8 grid gap-8">

                            {/* Section: Pricing */}
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 text-indigo-600">
                                    <Globe className="h-4 w-4" /> Pricing & Billing Cycles
                                </h4>
                                <div className="grid grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold uppercase text-slate-500">Monthly Base</Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                                            <Input
                                                className="pl-8 font-mono font-bold"
                                                type="number"
                                                value={editingPlan.prices.monthly}
                                                onChange={(e) => setEditingPlan({
                                                    ...editingPlan,
                                                    prices: { ...editingPlan.prices, monthly: parseInt(e.target.value) || 0 }
                                                })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold uppercase text-slate-500">Quarterly (per mo)</Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                                            <Input
                                                className="pl-8 font-mono font-bold"
                                                type="number"
                                                value={editingPlan.prices.quarterly}
                                                onChange={(e) => setEditingPlan({
                                                    ...editingPlan,
                                                    prices: { ...editingPlan.prices, quarterly: parseInt(e.target.value) || 0 }
                                                })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold uppercase text-slate-500">Annual (per mo)</Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                                            <Input
                                                className="pl-8 font-mono font-bold"
                                                type="number"
                                                value={editingPlan.prices.annual}
                                                onChange={(e) => setEditingPlan({
                                                    ...editingPlan,
                                                    prices: { ...editingPlan.prices, annual: parseInt(e.target.value) || 0 }
                                                })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Limits */}
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 text-blue-600">
                                    <Shield className="h-4 w-4" /> Usage Enforcement
                                </h4>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold uppercase text-slate-500">Ad Spend Cap (₹)</Label>
                                        <Input
                                            className="font-mono"
                                            type="number"
                                            value={editingPlan.limits.adSpend}
                                            onChange={(e) => setEditingPlan({
                                                ...editingPlan,
                                                limits: { ...editingPlan.limits, adSpend: parseInt(e.target.value) || 0 }
                                            })}
                                        />
                                        <p className="text-[10px] text-slate-400 font-medium">Use 0 for Unlimited.</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold uppercase text-slate-500">Image Gen (Monthly)</Label>
                                        <Input
                                            className="font-mono"
                                            type="number"
                                            value={typeof editingPlan.limits.images === 'number' ? editingPlan.limits.images : 0}
                                            onChange={(e) => setEditingPlan({
                                                ...editingPlan,
                                                limits: { ...editingPlan.limits, images: parseInt(e.target.value) || 0 }
                                            })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold uppercase text-slate-500">Max Workspaces</Label>
                                        <Input
                                            className="font-mono"
                                            type="number"
                                            value={typeof editingPlan.limits.workspaces === 'number' ? editingPlan.limits.workspaces : 0}
                                            onChange={(e) => setEditingPlan({
                                                ...editingPlan,
                                                limits: { ...editingPlan.limits, workspaces: parseInt(e.target.value) || 0 }
                                            })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold uppercase text-slate-500">Token Class</Label>
                                        <select
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                            value={editingPlan.limits.tokens}
                                            onChange={(e: any) => setEditingPlan({
                                                ...editingPlan,
                                                limits: { ...editingPlan.limits, tokens: e.target.value }
                                            })}
                                        >
                                            <option value="Low">Low Priority</option>
                                            <option value="High">High Priority</option>
                                            <option value="Unlimited">Unlimited</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Features */}
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 text-violet-600">
                                    <Zap className="h-4 w-4" /> Feature Gates
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    {Object.entries(editingPlan.features).map(([key, value]) => (
                                        <div key={key} className={`flex items-center justify-between p-4 rounded-lg border border-slate-100 transition-colors ${value ? "bg-slate-50" : "bg-white"
                                            }`}>
                                            <Label htmlFor={key} className="capitalize flex-1 cursor-pointer font-medium text-slate-700">
                                                {key.replace(/([A-Z])/g, ' $1')}
                                            </Label>
                                            <Switch
                                                id={key}
                                                checked={value}
                                                onCheckedChange={(checked) => setEditingPlan({
                                                    ...editingPlan,
                                                    features: { ...editingPlan.features, [key]: checked }
                                                })}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="p-6 bg-white border-t border-slate-100 flex justify-end gap-3 rounded-b-lg">
                        <Button variant="outline" size="lg" onClick={() => setEditingPlan(null)}>Cancel</Button>
                        <Button size="lg" className="bg-slate-900 text-white shadow-lg" onClick={handleSave}>
                            <Save className="h-4 w-4 mr-2" /> Save Configuration
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
