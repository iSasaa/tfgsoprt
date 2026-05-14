"use client";

import { useEffect, useRef } from "react";
import { api } from "~/trpc/react";
import { Edit2, Copy, Trash2, Star, ChevronRight } from "lucide-react";

export type ItemType = "folder" | "board" | "session";

interface ItemContextMenuProps {
    isOpen: boolean;
    onClose: () => void;
    x: number;
    y: number;
    itemId: string | null;
    itemType: ItemType | null;
    isFavorite: boolean;
    onRename: () => void;
    onMove: () => void;
}

export function ItemContextMenu({
    isOpen, onClose, x, y, itemId, itemType, isFavorite, onRename, onMove
}: ItemContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);
    const utils = api.useUtils();

    const deleteFolder = api.folder.delete.useMutation({ onSuccess: () => { utils.folder.getContents.invalidate(); utils.folder.getAll.invalidate(); onClose(); } });
    const deleteBoard = api.board.delete.useMutation({
        onSuccess: () => {
            utils.folder.getContents.invalidate();
            utils.board.getAll.invalidate();
            utils.board.getRecent.invalidate();
            utils.calendar.getDashboardData.invalidate();
            onClose();
        }
    });
    const deleteSession = api.session.delete.useMutation({
        onSuccess: () => {
            utils.folder.getContents.invalidate();
            utils.session.getAll.invalidate();
            utils.session.getRecent.invalidate();
            utils.calendar.getDashboardData.invalidate();
            onClose();
        }
    });

    const duplicateBoard = api.board.duplicate.useMutation({
        onSuccess: () => {
            utils.folder.getContents.invalidate();
            utils.board.getAll.invalidate();
            utils.board.getRecent.invalidate();
            onClose();
        }
    });
    const duplicateSession = api.session.duplicate.useMutation({
        onSuccess: () => {
            utils.folder.getContents.invalidate();
            utils.session.getAll.invalidate();
            utils.session.getRecent.invalidate();
            onClose();
        }
    });

    const toggleFavBoard = api.board.toggleFavorite.useMutation({ onSuccess: () => { utils.folder.getContents.invalidate(); utils.board.getAll.invalidate(); onClose(); } });
    const toggleFavSession = api.session.toggleFavorite.useMutation({ onSuccess: () => { utils.folder.getContents.invalidate(); utils.session.getAll.invalidate(); onClose(); } });

    const isPending =
        deleteFolder.isPending || deleteBoard.isPending || deleteSession.isPending ||
        duplicateBoard.isPending || duplicateSession.isPending ||
        toggleFavBoard.isPending || toggleFavSession.isPending;

    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen, onClose]);

    if (!isOpen || !itemId || !itemType) return null;

    const handleDelete = () => {
        if (!confirm(`Are you sure you want to delete this ${itemType}? This cannot be undone.`)) return;
        if (itemType === "folder") deleteFolder.mutate({ id: itemId });
        else if (itemType === "board") deleteBoard.mutate({ id: itemId });
        else if (itemType === "session") deleteSession.mutate({ id: itemId });
    };

    const handleDuplicate = () => {
        if (itemType === "board") duplicateBoard.mutate({ id: itemId });
        else if (itemType === "session") duplicateSession.mutate({ id: itemId });
    };

    const handleToggleFavorite = () => {
        const payload = { id: itemId, isFavorite: !isFavorite };
        if (itemType === "board") toggleFavBoard.mutate(payload);
        else if (itemType === "session") toggleFavSession.mutate(payload);
    };

    const handleRenameClick = () => {
        onClose();
        onRename();
    };

    const handleMoveClick = () => {
        onClose();
        onMove();
    };

    const screenW = typeof window !== 'undefined' ? window.innerWidth : 1000;
    const screenH = typeof window !== 'undefined' ? window.innerHeight : 1000;

    let finalX = x;
    let finalY = y;
    const menuWidth = 200;
    const menuHeight = itemType === "folder" ? 220 : 260;

    if (x + menuWidth > screenW) {
        finalX = x - menuWidth;
    }
    if (y + menuHeight > screenH) {
        finalY = y - menuHeight;
    }

    return (
        <div
            ref={menuRef}
            className="fixed z-[9999] w-52 overflow-hidden rounded-xl bg-white shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] border border-slate-100 py-1"
            style={{ left: finalX, top: finalY }}
            onClick={e => e.stopPropagation()}
        >
            {itemType !== "folder" && (
                <button
                    onClick={handleToggleFavorite}
                    disabled={isPending}
                    className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-slate-50 transition-colors text-left text-sm font-medium text-slate-700 disabled:opacity-50"
                >
                    <Star className={`h-4 w-4 ${isFavorite ? "fill-yellow-400 text-yellow-400" : "text-slate-400"}`} />
                    {isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                </button>
            )}
            <button
                onClick={handleRenameClick}
                disabled={isPending}
                className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-slate-50 transition-colors text-left text-sm font-medium text-slate-700 disabled:opacity-50"
            >
                <Edit2 className="h-4 w-4 text-slate-400" />
                Rename
            </button>

            <button
                onClick={handleMoveClick}
                disabled={isPending}
                className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-slate-50 transition-colors text-left text-sm font-medium text-slate-700 disabled:opacity-50"
            >
                <ChevronRight className="h-4 w-4 text-slate-400 rotate-0" />
                Move to...
            </button>

            {itemType !== "folder" && (
                <button
                    onClick={handleDuplicate}
                    disabled={isPending}
                    className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-slate-50 transition-colors text-left text-sm font-medium text-slate-700 disabled:opacity-50"
                >
                    <Copy className="h-4 w-4 text-slate-400" />
                    Duplicate
                </button>
            )}

            <hr className="my-1 border-slate-100" />

            <button
                onClick={handleDelete}
                disabled={isPending}
                className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-red-50 transition-colors text-left text-sm font-medium text-red-600 disabled:opacity-50"
            >
                <Trash2 className="h-4 w-4 text-red-500" />
                Delete
            </button>
        </div>
    );
}
