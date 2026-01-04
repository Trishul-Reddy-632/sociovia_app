// HowItWorks.tsx
// Animated 3-step timeline with self-drawing line
// Clean, minimal design

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Link2, Wand2, Rocket } from 'lucide-react';

const steps = [
    {
        icon: Link2,
        title: 'Connect',
        subtitle: 'Link Meta & WhatsApp',
        description: 'One-click integration with your Meta Business and WhatsApp accounts. No technical setup required.',
    },
    {
        icon: Wand2,
        title: 'Create',
        subtitle: 'Build campaigns & automations',
        description: 'AI-powered campaign builder and WhatsApp automation flows. Templates ready to go.',
    },
    {
        icon: Rocket,
        title: 'Scale',
        subtitle: 'Track, optimize, grow',
        description: 'Real-time analytics and AI recommendations. Watch your marketing perform.',
    },
];

function TimelineStep({ step, index }: { step: typeof steps[0]; index: number }) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-50px' });
    const Icon = step.icon;

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
            transition={{ duration: 0.5, delay: index * 0.2 }}
            className="relative flex items-start gap-6"
        >
            {/* Step Number & Icon */}
            <div className="relative flex-shrink-0">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={isInView ? { scale: 1 } : { scale: 0 }}
                    transition={{ type: 'spring', stiffness: 400, delay: index * 0.2 }}
                    className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/30"
                >
                    <Icon className="w-7 h-7 text-white" />
                </motion.div>
                <span className="absolute -top-2 -left-2 w-6 h-6 bg-gray-900 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {index + 1}
                </span>
            </div>

            {/* Content */}
            <div className="pt-2 pb-12">
                <span className="text-emerald-600 font-semibold text-sm uppercase tracking-wider">
                    {step.title}
                </span>
                <h3 className="text-2xl font-bold text-gray-900 mt-1 mb-2">
                    {step.subtitle}
                </h3>
                <p className="text-gray-600 leading-relaxed max-w-md">
                    {step.description}
                </p>
            </div>
        </motion.div>
    );
}

export default function HowItWorks() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-100px' });

    return (
        <section ref={ref} className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <span className="text-emerald-600 font-semibold text-sm uppercase tracking-wider">
                        How It Works
                    </span>
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-4">
                        Up and Running in Minutes
                    </h2>
                </motion.div>

                {/* Timeline */}
                <div className="relative">
                    {/* Vertical Line */}
                    <div className="absolute left-8 top-0 bottom-0 w-px bg-gray-200">
                        <motion.div
                            initial={{ height: 0 }}
                            animate={isInView ? { height: '100%' } : { height: 0 }}
                            transition={{ duration: 1.5, delay: 0.3 }}
                            className="w-full bg-gradient-to-b from-emerald-500 to-green-500"
                        />
                    </div>

                    {/* Steps */}
                    <div className="space-y-4">
                        {steps.map((step, index) => (
                            <TimelineStep key={step.title} step={step} index={index} />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
