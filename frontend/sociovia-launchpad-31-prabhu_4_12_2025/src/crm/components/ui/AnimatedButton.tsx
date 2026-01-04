import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import React from "react";
import { Loader2 } from "lucide-react";

interface AnimatedButtonProps extends HTMLMotionProps<"button"> {
    variant?: "primary" | "secondary" | "danger" | "ghost";
    isLoading?: boolean;
    children: React.ReactNode;
}

export const AnimatedButton = ({
    className,
    variant = "primary",
    isLoading,
    children,
    ...props
}: AnimatedButtonProps) => {
    const variants = {
        primary:
            "bg-gradient-to-r from-violet-400 to-indigo-400 text-white shadow-lg hover:shadow-indigo-500/50 border-0",
        secondary:
            "bg-white/50 text-foreground hover:bg-white/80 border border-white/60 backdrop-blur-md shadow-sm",
        danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
        ghost: "bg-transparent text-muted-foreground hover:bg-primary/10 hover:text-primary",
    };

    return (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
                "relative flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold transition-all disabled:opacity-50 disabled:pointer-events-none",
                variants[variant],
                className
            )}
            disabled={isLoading}
            {...props}
        >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {children}
        </motion.button>
    );
};
