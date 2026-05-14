"use client";

import { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import { X, Edit2, Copy, Trash2 } from "lucide-react";
import { useVisualViewport } from "~/hooks/useVisualViewport";

export type ItemType = "folder" | "board" | "session";

interface ItemOptionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    itemId: string | null;
    itemType: ItemType | null;
    currentTitle: string;
}

export function ItemOptionsModal({ isOpen, onClose, itemId, itemType, currentTitle }: ItemOptionsModalProps) {
    const [newName, setNewName] = useState(currentTitle);
    const { height, offsetTop, isKeyboardOpen } = useVisualViewport();
    
    useEffect(() => {
        if (isOpen) {
            setNewName(currentTitle);
        }
    }, [isOpen, currentTitle]);

    const utils = api.useUtils();

    const renameFolder = api.folder.rename.useMutation({ onSuccess: () => { utils.folder.getContents.invalidate(); utils.folder.getAll.invalidate(); onClose(); } });
    const renameBoard = api.board.updateMetadata.useMutation({ onSuccess: () => { utils.folder.getContents.invalidate(); utils.board.getAll.invalidate(); onClose(); } });
    const renameSession = api.session.updateMetadata.useMutation({ onSuccess: () => { utils.folder.getContents.invalidate(); utils.session.getAll.invalidate(); onClose(); } });

    const isPending = renameFolder.isPending || renameBoard.isPending || renameSession.isPending;

    if (!isOpen || !itemId || !itemType) return null;

    const handleRenameSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim() || newName === currentTitle) {
            onClose();
            return;
        }
        
        if (itemType === "folder") renameFolder.mutate({ id: itemId, name: newName });
        else if (itemType === "board") renameBoard.mutate({ id: itemId, title: newName });
        else if (itemType === "session") renameSession.mutate({ id: itemId, title: newName });
    };

    const labelUpper = itemType.charAt(0).toUpperCase() + itemType.slice(1);

    return (
        <div 
            style={{ 
                position: 'fixed',
                inset: 0,
                zIndex: 100,
            }}
        >
            <div 
                className="fixed inset-0 bg-black/40 backdrop-blur-sm" 
                onClick={onClose}
                style={{ touchAction: 'none' }}
            />

            <div
                style={{ 
                    position: 'fixed',
                    left: 0,
                    right: 0,
                    top: `${offsetTop}px`,
                    height: height ? `${height}px` : '100dvh',
                    display: 'flex',
                    alignItems: isKeyboardOpen ? 'flex-start' : 'center',
                    justifyContent: 'center',
                    padding: '1rem',
                    pointerEvents: 'none'
                }}
            >
                <div 
                    className="w-full max-w-sm flex flex-col rounded-2xl bg-white shadow-2xl pointer-events-auto overflow-hidden"
                    onClick={e => e.stopPropagation()}
                    style={{ 
                        maxHeight: 'calc(100% - 2rem)',
                        marginTop: isKeyboardOpen ? '1rem' : '0'
                    }}
                >
                    <div className="flex items-center justify-between bg-[#0f2d40] px-6 py-4 text-white flex-shrink-0">
                        <h2 className="text-lg font-extrabold italic tracking-tight flex gap-2 overflow-hidden items-center">
                            <span className="text-orange-400 shrink-0">{labelUpper}</span>
                            <span className="truncate opacity-80">{currentTitle}</span>
                        </h2>
                        <button
                            onClick={onClose}
                            className="rounded-lg p-1 hover:bg-white/10 transition-colors"
                            disabled={isPending}
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="p-4 flex flex-col gap-2 flex-1 overflow-y-auto no-scrollbar">
                        <form onSubmit={handleRenameSubmit} className="p-2 flex flex-col h-full">
                            <div className="flex-1">
                                <label className="mb-2 block text-xs font-bold uppercase text-slate-400">
                                    New {labelUpper} Name
                                </label>
                                <input
                                    autoFocus
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    disabled={isPending}
                                    className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-base font-medium text-slate-800 outline-none transition-all focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/20 disabled:opacity-50"
                                />
                            </div>
                            
                            <div className="mt-6 flex gap-3 pt-4 border-t border-slate-50">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={isPending}
                                    className="flex-1 rounded-xl bg-slate-100 py-3 font-bold text-slate-500 hover:bg-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isPending || !newName.trim()}
                                    className="flex-1 rounded-xl bg-orange-500 py-3 font-bold text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all disabled:opacity-50"
                                >
                                    {isPending ? "Saving..." : "Save"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
