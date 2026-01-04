/**
 * Dashboard Layout Component
 * ===========================
 * Wrapper layout for all /dashboard/* pages.
 * Provides consistent breadcrumb navigation across dashboard.
 * 
 * Usage:
 * - Wrap dashboard page components with this layout
 * - Breadcrumb auto-generates from current route
 * - Preserves workspace context
 */

import { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { DashboardBreadcrumb } from '@/components/navigation/DashboardBreadcrumb';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
    /** Page content (used when wrapping manually) */
    children?: ReactNode;
    /** Hide the breadcrumb navigation */
    hideBreadcrumb?: boolean;
    /** Additional CSS classes for the container */
    className?: string;
    /** Additional CSS classes for the header */
    headerClassName?: string;
    /** Additional CSS classes for the main content area */
    contentClassName?: string;
}

/**
 * Dashboard layout wrapper that provides:
 * - Sticky breadcrumb header
 * - Consistent page structure
 * - Workspace context preservation
 * 
 * Can be used two ways:
 * 
 * 1. As Route element with Outlet (preferred):
 * ```tsx
 * <Route path="/dashboard" element={<DashboardLayout />}>
 *   <Route index element={<Dashboard />} />
 *   <Route path="whatsapp" element={<WhatsAppDashboard />} />
 * </Route>
 * ```
 * 
 * 2. As wrapper component:
 * ```tsx
 * <Route path="/dashboard/whatsapp" element={
 *   <DashboardLayout>
 *     <WhatsAppDashboard />
 *   </DashboardLayout>
 * } />
 * ```
 */
export function DashboardLayout({
    children,
    hideBreadcrumb = false,
    className,
    headerClassName,
    contentClassName,
}: DashboardLayoutProps) {
    return (
        <div className={cn('min-h-screen bg-background', className)}>
            {/* Sticky Breadcrumb Header */}
            {!hideBreadcrumb && (
                <header
                    className={cn(
                        'sticky top-0 z-40',
                        'border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
                        'px-4 py-2.5 sm:px-6 lg:px-8',
                        headerClassName
                    )}
                >
                    <div className="max-w-7xl mx-auto">
                        <DashboardBreadcrumb />
                    </div>
                </header>
            )}

            {/* Main Content */}
            <main className={cn('', contentClassName)}>
                {/* Render children if provided, otherwise use Outlet for nested routes */}
                {children ?? <Outlet />}
            </main>
        </div>
    );
}

/**
 * Minimal dashboard wrapper - just adds breadcrumb above content.
 * Use this when the page already has its own full layout.
 */
export function DashboardBreadcrumbWrapper({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <>
            <div className={cn(
                'sticky top-0 z-40',
                'border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
                'px-4 py-2.5 sm:px-6 lg:px-8',
                className
            )}>
                <div className="max-w-7xl mx-auto">
                    <DashboardBreadcrumb />
                </div>
            </div>
            {children}
        </>
    );
}

export default DashboardLayout;
