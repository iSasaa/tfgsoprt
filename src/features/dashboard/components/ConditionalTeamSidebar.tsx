"use client";

import { usePathname } from "next/navigation";
import { SidebarRoster } from "~/features/dashboard/components/SidebarRoster";
import { NativeScrollArea } from "~/components/ui/NativeScrollArea";

/** Renders the Team roster sidebar, hidden when on /dashboard/personal */
export function ConditionalTeamSidebar() {
    const pathname = usePathname();
    const isHiddenRoute = pathname === "/dashboard/personal" || pathname === "/dashboard/profile";
    if (isHiddenRoute) return null;

    return (
        <aside className="flex-shrink-0 w-64 flex-col border-r border-slate-200 bg-white shadow-sm z-30 hidden md:flex overflow-hidden">
            <div className="flex-shrink-0 flex h-8 items-center justify-center border-b border-slate-200 bg-slate-50/50">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Team
                </span>
            </div>
            <NativeScrollArea className="flex-1 min-h-0 no-scrollbar">
                <SidebarRoster />
            </NativeScrollArea>
        </aside>
    );
}
