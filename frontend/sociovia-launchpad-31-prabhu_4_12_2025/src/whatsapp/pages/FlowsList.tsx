/**
 * Flows List Page
 * ================
 * Shows all WhatsApp Flows and their status
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
    Plus,
    Workflow,
    Edit,
    Trash2,
    Loader2,
    CheckCircle,
    Clock,
    XCircle,
    Send,
    MessageCircle
} from 'lucide-react';
import { API_BASE_URL } from "@/config";

const API_BASE = API_BASE_URL;

interface Flow {
    id: number;
    name: string;
    category: string;
    status: string;
    flow_version: number;
    screen_count: number;
    meta_flow_id: string | null;
    created_at: string;
    updated_at: string;
    published_at: string | null;
}

export function FlowsList() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [flows, setFlows] = useState<Flow[]>([]);
    const [loading, setLoading] = useState(true);
    const [publishing, setPublishing] = useState<number | null>(null);
    const [accountId, setAccountId] = useState<string | null>(null);
    const [accountName, setAccountName] = useState<string | null>(null);

    // Get workspace_id from storage (set during login/workspace selection)
    const workspaceId = localStorage.getItem('sv_whatsapp_workspace_id') ||
        sessionStorage.getItem('sv_whatsapp_workspace_id');

    // Check connection status (validates token with Meta, not just database records)
    useEffect(() => {
        const checkConnection = async () => {
            if (!workspaceId) {
                setLoading(false);
                return;
            }
            try {
                // Use /connection-path API which validates token with Meta
                const res = await fetch(`${API_BASE}/api/whatsapp/connection-path?workspace_id=${workspaceId}`, {
                    credentials: 'include',
                });
                const data = await res.json();

                // Only set account if status is CONNECTED (token is valid)
                if (data.status === 'CONNECTED' && data.account_summary) {
                    const accId = String(data.account_summary.id || '');
                    setAccountId(accId);
                    setAccountName(data.account_summary.verified_name || null);
                    if (accId) {
                        localStorage.setItem('selectedAccountId', accId);
                    }
                } else {
                    // Not connected - clear account
                    setAccountId(null);
                    setAccountName(null);
                    setLoading(false);
                }
            } catch (err) {
                console.error('Failed to check connection:', err);
                setLoading(false);
            }
        };
        checkConnection();
    }, [workspaceId]);

    useEffect(() => {
        if (accountId) {
            fetchFlows();
        } else {
            setLoading(false);
        }
    }, [accountId]);

    const fetchFlows = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/api/whatsapp/flows?account_id=${accountId}`);
            const data = await res.json();
            if (data.success) {
                setFlows(data.flows || []);
            }
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to load flows', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const publishFlow = async (flowId: number) => {
        try {
            setPublishing(flowId);
            const res = await fetch(`${API_BASE}/api/whatsapp/flows/${flowId}/publish`, {
                method: 'POST'
            });
            const data = await res.json();
            if (data.success) {
                toast({ title: 'Published!', description: 'Flow published successfully to Meta' });
                fetchFlows(); // Refresh list
            } else {
                // Show specific error message with action URL if available
                let errorMsg = data.message || data.error || 'Failed to publish flow';

                // Add action hint for specific error types
                if (data.error === 'business_not_verified') {
                    errorMsg += '. Go to Meta Business Manager to complete verification.';
                } else if (data.error === 'flows_not_enabled') {
                    errorMsg += '. Contact Meta Support to enable Flows.';
                } else if (data.error === 'token_expired' || data.error === 'token_missing') {
                    errorMsg += '. Please reconnect your WhatsApp account.';
                }

                toast({ title: 'Publish Failed', description: errorMsg, variant: 'destructive' });
            }
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to publish flow', variant: 'destructive' });
        } finally {
            setPublishing(null);
        }
    };

    const deleteFlow = async (flowId: number) => {
        if (!confirm('Are you sure you want to delete this flow?')) return;

        try {
            const res = await fetch(`${API_BASE}/api/whatsapp/flows/${flowId}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                toast({ title: 'Deleted', description: 'Flow deleted successfully' });
                fetchFlows();
            } else {
                toast({ title: 'Error', description: data.error, variant: 'destructive' });
            }
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to delete flow', variant: 'destructive' });
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PUBLISHED':
                return <Badge className="bg-green-500 text-white"><CheckCircle className="w-3 h-3 mr-1" /> Published</Badge>;
            case 'DRAFT':
                return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Draft</Badge>;
            case 'DEPRECATED':
                return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Deprecated</Badge>;
            default:
                return <Badge>{status}</Badge>;
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold">{accountName ? <><span className="text-green-600">{accountName}'s</span> Flows</> : 'WhatsApp Flows'}</h1>
                    <p className="text-muted-foreground">Manage your interactive flows</p>
                </div>
                <Button onClick={() => navigate('/dashboard/whatsapp/flows/new')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Flow
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
            ) : !workspaceId ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Workflow className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Workspace Selected</h3>
                        <p className="text-muted-foreground mb-4">Please select a workspace from the dashboard first</p>
                    </CardContent>
                </Card>
            ) : !accountId ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Workflow className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No WhatsApp Account Connected</h3>
                        <p className="text-muted-foreground mb-4">Connect a WhatsApp Business Account to create flows</p>
                        <Button
                            onClick={() => navigate('/dashboard/whatsapp/setup')}
                            className="w-full bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:from-[#128C7E] hover:to-[#075E54] text-white gap-2"
                        >
                            <MessageCircle className="w-5 h-5" />
                            Connect WhatsApp Account
                        </Button>
                    </CardContent>
                </Card>
            ) : flows.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Workflow className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No flows yet</h3>
                        <p className="text-muted-foreground mb-4">Create your first interactive flow</p>
                        <Button onClick={() => navigate('/dashboard/whatsapp/flows/new')}>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Flow
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {flows.map(flow => (
                        <Card key={flow.id} className="hover:shadow-lg transition-shadow">
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Workflow className="w-5 h-5 text-blue-500" />
                                            {flow.name}
                                        </CardTitle>
                                        <CardDescription>{flow.category}</CardDescription>
                                    </div>
                                    {getStatusBadge(flow.status)}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm text-muted-foreground space-y-1 mb-4">
                                    <p>Screens: {flow.screen_count}</p>
                                    <p>Version: {flow.flow_version}</p>
                                    {flow.meta_flow_id && (
                                        <p className="text-xs truncate">
                                            Flow ID: {flow.meta_flow_id}
                                        </p>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    {flow.status === 'DRAFT' && (
                                        <>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => navigate(`/dashboard/whatsapp/flows/${flow.id}`)}
                                            >
                                                <Edit className="w-4 h-4 mr-1" />
                                                Edit
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => publishFlow(flow.id)}
                                                disabled={publishing === flow.id}
                                            >
                                                {publishing === flow.id ? (
                                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                                ) : (
                                                    <Send className="w-4 h-4 mr-1" />
                                                )}
                                                Publish
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-destructive"
                                                onClick={() => deleteFlow(flow.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </>
                                    )}
                                    {flow.status === 'PUBLISHED' && (
                                        <Badge variant="outline" className="text-green-600">
                                            ✓ Ready to use in templates
                                        </Badge>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
