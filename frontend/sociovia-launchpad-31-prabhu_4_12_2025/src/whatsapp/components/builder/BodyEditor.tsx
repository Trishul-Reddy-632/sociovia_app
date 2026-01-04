// Body Editor Component
// =====================
// Template body editor with variable detection, intent validation via scoring, and AI rewrite

import { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { parseVariables, validateVariableSequence, TemplateCategory } from '../../utils/templateUtils';
import {
    validateCategoryCompliance,
    getCategoryHelperText,
    getConfidenceBadgeStyle
} from '../../utils/intentDetection';
import { CategoryRewriteButton } from './CategoryRewriteButton';
import { AlertCircle, Plus, Info, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BodyEditorProps {
    body: string;
    category: TemplateCategory;
    onChange: (body: string) => void;
    onCategoryChange?: (category: TemplateCategory) => void;
    error?: string;
}

export function BodyEditor({ body, category, onChange, onCategoryChange, error }: BodyEditorProps) {
    const variables = parseVariables(body);
    const isSequenceValid = validateVariableSequence(variables);
    const charCount = body.length;
    const maxChars = 1024;

    // Real-time intent compliance check with scoring
    const compliance = useMemo(() => {
        if (!body.trim()) return null;
        return validateCategoryCompliance(category, body);
    }, [body, category]);

    const insertVariable = () => {
        const nextNum = variables.length > 0 ? Math.max(...variables) + 1 : 1;
        onChange(body + `{{${nextNum}}}`);
    };

    const handleSwitchCategory = () => {
        if (compliance?.suggestedCategory && onCategoryChange) {
            onCategoryChange(compliance.suggestedCategory);
        }
    };

    // Get badge style
    const badgeStyle = compliance ? getConfidenceBadgeStyle(compliance.confidenceBadge) : null;

    return (
        <div className="space-y-3">
            {/* Header row */}
            <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                    Message Body <span className="text-destructive">*</span>
                </Label>
                <div className="flex items-center gap-2">
                    {/* AI Rewrite Button */}
                    <CategoryRewriteButton
                        body={body}
                        category={category}
                        onRewrite={onChange}
                        onCategoryChange={onCategoryChange}
                        disabled={!body.trim()}
                    />
                    <span className={`text-xs ${charCount > maxChars ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {charCount}/{maxChars}
                    </span>
                </div>
            </div>

            {/* Category helper text */}
            <p className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5">
                {getCategoryHelperText(category)}
            </p>

            <Textarea
                placeholder="Enter your message body. Use {{1}}, {{2}}, etc. for dynamic variables."
                value={body}
                onChange={(e) => onChange(e.target.value)}
                rows={6}
                className={`font-mono text-sm ${error || (compliance && !compliance.isCompliant && !compliance.allowUserOverride) ? 'border-destructive' : ''}`}
            />

            {/* Confidence Badge with Scores */}
            {compliance && body.trim() && (
                <div className="flex items-center justify-between flex-wrap gap-2">
                    {/* Confidence badge */}
                    {badgeStyle && (
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${badgeStyle.bgColor} ${badgeStyle.color}`}>
                            {badgeStyle.label}
                        </span>
                    )}

                    {/* Score breakdown */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>U: <strong className="text-green-600">{compliance.scores.utility}</strong></span>
                        <span>M: <strong className="text-red-600">{compliance.scores.marketing}</strong></span>
                        <span>A: <strong className="text-blue-600">{compliance.scores.authentication}</strong></span>
                    </div>
                </div>
            )}

            {/* User message from intent detection */}
            {compliance && body.trim() && (
                <>
                    {/* Non-compliant: Error state */}
                    {!compliance.isCompliant && (
                        <Alert variant="destructive" className="py-2">
                            <AlertTriangle className="w-4 h-4" />
                            <AlertDescription className="text-sm">
                                <p className="font-medium">{compliance.message}</p>
                                {compliance.violations.length > 0 && (
                                    <ul className="mt-1 text-xs space-y-0.5">
                                        {compliance.violations.slice(0, 3).map((v, i) => (
                                            <li key={i}>{v.detail}</li>
                                        ))}
                                    </ul>
                                )}
                                {compliance.allowUserOverride && (
                                    <p className="mt-2 text-xs opacity-80">
                                        You can still proceed — Meta will make the final decision.
                                    </p>
                                )}
                                {compliance.suggestSwitch && onCategoryChange && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleSwitchCategory}
                                        className="mt-2 gap-1 text-xs h-7"
                                    >
                                        Switch to {compliance.suggestedCategory}
                                        <ArrowRight className="w-3 h-3" />
                                    </Button>
                                )}
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Compliant but mixed intent: Warning state */}
                    {compliance.isCompliant && compliance.confidenceBadge === 'mixed_review' && (
                        <Alert className="py-2 bg-amber-50 border-amber-200">
                            <AlertCircle className="w-4 h-4 text-amber-600" />
                            <AlertDescription className="text-sm text-amber-800">
                                <p>{compliance.userMessage}</p>
                                <p className="text-xs mt-1 opacity-80">
                                    Meta will classify this during review. Your selection will be considered.
                                </p>
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Compliant but low confidence: Info state */}
                    {compliance.isCompliant && compliance.confidenceBadge === 'low_confidence' && (
                        <Alert className="py-2 bg-gray-50 border-gray-200">
                            <Info className="w-4 h-4 text-gray-600" />
                            <AlertDescription className="text-sm text-gray-700">
                                {compliance.userMessage}
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Compliant with suggestion: Info state */}
                    {compliance.isCompliant && compliance.suggestSwitch && compliance.message && (
                        <Alert className="py-2 bg-blue-50 border-blue-200">
                            <Info className="w-4 h-4 text-blue-600" />
                            <AlertDescription className="text-sm text-blue-800">
                                <p>{compliance.message}</p>
                                {onCategoryChange && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleSwitchCategory}
                                        className="mt-2 gap-1 text-xs h-7"
                                    >
                                        Switch to {compliance.suggestedCategory}
                                        <ArrowRight className="w-3 h-3" />
                                    </Button>
                                )}
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Strong match: Success state */}
                    {compliance.isCompliant &&
                        (compliance.confidenceBadge === 'strong_utility' ||
                            compliance.confidenceBadge === 'strong_auth' ||
                            (compliance.confidenceBadge === 'strong_marketing' && category === 'MARKETING')) &&
                        !compliance.suggestSwitch && (
                            <Alert className="py-2 bg-green-50 border-green-200">
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                                <AlertDescription className="text-sm text-green-800">
                                    {compliance.userMessage}
                                </AlertDescription>
                            </Alert>
                        )}
                </>
            )}

            {/* Variable helper */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                    {variables.length > 0 ? (
                        <>
                            <span className="text-xs text-muted-foreground">Variables:</span>
                            {variables.map(v => (
                                <Badge key={v} variant="secondary" className="font-mono text-xs">
                                    {`{{${v}}}`}
                                </Badge>
                            ))}
                        </>
                    ) : (
                        <span className="text-xs text-muted-foreground">No variables detected</span>
                    )}
                </div>

                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={insertVariable}
                    className="gap-1"
                >
                    <Plus className="w-3 h-3" />
                    Add Variable
                </Button>
            </div>

            {/* Variable sequence warning */}
            {variables.length > 0 && !isSequenceValid && (
                <Alert variant="destructive" className="py-2">
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription className="text-sm">
                        Variables must be sequential: {`{{1}}, {{2}}, {{3}}`}... with no gaps.
                    </AlertDescription>
                </Alert>
            )}

            {/* Help text */}
            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md p-3">
                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                    <p>Variables like <code className="bg-muted px-1 rounded">{`{{1}}`}</code> will be replaced with actual values when sending.</p>
                    <p className="mt-1">Example: "Hello {`{{1}}`}, your order {`{{2}}`} is confirmed."</p>
                </div>
            </div>

            {error && !variables.length && (
                <p className="text-xs text-destructive">{error}</p>
            )}
        </div>
    );
}
