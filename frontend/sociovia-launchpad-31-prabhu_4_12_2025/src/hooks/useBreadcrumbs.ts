/**
 * useBreadcrumbs Hook
 * ====================
 * Generates breadcrumb navigation items based on current route.
 * Uses centralized route configuration from dashboard/routes.ts.
 * 
 * @example
 * const { breadcrumbs, isRootDashboard } = useBreadcrumbs();
 * // breadcrumbs: [{ label: 'Dashboard', path: '/dashboard' }, { label: 'WhatsApp', path: '/dashboard/whatsapp' }]
 */

import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
    DASHBOARD_ROUTES,
    getRouteKeyByPath,
    buildBreadcrumbChain,
    type RouteConfig
} from '@/dashboard/routes';

export interface BreadcrumbItem {
    label: string;
    path: string;
    isCurrentPage: boolean;
}

export interface UseBreadcrumbsResult {
    /** Ordered list of breadcrumb items from root to current page */
    breadcrumbs: BreadcrumbItem[];
    /** True if user is on the root /dashboard page */
    isRootDashboard: boolean;
    /** True if current route is recognized in DASHBOARD_ROUTES */
    isKnownRoute: boolean;
}

/**
 * Hook to generate breadcrumb navigation items from current route.
 * 
 * Features:
 * - Auto-detects current route from useLocation()
 * - Builds parent chain using route configuration
 * - Handles dynamic routes (e.g., /dashboard/whatsapp/flows/123)
 * - Never throws - returns graceful fallback for unknown routes
 */
export function useBreadcrumbs(): UseBreadcrumbsResult {
    const location = useLocation();
    const pathname = location.pathname;

    return useMemo(() => {
        // Check if on root dashboard
        if (pathname === '/dashboard' || pathname === '/dashboard/') {
            return {
                breadcrumbs: [{
                    label: 'Dashboard',
                    path: '/dashboard',
                    isCurrentPage: true,
                }],
                isRootDashboard: true,
                isKnownRoute: true,
            };
        }

        // Try to find route key for current path
        const routeKey = getRouteKeyByPath(pathname);

        if (!routeKey) {
            // Unknown route - still show Dashboard as fallback
            // Generate breadcrumb from path segments
            return generateFallbackBreadcrumbs(pathname);
        }

        // Build breadcrumb chain from route configuration
        const chain = buildBreadcrumbChain(routeKey);

        // Convert to breadcrumb items
        const breadcrumbs: BreadcrumbItem[] = chain.map((route, index) => ({
            label: route.label,
            // For dynamic routes, use the actual pathname for the current page
            path: index === chain.length - 1 ? pathname : route.path,
            isCurrentPage: index === chain.length - 1,
        }));

        return {
            breadcrumbs,
            isRootDashboard: false,
            isKnownRoute: true,
        };
    }, [pathname]);
}

/**
 * Generate fallback breadcrumbs for unknown routes.
 * Parses path segments and capitalizes them.
 */
function generateFallbackBreadcrumbs(pathname: string): UseBreadcrumbsResult {
    const segments = pathname.split('/').filter(Boolean);

    // Ensure we start with dashboard
    if (segments[0] !== 'dashboard') {
        return {
            breadcrumbs: [{
                label: 'Dashboard',
                path: '/dashboard',
                isCurrentPage: false,
            }],
            isRootDashboard: false,
            isKnownRoute: false,
        };
    }

    const breadcrumbs: BreadcrumbItem[] = [];
    let currentPath = '';

    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        currentPath += `/${segment}`;

        // Try to get label from route config
        const routeConfig = (Object.values(DASHBOARD_ROUTES) as RouteConfig[]).find(r => r.path === currentPath);

        breadcrumbs.push({
            label: routeConfig?.label ?? formatSegmentLabel(segment),
            path: currentPath,
            isCurrentPage: i === segments.length - 1,
        });
    }

    return {
        breadcrumbs,
        isRootDashboard: false,
        isKnownRoute: false,
    };
}

/**
 * Format a path segment as a readable label.
 * e.g., 'whatsapp-inbox' -> 'Whatsapp Inbox'
 */
function formatSegmentLabel(segment: string): string {
    // Skip numeric IDs
    if (/^\d+$/.test(segment)) {
        return `#${segment}`;
    }

    return segment
        .split(/[-_]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}
