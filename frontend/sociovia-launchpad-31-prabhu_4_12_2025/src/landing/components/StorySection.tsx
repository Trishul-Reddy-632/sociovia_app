// StorySection.tsx
// Scroll-triggered story panels showing what Sociovia does
// Left: Floating UI mockups, Right: Animated text

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Target, MessageCircle, BarChart3 } from 'lucide-react';

const stories = [
    {
        id: 'ads',
        icon: Target,
        title: 'AI Ad Creation',
        subtitle: 'Create campaigns that learn',
        description: 'Our AI analyzes your audience, crafts compelling copy, and optimizes in real-time. Set up once, let AI do the rest.',
        color: 'emerald',
        mockup: '📊 Campaign Builder',
    },
    {
        id: 'whatsapp',
        icon: MessageCircle,
        title: 'WhatsApp Automation',
        subtitle: 'Conversations that convert',
        description: 'Automated templates, smart responses, and seamless CRM integration. Engage customers 24/7 without lifting a finger.',
        color: 'green',
        mockup: '💬 WhatsApp Flow',
    },
    {
        id: 'analytics',
        icon: BarChart3,
        title: 'Real-time Analytics',
        subtitle: 'Insights that drive growth',
        description: 'Unified dashboard for ads and messaging. AI-powered insights tell you exactly what to optimize next.',
        color: 'teal',
        mockup: '📈 Analytics Dashboard',
    },
];

function StoryCard({ story, index }: { story: typeof stories[0]; index: number }) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-100px' });

    const Icon = story.icon;

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 50 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
            transition={{ duration: 0.6, delay: index * 0.2 }}
            className={`flex flex-col lg:flex-row items-center gap-8 lg:gap-16 ${index % 2 === 1 ? 'lg:flex-row-reverse' : ''
                }`}
        >
            {/* Mockup Side */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.6, delay: 0.3 + index * 0.2 }}
                className="w-full lg:w-1/2"
            >
                <div className={`relative bg-gradient-to-br from-${story.color}-50 to-white border border-${story.color}-100 rounded-3xl p-8 shadow-xl`}>
                    {/* Mock UI */}
                    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`p-2 rounded-lg bg-${story.color}-100`}>
                                <Icon className={`w-5 h-5 text-${story.color}-600`} />
                            </div>
                            <span className="font-semibold text-gray-800">{story.mockup}</span>
                        </div>
                        <div className="space-y-3">
                            <div className="h-3 bg-gray-100 rounded-full w-full" />
                            <div className="h-3 bg-gray-100 rounded-full w-4/5" />
                            <div className="h-3 bg-gray-100 rounded-full w-3/5" />
                        </div>
                        <div className="mt-6 flex gap-3">
                            <div className={`h-10 bg-${story.color}-500 rounded-lg flex-1`} />
                            <div className="h-10 bg-gray-100 rounded-lg flex-1" />
                        </div>
                    </div>

                    {/* Floating Elements */}
                    <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                        className="absolute -top-4 -right-4 p-3 bg-white rounded-xl shadow-lg border border-gray-100"
                    >
                        <span className="text-2xl">{story.id === 'ads' ? '🎯' : story.id === 'whatsapp' ? '✅' : '📊'}</span>
                    </motion.div>
                </div>
            </motion.div>

            {/* Content Side */}
            <div className="w-full lg:w-1/2 text-center lg:text-left">
                <motion.div
                    initial={{ opacity: 0, x: index % 2 === 1 ? -30 : 30 }}
                    animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: index % 2 === 1 ? -30 : 30 }}
                    transition={{ duration: 0.6, delay: 0.2 + index * 0.2 }}
                >
                    <div className={`inline-flex items-center gap-2 text-${story.color}-600 font-semibold mb-2`}>
                        <Icon className="w-5 h-5" />
                        <span>{story.title}</span>
                    </div>
                    <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                        {story.subtitle}
                    </h3>
                    <p className="text-lg text-gray-600 leading-relaxed">
                        {story.description}
                    </p>
                </motion.div>
            </div>
        </motion.div>
    );
}

export default function StorySection() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-50px' });

    return (
        <section ref={ref} className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
            <div className="max-w-7xl mx-auto">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-20"
                >
                    <span className="text-emerald-600 font-semibold text-sm uppercase tracking-wider">
                        What Sociovia Does
                    </span>
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mt-4">
                        One Platform. <span className="text-emerald-500">Everything Marketing.</span>
                    </h2>
                </motion.div>

                {/* Story Cards */}
                <div className="space-y-24 lg:space-y-32">
                    {stories.map((story, index) => (
                        <StoryCard key={story.id} story={story} index={index} />
                    ))}
                </div>
            </div>
        </section>
    );
}
