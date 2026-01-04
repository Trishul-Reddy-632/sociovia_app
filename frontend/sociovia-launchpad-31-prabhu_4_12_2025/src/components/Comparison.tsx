import React from "react";
import { Check, X, Crown, ThumbsDown, Sparkles, Zap } from "lucide-react";

// Comparison data - single source of truth
const comparisonData = [
  { feature: "Setup Time", traditional: "Weeks to months", sociovia: "Minutes" },
  { feature: "Cost Structure", traditional: "High upfront fees + % of ad spend", sociovia: "Affordable monthly subscription" },
  { feature: "Campaign Optimization", traditional: "Manual adjustments by humans", sociovia: "24/7 AI-powered optimization" },
  { feature: "Lead Integration", traditional: "Manual exports and imports", sociovia: "Automatic CRM sync" },
  { feature: "Funnel Creation", traditional: "Requires technical expertise", sociovia: "Drag-and-drop builder" },
  { feature: "Performance Insights", traditional: "Weekly/monthly reports", sociovia: "Real-time AI analytics" },
];

// Consistent icon badge component
const IconBadge = ({ type }: { type: "traditional" | "sociovia" }) => {
  if (type === "traditional") {
    return (
      <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
        <X className="w-4 h-4 text-destructive" />
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-lg primary-gradient2 flex items-center justify-center shadow-primary flex-shrink-0">
      <Check className="w-4 h-4 text-primary-foreground" />
    </div>
  );
};

// Desktop comparison row - clean and aligned
const ComparisonRow = ({ feature, traditional, sociovia }: typeof comparisonData[0]) => (
  <div className="grid grid-cols-3 items-center bg-background/60 rounded-xl px-5 md:px-6 lg:px-8 py-3 md:py-4 hover:bg-background/80 transition-colors">
    <div className="flex items-center gap-3 md:gap-4">
      <IconBadge type="traditional" />
      <span className="text-sm md:text-base text-muted-foreground">{traditional}</span>
    </div>
    <div className="text-center">
      <span className="text-sm md:text-base font-medium text-secondary">{feature}</span>
    </div>
    <div className="flex items-center gap-3 md:gap-4 justify-end">
      <span className="text-sm md:text-base text-muted-foreground text-right">{sociovia}</span>
      <IconBadge type="sociovia" />
    </div>
  </div>
);

// Mobile comparison card - compact and clean
const MobileComparisonCard = ({ feature, traditional, sociovia }: typeof comparisonData[0]) => (
  <article className="bg-card rounded-xl border border-border/40 overflow-hidden shadow-soft">
    <div className="bg-muted/30 px-4 py-2 md:py-2.5 border-b border-border/40">
      <h3 className="text-sm md:text-base font-medium text-secondary text-center">{feature}</h3>
    </div>
    <div className="p-3 space-y-2">
      <div className="flex items-center gap-2 md:gap-3 bg-destructive/5 rounded-lg px-3 py-2 md:py-2.5">
        <IconBadge type="traditional" />
        <span className="text-xs md:text-sm text-muted-foreground">{traditional}</span>
      </div>
      <div className="flex items-center gap-2 md:gap-3 bg-primary/5 rounded-lg px-3 py-2 md:py-2.5">
        <IconBadge type="sociovia" />
        <span className="text-xs md:text-sm text-muted-foreground">{sociovia}</span>
      </div>
    </div>
  </article>
);

const Comparison = ({ className = "" }) => {
  return (
    <section className={`py-12 md:py-16 px-4 sm:px-6 lg:px-8 bg-card ${className}`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-secondary mb-3 md:mb-4">
            Why Choose <span className="text-primary">Sociovia</span>?
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            See how Sociovia compares to traditional marketing agencies and outdated ad tools.
          </p>
        </div>

        {/* Desktop View */}
        <div className="hidden md:block">
          <div className="bg-card rounded-2xl shadow-elegant border border-border/40 overflow-hidden">
            {/* All Rows Container */}
            <div className="p-3 md:p-4 space-y-2 md:space-y-3">
              {/* Header Row - Glassmorphism style with blur */}
              <div className="grid grid-cols-3 items-center bg-gradient-to-r from-destructive/10 via-background/80 to-primary/10 backdrop-blur-md rounded-xl px-5 md:px-6 lg:px-8 py-4 md:py-5 border border-white/20 shadow-lg">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-destructive/30 to-destructive/10 flex items-center justify-center border border-destructive/30 shadow-md flex-shrink-0">
                    <ThumbsDown className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <span className="text-base md:text-lg font-bold text-destructive">Traditional</span>
                    <p className="text-xs text-muted-foreground">Agencies & dated platforms</p>
                  </div>
                </div>
                <div className="text-center">
                  <span className="text-sm md:text-base font-bold uppercase tracking-widest text-secondary/80">Feature</span>
                </div>
                <div className="flex items-center gap-3 md:gap-4 justify-end">
                  <div className="text-right">
                    <span className="text-base md:text-lg font-bold text-primary">Sociovia</span>
                    <p className="text-xs text-muted-foreground">AI-native platform</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/30 border border-primary/50 flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>

              {/* Data Rows */}
              {comparisonData.map((row) => (
                <ComparisonRow key={row.feature} {...row} />
              ))}
            </div>

            {/* Footer CTA */}
            <div className="px-5 md:px-6 lg:px-8 py-4 bg-primary/5 border-t border-primary/10 text-center">
              <p className="text-sm md:text-base font-medium text-primary">
                Upgrade from "managed chaos" to intelligent automation
              </p>
            </div>
          </div>
        </div>

        {/* Mobile View */}
        <div className="md:hidden space-y-3">
          {comparisonData.map((row) => (
            <MobileComparisonCard key={row.feature} {...row} />
          ))}

          {/* Mobile CTA */}
          <div className="mt-4 text-center py-3 md:py-3.5 px-4 bg-primary/5 rounded-xl border border-primary/10">
            <p className="text-sm md:text-base font-medium text-primary">
              Ready to move past "traditional"?
            </p>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">
              Launch in minutes, not months.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Comparison;
