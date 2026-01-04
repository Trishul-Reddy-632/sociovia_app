
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { useOptimization } from '../../context/OptimizationContext';
import { motion, AnimatePresence } from 'framer-motion';

// Step Components
import Step1Mode from './Step1Mode';
import Step2Autopilot from './Step2Autopilot';
import Step3Risk from './Step3Risk';
import Step4Campaigns from './Step4Campaigns';
import Step5Confirm from './Step5Confirm';

export default function OptimizationWizard() {
    const navigate = useNavigate();
    const { config } = useOptimization();
    const [currentStep, setCurrentStep] = useState(1);
    const [direction, setDirection] = useState(1); // 1 for forward, -1 for back

    const TOTAL_STEPS = 5;

    const handleNext = () => {
        if (currentStep < TOTAL_STEPS) {
            setDirection(1);
            setCurrentStep(curr => curr + 1);
        } else {
            navigate('/optimization/dashboard');
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setDirection(-1);
            setCurrentStep(curr => curr - 1);
        } else {
            navigate('/optimization');
        }
    };

    const progressValue = (currentStep / TOTAL_STEPS) * 100;

    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 50 : -50,
            opacity: 0
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1
        },
        exit: (direction: number) => ({
            zIndex: 0,
            x: direction < 0 ? 50 : -50,
            opacity: 0
        })
    };

    return (
        <div className="min-h-screen bg-slate-50/50 py-10 px-4">
            <div className="container max-w-5xl mx-auto">

                {/* Header / Stepper */}
                <div className="mb-10 max-w-3xl mx-auto">
                    <div className="flex justify-between items-end mb-4">
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Setup Optimization</h2>
                            <p className="text-slate-500 mt-1">Configure your strategy in 5 simple steps.</p>
                        </div>
                        <span className="text-sm font-semibold text-slate-500 bg-white px-3 py-1 rounded-full border shadow-sm">
                            Step {currentStep} of {TOTAL_STEPS}
                        </span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-slate-900"
                            initial={{ width: 0 }}
                            animate={{ width: `${progressValue}%` }}
                            transition={{ duration: 0.5, ease: "easeInOut" }}
                        />
                    </div>
                </div>

                {/* Main Content Area with Transitions */}
                <div className="relative min-h-[500px]">
                    <AnimatePresence mode="wait" custom={direction}>
                        <motion.div
                            key={currentStep}
                            custom={direction}
                            variants={variants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{
                                x: { type: "spring", stiffness: 300, damping: 30 },
                                opacity: { duration: 0.2 }
                            }}
                            className="w-full"
                        >
                            {currentStep === 1 && <Step1Mode onNext={handleNext} />}
                            {currentStep === 2 && <Step2Autopilot onNext={handleNext} onBack={handleBack} />}
                            {currentStep === 3 && <Step3Risk onNext={handleNext} onBack={handleBack} />}
                            {currentStep === 4 && <Step4Campaigns onNext={handleNext} onBack={handleBack} />}
                            {currentStep === 5 && <Step5Confirm onBack={handleBack} />}
                        </motion.div>
                    </AnimatePresence>
                </div>

            </div>
        </div>
    );
}
