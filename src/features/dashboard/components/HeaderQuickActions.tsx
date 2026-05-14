"use client";

import { useQuickCreate } from "~/features/dashboard/hooks/useQuickCreate";
import { QuickCreateModal } from "./QuickCreateModal";

export function HeaderQuickActions() {
    const {
        handleCreateDrill,
        handleCreateSession,
        openDrillModal,
        openSessionModal,
        closeModal,
        modalState,
        isPending,
        selectedSport
    } = useQuickCreate();

    return (
        <div className="flex items-center gap-2 ml-2">
            <button
                onClick={openDrillModal}
                disabled={isPending || !selectedSport}
                className="flex items-center gap-2 rounded bg-[#00a0e3] px-3 py-1.5 text-[10px] font-black uppercase text-white hover:bg-[#008bc5] shadow-sm transition-all active:scale-95 disabled:opacity-50"
            >
                {isPending && modalState.type === "drill" ? (
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                    <span>+</span>
                )}
                Create Drill
            </button>
            <button
                onClick={openSessionModal}
                disabled={isPending || !selectedSport}
                className="flex items-center gap-2 rounded bg-orange-500 px-3 py-1.5 text-[10px] font-black uppercase text-white hover:bg-orange-600 shadow-sm transition-all active:scale-95 disabled:opacity-50"
            >
                {isPending && modalState.type === "session" ? (
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                    <span>+</span>
                )}
                Create Session
            </button>

            <QuickCreateModal
                isOpen={modalState.isOpen}
                onClose={closeModal}
                onConfirm={modalState.type === "drill" ? handleCreateDrill : handleCreateSession}
                type={modalState.type}
                sport={selectedSport ?? ""}
                isPending={isPending}
            />
        </div>
    );
}
