
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Scale, Rocket, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRegisterOptimizer } from '@/hooks/useOptimizationQueries';

export default function OptimizationEntry() {
    const navigate = useNavigate();
    const registerMutation = useRegisterOptimizer();

    const handleEnable = async () => {
        try {
            const res = await registerMutation.mutateAsync();
            if (res.data && res.data.status === 'registered') {
                navigate('/optimization/setup');
            } else {
                navigate('/optimization/setup');
            }
        } catch (error) {
            console.error("Failed to register optimizer", error);
            navigate('/optimization/setup');
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: { type: "spring", stiffness: 300, damping: 24 }
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex items-center justify-center p-6">
            {/* Background Decorative Blobs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-400/10 rounded-full blur-[100px]" />
            </div>

            <motion.div
                className="max-w-6xl w-full mx-auto relative z-10"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >

                {/* Hero Section */}
                <motion.div variants={itemVariants} className="text-center mb-16 space-y-6">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100/50 border border-blue-200 text-blue-700 text-sm font-medium mb-4">
                        <Zap className="w-4 h-4 fill-blue-500" />
                        <span>New: Intelligent Ad Decision Engine</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 leading-tight">
                        Stop Managing Ads.<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                            Start Orchestrating Strategy.
                        </span>
                    </h1>

                    <p className="text-xl md:text-2xl text-slate-600 max-w-3xl mx-auto font-light leading-relaxed">
                        Sociovia is not a black box. You define the rules, risk tolerance, and goals.
                        We execute thousands of micro-optimizations 24/7 to scale your winners.
                    </p>

                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="pt-8"
                    >
                        <Button
                            onClick={handleEnable}
                            disabled={registerMutation.isPending}
                            size="lg"
                            className="h-16 px-10 text-xl rounded-full bg-slate-900 hover:bg-slate-800 text-white shadow-2xl shadow-blue-900/20 hover:shadow-blue-900/30 transition-all group"
                        >
                            {registerMutation.isPending ? "Activating..." : "Configure Optimization Engine"}
                            {!registerMutation.isPending && <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-1 transition-transform" />}
                        </Button>
                        <p className="mt-4 text-sm text-slate-500 font-medium">
                            Takes ~2 minutes • No risk to existing campaigns
                        </p>
                    </motion.div>
                </motion.div>

                {/* Feature Cards */}
                <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <FeatureCard
                        icon={<Shield className="w-8 h-8 text-emerald-500" />}
                        title="Defensive & Safe"
                        description="Hard vetoes on risky scaling. We protect your budget like a hawk, ensuring no runaway spend."
                        gradient="from-emerald-50 to-teal-50"
                        borderColor="group-hover:border-emerald-200"
                    />
                    <FeatureCard
                        icon={<Scale className="w-8 h-8 text-blue-500" />}
                        title="Balanced Growth"
                        description="The perfect equilibrium. We scale when ROAS is healthy and pull back instantly when fatigue hits."
                        gradient="from-blue-50 to-indigo-50"
                        borderColor="group-hover:border-blue-200"
                    />
                    <FeatureCard
                        icon={<Rocket className="w-8 h-8 text-purple-500" />}
                        title="Aggressive Scaling"
                        description="Identify winners early and capitalize quickly. Automated velocity checks keep scaling profitable."
                        gradient="from-purple-50 to-pink-50"
                        borderColor="group-hover:border-purple-200"
                    />
                </motion.div>

                {/* Trust Indicators */}
                <motion.div variants={itemVariants} className="mt-20 pt-10 border-t border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-8 text-center opacity-70">
                    <TrustItem label="Active Rules" value="12+" />
                    <TrustItem label="Safety Checks" value="Every 15m" />
                    <TrustItem label="Decision Log" value="Glass Box" />
                    <TrustItem label="Control" value="100% Manual Override" />
                </motion.div>

            </motion.div>
        </div>
    );
}

function FeatureCard({ icon, title, description, gradient, borderColor }: any) {
    return (
        <motion.div whileHover={{ y: -5 }}>
            <Card className={`h-full border-slate-200/60 bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 group overflow-hidden relative border`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <CardContent className="p-8 relative z-10">
                    <div className="mb-6 p-3 bg-white rounded-2xl shadow-sm inline-block w-fit border border-slate-100">
                        {icon}
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
                    <p className="text-slate-600 leading-relaxed font-medium">
                        {description}
                    </p>
                </CardContent>
            </Card>
        </motion.div>
    )
}

function TrustItem({ label, value }: any) {
    return (
        <div className="space-y-1">
            <div className="text-2xl font-bold text-slate-900">{value}</div>
            <div className="text-sm font-medium text-slate-500 uppercase tracking-wider">{label}</div>
        </div>
    )
}
