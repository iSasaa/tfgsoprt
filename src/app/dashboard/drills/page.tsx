"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { DrillCard, DrillCardSkeleton } from "~/features/dashboard/components/DrillCard";
import { useQuickCreate } from "~/features/dashboard/hooks/useQuickCreate";
import { QuickCreateModal } from "~/features/dashboard/components/QuickCreateModal";
import { FolderExplorer } from "~/features/dashboard/components/FolderExplorer";
import { Plus, FolderPlus } from "lucide-react";

function timeAgo(date: Date): string {
    const now = new Date();
    const diff = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
    if (diff < 60) return "ara mateix";
    if (diff < 3600) return `fa ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `fa ${Math.floor(diff / 3600)}h`;
    return `fa ${Math.floor(diff / 86400)} dies`;
}

export default function BoardsPage() {
    const {
        handleCreateDrill,
        handleCreateFolder,
        openDrillModal,
        openFolderModal,
        closeModal,
        modalState,
        isPending,
        selectedSport
    } = useQuickCreate();
    
    const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

    const { data: boards = [], isLoading } = api.board.getAll.useQuery({ 
        sport: selectedSport ?? undefined 
    });

    return (
        <div className="h-full pb-12">
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
                
                <div className="absolute right-8 bottom-8 flex items-center gap-3">
                    <button
                        onClick={openFolderModal}
                        disabled={isPending || !selectedSport}
                        className="flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-slate-800 shadow-lg hover:bg-slate-100 hover:-translate-y-0.5 transition-all disabled:opacity-50"
                    >
                        <FolderPlus className="h-5 w-5" />
                        New Folder
                    </button>
                    <button
                        onClick={openDrillModal}
                        disabled={isPending || !selectedSport}
                        className="flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                    >
                        {isPending ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Plus className="h-5 w-5" />
                        )}
                        New Drill
                    </button>
                </div>
            </div>

            <div className="px-6 mt-8">
                <FolderExplorer 
                    type="board"
                    sport={selectedSport ?? null}
                    onFolderChange={(folderId: string | null) => {
                        setActiveFolderId(folderId);
                    }}
                />
            </div>

            <QuickCreateModal
                isOpen={modalState.isOpen}
                onClose={closeModal}
                onConfirm={(name) => {
                    if (modalState.type === "drill") {
                        handleCreateDrill(name, activeFolderId);
                    } else if (modalState.type === "folder") {
                        handleCreateFolder(name, activeFolderId, "board");
                    }
                }}
                type={modalState.type}
                sport={selectedSport ?? ""}
                isPending={isPending}
            />
        </div>
    );
}
