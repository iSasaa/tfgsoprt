"use client";

import React from "react";
import { Folder, MoreVertical } from "lucide-react";

interface FolderCardProps {
    id: string;
    name: string;
    isRenaming?: boolean;
    onRenameSubmit?: (newName: string) => void;
    onClick?: () => void;
    onOptionsClick?: (e: React.MouseEvent) => void;
    onDropElement?: (elementId: string, type: 'board' | 'session' | 'folder') => void;
}

export const FolderCard = React.memo(function FolderCard({ id, name, isRenaming, onRenameSubmit, onClick, onOptionsClick, onDropElement }: FolderCardProps) {
    return (
        <div
            onClick={onClick}
            onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add('ring-2', 'ring-orange-500', 'bg-orange-50');
            }}
            onDragLeave={(e) => {
                e.currentTarget.classList.remove('ring-2', 'ring-orange-500', 'bg-orange-50');
            }}
            onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('ring-2', 'ring-orange-500', 'bg-orange-50');
                const dataStr = e.dataTransfer.getData("application/json");
                if (!dataStr) return;
                try {
                    const data = JSON.parse(dataStr) as { id: string, type: 'board' | 'session' | 'folder' };
                    if (data.id !== id && onDropElement) {
                        onDropElement(data.id, data.type);
                    }
                } catch {
                    // Ignore
                }
            }}
            className="group relative flex items-center gap-3 w-full flex-shrink-0 cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
        >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-500">
                <Folder className="h-5 w-5 fill-current" />
            </div>
            <div className={`flex flex-col flex-1 ${!isRenaming ? "overflow-hidden" : ""}`}>
                {isRenaming ? (
                    <input
                        autoFocus
                        defaultValue={name}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                onRenameSubmit?.(e.currentTarget.value);
                            } else if (e.key === 'Escape') {
                                onRenameSubmit?.(name);
                            }
                        }}
                        onBlur={(e) => onRenameSubmit?.(e.target.value)}
                        className="text-sm font-bold text-slate-800 bg-orange-50 border border-orange-200 rounded px-1.5 py-0.5 w-full outline-none focus:ring-1 focus:ring-orange-300 min-w-0"
                    />
                ) : (
                    <h3 className="text-sm font-bold text-slate-800 truncate">{name}</h3>
                )}
            </div>
            <div className="flex items-center gap-1 ml-auto shrink-0 transition-opacity">
                {onOptionsClick && !isRenaming && (
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onOptionsClick(e);
                        }}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                    >
                        <MoreVertical className="h-5 w-5" />
                    </button>
                )}
            </div>
        </div>
    );
}, (prev, next) => {
    return prev.id === next.id &&
        prev.name === next.name &&
        prev.isRenaming === next.isRenaming;
});
