import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ExternalLink, FileText, Plus, Save } from 'lucide-react';
import LeadFormBuilder from '@/components/LeadFormBuilder';
import FormList from '@/components/FormList';
import { LeadFormConfig, useCampaignStore } from '@/store/campaignStore';
import { api } from '@/crm/api';
import { toast } from 'sonner';

export default function LeadFormsPage() {
    const [activeTab, setActiveTab] = useState('list');

    // Builder State
    const [formConfig, setFormConfig] = useState<LeadFormConfig>({
        form_name: 'New Lead Form',
        intro_text: 'Sign up for more info',
        questions: [],
        privacy_policy_url: '',
        thank_you_text: 'Thanks, we will contact you soon.'
    });
    const [isSaving, setIsSaving] = useState(false);
    const [lastSavedUrl, setLastSavedUrl] = useState<string | null>(null);

    // Save to Meta handler
    const handleSaveToMeta = async () => {
        if (!formConfig.form_name) {
            toast.error('Form name is required');
            return;
        }
        if (formConfig.questions.length === 0) {
            toast.error('Add at least one question');
            return;
        }

        setIsSaving(true);
        try {
            // Convert simple questions to backend expected payload
            const payload = {
                name: formConfig.form_name,
                intro: formConfig.intro_text,
                privacy_policy: formConfig.privacy_policy_url,
                thank_you: formConfig.thank_you_text,
                fields: formConfig.questions.map(q => ({
                    label: q.label,
                    type: q.type,
                    options: q.options?.map(o => o.label) // simplified options
                })),
                userId: '' // will be autodetected by backend from workspace/auth
            };

            const res = await api.saveMetaLeadForm(payload);

            if (res && res.viewUrl) {
                setLastSavedUrl(res.viewUrl);
                toast.success('Form saved to Meta successfully!');
                setActiveTab('list'); // Switch to list view to see it
            } else {
                toast.success('Form saved! (No preview URL returned)');
                setActiveTab('list');
            }
        } catch (err: any) {
            console.error('Save failed', err);
            toast.error(err?.message || 'Failed to save form to Meta');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="container mx-auto p-6 max-w-6xl space-y-8 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Lead Forms</h1>
                    <p className="text-muted-foreground mt-2">Create and manage your Facebook Lead Generation forms.</p>
                </div>
                {activeTab === 'list' && (
                    <Button onClick={() => setActiveTab('new')} className="gap-2">
                        <Plus className="w-4 h-4" /> Create New Form
                    </Button>
                )}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="bg-muted/50 p-1 rounded-xl">
                    <TabsTrigger value="list" className="rounded-lg px-6">My Forms</TabsTrigger>
                    <TabsTrigger value="new" className="rounded-lg px-6">Create New</TabsTrigger>
                </TabsList>

                <TabsContent value="list" className="space-y-6">
                    <Card className="border-none shadow-sm bg-transparent">
                        <FormList className="mt-2" />
                    </Card>
                </TabsContent>

                <TabsContent value="new" className="space-y-6">
                    <Card className="border shadow-lg">
                        <CardHeader className="border-b bg-muted/20">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Form Builder</CardTitle>
                                    <CardDescription>Design your lead form for Meta ads</CardDescription>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={() => setActiveTab('list')}>Cancel</Button>
                                    <Button onClick={handleSaveToMeta} disabled={isSaving} className="gap-2 bg-blue-600 hover:bg-blue-700">
                                        {isSaving ? 'Saving...' : 'Save to Meta'}
                                        {!isSaving && <Save className="w-4 h-4" />}
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            <LeadFormBuilder value={formConfig} onChange={setFormConfig} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
