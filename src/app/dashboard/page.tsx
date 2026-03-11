import Link from "next/link";
import { api } from "~/trpc/server";
import { DrillCard } from "~/features/dashboard/components/DrillCard";
import { SessionCard } from "~/features/dashboard/components/SessionCard";

function timeAgo(date: Date): string {
    const now = new Date();
    const diff = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
    if (diff < 60) return "ara mateix";
    if (diff < 3600) return `fa ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `fa ${Math.floor(diff / 3600)}h`;
    return `fa ${Math.floor(diff / 86400)} dies`;
}

export default async function DashboardPage() {
    const [recentBoards, recentSessions] = await Promise.all([
        api.board.getRecent(),
        api.session.getRecent(),
    ]);

    return (
        <div className="min-h-screen pb-12">

            {/* HERO BANNER */}
            <div className="relative h-48 w-full px-8 flex items-center overflow-hidden">
                <div className="relative z-10">
                    <div className="flex items-center gap-2">
                        <div className="h-12 w-2 bg-orange-400 transform -skew-x-12"></div>
                        <h1 className="text-5xl font-extrabold uppercase text-white tracking-tighter italic drop-shadow-lg">
                            Hockey <br />
                            <span className="text-orange-400">Home</span>
                        </h1>
                    </div>
                </div>
            </div>

            <div className="px-6 mt-8">

                {/* SECTION 1: Recent Exercises */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <span className="text-2xl font-bold text-slate-700">↺ Recent Exercises</span>
                        <Link href="/dashboard/boards" className="text-sm font-bold text-orange-500 hover:underline">
                            View all drills
                        </Link>
                    </div>

                    <div className="flex gap-4 overflow-x-auto pb-6 px-2 scrollbar-hide">
                        {recentBoards.length === 0 ? (
                            <div className="flex w-full items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-12 text-slate-400 text-sm">
                                No recent exercises yet —{" "}
                                <Link href="/dashboard/boards/new" className="ml-1 font-bold text-orange-500 hover:underline">
                                    create your first board!
                                </Link>
                            </div>
                        ) : (
                            recentBoards.map((board) => (
                                <DrillCard
                                    key={board.id}
                                    title={board.title}
                                    category={board.sport.toUpperCase()}
                                    href={`/whiteboard/${board.id}`}
                                    subtitle={timeAgo(board.updatedAt)}
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* SECTION 2: Recent Training Sessions */}
                <div>
                    <div className="flex items-center justify-between mb-4 px-2">
                        <span className="text-2xl font-bold text-slate-700">↺ Recent Training Sessions</span>
                        <Link href="/dashboard/plans" className="text-sm font-bold text-orange-500 hover:underline">
                            View all plans
                        </Link>
                    </div>

                    <div className="flex gap-4 overflow-x-auto pb-6 px-2 scrollbar-hide">
                        {recentSessions.length === 0 ? (
                            <div className="flex w-full items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-12 text-slate-400 text-sm">
                                No training sessions yet —{" "}
                                <Link href="/dashboard/plans" className="ml-1 font-bold text-orange-500 hover:underline">
                                    plan your first session!
                                </Link>
                            </div>
                        ) : (
                            recentSessions.map((s) => (
                                <SessionCard
                                    key={s.id}
                                    id={s.id}
                                    title={s.title}
                                    sport={s.sport}
                                    date={s.date}
                                    boardCount={s._count.boards}
                                />
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}