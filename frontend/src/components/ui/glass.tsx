import React from 'react';
import { cn } from '@/lib/utils';
import { motion, HTMLMotionProps } from 'framer-motion';

export const GlassButton = ({ className, ...props }: HTMLMotionProps<"button">) => {
    return (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
                "px-6 py-3 rounded-xl font-bold text-white transition-all duration-300",
                "bg-gradient-to-r from-primary to-secondary shadow-lg hover:shadow-primary/25",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                className
            )}
            {...props}
        />
    );
};

export const GlassInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    ({ className, ...props }, ref) => {
        return (
            <input
                ref={ref}
                className={cn(
                    "w-full px-4 py-3 rounded-xl outline-none transition-all duration-300",
                    "bg-white/5 border border-white/10 text-white placeholder:text-white/40",
                    "focus:bg-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/50",
                    className
                )}
                {...props}
            />
        );
    }
);
GlassInput.displayName = "GlassInput";

export const GlassCard = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn("glass-panel p-6", className)} {...props}>
        {children}
    </div>
);
