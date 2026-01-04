import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { CheckCircle2, Sparkles, PartyPopper, Rocket } from 'lucide-react';

interface CelebrationPopupProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  duration?: number; // in milliseconds
}

const CelebrationPopup = ({
  isOpen,
  onClose,
  title = "Campaign Sent to meta",
  subtitle = "Your ad is now being reviewed and will go live soon.",
  duration = 7000,
}: CelebrationPopupProps) => {
  const hasTriggeredConfetti = useRef(false);
  const onCloseRef = useRef(onClose);
  
  // Keep onClose ref updated
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (isOpen && !hasTriggeredConfetti.current) {
      hasTriggeredConfetti.current = true;

      // Initial burst from center
      const centerBurst = () => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6, x: 0.5 },
          colors: ['#22c55e', '#16a34a', '#4ade80', '#86efac', '#fbbf24', '#f59e0b', '#ffffff'],
          shapes: ['circle', 'square'],
          gravity: 0.8,
          scalar: 1.2,
        });
      };

      // Side cannons
      const sideCannons = () => {
        const end = Date.now() + 1500;
        const colors = ['#22c55e', '#16a34a', '#4ade80', '#fbbf24', '#f59e0b', '#3b82f6', '#8b5cf6'];

        const frame = () => {
          confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.7 },
            colors,
            shapes: ['circle', 'square'],
          });
          confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.7 },
            colors,
            shapes: ['circle', 'square'],
          });

          if (Date.now() < end) {
            requestAnimationFrame(frame);
          }
        };
        frame();
      };

      // Sparkle rain from top
      const sparkleRain = () => {
        const duration = 2000;
        const end = Date.now() + duration;

        const frame = () => {
          confetti({
            particleCount: 2,
            angle: 90,
            spread: 160,
            origin: { y: 0, x: Math.random() },
            colors: ['#ffd700', '#ffec8b', '#fbbf24', '#22c55e'],
            shapes: ['circle'],
            gravity: 0.6,
            scalar: 0.8,
            drift: 0,
          });

          if (Date.now() < end) {
            requestAnimationFrame(frame);
          }
        };
        frame();
      };

      // Trigger all effects
      setTimeout(centerBurst, 100);
      setTimeout(sideCannons, 300);
      setTimeout(sparkleRain, 500);

      // Second burst
      setTimeout(() => {
        confetti({
          particleCount: 80,
          spread: 100,
          origin: { y: 0.5, x: 0.5 },
          colors: ['#22c55e', '#16a34a', '#fbbf24', '#ffffff', '#3b82f6'],
          shapes: ['circle', 'square'],
          gravity: 0.9,
        });
      }, 1000);

      // Auto close after duration - use ref to get latest onClose
      const timer = setTimeout(() => {
        console.log('[CelebrationPopup] Timer fired, calling onClose');
        try {
          onCloseRef.current();
        } catch (err) {
          console.error('[CelebrationPopup] onClose error:', err);
          // Fallback to direct navigation
          window.location.href = '/dashboard';
        }
      }, duration);

      return () => {
        clearTimeout(timer);
      };
    }

    if (!isOpen) {
      hasTriggeredConfetti.current = false;
    }
  }, [isOpen, duration]); // Removed onClose from dependencies to prevent re-triggering

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
        >
          {/* Background overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
          />

          {/* Popup card */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -20 }}
            transition={{
              type: 'spring',
              damping: 20,
              stiffness: 300,
              delay: 0.1,
            }}
            className="relative z-10 max-w-md w-full mx-4"
          >
            {/* Glow effect behind card */}
            <div className="absolute inset-0 bg-gradient-to-r from-green-400 via-emerald-500 to-green-600 rounded-3xl blur-xl opacity-40 animate-pulse" />

            {/* Main card */}
            <div className="relative bg-white rounded-3xl p-8 shadow-2xl border border-green-100 overflow-hidden">
              {/* Decorative background circles */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-green-100 rounded-full opacity-50" />
              <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-yellow-100 rounded-full opacity-50" />

              {/* Content */}
              <div className="relative z-10 text-center">
                {/* Animated icon container */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', delay: 0.2, damping: 15 }}
                  className="mb-6 inline-flex"
                >
                  <div className="relative">
                    {/* Outer ring */}
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                      className="absolute inset-0 w-24 h-24 rounded-full border-4 border-dashed border-green-200"
                    />
                    
                    {/* Icon background */}
                    <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <CheckCircle2 className="w-12 h-12 text-white" strokeWidth={2.5} />
                      </motion.div>
                    </div>

                    {/* Floating sparkles */}
                    <motion.div
                      animate={{ y: [-5, 5, -5], rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute -top-2 -right-2"
                    >
                      <Sparkles className="w-6 h-6 text-yellow-400" />
                    </motion.div>
                    <motion.div
                      animate={{ y: [5, -5, 5], rotate: [0, -10, 10, 0] }}
                      transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
                      className="absolute -bottom-1 -left-2"
                    >
                      <PartyPopper className="w-5 h-5 text-orange-400" />
                    </motion.div>
                  </div>
                </motion.div>

                {/* Title */}
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-2xl font-bold text-gray-900 mb-3"
                >
                  {title}
                </motion.h2>

                {/* Subtitle */}
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-gray-600 mb-6"
                >
                  {subtitle}
                </motion.p>

                {/* Rocket animation */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center justify-center gap-2 text-sm text-green-600 font-medium"
                >
                  <motion.div
                    animate={{ y: [-2, 2, -2] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <Rocket className="w-4 h-4" />
                  </motion.div>
                  <span>Redirecting to dashboard...</span>
                </motion.div>

                {/* Progress bar */}
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: duration / 1000, ease: 'linear' }}
                  className="mt-6 h-1 bg-gradient-to-r from-green-400 via-emerald-500 to-green-600 rounded-full origin-left"
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CelebrationPopup;
