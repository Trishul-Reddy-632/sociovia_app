// My Templates List Component
// ============================
// Section 1: Real templates from user's WABA (synced from Meta)

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { TemplateCard, Template } from './TemplateCard';
import { RefreshCw, Search, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { API_BASE_URL } from "@/config";

const API_BASE = API_BASE_URL;

interface MyTemplatesListProps {
    accountId: number | null;
    onSendTemplate: (template: Template) => void;
}

export function MyTemplatesList({ accountId, onSendTemplate }: MyTemplatesListProps) {
    const navigate = useNavigate();
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');

    const fetchTemplates = async () => {
        if (!accountId) return;

        try {
            setLoading(true);
            const params = new URLSearchParams({ account_id: accountId.toString() });
            if (statusFilter) params.append('status', statusFilter);

            const res = await fetch(`${API_BASE}/api/whatsapp/templates?${params}`, {
                credentials: 'include',
            });
            const data = await res.json();

            if (data.success) {
                setTemplates(data.templates || []);
            }
        } catch (err) {
            console.error('Failed to fetch templates:', err);
        } finally {
            setLoading(false);
        }
    };

    const syncTemplates = async () => {
        if (!accountId) return;

        try {
            setSyncing(true);
            const res = await fetch(`${API_BASE}/api/whatsapp/templates/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ account_id: accountId }),
            });
            const data = await res.json();

            if (data.success) {
                // Re-fetch templates with current filter instead of using sync result
                await fetchTemplates();
                toast({
                    title: 'Templates Refreshed',
                    description: `${data.synced} templates updated from Meta`,
                });
            } else {
                toast({
                    title: 'Refresh Failed',
                    description: data.error || 'Failed to refresh templates',
                    variant: 'destructive',
                });
            }
        } catch (err) {
            console.error('Failed to refresh templates:', err);
            toast({
                title: 'Refresh Failed',
                description: 'Network error while refreshing',
                variant: 'destructive',
            });
        } finally {
            setSyncing(false);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, [accountId, statusFilter]);

    const filteredTemplates = templates.filter(t => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            t.name?.toLowerCase().includes(query) ||
            t.body_text?.toLowerCase().includes(query)
        );
    });

    if (!accountId) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <p>Select an account to view templates</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header with sync and search */}
            <div className="p-4 border-b space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold">My Templates</h3>
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            onClick={() => navigate('/dashboard/whatsapp/templates/new')}
                            className="gap-1"
                        >
                            <Plus className="w-4 h-4" />
                            Create Template
                        </Button>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={syncTemplates}
                                        disabled={syncing}
                                        className="gap-1"
                                    >
                                        <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                                        Refresh
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Fetch latest template status from Meta</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search templates..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>

                {/* Status filter */}
                <div className="flex gap-2 flex-wrap">
                    {['', 'APPROVED', 'PENDING', 'REJECTED'].map(status => (
                        <Button
                            key={status || 'all'}
                            size="sm"
                            variant={statusFilter === status ? 'default' : 'outline'}
                            onClick={() => setStatusFilter(status)}
                            className="text-xs"
                        >
                            {status || 'All'}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Templates list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loading ? (
                    <div className="flex items-center justify-center h-32">
                        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                ) : filteredTemplates.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                        <p>No templates found</p>
                        <p className="text-sm mt-2">Click "Refresh" to fetch from Meta</p>
                    </div>
                ) : (
                    filteredTemplates.map((template) => (
                        <TemplateCard
                            key={template.id}
                            template={template}
                            isReal={true}
                            onSend={() => onSendTemplate(template)}
                            onEdit={() => navigate(`/dashboard/whatsapp/templates/${template.id}/edit`)}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
