// EarlyAccessForm.tsx
// Email capture with minimal fields and confetti on submit

import { useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Sparkles, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import confetti from 'canvas-confetti';

export default function EarlyAccessForm() {
    const [email, setEmail] = useState('');
    const [company, setCompany] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-100px' });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setIsLoading(true);

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));

        setIsLoading(false);
        setIsSuccess(true);

        // Confetti celebration
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#10b981', '#22c55e', '#34d399']
        });

        // Reset after delay
        setTimeout(() => {
            setEmail('');
            setCompany('');
            setIsSuccess(false);
        }, 3000);
    };

    return (
        <section ref={ref} className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-emerald-50">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                transition={{ duration: 0.6 }}
                className="max-w-xl mx-auto text-center"
            >
                {/* Icon */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={isInView ? { scale: 1 } : { scale: 0 }}
                    transition={{ type: 'spring', stiffness: 400, delay: 0.2 }}
                    className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/30"
                >
                    <Sparkles className="w-8 h-8 text-white" />
                </motion.div>

                {/* Heading */}
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                    Get Early Access
                </h2>
                <p className="text-gray-600 mb-8">
                    Be among the first to experience AI-powered marketing automation.
                </p>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        type="email"
                        placeholder="Your email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isLoading || isSuccess}
                        className="h-14 px-5 text-lg rounded-xl border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                    />
                    <Input
                        type="text"
                        placeholder="Company name (optional)"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        disabled={isLoading || isSuccess}
                        className="h-14 px-5 text-lg rounded-xl border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                    />
                    <Button
                        type="submit"
                        size="lg"
                        disabled={isLoading || isSuccess || !email}
                        className={`w-full h-14 text-lg font-semibold rounded-xl transition-all ${isSuccess
                                ? 'bg-green-500 hover:bg-green-500'
                                : 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700'
                            }`}
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : isSuccess ? (
                            <>
                                <Check className="w-5 h-5 mr-2" />
                                You're on the list!
                            </>
                        ) : (
                            'Get Access'
                        )}
                    </Button>
                </form>

                {/* Trust Text */}
                <p className="text-sm text-gray-500 mt-6">
                    No spam, ever. We respect your inbox.
                </p>
            </motion.div>
        </section>
    );
}
