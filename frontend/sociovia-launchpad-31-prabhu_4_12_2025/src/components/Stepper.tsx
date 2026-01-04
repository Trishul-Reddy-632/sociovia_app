import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  { id: 1, name: "Objective", description: "Choose your goal" },
  { id: 2, name: "Audience", description: "Target your customers" },
  { id: 3, name: "Budget", description: "Set your spend" },
  { id: 4, name: "Placements", description: "Choose where to show" },
  { id: 5, name: "Creative", description: "Design your ad" },
  { id: 6, name: "Review", description: "Publish your campaign" },
];

// tooltips / guidance for each step (shown in hover/focus tooltip)
const stepTooltips: Record<number, string> = {
  1: "Choose your marketing goal. e.g. Awareness → BRAND_AWARENESS / REACH (broad reach); Sales → CONVERSIONS / CATALOG_SALES (purchase-focused).",
  2: "Define who sees the ad. Use AI Smart Audience for auto-suggestions or Manual to set location, age, gender, interests and behaviors.",
  3: "Choose Daily or Lifetime budget, start/end dates and optimization goal (Clicks, Leads, Purchases). Ensure end date ≥ start date.",
  4: "Automatic placement is recommended. Manual lets you pick Facebook Feed, Instagram Feed, Stories/Reels, Messenger, Audience Network.",
  5: "Edit creative: image canvas + copy inputs (Primary Text, Headline, Description). Use CTA and URL. Character counters shown per placement.",
  6: "Preview placement mockups, check summary and publish. After publishing ad is submitted for review by the platform.",
};

interface StepperProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
  /**
   * When true, user can jump forward to any step.
   * Default: false (only current or completed steps clickable)
   */
  allowSkip?: boolean;
  /**
   * completedSteps is optional — when provided, it marks steps as complete.
   * Example: [1,2] marks step 1 and 2 complete
   */
  completedSteps?: number[];
}

export const Stepper = ({
  currentStep,
  onStepClick,
  allowSkip = false,
  completedSteps = [],
}: StepperProps) => {
  // clamp progress between 0 and 100
  const rawProgress = ((currentStep - 1) / (steps.length - 1)) * 100;
  const progress = Math.max(0, Math.min(100, Number(rawProgress.toFixed(2))));

  // helper to check completion
  const isStepComplete = (stepId: number) =>
    completedSteps?.includes(stepId) || currentStep > stepId;

  const handleActivate = (stepId: number, allowed: boolean) => {
    if (!onStepClick || !allowed) return;
    onStepClick(stepId);
  };

  const onKeyActivate =
    (stepId: number, allowed: boolean) =>
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (!allowed) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onStepClick && onStepClick(stepId);
      }
    };

  return (
    <nav aria-label="Ad creation progress" className="w-full py-8 px-4" role="navigation">
      <div className="max-w-4xl mx-auto">
        {/* Progress Bar */}
        <div className="relative mb-8">
          <div className="h-2 bg-secondary rounded-full overflow-hidden" aria-hidden>
            <div
              className="h-full gradient-primary transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="sr-only" aria-live="polite">
            Progress: {Math.round(progress)}%
          </div>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {steps.map((step) => {
            const isComplete = isStepComplete(step.id);
            const isCurrent = currentStep === step.id;
            // clickable if: onStepClick provided AND (allowSkip OR isComplete OR isCurrent)
            const isClickable = Boolean(
              onStepClick && (allowSkip || isComplete || isCurrent)
            );
            const ariaDisabled = !isClickable;

            return (
              <button
                key={step.id}
                // click only if allowed
                onClick={() => handleActivate(step.id, isClickable)}
                onKeyDown={onKeyActivate(step.id, isClickable)}
                disabled={!isClickable}
                aria-current={isCurrent ? "step" : undefined}
                aria-disabled={ariaDisabled}
                tabIndex={isClickable ? 0 : -1}
                title={stepTooltips[step.id]}
                className={cn(
                  "flex flex-col items-center text-center group transition-all duration-200 focus:outline-none",
                  isClickable ? "cursor-pointer hover:scale-105 focus:scale-105" : "cursor-not-allowed opacity-50"
                )}
              >
                {/* Step Number/Icon */}
                <div
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all duration-200 border-2 font-semibold",
                    isComplete && "bg-primary border-primary text-primary-foreground",
                    isCurrent && "bg-accent border-accent text-accent-foreground shadow-medium",
                    !isComplete && !isCurrent && "bg-background border-border text-muted-foreground"
                  )}
                  aria-hidden
                >
                  {isComplete ? (
                    <Check className="w-6 h-6" aria-hidden />
                  ) : (
                    <span className="text-lg" aria-hidden>
                      {step.id}
                    </span>
                  )}
                </div>

                {/* Step Name */}
                <div
                  className={cn(
                    "text-sm font-medium transition-colors duration-200",
                    (isComplete || isCurrent) ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.name}
                </div>

                {/* Step Description (desktop) */}
                <div className="text-xs text-muted-foreground hidden md:block mt-1">
                  {step.description}
                </div>

                {/* Tooltip / helper text (visible on hover or focus) */}
                <div
                  className="pointer-events-none invisible group-hover:visible group-focus:visible opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-150 absolute z-30 mt-20 md:mt-6"
                  aria-hidden={!isClickable}
                >
                  <div className="max-w-xs text-xs bg-gray-800 text-white rounded-md p-2 shadow-lg">
                    <div className="font-semibold">{step.name}</div>
                    <div className="mt-1 leading-tight">{stepTooltips[step.id]}</div>
                    {/* small meta mapping hint for Objective step */}
                    {step.id === 1 && (
                      <div className="mt-2 text-[11px] text-gray-200">
                        Example Meta mapping: <span className="font-medium">BRAND_AWARENESS / REACH</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* screen-reader-only description for step */}
                <div className="sr-only" id={`step-desc-${step.id}`}>
                  {stepTooltips[step.id]}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
