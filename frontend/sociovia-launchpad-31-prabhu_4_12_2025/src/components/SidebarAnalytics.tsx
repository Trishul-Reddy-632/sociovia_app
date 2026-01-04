// SidebarAnalytics.tsx
// =====================
// Collapsible Analytics menu for the dashboard sidebar
// Features: Smooth animations, disabled "coming soon" items, active highlighting
// Now uses callback instead of navigation for inline content display

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BarChart3,
    ChevronRight,
    MessageCircle,
    Target,
    Search,
    Mail,
    Lock
} from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

// Analytics item types
export type AnalyticsType = 'whatsapp' | 'meta' | 'google' | 'email' | null;

interface SidebarAnalyticsProps {
    isCollapsed?: boolean;
    activeView?: AnalyticsType;
    onSelectView?: (view: AnalyticsType) => void;
}

// Analytics menu items configuration - ordered: meta, whatsapp, google, email
const ANALYTICS_ITEMS: {
    id: AnalyticsType;
    label: string;
    icon: typeof MessageCircle;
    enabled: boolean;
    color: string;
    comingSoon?: boolean;
}[] = [
        {
            id: 'meta',
            label: 'Meta Ads Analytics',
            icon: Target,
            enabled: true,
            color: '#0081FB', // Meta blue
        },
        {
            id: 'whatsapp',
            label: 'WhatsApp Analytics',
            icon: MessageCircle,
            enabled: true,
            color: '#25D366', // WhatsApp green
        },
        {
            id: 'google',
            label: 'Google Analytics',
            icon: Search,
            enabled: true,
            color: '#4285F4', // Google blue
            comingSoon: true,
        },
        {
            id: 'email',
            label: 'Email Analytics',
            icon: Mail,
            enabled: true,
            color: '#EA4335', // Email red
            comingSoon: true,
        },
    ];

// Animation variants for smooth expand/collapse
const SUBMENU_VARIANTS = {
    hidden: {
        height: 0,
        opacity: 0,
    },
    visible: {
        height: 'auto',
        opacity: 1,
    },
};

// Chevron rotation animation
const CHEVRON_VARIANTS = {
    collapsed: { rotate: 0 },
    expanded: { rotate: 90 },
};

export function SidebarAnalytics({
    isCollapsed = false,
    activeView = null,
    onSelectView
}: SidebarAnalyticsProps) {
    // Local expand state (auto-expand if an item is active)
    const [isExpanded, setIsExpanded] = useState(activeView !== null);

    const handleItemClick = (item: typeof ANALYTICS_ITEMS[0]) => {
        if (!item.enabled) return;
        // Just switch to the selected view (no toggle off)
        onSelectView?.(item.id);
    };

    const isItemActive = (id: AnalyticsType) => activeView === id;
    const hasActiveItem = activeView !== null;

    // Collapsed sidebar: show only icon with tooltip
    if (isCollapsed) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="w-full px-3 py-2 rounded-md hover:bg-muted/10 flex items-center justify-center"
                    >
                        <BarChart3 className={`h-4 w-4 ${hasActiveItem ? 'text-primary' : ''}`} />
                    </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="flex flex-col gap-1 p-2">
                    <span className="font-semibold text-xs">Analytics</span>
                    <div className="flex flex-col gap-0.5">
                        {ANALYTICS_ITEMS.map(item => (
                            <button
                                key={item.id}
                                disabled={!item.enabled}
                                onClick={() => item.enabled && onSelectView?.(item.id)}
                                className={`text-xs text-left px-2 py-1 rounded transition-colors ${item.enabled
                                    ? 'hover:bg-muted cursor-pointer'
                                    : 'text-muted-foreground/50 cursor-not-allowed'
                                    } ${isItemActive(item.id) ? 'bg-primary/10 text-primary font-medium' : ''}`}
                            >
                                {item.label}
                                {!item.enabled && ' (Soon)'}
                            </button>
                        ))}
                    </div>
                </TooltipContent>
            </Tooltip>
        );
    }

    return (
        <div className="select-none">
            {/* Analytics Toggle Row */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                aria-expanded={isExpanded}
                className={`
          w-full text-left px-3 py-2 rounded-md 
          flex items-center gap-3 
          transition-colors duration-150
          ${hasActiveItem ? 'bg-primary/5 text-primary' : 'hover:bg-muted/10'}
        `}
            >
                {/* Icon */}
                <BarChart3 className={`h-4 w-4 flex-shrink-0 transition-colors ${hasActiveItem ? 'text-primary' : 'text-muted-foreground'
                    }`} />

                {/* Label */}
                <span className={`flex-1 text-sm ${hasActiveItem ? 'font-medium' : ''
                    }`}>
                    Analytics
                </span>

                {/* Animated Chevron */}
                <motion.div
                    initial={false}
                    animate={isExpanded ? 'expanded' : 'collapsed'}
                    variants={CHEVRON_VARIANTS}
                    transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                >
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </motion.div>
            </button>

            {/* Animated SubMenu */}
            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        variants={SUBMENU_VARIANTS}
                        className="overflow-hidden"
                    >
                        <div className="pl-4 mt-1 space-y-0.5">
                            {ANALYTICS_ITEMS.map((item) => {
                                const Icon = item.icon;
                                const isActive = isItemActive(item.id);

                                if (!item.enabled) {
                                    // Disabled item with tooltip
                                    return (
                                        <Tooltip key={item.id}>
                                            <TooltipTrigger asChild>
                                                <div
                                                    className={`
                            relative flex items-center gap-2.5 px-3 py-2 rounded-md
                            text-muted-foreground/50 cursor-not-allowed
                            transition-all duration-120
                          `}
                                                >
                                                    {/* Icon with reduced opacity */}
                                                    <Icon
                                                        className="h-4 w-4 flex-shrink-0"
                                                        style={{ opacity: 0.4 }}
                                                    />

                                                    {/* Label */}
                                                    <span className="text-sm flex-1">{item.label}</span>

                                                    {/* Lock indicator */}
                                                    <Lock className="h-3 w-3 opacity-40" />
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent side="right" sideOffset={8}>
                                                <p className="text-sm">Coming soon</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    );
                                }

                                // Enabled item
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => handleItemClick(item)}
                                        className={`
                      relative w-full flex items-center gap-2.5 px-3 py-2 rounded-md
                      transition-all duration-120 group
                      ${isActive
                                                ? 'bg-primary/10 text-primary font-medium'
                                                : 'hover:bg-muted/10 text-foreground/80 hover:text-foreground'
                                            }
                    `}
                                    >
                                        {/* Active indicator bar */}
                                        {isActive && (
                                            <motion.div
                                                layoutId="analytics-active-bar"
                                                className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-full"
                                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                            />
                                        )}

                                        {/* Icon with hover effect */}
                                        <Icon
                                            className={`
                        h-4 w-4 flex-shrink-0 transition-transform duration-120
                        group-hover:scale-105
                      `}
                                            style={{ color: isActive ? item.color : undefined }}
                                        />

                                        {/* Label */}
                                        <span className="text-sm">{item.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default SidebarAnalytics;