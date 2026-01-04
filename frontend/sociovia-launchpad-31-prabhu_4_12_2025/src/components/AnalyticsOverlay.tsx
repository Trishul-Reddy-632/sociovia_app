// Import dependencies
import { useState, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { AnalyticsType } from './SidebarAnalytics';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
    Menu,
    X,
    Target,
    MessageCircle,
    Search,
    Mail,
    Loader2
} from 'lucide-react';
import logo from '@/assets/sociovia_logo.png';

// Lazy load heavy components
const WhatsAppAnalytics = lazy(() => import('@/whatsapp/pages/WhatsAppAnalytics').then(m => ({ default: m.WhatsAppAnalytics })));

// Import Coming Soon Banner
import { ComingSoonBanner } from './InlineAnalytics';

interface AnalyticsOverlayProps {
    activeView: AnalyticsType;
    onClose: () => void;
}

// Analytics Page Wrapper with Sidebar for Google/Email
function AnalyticsPageWrapper({
    type,
    children
}: {
    type: 'google' | 'email';
    children: React.ReactNode;
}) {
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const titles = {
        google: 'Google Analytics',
        email: 'Email Analytics',
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4 md:p-6">
            {/* Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 transition-opacity"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Slide-in Sidebar */}
            <div className={cn(
                "fixed top-0 left-0 h-full w-72 bg-background border-r z-50 transform transition-transform duration-300 ease-in-out",
                sidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="p-4 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <img src={logo} alt="Sociovia" className="w-6 h-6" />
                        <span className="font-semibold">Analytics</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                <div className="p-3 space-y-1">
                    {/* Analytics Section */}
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Analytics
                    </div>

                    {/* Meta Ads Analytics */}
                    <button
                        onClick={() => { window.location.href = '/dashboard'; }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left"
                    >
                        <Target className="w-4 h-4 text-[#0081FB]" />
                        <span className="text-sm">Meta Ads Analytics</span>
                    </button>

                    {/* WhatsApp Analytics */}
                    <button
                        onClick={() => { navigate('/dashboard?view=whatsapp'); setSidebarOpen(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left"
                    >
                        <MessageCircle className="w-4 h-4 text-[#25D366]" />
                        <span className="text-sm">WhatsApp Analytics</span>
                    </button>

                    {/* Google Analytics */}
                    <button
                        onClick={() => { navigate('/dashboard?view=google'); setSidebarOpen(false); }}
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left relative",
                            type === 'google' ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50"
                        )}
                    >
                        {type === 'google' && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-full" />}
                        <Search className="w-4 h-4 text-[#4285F4]" />
                        <span className="text-sm flex-1">Google Analytics</span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Soon</Badge>
                    </button>

                    {/* Email Analytics */}
                    <button
                        onClick={() => { navigate('/dashboard?view=email'); setSidebarOpen(false); }}
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left relative",
                            type === 'email' ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50"
                        )}
                    >
                        {type === 'email' && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-full" />}
                        <Mail className="w-4 h-4 text-[#EA4335]" />
                        <span className="text-sm flex-1">Email Analytics</span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Soon</Badge>
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4 border-b pb-4">
                    <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
                        <Menu className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                            <img src={logo} alt="Sociovia" className="w-5 h-5 md:w-6 md:h-6" />
                            {titles[type]}
                        </h1>
                        <p className="text-muted-foreground text-xs md:text-sm">Coming Soon</p>
                    </div>
                </div>

                {/* Content */}
                {children}
            </div>
        </div>
    );
}

export function AnalyticsOverlay({ activeView, onClose }: AnalyticsOverlayProps) {
    // Don't show overlay for Meta (it's the default dashboard)
    if (!activeView || activeView === 'meta') {
        return null;
    }

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={activeView}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 z-50 bg-white dark:bg-slate-950"
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                }}
            >
                {/* Solid background layer to ensure complete coverage */}
                <div className="min-h-full bg-white dark:bg-slate-950">
                    <Suspense fallback={
                        <div className="flex items-center justify-center h-full min-h-[400px]">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    }>
                        {activeView === 'whatsapp' && <WhatsAppAnalytics />}
                        {activeView === 'google' && (
                            <AnalyticsPageWrapper type="google">
                                <ComingSoonBanner type="google" />
                            </AnalyticsPageWrapper>
                        )}
                        {activeView === 'email' && (
                            <AnalyticsPageWrapper type="email">
                                <ComingSoonBanner type="email" />
                            </AnalyticsPageWrapper>
                        )}
                    </Suspense>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

export default AnalyticsOverlay;