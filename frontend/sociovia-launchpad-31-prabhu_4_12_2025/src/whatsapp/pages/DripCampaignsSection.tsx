import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GitMerge, Plus, Trash2, Clock, Play, UserPlus, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/config';

const API_BASE = API_BASE_URL;

interface Step {
    id?: number;
    step_order: number;
    delay_seconds: number;
    template_name: string;
    language: string;
}

interface Campaign {
    id: number;
    name: string;
    description: string;
    status: string;
    enrolled_count: number;
    steps: Step[];
}

export function DripCampaignsSection({ accountId }: { accountId: number }) {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);

    // Create Dialog
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newCampaign, setNewCampaign] = useState({ name: '', description: '', steps: [] as Step[] });

    // Step editor
    const [currentSteps, setCurrentSteps] = useState<Step[]>([]);
    const [stepTemplate, setStepTemplate] = useState('');
    const [stepDelay, setStepDelay] = useState('0');

    // Enroll Dialog
    const [enrollCampaign, setEnrollCampaign] = useState<Campaign | null>(null);
    const [enrollPhone, setEnrollPhone] = useState('');
    const [enrolling, setEnrolling] = useState(false);

    useEffect(() => {
        if (isOpen && accountId) {
            loadCampaigns();
        }
    }, [isOpen, accountId]);

    async function loadCampaigns() {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/api/whatsapp/accounts/${accountId}/drip-campaigns`, {
                credentials: 'include'
            });
            if (res.ok) {
                const data = await res.json();
                setCampaigns(data.campaigns || []);
            }
        } catch (err) {
            console.error('Failed to load campaigns:', err);
            toast.error("Failed to load campaigns");
        } finally {
            setLoading(false);
        }
    }

    function addStep() {
        if (!stepTemplate) return;
        const newStep: Step = {
            step_order: currentSteps.length + 1,
            template_name: stepTemplate,
            delay_seconds: parseInt(stepDelay) * 60, // Convert minutes to seconds for simpler UI
            language: 'en_US'
        };
        setCurrentSteps([...currentSteps, newStep]);
        setStepTemplate('');
        setStepDelay('0');
    }

    function removeStep(index: number) {
        const updated = currentSteps.filter((_, i) => i !== index).map((s, i) => ({ ...s, step_order: i + 1 }));
        setCurrentSteps(updated);
    }

    async function handleCreate() {
        if (!newCampaign.name) {
            toast.error("Name is required");
            return;
        }

        try {
            const payload = {
                ...newCampaign,
                steps: currentSteps
            };

            const res = await fetch(`${API_BASE}/api/whatsapp/accounts/${accountId}/drip-campaigns`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast.success("Campaign created");
                setIsCreateOpen(false);
                setNewCampaign({ name: '', description: '', steps: [] });
                setCurrentSteps([]);
                loadCampaigns();
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed");
            }
        } catch (err) {
            toast.error("Error creating campaign");
        }
    }

    async function handleEnroll() {
        if (!enrollCampaign || !enrollPhone) return;

        try {
            setEnrolling(true);
            const res = await fetch(`${API_BASE}/api/whatsapp/accounts/${accountId}/drip-campaigns/${enrollCampaign.id}/enroll`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ phone_number: enrollPhone })
            });

            const data = await res.json();
            if (res.ok) {
                toast.success(`Enrolled ${enrollPhone}`);
                setEnrollCampaign(null);
                setEnrollPhone('');
                loadCampaigns();
            } else {
                toast.error(data.error || "Enrollment failed");
            }
        } catch (err) {
            toast.error("Enrollment failed");
        } finally {
            setEnrolling(false);
        }
    }

    return (
        <Card className="border shadow-sm bg-gradient-to-br from-green-50/50 via-white to-emerald-50/30">
            <div className="h-1 bg-gradient-to-r from-emerald-500 via-green-500 to-lime-500" />
            <CardHeader
                className="cursor-pointer hover:bg-gray-50/50 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-100 to-green-100 shadow-sm">
                            <GitMerge className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                            <CardTitle className="text-xl">Drip Campaigns</CardTitle>
                            <CardDescription>Automated sequences of messages over time</CardDescription>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="px-3 py-1 font-mono text-xs">
                            {campaigns.length} Active
                        </Badge>
                        {isOpen ? <div className="text-emerald-500">▼</div> : <div className="text-gray-400">▶</div>}
                    </div>
                </div>
            </CardHeader>

            {isOpen && (
                <CardContent className="pt-0 pb-6 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex justify-end mb-4">
                        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-emerald-600 hover:bg-emerald-700">
                                    <Plus className="w-4 h-4 mr-2" />
                                    New Campaign
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                    <DialogTitle>Create Drip Campaign</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label>Campaign Name</Label>
                                        <Input
                                            value={newCampaign.name}
                                            onChange={e => setNewCampaign({ ...newCampaign, name: e.target.value })}
                                            placeholder="e.g. New User Onboarding"
                                        />
                                    </div>

                                    <div className="border rounded-md p-4 bg-gray-50/50">
                                        <Label className="mb-2 block">Sequence Steps</Label>

                                        <div className="space-y-2 mb-4">
                                            {currentSteps.map((step, idx) => (
                                                <div key={idx} className="flex items-center gap-2 p-2 bg-white border rounded shadow-sm">
                                                    <div className="flex flex-col items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs">
                                                        {idx + 1}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="text-sm font-medium">{step.template_name}</div>
                                                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            Delay: {step.delay_seconds / 60} mins
                                                        </div>
                                                    </div>
                                                    <Button variant="ghost" size="sm" onClick={() => removeStep(idx)}>
                                                        <Trash2 className="w-4 h-4 text-red-400" />
                                                    </Button>
                                                </div>
                                            ))}
                                            {currentSteps.length === 0 && <div className="text-sm text-muted-foreground italic text-center py-2">No steps added yet.</div>}
                                        </div>

                                        <div className="grid grid-cols-12 gap-2 items-end border-t pt-4">
                                            <div className="col-span-5 space-y-1">
                                                <Label className="text-xs">Template Name</Label>
                                                <Input
                                                    value={stepTemplate}
                                                    onChange={e => setStepTemplate(e.target.value)}
                                                    placeholder="welcome_message"
                                                    className="h-8"
                                                />
                                            </div>
                                            <div className="col-span-4 space-y-1">
                                                <Label className="text-xs">Delay (minutes)</Label>
                                                <Input
                                                    type="number"
                                                    value={stepDelay}
                                                    onChange={e => setStepDelay(e.target.value)}
                                                    className="h-8"
                                                />
                                            </div>
                                            <div className="col-span-3">
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={addStep}
                                                    disabled={!stepTemplate}
                                                    className="w-full h-8"
                                                >
                                                    <Plus className="w-3 h-3 mr-1" /> Add Step
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button onClick={handleCreate}>Create Campaign</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <div className="grid gap-4">
                        {campaigns.map(c => (
                            <Card key={c.id} className="overflow-hidden border-l-4 border-l-emerald-500">
                                <div className="p-4 flex items-center justify-between">
                                    <div>
                                        <h3 className="font-semibold text-lg">{c.name}</h3>
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                            <span className="flex items-center gap-1">
                                                <GitMerge className="w-3 h-3" /> {c.steps.length} Steps
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <UserPlus className="w-3 h-3" /> {c.enrolled_count} Enrolled
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm" onClick={() => setEnrollCampaign(c)}>
                                            <Play className="w-4 h-4 mr-2 text-green-600" />
                                            Test / Enroll
                                        </Button>
                                    </div>
                                </div>
                                <div className="bg-gray-50/50 px-4 py-3 flex items-center gap-2 overflow-x-auto">
                                    {c.steps.map((step, i) => (
                                        <div key={i} className="flex items-center flex-shrink-0">
                                            <div className="flex items-center gap-2 bg-white border rounded-full px-3 py-1 text-xs shadow-sm">
                                                <Clock className="w-3 h-3 text-muted-foreground" />
                                                <span>{step.delay_seconds / 60}m</span>
                                                <ArrowRight className="w-3 h-3 text-gray-300" />
                                                <span className="font-medium text-emerald-700">{step.template_name}</span>
                                            </div>
                                            {i < c.steps.length - 1 && <div className="w-8 h-[1px] bg-gray-300 mx-2" />}
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        ))}
                        {campaigns.length === 0 && !loading && (
                            <div className="text-center py-8 text-muted-foreground bg-gray-50/50 rounded-lg border border-dashed">
                                No campaigns found. Create one to get started.
                            </div>
                        )}
                    </div>
                </CardContent>
            )}

            <Dialog open={!!enrollCampaign} onOpenChange={(open) => !open && setEnrollCampaign(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Enroll User: {enrollCampaign?.name}</DialogTitle>
                        <DialogDescription>Manually start this drip sequence for a number.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label>Phone Number</Label>
                        <Input
                            value={enrollPhone}
                            onChange={e => setEnrollPhone(e.target.value)}
                            placeholder="15551234567"
                        />
                    </div>
                    <DialogFooter>
                        <Button onClick={handleEnroll} disabled={enrolling}>
                            {enrolling && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Enroll
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
