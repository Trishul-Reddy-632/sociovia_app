// LandingPage.tsx
// Main orchestrator for the premium Sociovia landing page (v2)
// Uses Framer Motion for animations, CSS particles instead of Three.js

import { useState, useEffect } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import HeroSection from './components/HeroSection';
import StorySection from './components/StorySection';
import ComparisonSection from './components/ComparisonSection';
import DashboardPreview from './components/DashboardPreview';
import HowItWorks from './components/HowItWorks';
import EarlyAccessForm from './components/EarlyAccessForm';
import LandingFooter from './components/LandingFooter';
import LoginModal from './components/LoginModal';

export default function LandingPage() {
    const [isLoginModalOpen, setLoginModalOpen] = useState(false);
    const [loginContext, setLoginContext] = useState<string>('');

    // Scroll progress for animations
    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    // Handle login trigger from any section
    const handleLoginTrigger = (context: string) => {
        setLoginContext(context);
        setLoginModalOpen(true);
    };

    return (
        <div className="relative bg-white overflow-hidden">
            {/* Progress Bar */}
            <motion.div
                className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-green-500 z-50 origin-left"
                style={{ scaleX }}
            />

            {/* Main Sections */}
            <HeroSection onLoginClick={() => handleLoginTrigger('hero')} />
            <StorySection />
            <ComparisonSection />
            <DashboardPreview onLoginClick={() => handleLoginTrigger('dashboard')} />
            <HowItWorks />
            <EarlyAccessForm />
            <LandingFooter />

            {/* Login Modal */}
            <LoginModal
                isOpen={isLoginModalOpen}
                onClose={() => setLoginModalOpen(false)}
                context={loginContext}
            />
        </div>
    );
}
