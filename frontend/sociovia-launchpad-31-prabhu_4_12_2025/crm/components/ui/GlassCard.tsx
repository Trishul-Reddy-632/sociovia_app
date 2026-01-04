import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import React from "react";

interface GlassCardProps extends HTMLMotionProps<"div"> {
    children: React.ReactNode;
    className?: string;
    hoverEffect?: boolean;
}

export const GlassCard = ({
    children,
    className,
    hoverEffect = true,
    ...props
}: GlassCardProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            whileHover={
                hoverEffect
                    ? {
                        y: -5,
                        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                        borderColor: "rgba(255, 255, 255, 0.4)",
                    }
                    : {}
            }
            className={cn(
                "relative overflow-hidden rounded-2xl border border-white/60 bg-white/40 p-6 backdrop-blur-xl transition-all",
                "shadow-soft hover:shadow-primary", // Use project CSS vars
                className
            )}
            {...props}
        >
            {/* Subtle Gradient Hint instead of heavy blobs */}
            <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-primary/10 to-transparent blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-gradient-to-tl from-accent/10 to-transparent blur-3xl" />

            <div className="relative z-10 text-foreground">{children}</div>
        </motion.div>
    );
};
