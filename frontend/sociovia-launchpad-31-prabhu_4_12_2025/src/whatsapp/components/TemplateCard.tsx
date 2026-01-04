// Template Card Component
// ========================
// Displays a single template card (real or suggestion)

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TemplateStatusBadge } from './TemplateStatusBadge';
import { Send, Sparkles, FileText, ShoppingCart, Shield, Megaphone } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Template {
    id: number | string;
    name: string;
    category: string;
    language: string;
    status?: string;
    body_text?: string;
    header_text?: string;
    footer_text?: string;
    variable_count?: number;
    rejection_reason?: string;
    // For suggestions
    title?: string;
    preview?: string;
    description?: string;
    variables?: number;
}

interface TemplateCardProps {
    template: Template;
    isReal: boolean; // true = real template from Meta, false = suggestion
    onSend?: () => void;
    onUse?: () => void;
    onEdit?: () => void;
    disabled?: boolean;
}

const categoryConfig: Record<string, { icon: typeof FileText; color: string }> = {
    UTILITY: { icon: ShoppingCart, color: 'bg-blue-100 text-blue-700' },
    MARKETING: { icon: Megaphone, color: 'bg-purple-100 text-purple-700' },
    AUTHENTICATION: { icon: Shield, color: 'bg-amber-100 text-amber-700' },
};

export function TemplateCard({ template, isReal, onSend, onUse, onEdit, disabled }: TemplateCardProps) {
    const name = template.title || template.name;
    const body = template.preview || template.body_text || '';
    const desc = template.description;
    const category = template.category?.toUpperCase() || 'UTILITY';
    const status = template.status?.toUpperCase();
    const variableCount = template.variables ?? template.variable_count ?? 0;
    const isApproved = status === 'APPROVED';
    const isRejected = status === 'REJECTED';

    const catConfig = categoryConfig[category] || categoryConfig.UTILITY;
    const CategoryIcon = catConfig.icon;

    return (
        <Card className={cn(
            'relative overflow-hidden transition-all duration-200 hover:shadow-md',
            'border-l-4',
            isReal
                ? (isApproved ? 'border-l-green-500' : isRejected ? 'border-l-red-500' : 'border-l-yellow-500')
                : 'border-l-primary/50',
            !isReal && 'bg-gradient-to-br from-background to-primary/5'
        )}>
            {/* Suggestion indicator */}
            {!isReal && (
                <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className="gap-1 text-xs">
                        <Sparkles className="w-3 h-3" />
                        Suggestion
                    </Badge>
                </div>
            )}

            <CardContent className="p-4">
                {/* Header row */}
                <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Badge variant="outline" className={cn('gap-1 shrink-0', catConfig.color)}>
                            <CategoryIcon className="w-3 h-3" />
                            {category}
                        </Badge>
                        <span className="text-xs text-muted-foreground shrink-0">{template.language}</span>
                    </div>
                    {isReal && status && (
                        <TemplateStatusBadge status={status} className="shrink-0" />
                    )}
                </div>

                {/* Template name */}
                <h4 className="font-semibold text-sm mb-1 truncate">{name}</h4>

                {/* Description for suggestions */}
                {desc && !isReal && (
                    <p className="text-xs text-muted-foreground mb-2">{desc}</p>
                )}

                {/* Body preview */}
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {body || 'No preview available'}
                </p>

                {/* Variables indicator */}
                {variableCount > 0 && (
                    <p className="text-xs text-muted-foreground mb-3">
                        📝 {variableCount} variable{variableCount > 1 ? 's' : ''} required
                    </p>
                )}

                {/* Rejection reason */}
                {isReal && isRejected && template.rejection_reason && (
                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded mb-3">
                        <strong>Reason:</strong> {template.rejection_reason}
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                    {isReal ? (
                        <>
                            <Button
                                size="sm"
                                onClick={onSend}
                                disabled={disabled || !isApproved}
                                className={cn(
                                    'flex-1',
                                    isApproved
                                        ? 'bg-[#25D366] hover:bg-[#128C7E] text-white'
                                        : 'opacity-50 cursor-not-allowed'
                                )}
                            >
                                <Send className="w-3 h-3 mr-1" />
                                {isApproved ? 'Send' : status === 'PENDING' ? 'Pending Approval' : 'Cannot Send'}
                            </Button>
                            {isRejected && onEdit && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={onEdit}
                                    className="border-orange-500 text-orange-600 hover:bg-orange-50"
                                >
                                    Edit & Resubmit
                                </Button>
                            )}
                        </>
                    ) : (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={onUse}
                            disabled={disabled}
                            className="flex-1 border-primary text-primary hover:bg-primary hover:text-white"
                        >
                            <FileText className="w-3 h-3 mr-1" />
                            Use this template
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
