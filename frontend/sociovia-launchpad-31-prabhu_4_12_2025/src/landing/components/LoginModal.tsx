// LoginModal.tsx
// Reusable login modal with existing login UI wrapped
// Soft blur background, smooth animations

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import logo from '@/assets/sociovia_logo.png';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    context?: string;
}

export default function LoginModal({ isOpen, onClose, context }: LoginModalProps) {
    const navigate = useNavigate();

    // Lock body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    const handleLoginRedirect = () => {
        onClose();
        navigate('/login');
    };

    const handleSignupRedirect = () => {
        onClose();
        navigate('/signup');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 p-8"
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>

                        {/* Content */}
                        <div className="text-center">
                            {/* Logo */}
                            <img src={logo} alt="Sociovia" className="h-12 mx-auto mb-6" />

                            {/* Message */}
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                Sign in to continue
                            </h2>
                            <p className="text-gray-600 mb-8">
                                {context === 'dashboard'
                                    ? 'Access your live dashboard and analytics'
                                    : 'Unlock the full power of Sociovia'
                                }
                            </p>

                            {/* Action Buttons */}
                            <div className="space-y-4">
                                <Button
                                    onClick={handleLoginRedirect}
                                    className="w-full h-12 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold rounded-xl"
                                >
                                    Sign In
                                </Button>
                                <Button
                                    onClick={handleSignupRedirect}
                                    variant="outline"
                                    className="w-full h-12 border-2 border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold rounded-xl"
                                >
                                    Create Account
                                </Button>
                            </div>

                            {/* Divider */}
                            <div className="flex items-center gap-4 my-6">
                                <div className="flex-1 h-px bg-gray-200" />
                                <span className="text-sm text-gray-500">or</span>
                                <div className="flex-1 h-px bg-gray-200" />
                            </div>

                            {/* Continue as Guest */}
                            <button
                                onClick={onClose}
                                className="text-sm text-gray-500 hover:text-emerald-600 transition-colors"
                            >
                                Continue exploring →
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
