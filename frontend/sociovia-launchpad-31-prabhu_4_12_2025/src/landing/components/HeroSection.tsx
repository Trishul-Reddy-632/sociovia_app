// HeroSection.tsx
// Premium hero with CSS particle network, animated text, and CTAs
// No heavy Three.js - uses lightweight canvas + CSS

import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logo from '@/assets/sociovia_logo.png';

interface HeroProps {
    onLoginClick: () => void;
}

// Particle Network Canvas
function ParticleNetwork() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationId: number;
        let particles: { x: number; y: number; vx: number; vy: number; size: number }[] = [];

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        const createParticles = () => {
            particles = [];
            const count = Math.min(80, Math.floor(window.innerWidth / 20));
            for (let i = 0; i < count; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: (Math.random() - 0.5) * 0.5,
                    size: Math.random() * 3 + 1,
                });
            }
        };

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw particles
            particles.forEach((p, i) => {
                // Update position
                p.x += p.vx;
                p.y += p.vy;

                // Bounce off edges
                if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

                // Draw particle
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(16, 185, 129, 0.4)';
                ctx.fill();

                // Draw connections
                particles.forEach((p2, j) => {
                    if (i === j) return;
                    const dx = p.x - p2.x;
                    const dy = p.y - p2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 150) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.strokeStyle = `rgba(16, 185, 129, ${0.15 * (1 - dist / 150)})`;
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                });
            });

            animationId = requestAnimationFrame(draw);
        };

        resize();
        createParticles();
        draw();

        window.addEventListener('resize', () => {
            resize();
            createParticles();
        });

        return () => {
            cancelAnimationFrame(animationId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none"
            style={{ opacity: 0.6 }}
        />
    );
}

// Animated word reveal
const words = ['Where', 'Marketing', 'Meets', 'AI', '&', 'Automation'];

function AnimatedHeadline() {
    return (
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
            {words.map((word, i) => (
                <motion.span
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.1, duration: 0.5, ease: 'easeOut' }}
                    className={`inline-block mr-3 ${word === 'AI' || word === 'Automation'
                            ? 'bg-gradient-to-r from-emerald-500 to-green-500 bg-clip-text text-transparent'
                            : 'text-gray-900'
                        }`}
                >
                    {word}
                </motion.span>
            ))}
        </h1>
    );
}

export default function HeroSection({ onLoginClick }: HeroProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
    }, []);

    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-white via-emerald-50/20 to-white">
            {/* Particle Network Background */}
            <ParticleNetwork />

            {/* Gradient Orbs */}
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-emerald-200/30 rounded-full -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-green-200/20 rounded-full translate-x-1/3 translate-y-1/3" />

            {/* Content */}
            <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
                {/* Logo */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="mb-8"
                >
                    <img src={logo} alt="Sociovia" className="h-16 md:h-20 mx-auto" />
                </motion.div>

                {/* Animated Headline */}
                <div className="mb-6">
                    <AnimatedHeadline />
                </div>

                {/* Subtext */}
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8, duration: 0.5 }}
                    className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed"
                >
                    Run ads. Automate WhatsApp. Understand performance.
                    <br className="hidden sm:block" />
                    <span className="text-emerald-600 font-medium">All powered by AI.</span>
                </motion.p>

                {/* CTAs */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1, duration: 0.5 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-4"
                >
                    <Button
                        size="lg"
                        onClick={onLoginClick}
                        className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white px-8 py-6 text-lg font-semibold rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-xl transition-all group"
                    >
                        Enter Sociovia
                        <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                    <Button
                        variant="outline"
                        size="lg"
                        className="border-2 border-gray-200 text-gray-700 hover:bg-gray-50 px-8 py-6 text-lg rounded-xl group"
                    >
                        <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                        Watch Demo
                    </Button>
                </motion.div>

                {/* Scroll Indicator */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.5 }}
                    className="absolute bottom-8 left-1/2 -translate-x-1/2"
                >
                    <motion.div
                        animate={{ y: [0, 8, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                        className="w-6 h-10 border-2 border-emerald-300 rounded-full flex justify-center pt-2"
                    >
                        <div className="w-1.5 h-3 bg-emerald-400 rounded-full" />
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}
