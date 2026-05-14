"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { DashboardHeader } from "~/components/layout/dashboard-header-controls";

interface Props {
    children: React.ReactNode;
}

/**
 * Client component. On /dashboard/personal shows logo + children only (no selectors).
 * On all other routes wraps the full DashboardHeader with sport/club/team selectors.
 */
export function ConditionalDashboardHeader({ children }: Props) {
    const pathname = usePathname();

    const isHiddenRoute = pathname === "/dashboard/personal" || pathname === "/dashboard/profile";

    if (isHiddenRoute) {
        return (
            <div className="flex w-full items-center justify-between px-4 text-white">
                <Link href="/dashboard" className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 font-bold text-white">
                        T
                    </div>
                    <span className="text-lg font-bold tracking-tight">
                        Tactix<span className="text-orange-400 italic">Pro</span>
                    </span>
                </Link>
                <div className="flex items-center gap-3">
                    {children}
                </div>
            </div>
        );
    }

    return <DashboardHeader>{children}</DashboardHeader>;
}
