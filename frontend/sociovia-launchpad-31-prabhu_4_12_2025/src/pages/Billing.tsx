import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, CreditCard, Shield, ArrowLeft, Sparkles, Lock, Rocket, Clock, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import emailjs from "@emailjs/browser";

const planDetails: Record<string, { name: string; originalPrice: number; price: number; period: string; billingCycle: string; features: string[] }> = {
    monthly: {
        name: "Monthly",
        originalPrice: 10000,
        price: 5000,
        period: "/month",
        billingCycle: "Billed monthly",
        features: [
            "Full access to all features",
            "Unlimited content & image generation",
            "Priority support",
            "No hidden fees"
        ]
    },
    quarterly: {
        name: "Quarterly",
        originalPrice: 9000,
        price: 4500,
        period: "/month",
        billingCycle: "Billed every 3 months (₹13,500)",
        features: [
            "Everything in Monthly",
            "10% discount compared to monthly",
            "Premium support"
        ]
    },
    yearly: {
        name: "Yearly",
        originalPrice: 8000,
        price: 4000,
        period: "/month",
        billingCycle: "Billed annually (₹48,000)",
        features: [
            "Everything in Quarterly",
            "20% discount compared to monthly",
            "Dedicated onboarding"
        ]
    }
};

export default function Billing() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const planKey = searchParams.get("plan")?.toLowerCase() || "monthly";
    const plan = planDetails[planKey] || planDetails.monthly;

    const [email, setEmail] = useState("");
    const [isNotified, setIsNotified] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleNotifyMe = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;
        
        setIsLoading(true);
        try {
            await emailjs.send(
                "service_7u4ze5m",
                "template_oo8fe1c",
                {
                    to_email: email,
                    email: email,
                    plan_name: plan.name,
                    message: `User ${email} requested early access for the ${plan.name} plan.`
                },
                "YRKPxg6mgQ2yZ7Jni"
            );

            setIsNotified(true);
            toast({
                title: "You're on the list!",
                description: "We'll notify you as soon as payments are live.",
            });
        } catch (error) {
            console.error("Email error:", error);
            toast({
                title: "Something went wrong",
                description: "Please try again later.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-purple-100 py-12 px-4 flex flex-col items-center justify-center">
            <div className="max-w-4xl w-full mx-auto">
                {/* Header */}
                <div className="mb-8 text-center">
                    <Button 
                        variant="ghost" 
                        onClick={() => navigate("/pricing")}
                        className="mb-6 hover:bg-white/50"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Plans
                    </Button>
                    
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100 border border-amber-200 text-amber-700 mb-6 animate-in fade-in slide-in-from-top-4 duration-700">
                        <Rocket className="w-4 h-4" />
                        <span className="text-sm font-medium">Early Access Phase</span>
                    </div>
                    
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent mb-4">
                        We're Upgrading Our Payment Gateway
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        To ensure the most secure and seamless experience, we are currently finalizing our payment infrastructure.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 items-center">
                    {/* Left: Plan Summary */}
                    <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm h-full flex flex-col">
                        <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-primary/5 to-purple-50">
                            <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                                Your Selected Plan
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-8 flex-1">
                            <div className="text-center mb-8">
                                <h3 className="text-3xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                                <div className="flex items-center justify-center gap-3 mb-2">
                                    <span className="text-lg text-muted-foreground line-through decoration-red-500">₹{plan.originalPrice}</span>
                                    <span className="text-4xl font-extrabold text-primary">₹{plan.price}</span>
                                </div>
                                <p className="text-sm text-muted-foreground">{plan.billingCycle}</p>
                            </div>

                            <div className="space-y-4 max-w-xs mx-auto">
                                {plan.features.map((feature, idx) => (
                                    <div key={idx} className="flex items-center gap-3 text-sm text-slate-700">
                                        <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                            <Check className="w-3.5 h-3.5 text-green-600" />
                                        </div>
                                        {feature}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                        <CardFooter className="bg-slate-50/50 border-t border-slate-100 p-6">
                            <p className="text-xs text-center text-muted-foreground w-full">
                                You won't be charged today. Join the waitlist to lock in this price.
                            </p>
                        </CardFooter>
                    </Card>

                    {/* Right: Waitlist / Notification */}
                    <div className="space-y-6">
                        <Card className="shadow-2xl border-2 border-primary/10 bg-white overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/5 rounded-full -ml-16 -mb-16 blur-3xl"></div>
                            
                            <CardHeader>
                                <CardTitle className="text-2xl font-bold text-slate-900">Lock In This Special Offer</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-slate-600 mb-6">
                                    While we finish our upgrades, you can reserve your spot for the <strong>{plan.name}</strong> plan at this discounted rate. We'll notify you the moment payments are live.
                                </p>

                                {isNotified ? (
                                    <div className="bg-green-50 border border-green-100 rounded-xl p-6 text-center animate-in zoom-in duration-300">
                                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Check className="w-8 h-8 text-green-600" />
                                        </div>
                                        <h3 className="text-lg font-bold text-green-800 mb-2">You're on the list!</h3>
                                        <p className="text-green-700 text-sm">
                                            We've reserved this price for you. Keep an eye on your inbox!
                                        </p>
                                        <Button 
                                            variant="outline" 
                                            className="mt-6 border-green-200 text-green-700 hover:bg-green-100 hover:text-green-800"
                                            onClick={() => navigate("/dashboard")}
                                        >
                                            Go to Dashboard
                                        </Button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleNotifyMe} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email Address</Label>
                                            <Input 
                                                id="email" 
                                                type="email" 
                                                placeholder="name@company.com" 
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                                className="h-12"
                                            />
                                        </div>
                                        <Button 
                                            type="submit" 
                                            disabled={isLoading}
                                            className="w-full h-12 text-lg font-semibold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all hover:scale-[1.02]"
                                        >
                                            {isLoading ? (
                                                <span className="flex items-center gap-2">
                                                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                                                    Sending...
                                                </span>
                                            ) : (
                                                <>
                                                    <Clock className="w-5 h-5 mr-2" />
                                                    Notify Me When Live
                                                </>
                                            )}
                                        </Button>
                                        <p className="text-xs text-center text-muted-foreground">
                                            No spam. We'll only email you about your subscription availability.
                                        </p>
                                    </form>
                                )}
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-white/20 shadow-sm flex items-center gap-3">
                                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                    <Shield className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="font-semibold text-sm text-slate-900">Secure</div>
                                    <div className="text-xs text-slate-500">Bank-grade security</div>
                                </div>
                            </div>
                            <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-white/20 shadow-sm flex items-center gap-3">
                                <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                                    <Sparkles className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="font-semibold text-sm text-slate-900">Priority</div>
                                    <div className="text-xs text-slate-500">First access guaranteed</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
