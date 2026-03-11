import Link from "next/link";
import { api } from "~/trpc/server";
import { DrillCard } from "~/features/dashboard/components/DrillCard";

function timeAgo(date: Date): string {
    const now = new Date();
    const diff = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
    if (diff < 60) return "ara mateix";
    if (diff < 3600) return `fa ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `fa ${Math.floor(diff / 3600)}h`;
    return `fa ${Math.floor(diff / 86400)} dies`;
}

export default async function BoardsPage() {
    const boards = await api.board.getAll();

    return (
        <div className="min-h-screen pb-12">
            {/* Header */}
            <div className="relative h-48 w-full px-8 flex items-center overflow-hidden">
                <div className="relative z-10">
                    <div className="flex items-center gap-2">
                        <div className="h-12 w-2 bg-orange-400 transform -skew-x-12"></div>
                        <h1 className="text-5xl font-extrabold uppercase text-white tracking-tighter italic drop-shadow-lg">
                            My <br />
                            <span className="text-orange-400">Drills</span>
                        </h1>
                    </div>
                </div>
                <Link
                    href="/dashboard/boards/new"
                    className="absolute right-8 bottom-8 flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-orange-600 transition-colors"
                >
                    ✎ New Board
                </Link>
            </div>

            <div className="px-6 mt-8">
                {boards.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white py-20 text-center">
                        <div className="text-5xl mb-4">📋</div>
                        <h2 className="text-xl font-bold text-slate-700 mb-2">No boards yet</h2>
                        <p className="text-slate-400 text-sm mb-6">Create your first tactical board to get started.</p>
                        <Link
                            href="/dashboard/boards/new"
                            className="rounded-lg bg-orange-500 px-6 py-3 font-bold text-white hover:bg-orange-600 transition-colors"
                        >
                            Create Board
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {boards.map((board) => (
                            <DrillCard
                                key={board.id}
                                title={board.title}
                                category={board.sport.toUpperCase()}
                                href={`/whiteboard/${board.id}`}
                                subtitle={timeAgo(board.updatedAt)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
