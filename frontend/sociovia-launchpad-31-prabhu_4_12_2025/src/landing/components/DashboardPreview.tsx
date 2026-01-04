// DashboardPreview.tsx
// Blurred dashboard preview with login CTA - the "login bait"
// Critical section for conversion

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Lock, ArrowRight, BarChart3, MessageCircle, Target, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DashboardPreviewProps {
    onLoginClick: () => void;
}

export default function DashboardPreview({ onLoginClick }: DashboardPreviewProps) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-100px' });

    return (
        <section ref={ref} className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-12"
                >
                    <span className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
                        <Lock className="w-4 h-4" />
                        Live Platform Preview
                    </span>
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                        See What's Inside
                    </h2>
                </motion.div>

                {/* Dashboard Preview */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="relative"
                >
                    {/* Blurred Dashboard Mock */}
                    <div className="relative bg-gray-900 rounded-2xl p-4 shadow-2xl overflow-hidden">
                        {/* Browser Chrome */}
                        <div className="flex items-center gap-2 mb-4">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-red-400" />
                                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                                <div className="w-3 h-3 rounded-full bg-green-400" />
                            </div>
                            <div className="flex-1 bg-gray-800 rounded-lg py-1.5 px-4 text-gray-400 text-sm ml-4">
                                app.sociovia.in/dashboard
                            </div>
                        </div>

                        {/* Dashboard Content (Blurred) */}
                        <div className="relative rounded-xl overflow-hidden" style={{ filter: 'blur(6px)' }}>
                            <div className="bg-white p-6">
                                {/* Header */}
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-emerald-100 rounded-lg" />
                                        <div>
                                            <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
                                            <div className="h-3 bg-gray-100 rounded w-24" />
                                        </div>
                                    </div>
                                    <div className="h-10 bg-emerald-500 rounded-lg w-32" />
                                </div>

                                {/* Stats Row */}
                                <div className="grid grid-cols-4 gap-4 mb-6">
                                    {[Target, MessageCircle, BarChart3, TrendingUp].map((Icon, i) => (
                                        <div key={i} className="bg-gray-50 rounded-xl p-4">
                                            <Icon className="w-6 h-6 text-emerald-500 mb-2" />
                                            <div className="h-6 bg-gray-200 rounded w-16 mb-1" />
                                            <div className="h-3 bg-gray-100 rounded w-20" />
                                        </div>
                                    ))}
                                </div>

                                {/* Charts Row */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gray-50 rounded-xl p-4 h-48">
                                        <div className="h-4 bg-gray-200 rounded w-24 mb-4" />
                                        <div className="h-32 bg-gradient-to-t from-emerald-100 to-transparent rounded" />
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-4 h-48">
                                        <div className="h-4 bg-gray-200 rounded w-24 mb-4" />
                                        <div className="grid grid-cols-5 gap-1 h-32 items-end">
                                            {[60, 80, 45, 90, 70].map((h, i) => (
                                                <div key={i} className="bg-green-300 rounded-t" style={{ height: `${h}%` }} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Pulsing Data Indicator */}
                        <motion.div
                            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute top-8 right-8 flex items-center gap-2 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold"
                        >
                            <div className="w-2 h-2 bg-white rounded-full" />
                            Live Data
                        </motion.div>
                    </div>

                    {/* Overlay CTA */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                        className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-gray-900/80 via-gray-900/40 to-transparent rounded-2xl"
                    >
                        <div className="text-center">
                            <motion.p
                                animate={{ y: [0, -5, 0] }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                                className="text-white text-xl md:text-2xl font-semibold mb-6 drop-shadow-lg"
                            >
                                This is live data from Sociovia
                            </motion.p>
                            <Button
                                size="lg"
                                onClick={onLoginClick}
                                className="bg-white text-gray-900 hover:bg-gray-100 px-8 py-6 text-lg font-semibold rounded-xl shadow-2xl group"
                            >
                                <Lock className="w-5 h-5 mr-2" />
                                Log in to unlock your dashboard
                                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}
