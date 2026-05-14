"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { useDashboard } from "~/context/DashboardContext";

interface ModalState {
    isOpen: boolean;
    type: "drill" | "session";
}

export function useQuickCreate() {
    const router = useRouter();
    const { selectedSport } = useDashboard();
    const [modalState, setModalState] = useState<{ isOpen: boolean; type: "drill" | "session" | "folder" }>({
        isOpen: false,
        type: "drill",
    });

    const createBoard = api.board.create.useMutation({
        onSuccess: (board) => {
            utils.folder.getContents.invalidate();
            const returnUrl = `/dashboard?sport=${selectedSport || 'hockey'}`;
            router.push(`/whiteboard/${board.id}?returnTo=${encodeURIComponent(returnUrl)}`);
            setModalState((prev) => ({ ...prev, isOpen: false }));
        },
    });

    const utils = api.useUtils();

    const createFolder = api.folder.create.useMutation({
        onMutate: async (newFolder) => {
            await utils.folder.getAll.cancel();

            const previousFolders = utils.folder.getAll.getData({
                type: newFolder.type,
                parentId: newFolder.parentId ?? null,
                sport: newFolder.sport
            });

            utils.folder.getAll.setData({
                type: newFolder.type,
                parentId: newFolder.parentId ?? null,
                sport: newFolder.sport
            }, (old) => {
                const optimisticFolder = {
                    id: "temp-id-" + Math.random(),
                    name: newFolder.name,
                    type: newFolder.type,
                    userId: "current-user",
                    parentId: newFolder.parentId ?? null,
                    sport: newFolder.sport ?? null,
                    isFavorite: false,
                    updatedAt: new Date(),
                    createdAt: new Date(),
                    order: 0,
                };
                return old ? [optimisticFolder, ...old] : [optimisticFolder];
            });

            return { previousFolders };
        },
        onError: (err, newFolder, context) => {
            utils.folder.getAll.setData({
                type: newFolder.type,
                parentId: newFolder.parentId ?? null,
                sport: newFolder.sport
            }, context?.previousFolders);
        },
        onSuccess: () => {
            utils.folder.getContents.invalidate();
            utils.folder.getAll.invalidate();
            setModalState((prev) => ({ ...prev, isOpen: false }));
        },
    });

    const createSession = api.session.create.useMutation({
        onSuccess: (session) => {
            utils.folder.getContents.invalidate();
            router.push(`/dashboard/sessions/${session.id}`);
            setModalState((prev) => ({ ...prev, isOpen: false }));
        },
    });

    const handleCreateDrill = (title: string, folderId?: string | null) => {
        if (!selectedSport) return;
        createBoard.mutate({
            title,
            sport: selectedSport,
            folderId,
        });
    };

    const handleCreateSession = (title: string, folderId?: string | null) => {
        if (!selectedSport) return;
        createSession.mutate({
            title,
            sport: selectedSport,
            folderId,
        });
    };

    const handleCreateFolder = (name: string, folderId?: string | null, type: "board" | "session" = "board") => {
        createFolder.mutate({
            name,
            type,
            parentId: folderId,
            sport: selectedSport ?? undefined
        });
    };

    const openDrillModal = () => setModalState({ isOpen: true, type: "drill" });
    const openSessionModal = () => setModalState({ isOpen: true, type: "session" });
    const openFolderModal = () => setModalState({ isOpen: true, type: "folder" });
    const closeModal = () => setModalState((prev) => ({ ...prev, isOpen: false }));

    return {
        handleCreateDrill,
        handleCreateSession,
        handleCreateFolder,
        openDrillModal,
        openSessionModal,
        openFolderModal,
        closeModal,
        modalState,
        isPending: createBoard.isPending || createSession.isPending || createFolder.isPending,
        selectedSport
    };
}
