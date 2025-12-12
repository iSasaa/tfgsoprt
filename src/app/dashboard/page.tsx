import Link from "next/link";
import { auth } from "~/server/auth";
import { UserNav } from "~/components/user-nav"; // <--- Importa el component que hem creat

export default async function DashboardPage() {
    const session = await auth();

    return (
        <div className="min-h-screen bg-[#536575] p-8 text-white">
            <div className="mx-auto max-w-6xl space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
                        <p className="text-slate-300">Welcome back, Coach.</p>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Aquí posem el nou botó d'usuari */}
                        <UserNav user={session?.user} />

                        {/* Botó d'acció principal */}
                        <Link
                            href="/dashboard/boards/new"
                            className="flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-2.5 font-bold text-white shadow-lg shadow-orange-500/20 transition-all hover:bg-orange-600"
                        >
                            <span>+</span> New Tactic
                        </Link>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    <StatCard
                        title="Total Tactics"
                        value="12"
                        gradient="from-blue-500/20 to-blue-600/5"
                        borderColor="border-blue-500/30"
                    />
                    <StatCard
                        title="Upcoming Sessions"
                        value="3"
                        gradient="from-green-500/20 to-green-600/5"
                        borderColor="border-green-500/30"
                    />
                    <StatCard
                        title="Team Members"
                        value="24"
                        gradient="from-orange-500/20 to-orange-600/5"
                        borderColor="border-orange-500/30"
                    />
                </div>

                {/* Recent Activity */}
                <div>
                    <h2 className="mb-4 text-xl font-bold text-white">Recent Tactics</h2>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        <BoardCard title="Power Play Setup" sport="Hockey" date="2 hours ago" />
                        <BoardCard title="Defensive Box" sport="Hockey" date="Yesterday" />
                        <BoardCard title="Corner Kick Routine" sport="Football" date="3 days ago" />
                    </div>
                </div>
            </div>
        </div>
    );
}

// Components StatCard i BoardCard es mantenen igual...
function StatCard({ title, value, gradient, borderColor }: { title: string; value: string; gradient: string, borderColor: string }) {
    return (
        <div className={`rounded-xl border ${borderColor} bg-gradient-to-br ${gradient} p-6 backdrop-blur-sm`}>
            <p className="text-sm font-medium text-slate-300">{title}</p>
            <p className="mt-2 text-3xl font-bold text-white">{value}</p>
        </div>
    );
}

function BoardCard({ title, sport, date }: { title: string; sport: string; date: string }) {
    return (
        <div className="group cursor-pointer rounded-xl border border-white/10 bg-[#465663] p-5 transition-all hover:border-orange-400/50 hover:bg-[#3e4d59]">
            <div className="mb-4 flex aspect-video items-center justify-center rounded-lg bg-black/20 text-slate-400 shadow-inner">
                <span className="text-sm font-medium">Preview</span>
            </div>
            <h3 className="text-lg font-semibold text-white transition-colors group-hover:text-orange-300">
                {title}
            </h3>
            <div className="mt-2 flex items-center justify-between">
                <span className="rounded bg-white/10 px-2 py-1 text-xs font-medium text-slate-300">
                    {sport}
                </span>
                <span className="text-xs text-slate-400">{date}</span>
            </div>
        </div>
    );
}