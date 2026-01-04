// Template Preview Modal Component
// =================================
// Modal for previewing and sending an approved template

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Template } from './TemplateCard';
import { TemplateStatusBadge } from './TemplateStatusBadge';
import { Send, Loader2, AlertCircle, MessageSquare } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { API_BASE_URL } from "@/config";

const API_BASE = API_BASE_URL;

interface TemplatePreviewModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    template: Template | null;
    recipientPhone: string;
    phoneNumberId: string;
}

export function TemplatePreviewModal({
    open,
    onOpenChange,
    template,
    recipientPhone,
    phoneNumberId,
}: TemplatePreviewModalProps) {
    const [variables, setVariables] = useState<Record<string, string>>({});
    const [sending, setSending] = useState(false);

    if (!template) return null;

    const variableCount = template.variable_count || 0;
    const bodyText = template.body_text || '';
    const hasRecipient = recipientPhone && recipientPhone.trim().length > 0;

    // Get preview with substituted variables
    const getPreview = () => {
        let text = bodyText;
        for (let i = 1; i <= variableCount; i++) {
            const value = variables[`${i}`] || `{{${i}}}`;
            text = text.replace(`{{${i}}}`, value);
        }
        return text;
    };

    const handleSend = async () => {
        if (!hasRecipient) {
            toast({
                title: 'No Conversation Selected',
                description: 'Please select a conversation from the left panel first',
                variant: 'destructive',
            });
            return;
        }

        try {
            setSending(true);

            // Build body params array
            const bodyParams = [];
            for (let i = 1; i <= variableCount; i++) {
                bodyParams.push(variables[`${i}`] || '');
            }

            const res = await fetch(`${API_BASE}/api/whatsapp/send/template`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    to: recipientPhone,
                    phone_number_id: phoneNumberId,
                    template_name: template.name,
                    language: template.language,
                    body_params: bodyParams.length > 0 ? bodyParams : undefined,
                }),
            });

            const data = await res.json();

            if (res.ok && data.success !== false) {
                toast({
                    title: 'Template Sent!',
                    description: `Message sent to ${recipientPhone}`,
                });
                onOpenChange(false);
                setVariables({});
            } else {
                toast({
                    title: 'Send Failed',
                    description: data.error?.message || data.error || 'Failed to send template',
                    variant: 'destructive',
                });
            }
        } catch (err) {
            console.error('Send template error:', err);
            toast({
                title: 'Send Failed',
                description: 'Network error',
                variant: 'destructive',
            });
        } finally {
            setSending(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        Send Template
                        {template.status && <TemplateStatusBadge status={template.status} />}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Template info */}
                    <div className="flex items-center gap-2">
                        <Badge variant="outline">{template.name}</Badge>
                        <span className="text-sm text-muted-foreground">{template.language}</span>
                    </div>

                    {/* Variable inputs */}
                    {variableCount > 0 && (
                        <div className="space-y-3">
                            <Label className="text-sm font-medium">Fill in variables:</Label>
                            {Array.from({ length: variableCount }, (_, i) => i + 1).map((num) => (
                                <div key={num} className="flex items-center gap-2">
                                    <Label className="w-12 text-sm text-muted-foreground">
                                        {`{{${num}}}`}
                                    </Label>
                                    <Input
                                        placeholder={`Value for variable ${num}`}
                                        value={variables[`${num}`] || ''}
                                        onChange={(e) => setVariables(prev => ({
                                            ...prev,
                                            [`${num}`]: e.target.value
                                        }))}
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Preview */}
                    <div className="bg-muted rounded-lg p-4">
                        <Label className="text-xs text-muted-foreground mb-2 block">Preview:</Label>
                        <p className="text-sm whitespace-pre-wrap">{getPreview()}</p>
                    </div>

                    {/* Recipient */}
                    {hasRecipient ? (
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" />
                            Sending to: <strong>{recipientPhone}</strong>
                        </div>
                    ) : (
                        <Alert variant="destructive" className="bg-red-50 border-red-200">
                            <AlertCircle className="w-4 h-4" />
                            <AlertDescription>
                                <strong>No conversation selected!</strong>
                                <br />
                                Please select a conversation from the left panel before sending.
                            </AlertDescription>
                        </Alert>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSend}
                        disabled={sending || !hasRecipient}
                        className="bg-[#25D366] hover:bg-[#128C7E] text-white disabled:opacity-50"
                    >
                        {sending ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
                        ) : (
                            <><Send className="w-4 h-4 mr-2" /> Send Template</>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
