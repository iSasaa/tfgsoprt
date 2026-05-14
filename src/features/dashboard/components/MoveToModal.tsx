"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Folder, X, ChevronRight, Home, Check, ChevronLeft, FileText, ClipboardList } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useVisualViewport } from "~/hooks/useVisualViewport";

interface MoveToModalProps {
    isOpen: boolean;
    onClose: () => void;
    itemId: string;
    itemType: "folder" | "board" | "session";
    onMove: (targetFolderId: string | null) => void;
    currentFolderId?: string | null;
}

interface NavItem {
    id: string;
    name: string;
}

export function MoveToModal({ isOpen, onClose, itemId, itemType, onMove, currentFolderId }: MoveToModalProps) {
    const [navPath, setNavPath] = useState<NavItem[]>([]);
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(currentFolderId || null);
    const { height, offsetTop, isKeyboardOpen } = useVisualViewport();

    const currentParentId = navPath.length > 0 ? navPath[navPath.length - 1]!.id : null;

    const folderType = itemType === "session" ? "session" : "board";

    const { data: allFolders = [], isLoading: loadingFolders } = api.folder.getAll.useQuery({
        type: folderType,
        parentId: currentParentId,
    }, { enabled: isOpen });

    const { data: boards = [], isLoading: loadingBoards } = api.board.getAll.useQuery({
        folderId: currentParentId,
    }, { enabled: isOpen && folderType === 'board' });

    const { data: sessions = [], isLoading: loadingSessions } = api.session.getAll.useQuery({
        folderId: currentParentId,
    }, { enabled: isOpen && folderType === 'session' });

    const isLoading = loadingFolders || loadingBoards || loadingSessions;

    const availableFolders = allFolders.filter(f => f.id !== itemId);
    const currentItems = folderType === 'board' ? boards : sessions;

    const handleConfirm = () => {
        onMove(selectedFolderId);
        onClose();
    };

    const navigateTo = (id: string, name: string) => {
        setNavPath(prev => [...prev, { id, name }]);
        setSelectedFolderId(id);
    };

    const navigateUp = () => {
        setNavPath(prev => {
            const newPath = prev.slice(0, -1);
            const newParentId = newPath.length > 0 ? newPath[newPath.length - 1]!.id : null;
            setSelectedFolderId(newParentId);
            return newPath;
        });
    };

    const jumpToPath = (index: number) => {
        if (index === -1) {
            setNavPath([]);
            setSelectedFolderId(null);
        } else {
            const newPath = navPath.slice(0, index + 1);
            setNavPath(newPath);
            setSelectedFolderId(newPath[newPath.length - 1]!.id);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1000]" style={{ touchAction: "none" }}>
            <div
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
                onClick={onClose}
            />

            <div
                className="fixed inset-0 flex justify-center p-4"
                style={{
                    top: `${offsetTop}px`,
                    height: height ? `${height}px` : '100dvh',
                    alignItems: isKeyboardOpen ? 'flex-start' : 'center',
                    pointerEvents: 'none'
                }}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    className="bg-white rounded-3xl w-full max-w-md shadow-2xl flex flex-col pointer-events-auto overflow-hidden"
                    style={{
                        maxHeight: 'calc(100% - 2rem)',
                        marginTop: isKeyboardOpen ? '1rem' : '0'
                    }}
                >
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 flex-shrink-0">
                        <div>
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Move Item</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Navigate & Select Folder</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-1 overflow-x-auto no-scrollbar flex-shrink-0">
                        <button
                            onClick={() => jumpToPath(-1)}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${navPath.length === 0 ? "text-orange-500 bg-orange-50" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"}`}
                        >
                            <Home size={12} />
                            ROOT
                        </button>
                        {navPath.map((item, idx) => (
                            <div key={item.id} className="flex items-center gap-1">
                                <ChevronRight size={12} className="text-slate-300" />
                                <button
                                    onClick={() => jumpToPath(idx)}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors whitespace-nowrap ${idx === navPath.length - 1 ? "text-orange-500 bg-orange-50" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"}`}
                                >
                                    {item.name}
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="p-4 space-y-2 flex-1 overflow-y-auto no-scrollbar">
                        {navPath.length === 0 && (
                            <button
                                onClick={() => setSelectedFolderId(null)}
                                className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${selectedFolderId === null
                                        ? "border-orange-400 bg-orange-50"
                                        : "border-transparent hover:bg-slate-50 text-slate-600"
                                    }`}
                            >
                                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${selectedFolderId === null ? "bg-orange-400 text-white shadow-lg shadow-orange-200" : "bg-slate-100 text-slate-400"}`}>
                                    <Home size={20} strokeWidth={2.5} />
                                </div>
                                <div className="flex-1 text-left">
                                    <span className="block font-black text-xs uppercase tracking-wider">Main Directory</span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Root level</span>
                                </div>
                                {selectedFolderId === null && <Check size={20} className="text-orange-500" strokeWidth={3} />}
                            </button>
                        )}

                        {navPath.length > 0 && (
                            <button
                                onClick={navigateUp}
                                className="w-full flex items-center gap-3 p-3 rounded-xl border border-dashed border-slate-200 hover:bg-slate-50 text-slate-400 transition-colors mb-2"
                            >
                                <ChevronLeft size={18} strokeWidth={2.5} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Back to {navPath.length > 1 ? navPath[navPath.length - 2]!.name : "Root"}</span>
                            </button>
                        )}

                        {isLoading ? (
                            <div className="py-20 flex flex-col items-center gap-4 animate-pulse">
                                <div className="h-10 w-10 bg-slate-100 rounded-full" />
                                <div className="h-4 w-32 bg-slate-100 rounded" />
                            </div>
                        ) : (availableFolders.length === 0 && currentItems.length === 0) ? (
                            <div className="py-12 text-center">
                                <div className="h-12 w-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-200">
                                    <Folder size={24} />
                                </div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">This folder is empty</p>
                            </div>
                        ) : (
                            <>
                                {availableFolders.map((folder) => (
                                    <div key={folder.id} className="relative group">
                                        <button
                                            onClick={() => setSelectedFolderId(folder.id)}
                                            className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${selectedFolderId === folder.id
                                                    ? "border-orange-400 bg-orange-50/50"
                                                    : "border-transparent hover:bg-slate-50 text-slate-600"
                                                }`}
                                        >
                                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${selectedFolderId === folder.id ? "bg-orange-400 text-white shadow-lg shadow-orange-200" : "bg-orange-50 text-orange-400"}`}>
                                                <Folder size={20} strokeWidth={2.5} fill={selectedFolderId === folder.id ? "white" : "currentColor"} />
                                            </div>
                                            <div className="flex-1 text-left min-w-0 pr-10">
                                                <span className="block font-black text-xs uppercase tracking-wider truncate">{folder.name}</span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Select as destination</span>
                                            </div>
                                            {selectedFolderId === folder.id && <Check size={20} className="text-orange-500 absolute right-14" strokeWidth={3} />}
                                        </button>

                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigateTo(folder.id, folder.name);
                                            }}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center rounded-xl bg-slate-100/50 hover:bg-orange-100 hover:text-orange-600 text-slate-400 transition-all border border-slate-200"
                                            title="Open subfolders"
                                        >
                                            <ChevronRight size={18} strokeWidth={3} />
                                        </button>
                                    </div>
                                ))}

                                {currentItems.length > 0 && availableFolders.length > 0 && (
                                    <div className="py-2 flex items-center gap-4">
                                        <div className="h-px flex-1 bg-slate-100"></div>
                                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Existing Contents</span>
                                        <div className="h-px flex-1 bg-slate-100"></div>
                                    </div>
                                )}

                                {currentItems.map((item: any) => (
                                    <div
                                        key={item.id}
                                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-transparent opacity-40 grayscale pointer-events-none select-none"
                                    >
                                        <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center">
                                            {folderType === 'board' ? <FileText size={16} /> : <ClipboardList size={16} />}
                                        </div>
                                        <div className="flex-1 text-left min-w-0">
                                            <span className="block font-bold text-[11px] text-slate-500 uppercase truncate">{item.title}</span>
                                            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter">Read Only Reference</span>
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>

                    <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col gap-4 flex-shrink-0">
                        <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-inner">
                            <div className="h-8 w-8 rounded-lg bg-orange-100 text-orange-500 flex items-center justify-center shrink-0">
                                {selectedFolderId ? <Folder size={16} /> : <Home size={16} />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Target Location</p>
                                <p className="text-xs font-black text-slate-700 uppercase truncate">
                                    {selectedFolderId ? navPath.find(p => p.id === selectedFolderId)?.name || availableFolders.find(f => f.id === selectedFolderId)?.name || "Current Folder" : "Main Directory"}
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 py-4 text-xs font-black text-slate-400 hover:text-slate-600 tracking-[0.2em] transition-colors"
                            >
                                CANCEL
                            </button>
                            <button
                                onClick={handleConfirm}
                                className="flex-3 px-8 py-4 bg-orange-400 hover:bg-orange-500 text-white rounded-2xl text-xs font-black shadow-lg shadow-orange-200 tracking-[0.2em] transition-all transform active:scale-95"
                            >
                                MOVE HERE
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}


