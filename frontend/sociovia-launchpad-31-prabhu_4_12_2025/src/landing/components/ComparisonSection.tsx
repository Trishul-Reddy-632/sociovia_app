// ComparisonSection.tsx
// Interactive comparison table showing Sociovia vs Traditional
// Animated checkmarks, hover effects

import { useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { Check, X, HelpCircle } from 'lucide-react';

const comparisons = [
    {
        feature: 'Setup Time',
        traditional: { value: 'Days to weeks', good: false },
        sociovia: { value: 'Minutes', good: true },
        tooltip: 'Get started immediately with guided setup',
    },
    {
        feature: 'AI Optimization',
        traditional: { value: 'Manual adjustments', good: false },
        sociovia: { value: 'Automatic & continuous', good: true },
        tooltip: 'AI learns and optimizes 24/7',
    },
    {
        feature: 'WhatsApp + Ads',
        traditional: { value: 'Separate tools', good: false },
        sociovia: { value: 'Unified platform', good: true },
        tooltip: 'One dashboard for everything',
    },
    {
        feature: 'Learning Curve',
        traditional: { value: 'Steep, requires expertise', good: false },
        sociovia: { value: 'Guided, AI-assisted', good: true },
        tooltip: 'AI suggests what to do next',
    },
    {
        feature: 'Cost Efficiency',
        traditional: { value: 'Multiple subscriptions', good: false },
        sociovia: { value: 'All-in-one pricing', good: true },
        tooltip: 'Save 40%+ vs multiple tools',
    },
];

function ComparisonRow({ item, index }: { item: typeof comparisons[0]; index: number }) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-50px' });
    const [showTooltip, setShowTooltip] = useState(false);

    return (
        <motion.tr
            ref={ref}
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            className="group hover:bg-emerald-50/50 transition-colors"
        >
            <td className="py-5 px-6 font-medium text-gray-900 flex items-center gap-2">
                {item.feature}
                <div className="relative">
                    <HelpCircle
                        className="w-4 h-4 text-gray-400 cursor-help"
                        onMouseEnter={() => setShowTooltip(true)}
                        onMouseLeave={() => setShowTooltip(false)}
                    />
                    {showTooltip && (
                        <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="absolute left-6 top-0 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap z-10"
                        >
                            {item.tooltip}
                        </motion.div>
                    )}
                </div>
            </td>
            <td className="py-5 px-6 text-center">
                <div className="flex items-center justify-center gap-2 text-gray-500">
                    <X className="w-4 h-4 text-red-400" />
                    <span>{item.traditional.value}</span>
                </div>
            </td>
            <td className="py-5 px-6 text-center">
                <div className="flex items-center justify-center gap-2 text-emerald-600 font-medium">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={isInView ? { scale: 1 } : { scale: 0 }}
                        transition={{ type: 'spring', stiffness: 500, delay: 0.3 + index * 0.1 }}
                    >
                        <Check className="w-5 h-5" />
                    </motion.div>
                    <span>{item.sociovia.value}</span>
                </div>
            </td>
        </motion.tr>
    );
}

export default function ComparisonSection() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-100px' });

    return (
        <section ref={ref} className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-gray-50">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <span className="text-emerald-600 font-semibold text-sm uppercase tracking-wider">
                        Why Sociovia
                    </span>
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-4">
                        The Smarter Way to Market
                    </h2>
                    <p className="text-gray-600 mt-4 max-w-2xl mx-auto">
                        See how Sociovia compares to managing multiple traditional tools
                    </p>
                </motion.div>

                {/* Comparison Table */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
                >
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="py-4 px-6 text-left text-sm font-semibold text-gray-600">Feature</th>
                                <th className="py-4 px-6 text-center text-sm font-semibold text-gray-600">Traditional</th>
                                <th className="py-4 px-6 text-center text-sm font-semibold text-emerald-600 bg-emerald-50">
                                    <span className="flex items-center justify-center gap-2">
                                        ✨ Sociovia
                                    </span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {comparisons.map((item, index) => (
                                <ComparisonRow key={item.feature} item={item} index={index} />
                            ))}
                        </tbody>
                    </table>
                </motion.div>
            </div>
        </section>
    );
}
