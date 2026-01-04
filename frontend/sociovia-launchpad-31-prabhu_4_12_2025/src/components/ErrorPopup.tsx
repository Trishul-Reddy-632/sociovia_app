import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XCircle, AlertTriangle, CloudOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry?: () => void;
  title?: string;
  errorMessage?: string;
  duration?: number; // in milliseconds, 0 = no auto close
}

const ErrorPopup = ({
  isOpen,
  onClose,
  onRetry,
  title = "Publication Failed",
  errorMessage = "Something went wrong while publishing your campaign.",
  duration = 0, // Default: don't auto close, let user dismiss
}: ErrorPopupProps) => {

  useEffect(() => {
    if (isOpen && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [isOpen, duration, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
        >
          {/* Background overlay - darker and duller */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60"
          />

          {/* Sad falling particles effect */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  y: -20, 
                  x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
                  opacity: 0.3 
                }}
                animate={{ 
                  y: typeof window !== 'undefined' ? window.innerHeight + 20 : 1000,
                  opacity: 0 
                }}
                transition={{ 
                  duration: 4 + Math.random() * 3,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                  ease: 'linear'
                }}
                className="absolute w-1 h-1 bg-gray-400 rounded-full"
              />
            ))}
          </div>

          {/* Popup card */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{
              type: 'spring',
              damping: 25,
              stiffness: 200,
              delay: 0.1,
            }}
            className="relative z-10 max-w-md w-full mx-4"
          >
            {/* Dull glow effect behind card */}
            <div className="absolute inset-0 bg-gradient-to-r from-gray-500 via-slate-600 to-gray-700 rounded-3xl blur-xl opacity-30" />

            {/* Main card */}
            <div className="relative bg-gradient-to-b from-gray-50 to-gray-100 rounded-3xl p-8 shadow-2xl border border-gray-300 overflow-hidden">
              {/* Decorative background - dull colors */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-gray-200 rounded-full opacity-40" />
              <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-red-100 rounded-full opacity-30" />
              
              {/* Subtle crack pattern overlay */}
              <div className="absolute inset-0 opacity-5">
                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path d="M20,0 L25,30 L15,60 L30,100" stroke="currentColor" strokeWidth="0.5" fill="none" className="text-gray-800" />
                  <path d="M60,0 L55,40 L70,70 L60,100" stroke="currentColor" strokeWidth="0.5" fill="none" className="text-gray-800" />
                  <path d="M80,0 L85,50 L75,100" stroke="currentColor" strokeWidth="0.5" fill="none" className="text-gray-800" />
                </svg>
              </div>

              {/* Content */}
              <div className="relative z-10 text-center">
                {/* Animated icon container */}
                <motion.div
                  initial={{ scale: 0, rotate: 10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', delay: 0.2, damping: 12 }}
                  className="mb-6 inline-flex"
                >
                  <div className="relative">
                    {/* Outer ring - slow pulsing */}
                    <motion.div
                      animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.5, 0.3] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                      className="absolute inset-0 w-24 h-24 rounded-full border-4 border-gray-300"
                    />
                    
                    {/* Icon background - dull red/gray gradient */}
                    <div className="w-24 h-24 bg-gradient-to-br from-gray-400 via-gray-500 to-red-400 rounded-full flex items-center justify-center shadow-lg">
                      <motion.div
                        animate={{ rotate: [0, -5, 5, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <XCircle className="w-12 h-12 text-white" strokeWidth={2} />
                      </motion.div>
                    </div>

                    {/* Floating warning icons */}
                    <motion.div
                      animate={{ y: [0, -3, 0], opacity: [0.6, 1, 0.6] }}
                      transition={{ duration: 2.5, repeat: Infinity }}
                      className="absolute -top-1 -right-1"
                    >
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                    </motion.div>
                    <motion.div
                      animate={{ y: [0, 3, 0], opacity: [0.5, 0.8, 0.5] }}
                      transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
                      className="absolute -bottom-1 -left-1"
                    >
                      <CloudOff className="w-4 h-4 text-gray-500" />
                    </motion.div>
                  </div>
                </motion.div>

                {/* Title */}
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-2xl font-bold text-gray-700 mb-3"
                >
                  {title}
                </motion.h2>

                {/* Error message */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mb-6"
                >
                  <p className="text-gray-500 mb-3">
                    We couldn't publish your campaign this time.
                  </p>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-left">
                    <p className="text-sm text-red-600 font-medium mb-1">Error Details:</p>
                    <p className="text-sm text-red-500 break-words max-h-24 overflow-y-auto">
                      {errorMessage}
                    </p>
                  </div>
                </motion.div>

                {/* Sad message */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-gray-400 text-sm mb-6 italic"
                >
                  Don't worry, your draft is still saved. Please try again.
                </motion.p>

                {/* Action buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="flex flex-col sm:flex-row gap-3 justify-center"
                >
                  {onRetry && (
                    <Button 
                      onClick={() => {
                        onClose();
                        onRetry();
                      }}
                      className="bg-gray-700 hover:bg-gray-800 text-white"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Try Again
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    onClick={onClose}
                    className="border-gray-300 text-gray-600 hover:bg-gray-100"
                  >
                    Close
                  </Button>
                </motion.div>

                {/* Bottom bar - static, no animation */}
                <div className="mt-6 h-1 bg-gradient-to-r from-gray-300 via-red-300 to-gray-300 rounded-full opacity-50" />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ErrorPopup;
