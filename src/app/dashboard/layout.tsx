import Link from "next/link";
export const dynamic = "force-dynamic";
export const revalidate = 0;
import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import { UserNav } from "~/components/layout/user-nav";
import { HeaderQuickActions } from "~/features/dashboard/components/HeaderQuickActions";
import { NativeScrollArea } from "~/components/ui/NativeScrollArea";
import { StabilizedDashboard } from "~/features/dashboard/components/StabilizedDashboard";
import { ConditionalTeamSidebar } from "~/features/dashboard/components/ConditionalTeamSidebar";
import { ConditionalDashboardHeader } from "~/features/dashboard/components/ConditionalDashboardHeader";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();
    if (!session) redirect("/login");

    return (
        <>
            <StabilizedDashboard>
                <header
                    className="flex-shrink-0 flex h-12 w-full items-center bg-[#0f2d40] shadow-md z-[60] relative"
                    style={{ touchAction: "none" }}
                >
                    <ConditionalDashboardHeader>
                        <HeaderQuickActions />
                        <div className="flex items-center border-l border-white/20 pl-3">
                            <UserNav user={session.user} theme="dark" />
                        </div>
                    </ConditionalDashboardHeader>
                </header>

                <div className="flex flex-1 min-h-0 overflow-hidden">
                    <aside
                        className="flex-shrink-0 w-16 flex-col items-center bg-[#008bc5] py-4 text-white shadow-xl z-[55] hidden md:flex overflow-hidden relative"
                        style={{ touchAction: "none" }}
                    >
                        <SidebarLink
                            href="/dashboard"
                            icon={
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                    <path d="M3 9l9-7 9 7" fill="currentColor" fillOpacity={0.6} />
                                    <polyline points="9 22 9 12 15 12 15 22" />
                                </svg>
                            }
                            label="Home"
                        />
                        <SidebarLink
                            href="/dashboard/calendar"
                            icon={
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                    <path d="M3 4h18v4H3z" fill="currentColor" fillOpacity={0.6} />
                                    <line x1="16" y1="2" x2="16" y2="6" />
                                    <line x1="8" y1="2" x2="8" y2="6" />
                                    <line x1="3" y1="10" x2="21" y2="10" />
                                </svg>
                            }
                            label="Calendar"
                        />
                        <div className="w-8 h-px bg-white/10 my-3" />
                        <SidebarLink
                            href="/dashboard/drills"
                            icon={
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                    <path d="M10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685" fill="currentColor" fillOpacity={0.6} strokeWidth="0" />
                                </svg>
                            }
                            label="Drills"
                        />
                        <SidebarLink
                            href="/dashboard/sessions"
                            icon={
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="12 2 2 7 12 12 22 7 12 2" fill="currentColor" fillOpacity={0.6} />
                                    <polyline points="2 17 12 22 22 17" />
                                    <polyline points="2 12 12 17 22 12" />
                                </svg>
                            }
                            label="Sessions"
                        />
                        <SidebarLink
                            href="/dashboard/personal"
                            icon={
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                    <circle cx="12" cy="7" r="4" fill="currentColor" fillOpacity={0.6} />
                                </svg>
                            }
                            label="Personal"
                        />
                    </aside>

                    <ConditionalTeamSidebar />

                    <NativeScrollArea className="flex-1 min-h-0 bg-slate-100 relative flex flex-col z-10 no-scrollbar">
                        <div className="absolute top-0 left-0 w-full h-48 bg-gradient-to-r from-slate-400 to-slate-300 z-0 pointer-events-none">
                            <div className="absolute inset-0 bg-black/10" />
                        </div>
                        <div className="relative z-10 flex-1 flex flex-col">{children}</div>
                    </NativeScrollArea>
                </div>
            </StabilizedDashboard>
        </>
    );
}

function SidebarLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
    return (
        <Link
            href={href}
            className="group flex cursor-pointer flex-col items-center justify-center py-4 w-full transition-all duration-200 hover:bg-[#0077a8]/50"
        >
            <div className="mb-1 text-white/90 group-hover:text-white group-hover:scale-110 transition-transform">
                {icon}
            </div>
            <span className="text-[9px] uppercase font-black tracking-widest opacity-70 group-hover:opacity-100 transition-opacity">
                {label}
            </span>
        </Link>
    );
}
