import Link from "next/link";
import { auth } from "~/server/auth";
import { redirect } from "next/navigation";

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
        <div className="flex h-screen bg-[#0f1016] text-white">
            {/* Sidebar */}
            <aside className="w-64 border-r border-white/10 bg-[#15162c] flex flex-col">
                <div className="p-6 border-b border-white/10">
                    <Link href="/dashboard" className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                        SmartBoard
                    </Link>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <SidebarItem href="/dashboard" icon="🏠">Dashboard</SidebarItem>
                    <SidebarItem href="/dashboard/boards" icon="📋">My Tactics</SidebarItem>
                    <SidebarItem href="/dashboard/training" icon="📅">Training</SidebarItem>
                    <SidebarItem href="/dashboard/settings" icon="⚙️">Settings</SidebarItem>
                </nav>

                <div className="p-4 border-t border-white/10">
                    <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-white/5">
                        <div className="w-8 h-8 rounded-full bg-purple-500/50 flex items-center justify-center text-sm font-bold">
                            {session.user.name?.[0] ?? "U"}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{session.user.name}</p>
                            <p className="text-xs text-gray-400 truncate">{session.user.email}</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                <div className="container mx-auto p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}

function SidebarItem({ href, icon, children }: { href: string; icon: string; children: React.ReactNode }) {
    return (
        <Link
            href={href}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
        >
            <span className="text-xl">{icon}</span>
            <span className="font-medium">{children}</span>
        </Link>
    );
}
