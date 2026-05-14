"use client";

import { format } from "date-fns";
import Link from "next/link";
import { api } from "~/trpc/react";
import { useDashboard } from "~/context/DashboardContext";
import { DrillCard, DrillCardSkeleton } from "~/features/dashboard/components/DrillCard";
import { SessionCard, SessionCardSkeleton } from "~/features/dashboard/components/SessionCard";
import { useQuickCreate } from "~/features/dashboard/hooks/useQuickCreate";
import { QuickCreateModal } from "~/features/dashboard/components/QuickCreateModal";
import { ItemContextMenu } from "~/features/dashboard/components/ItemContextMenu";
import { MoveToModal } from "~/features/dashboard/components/MoveToModal";
import { useState, useEffect } from "react";
import type { ItemType } from "~/features/dashboard/components/ItemOptionsModal";

function timeAgo(date: Date): string {
    const now = new Date();
    const diff = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
    if (diff < 60) return "ara mateix";
    if (diff < 3600) return `fa ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `fa ${Math.floor(diff / 3600)}h`;
    return `fa ${Math.floor(diff / 86400)} dies`;
}

export default function DashboardPage() {
    const { selectedSport: activeSport, selectedTeamId } = useDashboard();

    // Inline rename state
    const [renamingItemId, setRenamingItemId] = useState<string | null>(null);

    // Dropdown menu state
    const [contextMenuState, setContextMenuState] = useState<{
        isOpen: boolean;
        x: number;
        y: number;
        itemId: string | null;
        itemType: ItemType | null;
        isFavorite: boolean;
        title: string;
    }>({ isOpen: false, x: 0, y: 0, itemId: null, itemType: null, isFavorite: false, title: "" });

    // Move to modal state
    const [moveToModalState, setMoveToModalState] = useState<{
        isOpen: boolean;
        itemId: string | null;
        itemType: ItemType | null;
    }>({ isOpen: false, itemId: null, itemType: null });

    const utils = api.useUtils();

    // Auto-refresh data on mount to ensure synchronization
    useEffect(() => {
        void utils.calendar.getDashboardData.invalidate();
        void utils.board.getRecent.invalidate();
        void utils.session.getRecent.invalidate();
    }, [utils]);

    // Favorite mutations
    const toggleFavBoard = api.board.toggleFavorite.useMutation({
        onSuccess: (updated) => {
            utils.calendar.getDashboardData.invalidate();
            utils.board.getRecent.invalidate();
        }
    });
    const toggleFavSession = api.session.toggleFavorite.useMutation({
        onSuccess: (updated) => {
            utils.calendar.getDashboardData.invalidate();
            utils.session.getRecent.invalidate();
        }
    });

    // Rename mutations
    const renameBoard = api.board.updateMetadata.useMutation({
        onSuccess: () => utils.calendar.getDashboardData.invalidate()
    });
    const renameSession = api.session.updateMetadata.useMutation({
        onSuccess: () => utils.calendar.getDashboardData.invalidate()
    });

    // Move mutations
    const moveBoard = api.board.updateMetadata.useMutation({
        onSuccess: () => utils.calendar.getDashboardData.invalidate()
    });
    const moveSession = api.session.updateMetadata.useMutation({
        onSuccess: () => utils.calendar.getDashboardData.invalidate()
    });

    const handleRenameSubmit = (id: string, type: ItemType, newName: string, originalName: string) => {
        setRenamingItemId(null);
        if (!newName.trim() || newName === originalName) return;

        if (type === "board") renameBoard.mutate({ id, title: newName });
        else if (type === "session") renameSession.mutate({ id, title: newName });
    };

    const { data: globalBoards = [], isLoading: loadingGlobalBoards } = api.board.getRecent.useQuery({
        sport: activeSport ?? undefined
    }, { enabled: !selectedTeamId });
    const { data: globalSessions = [], isLoading: loadingGlobalSessions } = api.session.getRecent.useQuery({
        sport: activeSport ?? undefined
    }, { enabled: !selectedTeamId });

    const { data: dashboardData, isLoading: loadingDashboard } = api.calendar.getDashboardData.useQuery(
        { teamId: selectedTeamId || undefined, sport: activeSport || undefined },
        { enabled: !!selectedTeamId }
    );

    const {
        handleCreateDrill,
        handleCreateSession,
        openDrillModal,
        openSessionModal,
        closeModal,
        modalState,
        isPending
    } = useQuickCreate();

    const sportName = activeSport ? (activeSport.charAt(0).toUpperCase() + activeSport.slice(1).toLowerCase()) : "Drill";

    return (
        <div className="h-full pb-12">

            <div className="relative h-48 w-full px-8 flex items-center overflow-hidden">
                <div className="relative z-10">
                    <div className="flex items-center gap-2">
                        <div className="h-12 w-2 bg-orange-400 transform -skew-x-12"></div>
                        <h1 className="text-5xl font-extrabold uppercase text-white tracking-tighter italic drop-shadow-lg">
                            {sportName} <br />
                            <span className="text-orange-400">Dashboard</span>
                        </h1>
                    </div>
                </div>
            </div>

            <div className="px-6 mt-8">

                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4 px-0">
                        <span className="text-2xl font-bold text-slate-700 italic uppercase tracking-tighter flex items-center gap-3">
                            <span className="h-2 w-2 rounded-full bg-orange-500"></span>
                            {selectedTeamId ? (
                                dashboardData?.nextSession
                                    ? `Next Up: ${dashboardData.nextSession.title}`
                                    : "No Sessions Planned"
                            ) : "Recent Drills"}
                        </span>
                        <div className="flex items-center gap-4">
                            {selectedTeamId && dashboardData?.nextSession && (
                                <Link
                                    href={`/dashboard/calendar/session/${format(new Date(dashboardData.nextSession.date), "yyyy-MM-dd")}/${dashboardData.nextSession.id}`}
                                    className="text-sm font-bold text-slate-400 hover:text-orange-500 hover:underline transition-colors"
                                >
                                    Open Session
                                </Link>
                            )}
                            <Link href="/dashboard/drills" className="text-sm font-bold text-slate-400 hover:text-orange-500 hover:underline transition-colors">
                                View all drills
                            </Link>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pb-6 px-0 w-full">
                        {(selectedTeamId ? loadingDashboard : loadingGlobalBoards) ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <DrillCardSkeleton key={i} />
                            ))
                        ) : (selectedTeamId ? (dashboardData?.nextSession?.drills ?? []) : globalBoards).length === 0 ? (
                            <div className="flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-8 px-4 text-center">
                                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 shadow-inner">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                    </svg>
                                </div>
                                <h3 className="text-sm font-bold text-slate-800 tracking-tight">
                                    {selectedTeamId ? "No exercises planned" : "Your repository is empty"}
                                </h3>
                                <p className="mb-4 mt-0.5 max-w-[280px] text-xs text-slate-400">
                                    {selectedTeamId
                                        ? "No drills yet. Add some from the calendar."
                                        : "Start building your strategy library."}
                                </p>
                                {!selectedTeamId && (
                                    <button
                                        onClick={openDrillModal}
                                        disabled={isPending}
                                        className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-orange-500/30 transition-all hover:bg-orange-600 hover:scale-105 active:scale-95 disabled:opacity-50"
                                    >
                                        {isPending ? "Preparing..." : "Create First Drill"}
                                    </button>
                                )}
                            </div>
                        ) : (
                            ((selectedTeamId ? (dashboardData?.nextSession?.drills ?? []) : globalBoards) as any[]).map((board: any) => (
                                <DrillCard
                                    key={board.id}
                                    id={board.boardId || board.id}
                                    title={board.localTitle || board.title}
                                    category={board.sport?.toUpperCase() || (activeSport?.toUpperCase() ?? "DRILL")}
                                    href={`/whiteboard/${board.id}${selectedTeamId ? "?isSession=true&" : "?"}returnTo=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname + window.location.search : '')}`}
                                    subtitle={board.durationMin ? `${board.durationMin} min` : timeAgo(board.updatedAt)}
                                    boardData={board.boardData || board.data}
                                    isFavorite={board.isFavorite}
                                    onOptionsClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setContextMenuState({
                                            isOpen: true,
                                            x: e.clientX,
                                            y: e.clientY,
                                            itemId: board.boardId || board.id,
                                            itemType: "board",
                                            isFavorite: board.isFavorite ?? false,
                                            title: board.localTitle || board.title
                                        });
                                    }}
                                    onToggleFavorite={() => {
                                        toggleFavBoard.mutate({ id: board.boardId || board.id, isFavorite: !(board.isFavorite ?? false) });
                                    }}
                                    isRenaming={renamingItemId === (board.boardId || board.id)}
                                    onRenameSubmit={(newName) => handleRenameSubmit(board.boardId || board.id, "board", newName, board.localTitle || board.title)}
                                />
                            ))
                        )}
                    </div>
                </div>

                <div>
                    <div className="flex items-center justify-between mb-4 px-0">
                        <span className="text-2xl font-bold text-slate-700 italic uppercase tracking-tighter flex items-center gap-3">
                            <span className="h-2 w-2 rounded-full bg-orange-500"></span>
                            {selectedTeamId ? "Past Activity" : "Recent Sessions"}
                        </span>
                        <Link href="/dashboard/sessions" className="text-sm font-bold text-slate-400 hover:text-orange-500 hover:underline transition-colors">
                            View all Sessions
                        </Link>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pb-6 px-0 w-full">
                        {(selectedTeamId ? loadingDashboard : loadingGlobalSessions) ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <SessionCardSkeleton key={i} />
                            ))
                        ) : (selectedTeamId ? (dashboardData?.pastSessions ?? []) : globalSessions).length === 0 ? (
                            <div className="flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-8 px-4 text-center">
                                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 shadow-inner">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                                    </svg>
                                </div>
                                <h3 className="text-sm font-bold text-slate-800 tracking-tight">
                                    {selectedTeamId ? "No past sessions yet" : "No sessions found"}
                                </h3>
                                <p className="mb-4 mt-0.5 max-w-[280px] text-xs text-slate-400">
                                    {selectedTeamId
                                        ? "No history yet. Your sessions will appear here."
                                        : "Start planning your season."}
                                </p>
                                {!selectedTeamId && (
                                    <button
                                        onClick={openSessionModal}
                                        disabled={isPending}
                                        className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-slate-900/20 transition-all hover:bg-slate-900 hover:scale-105 active:scale-95 disabled:opacity-50"
                                    >
                                        {isPending ? "Scheduling..." : "Schedule Session"}
                                    </button>
                                )}
                            </div>
                        ) : (
                            ((selectedTeamId ? dashboardData?.pastSessions : globalSessions) as any[]).map((s: any) => (
                                <SessionCard
                                    key={s.id}
                                    id={s.id}
                                    title={s.title}
                                    sport={s.sport}
                                    notes={s.notes || (s.date ? format(new Date(s.date), "dd/MM/yyyy") : "")}
                                    boardCount={s.drills?.length ?? s._count?.boards ?? 0}
                                    firstBoardData={s.drills?.[0]?.boardData ?? s.firstBoardData}
                                    isFavorite={s.isFavorite}
                                    href={s.id ? (s.date ? `/dashboard/calendar/session/${format(new Date(s.date), "yyyy-MM-dd")}/${s.id}` : `/dashboard/sessions/${s.id}`) : "#"}
                                    onOptionsClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setContextMenuState({
                                            isOpen: true,
                                            x: e.clientX,
                                            y: e.clientY,
                                            itemId: s.id,
                                            itemType: "session",
                                            isFavorite: s.isFavorite ?? false,
                                            title: s.title
                                        });
                                    }}
                                    onToggleFavorite={() => {
                                        toggleFavSession.mutate({ id: s.id, isFavorite: !(s.isFavorite ?? false) });
                                    }}
                                    isRenaming={renamingItemId === s.id}
                                    onRenameSubmit={(newName) => handleRenameSubmit(s.id, "session", newName, s.title)}
                                />
                            ))
                        )}
                    </div>
                </div>
            </div>

            <QuickCreateModal
                isOpen={modalState.isOpen}
                onClose={closeModal}
                onConfirm={modalState.type === "drill" ? handleCreateDrill : handleCreateSession}
                type={modalState.type}
                sport={activeSport ?? ""}
                isPending={isPending}
            />

            <ItemContextMenu
                isOpen={contextMenuState.isOpen}
                onClose={() => setContextMenuState(prev => ({ ...prev, isOpen: false }))}
                x={contextMenuState.x}
                y={contextMenuState.y}
                itemId={contextMenuState.itemId}
                itemType={contextMenuState.itemType}
                isFavorite={contextMenuState.isFavorite}
                onRename={() => {
                    if (contextMenuState.itemId && contextMenuState.itemType) {
                        setRenamingItemId(contextMenuState.itemId);
                    }
                }}
                onMove={() => {
                    if (contextMenuState.itemId && contextMenuState.itemType) {
                        setMoveToModalState({
                            isOpen: true,
                            itemId: contextMenuState.itemId,
                            itemType: contextMenuState.itemType
                        });
                    }
                }}
            />

            {moveToModalState.isOpen && moveToModalState.itemId && moveToModalState.itemType && (
                <MoveToModal
                    isOpen={moveToModalState.isOpen}
                    onClose={() => setMoveToModalState(prev => ({ ...prev, isOpen: false }))}
                    itemId={moveToModalState.itemId}
                    itemType={moveToModalState.itemType}
                    onMove={(targetFolderId) => {
                        const id = moveToModalState.itemId!;
                        if (moveToModalState.itemType === "board") {
                            moveBoard.mutate({ id, folderId: targetFolderId });
                        } else if (moveToModalState.itemType === "session") {
                            moveSession.mutate({ id, folderId: targetFolderId });
                        }
                    }}
                />
            )}
        </div>
    );
}