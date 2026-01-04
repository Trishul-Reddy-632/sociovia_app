// RouteStepper.tsx
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Stepper specifically wired to these root routes:
 *  /objective
 *  /audience
 *  /budget
 *  /placements
 *  /creative
 *  /review
 *
 * Props:
 *  - allowSkip?: boolean  // if true, user can jump to future steps
 *  - completedSteps?: number[] // optional array of completed step ids e.g. [1,2]
 */
const ROUTE_STEPS = [
  { id: 1, name: "Objective", description: "Choose your goal", path: "/objective" },
  { id: 2, name: "Audience", description: "Target your customers", path: "/audience" },
  { id: 3, name: "Budget", description: "Set your spend", path: "/budget" },
  { id: 4, name: "Placements", description: "Choose where to show", path: "/placements" },
  { id: 5, name: "Creative", description: "Design your ad", path: "/creative" },
  { id: 6, name: "Review", description: "Publish your campaign", path: "/review" },
];

interface RouteStepperProps {
  allowSkip?: boolean;
  completedSteps?: number[]; // mark specific steps as complete
  className?: string;
}

export default function RouteStepper({
  allowSkip = false,
  completedSteps = [],
  className,
}: RouteStepperProps) {
  const location = useLocation();
  const navigate = useNavigate();

  // find active index by exact pathname match (works with your root paths)
  const activeIndex = Math.max(
    0,
    ROUTE_STEPS.findIndex((s) => s.path === location.pathname)
  );

  // compute progress percentage (0..100)
  const rawProgress = ((activeIndex) / (ROUTE_STEPS.length - 1)) * 100;
  const progress = Math.max(0, Math.min(100, Number(rawProgress.toFixed(2))));

  const isStepComplete = (id: number) => completedSteps.includes(id) || activeIndex > (id - 1);

  const handleClick = (step: typeof ROUTE_STEPS[number]) => {
    const targetIndex = ROUTE_STEPS.findIndex((s) => s.id === step.id);
    const allowed = allowSkip || targetIndex <= activeIndex || isStepComplete(step.id);

    if (!allowed) return;
    navigate(step.path);
  };

  const onKeyActivate =
    (step: typeof ROUTE_STEPS[number]) =>
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleClick(step);
      }
    };

  return (
    <nav
      aria-label="Ad creation progress"
      className={cn("w-full py-6 px-4 bg-transparent", className || "")}
      role="navigation"
    >
      <div className="max-w-5xl mx-auto">
        {/* Progress Bar */}
        <div className="relative mb-6">
          <div className="h-2 bg-secondary rounded-full overflow-hidden" aria-hidden>
            <div
              className="h-full gradient-primary transition-all duration-400 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="sr-only" aria-live="polite">
            Progress: {Math.round(progress)}%
          </div>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {ROUTE_STEPS.map((step, idx) => {
            const isCurrent = idx === activeIndex;
            const complete = isStepComplete(step.id);
            const allowed = allowSkip || complete || isCurrent;
            return (
              <button
                key={step.id}
                onClick={() => allowed && handleClick(step)}
                onKeyDown={onKeyActivate(step)}
                disabled={!allowed}
                title={step.description}
                aria-current={isCurrent ? "step" : undefined}
                aria-disabled={!allowed}
                tabIndex={allowed ? 0 : -1}
                className={cn(
                  "flex flex-col items-center text-center group transition-all duration-150 focus:outline-none",
                  allowed ? "cursor-pointer hover:scale-105" : "cursor-not-allowed opacity-50"
                )}
              >
                <div
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all duration-150 border-2 font-semibold",
                    complete && "bg-primary border-primary text-primary-foreground",
                    isCurrent && "bg-accent border-accent text-accent-foreground shadow-md",
                    !complete && !isCurrent && "bg-background border-border text-muted-foreground"
                  )}
                  aria-hidden
                >
                  {complete ? <Check className="w-6 h-6" /> : <span className="text-lg">{step.id}</span>}
                </div>

                <div
                  className={cn(
                    "text-sm font-medium transition-colors duration-150",
                    (complete || isCurrent) ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.name}
                </div>

                <div className="text-xs text-muted-foreground hidden md:block mt-1">
                  {step.description}
                </div>

                {/* SR-only description for screen readers */}
                <div className="sr-only" id={`step-desc-${step.id}`}>
                  {step.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
