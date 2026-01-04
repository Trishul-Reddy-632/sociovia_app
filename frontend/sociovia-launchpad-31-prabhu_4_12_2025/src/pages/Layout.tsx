import { Outlet } from 'react-router-dom';
import { Stepper } from '@/components/Stepper';
import { useCampaignStore } from '@/store/campaignStore';
export default function Layout() {
  const {
    currentStep,
    setStep
  } = useCampaignStore();
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 bg-slate-50">
          
        </div>
      </header>

      {/* Stepper */}
      {currentStep > 0 && <div className="border-b border-border bg-card">
          <Stepper currentStep={currentStep} onStepClick={setStep} />
        </div>}

      {/* Main Content */}
      <main className="container mx-auto">
        <Outlet />
      </main>
    </div>;
}