import React, { useEffect, useState } from 'react';
import { api } from '@/crm/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, CheckCircle, Search, FileText, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface FormListProps {
    onSelect?: (form: any) => void;
    selectedId?: string | null;
    className?: string;
    compact?: boolean;
}

export default function FormList({ onSelect, selectedId, className = '', compact = false }: FormListProps) {
    const [forms, setForms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetchForms = async () => {
        setLoading(true);
        try {
            const data: any = await api.getMetaLeadForms();
            // api.ts now handles normalization, but double check
            setForms(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch forms', err);
            toast.error('Failed to load lead forms');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchForms();
    }, []);

    const filtered = forms.filter(f =>
        (f.name || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className={`space-y-4 ${className}`}>
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search forms..."
                        className="pl-9 h-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Button variant="outline" size="sm" onClick={fetchForms} disabled={loading} className="shrink-0">
                    Refresh
                </Button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center p-8 space-y-2 text-muted-foreground bg-muted/10 rounded-lg">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span className="text-sm">Loading forms from Meta...</span>
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center p-8 border-2 border-dashed rounded-lg text-muted-foreground bg-muted/5">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No forms found.</p>
                </div>
            ) : (
                <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
                    {filtered.map((form) => {
                        const isSelected = selectedId === form.id;
                        return (
                            <Card
                                key={form.id}
                                className={`transition-all hover:shadow-md cursor-pointer border-2 ${isSelected ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-transparent hover:border-border'}`}
                                onClick={() => onSelect && onSelect(form)}
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <h4 className={`font-semibold text-sm truncate ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                                                {form.name}
                                            </h4>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Created: {form.created_time ? new Date(form.created_time).toLocaleDateString() : 'Unknown'}
                                            </p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${form.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                                    {form.status || 'Active'}
                                                </span>
                                            </div>
                                        </div>
                                        {isSelected && <CheckCircle className="w-5 h-5 text-primary shrink-0" />}
                                    </div>

                                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
                                        {/* Only show Select button if not compact/onClick managed */}
                                        {onSelect && !compact ? (
                                            <Button
                                                variant={isSelected ? "default" : "secondary"}
                                                size="sm"
                                                className="h-7 text-xs w-full mr-2"
                                                onClick={(e) => { e.stopPropagation(); onSelect(form); }}
                                            >
                                                {isSelected ? 'Selected' : 'Select'}
                                            </Button>
                                        ) : null}

                                        {form.campaign_preview_url && (
                                            <a
                                                href={form.campaign_preview_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-primary hover:underline flex items-center gap-1 ml-auto"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                View <ExternalLink className="w-3 h-3" />
                                            </a>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
