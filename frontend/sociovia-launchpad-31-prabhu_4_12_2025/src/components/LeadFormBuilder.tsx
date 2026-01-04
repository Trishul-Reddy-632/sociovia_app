import React, { useState } from 'react';
import {
    Plus,
    Trash2,
    GripVertical,
    Type,
    Mail,
    Phone,
    List,
    CheckSquare,
    Star,
    Calendar,
    Upload,
    MapPin,
    ToggleLeft,
    Settings,
    X,
    Sparkles,
    Loader2,
    Wand2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { api } from '@/crm/api';

import {
    Question,
    QuestionType,
    LeadFormConfig,
    useCampaignStore
} from '@/store/campaignStore';

interface LeadFormBuilderProps {
    value: LeadFormConfig;
    onChange: (val: LeadFormConfig) => void;
}

// --- Icons Map ---
const TYPE_ICONS: Record<QuestionType, React.ReactNode> = {
    FULL_NAME: <Type className="w-4 h-4" />,
    EMAIL: <Mail className="w-4 h-4" />,
    PHONE: <Phone className="w-4 h-4" />,
    TEXT: <Type className="w-4 h-4" />,
    TEXTAREA: <Type className="w-4 h-4" />,
    MCQ_SINGLE: <List className="w-4 h-4" />,
    MCQ_MULTI: <CheckSquare className="w-4 h-4" />,
    DROPDOWN: <List className="w-4 h-4" />,
    BOOLEAN: <ToggleLeft className="w-4 h-4" />,
    RATING: <Star className="w-4 h-4" />,
    DATE: <Calendar className="w-4 h-4" />,
    FILE_UPLOAD: <Upload className="w-4 h-4" />,
    ADDRESS: <MapPin className="w-4 h-4" />,
};

const DEFAULT_LABELS: Record<QuestionType, string> = {
    FULL_NAME: 'Full Name',
    EMAIL: 'Work Email',
    PHONE: 'Phone Number',
    TEXT: 'Short Answer',
    TEXTAREA: 'Long Answer',
    MCQ_SINGLE: 'Multiple Choice',
    MCQ_MULTI: 'Checkboxes',
    DROPDOWN: 'Dropdown',
    BOOLEAN: 'Yes/No',
    RATING: 'Rating',
    DATE: 'Date',
    FILE_UPLOAD: 'File Upload',
    ADDRESS: 'Address',
};

// --- Question Editor Component ---

const QuestionEditor = ({
    question,
    index,
    onUpdate,
    onRemove,
    allQuestions
}: {
    question: Question;
    index: number;
    onUpdate: (q: Question) => void;
    onRemove: () => void;
    allQuestions: Question[];
}) => {
    const [expanded, setExpanded] = useState(true);

    // Helper to update specific field
    const updateField = (key: keyof Question, val: any) => {
        onUpdate({ ...question, [key]: val });
    };

    const addOption = () => {
        const opts = question.options || [];
        updateField('options', [...opts, { label: `Option ${opts.length + 1}`, value: `opt_${opts.length + 1}` }]);
    };

    const updateOption = (optIdx: number, key: 'label' | 'value', val: string) => {
        const opts = [...(question.options || [])];
        opts[optIdx] = { ...opts[optIdx], [key]: val };
        updateField('options', opts);
    };

    const removeOption = (optIdx: number) => {
        const opts = [...(question.options || [])];
        opts.splice(optIdx, 1);
        updateField('options', opts);
    };

    const needsOptions = ['MCQ_SINGLE', 'MCQ_MULTI', 'DROPDOWN'].includes(question.type);

    return (
        <div className="group border border-border rounded-lg bg-card mb-3 transition-all hover:border-primary/40 focus-within:border-primary/60 shadow-sm">
            {/* Header / Summary */}
            <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-t-lg cursor-pointer" onClick={() => setExpanded(!expanded)}>
                <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab active:cursor-grabbing" onClick={(e) => e.stopPropagation()} />
                <div className="flex items-center gap-2 flex-1">
                    <div className="p-1.5 bg-primary/10 rounded text-primary">
                        {TYPE_ICONS[question.type]}
                    </div>
                    <span className="font-medium text-sm truncate max-w-[200px]">{question.label || 'Untitled Question'}</span>
                    {question.required && <span className="text-xs text-destructive">*</span>}
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onRemove(); }}>
                        <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                </div>
            </div>

            {/* Expanded Editor */}
            {expanded && (
                <div className="p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label className="text-xs">Label</Label>
                            <Input
                                value={question.label}
                                onChange={(e) => updateField('label', e.target.value)}
                                className="mt-1 h-9"
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Type</Label>
                            <Select
                                value={question.type}
                                onValueChange={(val) => updateField('type', val as QuestionType)}
                            >
                                <SelectTrigger className="mt-1 h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(DEFAULT_LABELS).map(([k, v]) => (
                                        <SelectItem key={k} value={k} className="text-xs">
                                            <span className="flex items-center gap-2">
                                                {TYPE_ICONS[k as QuestionType]} {v}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label className="text-xs">Placeholder</Label>
                            <Input
                                value={question.placeholder || ''}
                                onChange={(e) => updateField('placeholder', e.target.value)}
                                className="mt-1 h-9"
                                placeholder="e.g. Type here..."
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Help Text</Label>
                            <Input
                                value={question.help_text || ''}
                                onChange={(e) => updateField('help_text', e.target.value)}
                                className="mt-1 h-9"
                                placeholder="Instructions for user..."
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Switch
                                checked={question.required}
                                onCheckedChange={(c) => updateField('required', c)}
                                id={`req-${index}`}
                            />
                            <Label htmlFor={`req-${index}`} className="text-xs cursor-pointer">Required</Label>
                        </div>
                    </div>

                    {/* Options Editor */}
                    {needsOptions && (
                        <div className="bg-muted/30 p-3 rounded-md space-y-2">
                            <Label className="text-xs font-semibold">Options</Label>
                            <div className="space-y-2">
                                {(question.options || []).map((opt, optIdx) => (
                                    <div key={optIdx} className="flex gap-2 items-center">
                                        <Input
                                            value={opt.label}
                                            onChange={(e) => updateOption(optIdx, 'label', e.target.value)}
                                            className="h-8 text-xs"
                                            placeholder={`Option ${optIdx + 1}`}
                                        />
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeOption(optIdx)}>
                                            <X className="w-3 h-3" />
                                        </Button>
                                    </div>
                                ))}
                                <Button variant="outline" size="sm" onClick={addOption} className="w-full text-xs h-8 border-dashed">
                                    <Plus className="w-3 h-3 mr-1" /> Add Option
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Minimal Conditional Logic */}
                    <div className="mt-2">
                        <Label className="text-xs text-muted-foreground flex items-center gap-2 cursor-pointer" onClick={() => {
                            if (question.conditionalOn) updateField('conditionalOn', undefined);
                            else updateField('conditionalOn', { questionId: '', operator: 'eq', value: '' });
                        }}>
                            <Settings className="w-3 h-3" />
                            {question.conditionalOn ? 'Remove Condition' : 'Add Conditional Logic'}
                        </Label>

                        {question.conditionalOn && (
                            <div className="mt-2 p-3 border border-dashed rounded bg-yellow-50/50 flex flex-col gap-2">
                                <div className="text-xs font-medium">Show this question if:</div>
                                <div className="flex gap-2">
                                    <Select
                                        value={question.conditionalOn.questionId}
                                        onValueChange={(v) => updateField('conditionalOn', { ...question.conditionalOn, questionId: v })}
                                    >
                                        <SelectTrigger className="h-8 text-xs flex-1">
                                            <SelectValue placeholder="Select Question" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {allQuestions
                                                .filter(q => q.id !== question.id && ['MCQ_SINGLE', 'DROPDOWN', 'BOOLEAN'].includes(q.type))
                                                .map(q => (
                                                    <SelectItem key={q.id} value={q.id} className="text-xs">{q.label}</SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>

                                    <Select
                                        value={question.conditionalOn.operator}
                                        onValueChange={(v) => updateField('conditionalOn', { ...question.conditionalOn, operator: v })}
                                    >
                                        <SelectTrigger className="h-8 text-xs w-[100px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="eq" className="text-xs">Equals</SelectItem>
                                            <SelectItem value="contains" className="text-xs">Contains</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <Input
                                        value={question.conditionalOn.value}
                                        onChange={(e) => updateField('conditionalOn', { ...question.conditionalOn, value: e.target.value })}
                                        className="h-8 text-xs flex-1"
                                        placeholder="Value match..."
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            )}
        </div>
    );
};


// --- Main Builder Component ---

export default function LeadFormBuilder({ value, onChange }: LeadFormBuilderProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [isAiPromptOpen, setIsAiPromptOpen] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');

    // Get campaign context for AI payload
    const { audience, creative } = useCampaignStore();

    const updateForm = (key: keyof LeadFormConfig, val: any) => {
        onChange({ ...value, [key]: val });
    };

    const openAiPrompt = () => {
        setAiPrompt('');
        setIsAiPromptOpen(true);
    };

    // --------------------
    // Helper: parse AI response robustly in frontend
    // --------------------
    function extractJsonFromRawGemini(raw: string) {
        if (!raw) return null;
        // remove triple-backticks if present
        let cleaned = raw.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
        // try to find first {...} block
        const m = cleaned.match(/(\{[\s\S]*\})/);
        if (m) cleaned = m[1];
        try {
            return JSON.parse(cleaned);
        } catch (e) {
            // last attempt: replace single quotes in obvious patterns (be conservative)
            try {
                const alt = cleaned.replace(/([{,]\s*)'([^']+)'\s*:/g, '$1"$2":').replace(/'([^']+)'(?=\s*[,\}])/g, '"$1"');
                return JSON.parse(alt);
            } catch (e2) {
                console.warn('Failed to parse raw_gemini', e2);
                return null;
            }
        }
    }

    function normalizeOptionEntry(opt: any): { label: string; value?: string } | null {
        if (opt == null) return null;
        if (typeof opt === 'string') {
            // strip patterns like "{'label': 'X'}" or '{"label":"X"}'
            const m = opt.match(/['"]?label['"]?\s*[:=]\s*['"](.+?)['"]/i);
            if (m) {
                return { label: m[1] };
            }
            return { label: opt };
        }
        if (typeof opt === 'object') {
            if (Array.isArray(opt)) {
                // fallback: join
                return { label: opt.join(' / ') };
            }
            if ('label' in opt) {
                return { label: String(opt.label) };
            }
            // if it's {value:..., text:...}
            if ('text' in opt) return { label: String(opt.text) };
            if ('name' in opt) return { label: String(opt.name) };
            // otherwise stringify
            return { label: String(opt) };
        }
        return null;
    }

    function mapMetaTypeToQuestionType(metaType?: string): QuestionType {
        if (!metaType) return 'TEXT';
        const t = String(metaType).toUpperCase();
        switch (t) {
            case 'FULL_NAME':
            case 'FULLNAME':
                return 'FULL_NAME';
            case 'EMAIL':
                return 'EMAIL';
            case 'PHONE':
                return 'PHONE';
            case 'SHORT_TEXT':
            case 'SHORT':
                return 'TEXT';
            case 'LONG_TEXT':
            case 'LONG':
            case 'PARAGRAPH':
                return 'TEXTAREA';
            case 'MULTIPLE_CHOICE':
            case 'MCQ':
                return 'MCQ_SINGLE';
            case 'MCQ_MULTI':
            case 'CHECKBOX':
            case 'CHECKBOXES':
                return 'MCQ_MULTI';
            case 'DROPDOWN':
                return 'DROPDOWN';
            case 'YES_NO':
            case 'BOOLEAN':
                return 'BOOLEAN';
            case 'DATE':
                return 'DATE';
            default:
                return 'TEXT';
        }
    }

    function normalizeQuestionsFromAi(obj: any): Question[] {
        if (!obj) return [];
        // common shapes: obj.form.questions, obj.questions, obj.data, obj.lead_form.questions
        const candidates = obj.form?.questions || obj.questions || obj.data || obj.lead_form?.questions || obj.items || [];
        if (!Array.isArray(candidates)) return [];

        const now = Date.now();
        const formatted: Question[] = candidates.map((q: any, idx: number) => {
            // possible fields: question_type, type, questionType, label, text, question, options
            const rawType = q.question_type || q.type || q.questionType || q.kind || q.field_type;
            const mappedType = mapMetaTypeToQuestionType(rawType);
            const id = q.id || q.key || `q_ai_${now}_${idx}`;

            // pick label: for built-ins Meta may not provide label; use defaults
            let label = q.label || q.text || q.question || (DEFAULT_LABELS as any)[mappedType] || 'Question';

            label = String(label).trim();

            // options: might be array of strings, array of {label:...}, or the weird nested strings
            let rawOpts: any[] = [];
            if (Array.isArray(q.options)) rawOpts = q.options;
            else if (Array.isArray(q.choices)) rawOpts = q.choices;
            else if (Array.isArray(q.answers)) rawOpts = q.answers;
            else if (typeof q.options === 'string') {
                try {
                    rawOpts = JSON.parse(q.options);
                } catch {
                    rawOpts = [q.options];
                }
            }

            const optsClean = rawOpts.map(normalizeOptionEntry).filter(Boolean).slice(0, 20) as { label: string, value?: string }[];

            const optionsForUi = optsClean.map((o, i) => ({ label: o.label, value: o.value || `opt_${i + 1}` }));

            const required = !!(q.required || q.mandatory || q.is_required);

            const questionObj: Question = {
                id,
                type: mappedType,
                label,
                required,
            } as Question;

            if (optionsForUi.length > 0 && ['MCQ_SINGLE', 'MCQ_MULTI', 'DROPDOWN'].includes(mappedType)) {
                questionObj.options = optionsForUi;
            }

            // map help_text/placeholder if present
            if (q.help_text || q.description) questionObj.help_text = q.help_text || q.description;
            if (q.placeholder) questionObj.placeholder = q.placeholder;

            // if it's CUSTOM with key, preserve
            if (q.key) (questionObj as any).key = q.key;

            return questionObj;
        });

        return formatted;
    }

    // --------------------
    const handleAiGenerate = async () => {
        if (!aiPrompt.trim()) {
            toast.error('Please enter a description for your form.');
            return;
        }

        setIsGenerating(true);

        try {
            // 1. Gather context data with fallback
            const [settings, users] = await Promise.all([
                api.getWorkspaceSettings().catch(() => ({})),
                api.getWorkspaceUsers().catch(() => [])
            ]);

            // 2. Construct Payload
            const payload = {
                workspace: {
                    id: settings.id || 123,
                    business_name: settings.name || 'My Business',
                    description: settings.description || 'A business looking for leads',
                    website: settings.website || 'https://example.com',
                    address: settings.address || { country: audience.location?.country || '' },
                    contacts: (users || []).map((u: any) => ({ role: u.role, name: u.name, email: u.email })),
                    audience_description: `Targeting ${audience.age?.[0] || ''}-${audience.age?.[1] || ''} year olds in ${audience.location?.country || 'N/A'}. Interests: ${(audience.interests || []).join(', ')}`,
                    social_links: settings.social_links || [],
                    competitors: settings.competitors || []
                },
                user_prompt: aiPrompt,
                industry: audience.location?.industry || 'General',
                creative_desc: creative?.description || 'Lead Generation Campaign',
                workspace_preview: ""
            };

            // 3. Call API
            const response = await api.generateLeadForm(payload);

            // 4. Parse smartly (support many shapes)
            let parsed: any = response;
            if (response?.data) parsed = response.data;
            if (response?.form) parsed = response; // keep as-is but will check .form inside normalizer
            if (!parsed || Object.keys(parsed).length === 0) {
                // try raw_gemini block
                if (response?.raw_gemini) {
                    const extracted = extractJsonFromRawGemini(response.raw_gemini);
                    if (extracted) parsed = extracted;
                }
            } else if (!Array.isArray(parsed) && parsed.raw_gemini && !parsed.questions) {
                const extracted = extractJsonFromRawGemini(parsed.raw_gemini);
                if (extracted) parsed = extracted;
            }

            const aiQuestions = normalizeQuestionsFromAi(parsed);

            if (Array.isArray(aiQuestions) && aiQuestions.length > 0) {
                // Update form metadata if available
                // support either response.lead_form or response.form or parsed top-level fields
                const srcForm = response.lead_form || response.form || parsed || {};

                if (srcForm.form_name || srcForm.name) updateForm('form_name', srcForm.form_name || srcForm.name || value.form_name);
                if (srcForm.intro_text || srcForm.context_card?.content || srcForm.context_card?.body) {
                    updateForm('intro_text', srcForm.intro_text || srcForm.context_card?.content || srcForm.context_card?.body || value.intro_text);
                }
                if (srcForm.privacy_policy_url || srcForm.privacy_policy) {
                    updateForm('privacy_policy_url', srcForm.privacy_policy_url || srcForm.privacy_policy?.url || value.privacy_policy_url);
                }
                if (srcForm.thank_you_text || srcForm.thank_you_page?.body || srcForm.thank_you_page?.message) {
                    updateForm('thank_you_text', srcForm.thank_you_text || srcForm.thank_you_page?.body || srcForm.thank_you_page?.message || value.thank_you_text);
                }

                // Replace questions (use full replacement to avoid duplicates)
                updateForm('questions', aiQuestions);

                toast.success('Form generated successfully!');
                setIsAiPromptOpen(false);
            } else {
                toast.warning("AI didn't return any questions. Please try a different prompt.");
            }

        } catch (e) {
            console.error("AI Generation Error:", e);
            toast.error("Failed to generate questions. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    const addQuestion = (type: QuestionType) => {
        const newQ: Question = {
            id: `q_${Date.now()}`,
            type,
            label: DEFAULT_LABELS[type],
            required: type === 'EMAIL' || type === 'FULL_NAME',
            options: ['MCQ_SINGLE', 'MCQ_MULTI', 'DROPDOWN'].includes(type)
                ? [{ label: 'Option 1', value: 'opt_1' }, { label: 'Option 2', value: 'opt_2' }]
                : undefined
        };
        updateForm('questions', [...value.questions, newQ]);
    };

    const updateQuestion = (idx: number, q: Question) => {
        const questions = [...value.questions];
        questions[idx] = q;
        updateForm('questions', questions);
    };

    const removeQuestion = (idx: number) => {
        const questions = [...value.questions];
        questions.splice(idx, 1);
        updateForm('questions', questions);
    };

    return (
        <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
                <div>
                    <Label>Form Name</Label>
                    <Input
                        value={value.form_name}
                        onChange={(e) => updateForm('form_name', e.target.value)}
                        placeholder="e.g. Summer Campaign Lead Form"
                        className="mt-1"
                    />
                </div>
                <div>
                    <Label>Intro Headline</Label>
                    <Input
                        value={value.intro_text}
                        onChange={(e) => updateForm('intro_text', e.target.value)}
                        placeholder="e.g. Sign up for updates"
                        className="mt-1"
                    />
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                <div>
                    <Label>Privacy Policy URL</Label>
                    <Input
                        value={value.privacy_policy_url}
                        onChange={(e) => updateForm('privacy_policy_url', e.target.value)}
                        placeholder="https://..."
                        className="mt-1"
                    />
                </div>
                <div>
                    <Label>Thank You Message</Label>
                    <Input
                        value={value.thank_you_text}
                        onChange={(e) => updateForm('thank_you_text', e.target.value)}
                        placeholder="e.g. Thanks! We'll be in touch."
                        className="mt-1"
                    />
                </div>
            </div>

            <Separator />

            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <List className="w-5 h-5" /> Questions ({value.questions.length})
                    </h3>
                    <div className="flex gap-2">
                        <Button
                            variant="default"
                            size="sm"
                            className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
                            onClick={openAiPrompt}
                            disabled={isGenerating}
                        >
                            <Sparkles className="w-4 h-4" />
                            Generate with AI
                        </Button>
                    </div>
                </div>

                {/* AI Prompt Dialog */}
                <Dialog open={isAiPromptOpen} onOpenChange={setIsAiPromptOpen}>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Wand2 className="w-5 h-5 text-purple-600" />
                                AI Form Assistant
                            </DialogTitle>
                            <DialogDescription>
                                Describe what kind of information you want to collect. The AI will suggest relevant questions.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="prompt">Describe your form goal</Label>
                                <Textarea
                                    id="prompt"
                                    placeholder="e.g. I need a registration form for a digital marketing webinar with contact info and industry..."
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    className="min-h-[100px]"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="secondary" onClick={() => setIsAiPromptOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="button" onClick={handleAiGenerate} disabled={isGenerating || !aiPrompt.trim()} className="bg-purple-600 hover:bg-purple-700 text-white gap-2">
                                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                {isGenerating ? 'Generating...' : 'Generate Questions'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <div className="space-y-4">
                    {value.questions.map((q, idx) => (
                        <QuestionEditor
                            key={q.id}
                            index={idx}
                            question={q}
                            onUpdate={(nq) => updateQuestion(idx, nq)}
                            onRemove={() => removeQuestion(idx)}
                            allQuestions={value.questions}
                        />
                    ))}

                    {value.questions.length === 0 && (
                        <div className="text-center p-8 border-2 border-dashed rounded-lg text-muted-foreground bg-muted/10">
                            No questions yet. Add one to start collecting leads.
                        </div>
                    )}
                </div>

                <div className="mt-6">
                    <Label className="mb-2 block text-sm font-medium">Add Question Type</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {[
                            { type: 'FULL_NAME', label: 'Full Name', icon: Type },
                            { type: 'EMAIL', label: 'Email', icon: Mail },
                            { type: 'PHONE', label: 'Phone', icon: Phone },
                            { type: 'MCQ_SINGLE', label: 'Choice', icon: List },
                            { type: 'TEXT', label: 'Short Text', icon: Type },
                            { type: 'TEXTAREA', label: 'Long Text', icon: Type },
                            { type: 'BOOLEAN', label: 'Yes/No', icon: ToggleLeft },
                            { type: 'RATING', label: 'Rating', icon: Star },
                            { type: 'DATE', label: 'Date', icon: Calendar },
                            { type: 'FILE_UPLOAD', label: 'File', icon: Upload }
                        ].map((item) => (
                            <Button
                                key={item.type}
                                variant="outline"
                                size="sm"
                                className="justify-start gap-2 h-9"
                                onClick={() => addQuestion(item.type as QuestionType)}
                            >
                                <item.icon className="w-3 h-3" /> {item.label}
                            </Button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
