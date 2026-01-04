
import { API_ENDPOINT } from '@/config';

;

import { useEffect, useRef, useState } from 'react';
import { DollarSign, Calendar, Target, RefreshCw, Sparkles, List, Plus, FileText, ExternalLink, Eye } from 'lucide-react';
import { api } from '@/crm/api';
import LeadFormBuilder from '@/components/LeadFormBuilder';
import FormList from '@/components/FormList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCampaignStore, LeadFormConfig } from '@/store/campaignStore';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const API_BASE = API_ENDPOINT;

export default function BudgetSchedule() {
  const { budget, setBudget, setStep, audience } = useCampaignStore();
  const navigate = useNavigate();

  const [estimating, setEstimating] = useState(false);
  const [estimate, setEstimate] = useState<any | null>(null);
  const debounceRef = useRef<number | null>(null);
  const lastReqRef = useRef<number>(0);

  // Default form
  const initialLeads: LeadFormConfig = budget?.leads_form ?? {
    form_name: 'Quick Lead Form',
    intro_text: '',
    privacy_policy_url: '',
    questions: [
      { id: 'q1', type: 'FULL_NAME', label: 'Full Name', required: true },
      { id: 'q2', type: 'EMAIL', label: 'Email', required: true }
    ],
    thank_you_text: 'Thanks! We will contact you shortly.',
  };

  const [leadsForm, setLeadsForm] = useState<LeadFormConfig>(initialLeads);
  const [formMode, setFormMode] = useState<'create' | 'select'>('create');

  // Also track the selected existing form ID if any
  const [selectedExistingForm, setSelectedExistingForm] = useState<any>(null);

  useEffect(() => {
    if (budget?.leads_form) {
      setLeadsForm(budget.leads_form);
    }
    // If budget has a selectedFormId, we should try to reflect that, but local state management
    // for "formMode" might need to default to 'select' if an ID is present.
    if (budget?.selectedFormId && !selectedExistingForm) {
      setFormMode('select');
      // Ideally we would fetch the form details to show it, or just show list
    }
  }, [budget?.leads_form, budget?.selectedFormId]);

  const handleContinue = () => {
    if ((budget.amount ?? 0) < 100) {
      toast.error('Minimum budget is ₹100 per day');
      return;
    }

    if (new Date(budget.endDate) < new Date(budget.startDate)) {
      toast.error('End date must be after start date');
      return;
    }

    setStep(4);
    navigate('/placements');
    toast.success('Budget settings saved');
  };

  const handleBack = () => {
    setStep(2);
    navigate('/audience');
  };

  const buildEstimatePayload = () => ({
    audience: {
      location: audience.location ?? {},
      age: audience.age ?? [18, 65],
      gender: audience.gender ?? 'all',
      interests: audience.interests ?? [],
      mode: audience.mode ?? 'MANUAL',
    },
    budget: {
      amount: Number(budget.amount ?? 0),
      type: budget.type ?? 'daily',
      currency: budget.currency ?? 'INR',
      startDate: budget.startDate,
      endDate: budget.endDate,
    },
    optimization: budget.optimization || 'CLICKS',
  });

  // -----------------------------------------------------------
  // ⭐ NEW: Fetch AI-generated lead form
  // -----------------------------------------------------------
  const fetchLeadForm = async () => {
    toast.info("Generating form with AI...");

    try {
      const res = await fetch(`${API_BASE}/ai/lead-form`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: "My Business",
          audience: audience,
        }),
      });

      const body = await res.json();

      if (!body.form) {
        toast.error("AI did not return a form. Try again.");
        return;
      }

      // Convert API → LeadFormConfig
      const aiForm: LeadFormConfig = {
        form_name: body.form.name || "AI Generated Form",
        intro_text: body.form.context_card?.body || "",
        privacy_policy_url: body.form.privacy_policy?.url || "",
        thank_you_text: body.form.thank_you_page?.body || "",
        questions: (body.form.questions || []).map((q: any, index: number) => ({
          id: `q${index + 1}`,
          type: q.type,
          label: q.label,
          options: q.options || [],
          required: true,
        })),
      };

      // Save in store + UI
      setLeadsForm(aiForm);
      setBudget({ leads_form: aiForm });

      toast.success("AI Form Generated Successfully!");
    } catch (e) {
      console.error(e);
      toast.error("AI form generation failed.");
    }
  };

  // -----------------------------------------------------------

  const fetchEstimate = async () => {
    if ((budget.optimization || '').toUpperCase() === 'LEADS') {
      setEstimate(null);
      setEstimating(false);
      return;
    }

    const reqId = Date.now();
    lastReqRef.current = reqId;
    setEstimating(true);

    try {
      const payload = buildEstimatePayload();
      const res = await fetch(`${API_BASE}/meta/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => ({}));
      if (lastReqRef.current !== reqId) return;

      if (!res.ok) {
        toast.error(body?.error || 'Failed to fetch Meta estimates');
        setEstimate(null);
        return;
      }

      const normalized = {
        ok: body.ok !== false,
        meta_raw: body.meta_raw ?? null,
        estimate: body.estimate ?? body.delivery_estimate ?? null,
        generated_at: body.generated_at ?? new Date().toISOString(),
      };

      setEstimate(normalized);
    } catch (err: any) {
      toast.error(err?.message || 'Network error while fetching estimates');
      setEstimate(null);
    } finally {
      if (lastReqRef.current === reqId) setEstimating(false);
    }
  };

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);

    if ((budget.optimization || '').toUpperCase() === 'LEADS') {
      setEstimate(null);
      return;
    }

    debounceRef.current = window.setTimeout(() => fetchEstimate(), 800);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [budget.amount, budget.type, budget.startDate, budget.endDate, budget.optimization, JSON.stringify(audience)]);

  const prettyNumber = (n: number | null | undefined) =>
    n == null ? '—' : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`;

  const handleLeadsFormChange = (newForm: LeadFormConfig) => {
    setLeadsForm(newForm);
    setBudget({ leads_form: newForm });
  };

  const handlePreviewForm = async (formId: string) => {
    if (!formId) return;
    try {
      const res = await api.getMetaFormPreview(formId);
      if (res && res.url) {
        window.open(res.url, '_blank');
      } else {
        toast.error('Could not get preview URL from Meta');
      }
    } catch (err) {
      console.error('Preview error', err);
      toast.error('Failed to load preview');
    }
  };

  const [savingForm, setSavingForm] = useState(false);

  const handleSaveToMeta = async () => {
    if (!leadsForm.form_name) {
      toast.error('Form Name is required');
      return;
    }
    setSavingForm(true);
    try {
      // 1. Save to Meta
      const payload = {
        name: leadsForm.form_name,
        intro: leadsForm.intro_text,
        privacy_policy: leadsForm.privacy_policy_url,
        thank_you: leadsForm.thank_you_text,
        fields: leadsForm.questions.map(q => ({
          label: q.label,
          type: q.type,
          options: q.options?.map(o => o.label)
        })),
        // userId: user?.id || ''  <-- user is not defined here, and backend uses auth token
      };
      const res = await api.saveMetaLeadForm(payload);

      if (res && res.formId) {
        // 2. Update Budget with selectedFormId
        setBudget({
          leads_form: leadsForm,
          selectedFormId: res.formId
        });

        // 3. Select it locally so UI updates
        setSelectedExistingForm({
          id: res.formId,
          name: leadsForm.form_name,
          viewUrl: res.viewUrl
        });

        toast.success('Form saved to Meta successfully!');
      }
    } catch (err: any) {
      console.error("Save Form Error", err);
      toast.error(err.message || "Failed to save form");
    } finally {
      setSavingForm(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">Set your budget & schedule</h1>
        <p className="text-lg text-muted-foreground">
          Control your ad spend and campaign duration — we will show Meta predicted performance, or configure a Leads form
        </p>
      </div>

      {/* Budget type & amount */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Budget Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={budget.type}
              onValueChange={(value: any) => setBudget({ type: value })}
              className="space-y-4"
            >
              <div className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:border-primary">
                <RadioGroupItem value="daily" id="daily" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="daily" className="cursor-pointer font-semibold">Daily Budget</Label>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:border-primary">
                <RadioGroupItem value="lifetime" id="lifetime" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="lifetime" className="cursor-pointer font-semibold">Lifetime Budget</Label>
                </div>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle>Budget Amount</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="amount">Amount ({budget.currency})</Label>
              <div className="relative mt-2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                <Input
                  id="amount"
                  type="number"
                  min="100"
                  value={budget.amount}
                  onChange={(e) => setBudget({ amount: parseInt(e.target.value) || 0 })}
                  className="pl-8"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Schedule */}
      <Card className="shadow-medium mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Campaign Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="start-date">Start Date</Label>
            <Input
              id="start-date"
              type="date"
              value={budget.startDate}
              onChange={(e) => setBudget({ startDate: e.target.value })}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="end-date">End Date</Label>
            <Input
              id="end-date"
              type="date"
              value={budget.endDate}
              onChange={(e) => setBudget({ endDate: e.target.value })}
              className="mt-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Optimization Goal */}
      <Card className="shadow-medium mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Optimization Goal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={budget.optimization} onValueChange={(value: any) => setBudget({ optimization: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CLICKS">Link Clicks</SelectItem>
              <SelectItem value="LEADS">Leads</SelectItem>
              <SelectItem value="PURCHASES">Purchases</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Leads Form Section */}
      {((budget.optimization || '').toUpperCase() === 'LEADS') ? (
        <div className="mb-8">
          <Card className="shadow-medium border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Lead Collection Method
              </CardTitle>
              <CardDescription>Choose how you want to collect leads on Facebook</CardDescription>
            </CardHeader>

            <CardContent>
              <Tabs value={formMode} onValueChange={(v: any) => setFormMode(v)} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="create" className="gap-2">
                    <Plus className="w-4 h-4" /> Create New Form
                  </TabsTrigger>
                  <TabsTrigger value="select" className="gap-2">
                    <List className="w-4 h-4" /> Select Existing Form
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="create" className="space-y-6 animate-in slide-in-from-left-2 duration-300">
                  <div className="flex justify-between items-center bg-background/50 p-4 rounded-lg border border-border/50">
                    <div>
                      <h4 className="font-medium text-sm">AI Generator</h4>
                      <p className="text-xs text-muted-foreground">Auto-generate questions based on your audience</p>
                    </div>
                    <Button onClick={fetchLeadForm} size="sm" className="gap-2 bg-purple-600 hover:bg-purple-700 text-white">
                      <Sparkles className="w-4 h-4" /> Generate Using AI
                    </Button>
                  </div>

                  <div className="bg-card border rounded-xl p-4 shadow-sm">
                    <LeadFormBuilder
                      value={leadsForm}
                      onChange={handleLeadsFormChange}
                    />
                  </div>

                  <div className="flex gap-3 justify-end items-center">
                    {budget.selectedFormId && formMode === 'create' && (
                      <Button variant="outline" size="sm" onClick={() => handlePreviewForm(budget.selectedFormId!)} className="gap-2 text-blue-600">
                        <Eye className="w-4 h-4" /> Preview
                      </Button>
                    )}

                    <Button variant="ghost" onClick={() => { setLeadsForm(initialLeads); setBudget({ leads_form: initialLeads }); }}>
                      Reset
                    </Button>

                    <Button onClick={handleSaveToMeta} disabled={savingForm} className="gap-2">
                      {savingForm && <RefreshCw className="w-4 h-4 animate-spin" />}
                      Save to Meta & Select
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="select" className="space-y-4 animate-in slide-in-from-right-2 duration-300">
                  <div className="bg-background/50 p-4 rounded-lg border border-border/50 mb-4">
                    <h4 className="font-medium text-sm mb-2">Select from Meta library</h4>
                    <p className="text-xs text-muted-foreground">Choose a form you've previously created and saved to Meta.</p>
                  </div>

                  {selectedExistingForm && (
                    <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-lg mb-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">Selected: {selectedExistingForm.name}</span>
                      </div>
                      <Button size="sm" variant="outline" className="h-8 gap-2 bg-white text-blue-700 hover:text-blue-800 border-blue-200"
                        onClick={() => handlePreviewForm(selectedExistingForm.id)}
                      >
                        <Eye className="w-3.5 h-3.5" /> Preview on Facebook
                      </Button>
                    </div>
                  )}

                  <div className="min-h-[300px]">
                    <FormList
                      selectedId={budget.selectedFormId}
                      onSelect={(form) => {
                        setBudget({ selectedFormId: form.id, leads_form: undefined }); // Clear config if selecting ID
                        setSelectedExistingForm(form);
                        toast.success(`Selected form: ${form.name}`);
                      }}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="mb-8"></div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleBack}>Back</Button>
        <Button onClick={handleContinue}>Continue to Placements</Button>
      </div>
    </div>
  );
}