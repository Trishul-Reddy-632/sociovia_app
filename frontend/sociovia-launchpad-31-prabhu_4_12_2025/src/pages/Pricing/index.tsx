import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Building2, Rocket, ArrowRight, MessageSquare } from "lucide-react";
import logo from "@/assets/sociovia_logo.png";

type BillingPeriod = 'monthly' | 'quarterly' | 'annually';

const plans = [
    {
        name: "Starter",
        icon: Rocket,
        description: "Best suited for small businesses and early-stage brands beginning their AI-led marketing journey.",
        pricing: {
            monthly: 4999,
            quarterly: 4499,
            annually: 3999,
        },
        highlight: false,
        features: [
            "Unified dashboard analytics",
            "Meta AI ad optimization",
            "WhatsApp automation",
            "Ad spend limit up to ₹1,00,000/month",
            "WhatsApp messaging as per Meta rates",
            "1 workspace",
            "Low token allocation"
        ],
        cta: "Get Started"
    },
    {
        name: "Growth",
        icon: Sparkles,
        description: "Designed for growing teams that require higher advertising budgets, creative intelligence, and deeper insights.",
        pricing: {
            monthly: 9999,
            quarterly: 8999,
            annually: 7999,
        },
        highlight: true,
        includes: "Everything in Starter, plus:",
        features: [
            "AI image creation (200 images/month)",
            "Ad spend limit up to ₹5,00,000/month",
            "Analytics chatbot (dashboard-only)",
            "Up to 3 workspaces",
            "High token allocation"
        ],
        cta: "Choose Growth"
    },
    {
        name: "Enterprise",
        icon: Building2,
        description: "Built for larger organizations requiring advanced AI automation, customization, and scale.",
        pricing: {
            custom: true,
        },
        highlight: false,
        includes: "Everything in Growth, plus:",
        features: [
            "Company-specific customizations",
            "AI-powered WhatsApp chatbot",
            "Unlimited tokens & image generation",
            "Access to agentic workflows",
            "Unlimited workspaces",
            "Priority onboarding & support"
        ],
        cta: "Contact Sales"
    }
];

const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN').format(price);
};

// Animated counter component
const AnimatedPrice = ({ value, duration = 1000 }: { value: number; duration?: number }) => {
    const [displayValue, setDisplayValue] = useState(0);
    const previousValue = useRef(0);

    useEffect(() => {
        const startValue = previousValue.current;
        const endValue = value;
        const startTime = performance.now();

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            
            const current = Math.round(startValue + (endValue - startValue) * easeOutQuart);
            setDisplayValue(current);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                previousValue.current = endValue;
            }
        };

        requestAnimationFrame(animate);
    }, [value, duration]);

    return <>{formatPrice(displayValue)}</>;
};

const Pricing = () => {
    const navigate = useNavigate();
    const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');

    // Scroll to top when component mounts
    React.useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const handlePlanClick = (planName: string) => {
        if (planName.toLowerCase() === 'enterprise') {
            // Could open a contact form or navigate to contact page
            navigate('/contact?plan=enterprise');
        } else {
            navigate(`/billing?plan=${planName.toLowerCase()}&period=${billingPeriod}`);
        }
    };

    const getPeriodLabel = (period: BillingPeriod) => {
        switch (period) {
            case 'monthly': return '/mo';
            case 'quarterly': return '/mo';
            case 'annually': return '/mo';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
            {/* Header Section */}
            <div className="pt-16 pb-12 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    {/* Logo Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                        <img src={logo} alt="Sociovia" className="w-5 h-5" />
                        <span className="text-sm font-medium text-primary">Pricing Plans</span>
                    </div>

                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4">
                        Choose Your
                        <span className="block text-primary mt-1">Growth Path</span>
                    </h1>

                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                        Transparent pricing that scales with your business.
                        No hidden fees, no surprises.
                    </p>

                    {/* Billing Period Tabs */}
                    <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
                        {(['monthly', 'quarterly', 'annually'] as BillingPeriod[]).map((period) => (
                            <button
                                key={period}
                                onClick={() => setBillingPeriod(period)}
                                className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                                    billingPeriod === period
                                        ? 'bg-white text-primary shadow-md'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                {period.charAt(0).toUpperCase() + period.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Pricing Cards */}
            <div className="max-w-7xl mx-auto px-4 pb-20">
                <div className="grid md:grid-cols-3 gap-8 mb-20 items-stretch">
                    {plans.map((plan, idx) => {
                        const IconComponent = plan.icon;
                        return (
                            <Card
                                key={plan.name}
                                className={`relative overflow-hidden shadow-xl border-2 ${plan.highlight
                                        ? "border-primary shadow-2xl shadow-primary/20 scale-[1.02]"
                                        : "border-slate-200"
                                    } transition-all duration-300 hover:shadow-2xl hover:border-primary/50 bg-gradient-to-br from-white via-slate-50 to-purple-50 animate-in fade-in slide-in-from-bottom-8 fill-mode-both flex flex-col`}
                                style={{ animationDelay: `${idx * 150}ms` }}
                            >
                                {/* Popular Badge */}
                                {plan.highlight && (
                                    <div className="absolute -top-0 left-0 right-0 z-10">
                                        <div className="w-full py-2 bg-gradient-to-r from-primary to-purple-600 text-primary-foreground text-sm font-semibold text-center">
                                            Most Popular
                                        </div>
                                    </div>
                                )}

                                <CardHeader className={`pb-4 ${plan.highlight ? 'pt-12' : 'pt-8'}`}>
                                    <div className="flex items-center justify-center mb-3">
                                        <div className={`p-3 rounded-xl ${plan.highlight ? 'bg-primary/20' : 'bg-slate-100'}`}>
                                            <IconComponent className={`w-6 h-6 ${plan.highlight ? 'text-primary' : 'text-slate-600'}`} />
                                        </div>
                                    </div>
                                    <CardTitle className="text-2xl font-bold text-center mb-2">{plan.name}</CardTitle>
                                    <p className="text-sm text-muted-foreground text-center leading-relaxed">{plan.description}</p>
                                </CardHeader>

                                <CardContent className="py-4 flex-1">
                                    {/* Pricing Section */}
                                    <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                        {plan.pricing.custom ? (
                                            <div className="text-center">
                                                <div className="text-3xl font-bold text-foreground mb-1">Custom</div>
                                                <div className="text-sm text-muted-foreground">Based on usage and scope</div>
                                            </div>
                                        ) : (
                                            <div className="text-center">
                                                {/* Original price (doubled + 1 to end in 9) with red strikethrough */}
                                                <div className="relative inline-block mb-2">
                                                    <span 
                                                        className="text-xl font-semibold text-slate-600 drop-shadow-sm"
                                                        style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.15)' }}
                                                    >
                                                        ₹{formatPrice((plan.pricing as { monthly: number; quarterly: number; annually: number })[billingPeriod] * 2 + 1)}
                                                    </span>
                                                    {/* Red strikethrough line */}
                                                    <span 
                                                        className="absolute left-0 right-0 top-1/2 h-[3px] bg-red-500 rounded-full"
                                                        style={{ 
                                                            transform: 'rotate(-8deg)',
                                                            boxShadow: '0 2px 6px rgba(239, 68, 68, 0.4)'
                                                        }}
                                                    />
                                                </div>
                                                {/* Current price with animation */}
                                                <div className="flex items-baseline justify-center gap-1">
                                                    <span className="text-4xl font-bold text-foreground">
                                                        ₹<AnimatedPrice 
                                                            value={(plan.pricing as { monthly: number; quarterly: number; annually: number })[billingPeriod]} 
                                                            duration={800} 
                                                        />
                                                    </span>
                                                    <span className="text-sm font-normal text-muted-foreground">{getPeriodLabel(billingPeriod)}</span>
                                                </div>
                                                {/* 50% off badge */}
                                                <div className="mt-2">
                                                    <span className="inline-block px-3 py-1 bg-red-100 text-red-600 text-xs font-semibold rounded-full">
                                                        50% OFF
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Includes label */}
                                    {plan.includes && (
                                        <p className="text-sm font-semibold text-primary mb-3">{plan.includes}</p>
                                    )}

                                    {/* Features */}
                                    <ul className="space-y-3">
                                        {plan.features.map((feature, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                                                <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                                <span>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>

                                <CardFooter className="pt-4 pb-6 mt-auto">
                                    <Button
                                        className={`w-full ${plan.highlight
                                                ? "bg-gradient-to-r from-primary to-purple-600 text-white hover:opacity-90"
                                                : "bg-slate-900 text-white hover:bg-slate-800"
                                            } font-semibold py-6 text-base rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5`}
                                        onClick={() => handlePlanClick(plan.name)}
                                    >
                                        {plan.cta}
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>

                {/* Disclaimer */}
                <div className="mt-12 text-center">
                    <div className="inline-flex items-start gap-3 p-5 bg-amber-50 rounded-xl border border-amber-200 max-w-3xl">
                        <MessageSquare className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-amber-800 text-left">
                            <span className="font-semibold">Important:</span> Subscription fees shown above do not include Meta ad spend or WhatsApp Business API messaging charges. These are billed separately based on your usage according to Meta's standard rates.
                        </p>
                    </div>
                </div>

                {/* Trust Section */}
                <div className="mt-16 text-center">
                    <p className="text-sm text-muted-foreground mb-4">Questions about which plan is right for you?</p>
                    <Button variant="outline" size="lg" className="px-8">
                        Talk to Sales
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default Pricing;
