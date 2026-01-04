import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Moon, Sun, Sparkles, ArrowLeft } from 'lucide-react';

import UrlInputStep from '@/components/ai-campaign/UrlInputStep';
import CampaignEditorStep, { EditorState } from '@/components/ai-campaign/CampaignEditorStep';
import PublishStep from '@/components/ai-campaign/PublishStep';

type Step = 'input' | 'editor' | 'publish';

export default function AICampaignBuilder() {
  const [isDark, setIsDark] = useState(false);
  const [step, setStep] = useState<Step>('input');

  // Data from AI Generation
  const [aiData, setAiData] = useState<any>(null);

  // State from Editor
  const [editorState, setEditorState] = useState<EditorState | null>(null);

  const handleAiGenerated = (data: any) => {
    setAiData(data);
    setStep('editor');
  };

  const handleEditorChange = (newState: EditorState) => {
    setEditorState(newState);
  };

  const goToPublish = () => {
    if (editorState) setStep('publish');
  };

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-50/50 py-8 px-4 font-sans text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-50">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* Header */}
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Sparkles className="w-8 h-8 text-indigo-600" />
                <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                  AI Campaign Builder
                </span>
              </h1>
              <p className="text-slate-500 mt-1 dark:text-slate-400">
                From URL to live ad in seconds.
              </p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsDark(!isDark)}
              className="rounded-full"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
          </header>

          {/* Progress Stepper (Visual) */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-4 text-sm font-medium">
              <div className={`flex items-center gap-2 ${step === 'input' ? 'text-indigo-600' : 'text-slate-400'}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center border ${step === 'input' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-300'}`}>1</span>
                Link
              </div>
              <div className="w-8 h-px bg-slate-200"></div>
              <div className={`flex items-center gap-2 ${step === 'editor' ? 'text-indigo-600' : 'text-slate-400'}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center border ${step === 'editor' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-300'}`}>2</span>
                Customize
              </div>
              <div className="w-8 h-px bg-slate-200"></div>
              <div className={`flex items-center gap-2 ${step === 'publish' ? 'text-emerald-600' : 'text-slate-400'}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center border ${step === 'publish' ? 'border-emerald-600 bg-emerald-50' : 'border-slate-300'}`}>3</span>
                Launch
              </div>
            </div>
          </div>

          {/* Steps */}
          <main className="animate-in fade-in slide-in-from-bottom-4 duration-500">

            {step === 'input' && (
              <UrlInputStep onGenerated={handleAiGenerated} />
            )}

            {step === 'editor' && aiData && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <Button variant="ghost" onClick={() => setStep('input')}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Start Over
                  </Button>
                  <Button onClick={goToPublish} size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    Review & Launch
                  </Button>
                </div>
                <CampaignEditorStep
                  initialData={aiData}
                  onChange={handleEditorChange}
                />
              </div>
            )}

            {step === 'publish' && editorState && (
              <PublishStep
                finalState={editorState}
                onBack={() => setStep('editor')}
                onSuccess={() => {
                  // Redirect or show final success state
                }}
              />
            )}

          </main>

        </div>
      </div>
    </div>
  );
}
