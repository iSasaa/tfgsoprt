import Link from "next/link";
import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import { UserNav } from "~/components/user-nav";
import { DashboardHeader } from "~/components/dashboard-header-controls";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    if (!session) {
        redirect("/login");
    }

    return (
        <div className="flex h-screen flex-col bg-[#f0f2f5] font-sans text-slate-900">
            {/* TOP NAVIGATION BAR (dark teal/slate) */}
            <header className="flex h-12 w-full items-center bg-[#0f2d40] shadow-md z-50">
                <DashboardHeader>
                    <Link
                        href="/dashboard/boards/new"
                        className="flex items-center gap-2 rounded bg-[#00a0e3] px-4 py-1.5 text-xs font-bold uppercase text-white hover:bg-[#008bc5] shadow-sm ml-2"
                    >
                        <span>✎</span> Create
                    </Link>

                    {/* User Nav */}
                    <div className="flex items-center border-l border-white/20 pl-3">
                        <UserNav user={session.user} theme="dark" />
                    </div>
                </DashboardHeader>
            </header>

            {/* MAIN WORKSPACE (Flex container below header) */}
            <div className="flex flex-1 overflow-hidden">

                {/* 1. ICON SIDEBAR (Leftmost, thin, blue/brand color) */}
                <aside className="w-16 flex-col items-center bg-[#008bc5] py-4 text-white shadow-xl z-40 hidden md:flex">
                    <SidebarIcon icon="🏠" label="Home" active />
                    <SidebarIcon icon="📋" label="Drills" />
                    <SidebarIcon icon="📅" label="Plans" />
                    <SidebarIcon icon="👥" label="Team" />
                    <div className="mt-auto mb-4">
                        <SidebarIcon icon="⚙️" label="Settings" />
                    </div>
                </aside>

                {/* 2. INFO SIDEBAR (White panel, "Activity" & "My Team") */}
                <aside className="w-64 flex-col border-r border-slate-200 bg-white shadow-sm z-30 hidden lg:flex">
                    {/* Tabs simulate the mockup */}
                    <div className="flex border-b border-slate-200 text-xs font-bold text-slate-500">
                        <div className="flex-1 cursor-pointer border-b-2 border-orange-500 py-3 text-center text-slate-800">
                            My Team
                        </div>
                        <div className="flex-1 cursor-pointer py-3 text-center hover:bg-slate-50">
                            Activity
                        </div>
                    </div>

                    <div className="p-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-700">My Team</h3>
                            <span className="text-xs text-orange-500 hover:underline cursor-pointer">Manage</span>
                        </div>

                        <div className="mt-6 flex flex-col items-center justify-center space-y-2 py-8 border-2 border-dashed border-slate-200 rounded-lg">
                            <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 font-bold text-xl">
                                +
                            </div>
                            <p className="text-xs text-slate-400">Add Members</p>
                        </div>
                    </div>

                    <div className="flex-1 bg-slate-50 p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-slate-700">Activity</h3>
                            <span className="text-slate-400">?</span>
                        </div>
                        <div className="text-center text-xs text-slate-400 mt-10">
                            <p>Start building your private coaching network.</p>
                            <button className="mt-4 rounded-full bg-orange-400 px-6 py-2 text-white font-bold shadow-lg hover:bg-orange-500">
                                BUILD TEAM
                            </button>
                        </div>
                    </div>
                </aside>

                {/* 3. MAIN CONTENT AREA */}
                <main className="flex-1 overflow-y-auto bg-slate-100 relative">
                    {/* Background Banner Image Shim */}
                    <div className="absolute top-0 left-0 w-full h-48 bg-gradient-to-r from-slate-400 to-slate-300 z-0">
                        {/* This mimics the "Hockey Home" banner background until we put a real image */}
                        <div className="absolute inset-0 bg-black/10"></div>
                    </div>

                    <div className="relative z-10">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}

function SidebarIcon({ icon, label, active }: { icon: string; label: string; active?: boolean }) {
    return (
        <div className={`flex cursor-pointer flex-col items-center justify-center py-3 w-full transition-colors ${active ? 'bg-[#0077a8]' : 'hover:bg-[#0077a8]'}`}>
            <span className="text-xl mb-1">{icon}</span>
            <span className="text-[10px] uppercase font-bold tracking-wide opacity-90">{label}</span>
        </div>
    );
}
