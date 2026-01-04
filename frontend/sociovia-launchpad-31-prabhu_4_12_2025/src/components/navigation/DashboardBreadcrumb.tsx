/**
 * Dashboard Breadcrumb Navigation Component
 * ==========================================
 * Context-aware breadcrumb that appears on all /dashboard/* pages.
 * Auto-generates navigation chain from current route.
 * 
 * Features:
 * - Uses shadcn/ui breadcrumb primitives
 * - SPA navigation (no page reloads)
 * - Mobile-responsive with truncation
 * - Accessible (ARIA roles)
 * - Preserves workspace context
 */

import { Link, useNavigate } from 'react-router-dom';
import { Fragment } from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface DashboardBreadcrumbProps {
    /** Additional CSS classes */
    className?: string;
    /** Show home icon for dashboard root */
    showHomeIcon?: boolean;
}

/**
 * Breadcrumb navigation component for dashboard pages.
 * Automatically generates breadcrumb trail from current route.
 * 
 * @example
 * // In DashboardLayout:
 * <DashboardBreadcrumb />
 * 
 * // Result on /dashboard/whatsapp/flows/new:
 * Dashboard > WhatsApp > Flows > New Flow
 */
export function DashboardBreadcrumb({
    className,
    showHomeIcon = true,
}: DashboardBreadcrumbProps) {
    const { breadcrumbs, isRootDashboard } = useBreadcrumbs();
    const navigate = useNavigate();

    // Don't show breadcrumb on root dashboard (just "Dashboard" alone is not useful)
    if (isRootDashboard) {
        return null;
    }

    // If only one item (shouldn't happen except on root), don't show
    if (breadcrumbs.length <= 1) {
        return null;
    }

    const handleClick = (path: string, e: React.MouseEvent) => {
        e.preventDefault();
        // Use navigate for SPA navigation - preserves React state and storage
        navigate(path);
    };

    return (
        <Breadcrumb className={cn('', className)}>
            <BreadcrumbList className="flex-wrap gap-1 sm:gap-1.5">
                {breadcrumbs.map((crumb, index) => {
                    const isFirst = index === 0;
                    const isLast = crumb.isCurrentPage;

                    return (
                        <Fragment key={crumb.path}>
                            {/* Separator (not before first item) */}
                            {index > 0 && (
                                <BreadcrumbSeparator className="mx-1 sm:mx-2">
                                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/70" />
                                </BreadcrumbSeparator>
                            )}

                            <BreadcrumbItem className="flex items-center">
                                {isLast ? (
                                    // Current page - not clickable
                                    <BreadcrumbPage className="font-medium text-foreground max-w-[150px] sm:max-w-none truncate">
                                        {crumb.label}
                                    </BreadcrumbPage>
                                ) : (
                                    // Clickable link
                                    <BreadcrumbLink asChild>
                                        <a
                                            href={crumb.path}
                                            onClick={(e) => handleClick(crumb.path, e)}
                                            className={cn(
                                                'flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors',
                                                'max-w-[100px] sm:max-w-none truncate'
                                            )}
                                        >
                                            {isFirst && showHomeIcon && (
                                                <Home className="h-3.5 w-3.5 shrink-0" />
                                            )}
                                            <span className={cn(isFirst && showHomeIcon && 'hidden sm:inline')}>
                                                {crumb.label}
                                            </span>
                                        </a>
                                    </BreadcrumbLink>
                                )}
                            </BreadcrumbItem>
                        </Fragment>
                    );
                })}
            </BreadcrumbList>
        </Breadcrumb>
    );
}

/**
 * Compact breadcrumb variant for mobile or space-constrained areas.
 * Shows: Dashboard > ... > Current Page
 */
export function DashboardBreadcrumbCompact({ className }: { className?: string }) {
    const { breadcrumbs, isRootDashboard } = useBreadcrumbs();
    const navigate = useNavigate();

    if (isRootDashboard || breadcrumbs.length <= 1) {
        return null;
    }

    const first = breadcrumbs[0];
    const current = breadcrumbs[breadcrumbs.length - 1];
    const hasMiddle = breadcrumbs.length > 2;

    return (
        <Breadcrumb className={cn('', className)}>
            <BreadcrumbList>
                {/* Dashboard link */}
                <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                        <a
                            href={first.path}
                            onClick={(e) => {
                                e.preventDefault();
                                navigate(first.path);
                            }}
                            className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                        >
                            <Home className="h-3.5 w-3.5" />
                        </a>
                    </BreadcrumbLink>
                </BreadcrumbItem>

                <BreadcrumbSeparator>
                    <ChevronRight className="h-3.5 w-3.5" />
                </BreadcrumbSeparator>

                {/* Ellipsis for middle items */}
                {hasMiddle && (
                    <>
                        <BreadcrumbItem>
                            <span className="text-muted-foreground">...</span>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator>
                            <ChevronRight className="h-3.5 w-3.5" />
                        </BreadcrumbSeparator>
                    </>
                )}

                {/* Current page */}
                <BreadcrumbItem>
                    <BreadcrumbPage className="font-medium truncate max-w-[150px]">
                        {current.label}
                    </BreadcrumbPage>
                </BreadcrumbItem>
            </BreadcrumbList>
        </Breadcrumb>
    );
}

export default DashboardBreadcrumb;
