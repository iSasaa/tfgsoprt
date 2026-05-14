"use client";

import Link from "next/link";
import React, { useRef } from "react";
import { MoreVertical, Star } from "lucide-react";
import { BoardPreviewCanvas } from "./BoardPreviewCanvas";
import type { BoardPreviewCanvasRef } from "./BoardPreviewCanvas";

interface DrillCardProps {
    id: string;
    title: string;
    category: string;
    href?: string;
    subtitle?: string;
    boardData?: unknown;
    type?: 'board' | 'session';
    isFavorite?: boolean;
    isRenaming?: boolean;
    onRenameSubmit?: (newName: string) => void;
    onOptionsClick?: (e: React.MouseEvent) => void;
    onToggleFavorite?: (e: React.MouseEvent) => void;
    onClick?: (e: React.MouseEvent) => void;
}

export const DrillCard = React.memo(function DrillCard({ id, title, category, href, subtitle, boardData, type = 'board', isFavorite, isRenaming, onRenameSubmit, onOptionsClick, onToggleFavorite, onClick }: DrillCardProps) {
    const canvasRef = useRef<BoardPreviewCanvasRef>(null);

    const card = (
        <div 
            className="group relative flex w-full cursor-pointer flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
            onClick={onClick}
            onMouseEnter={() => canvasRef.current?.startAnim()}
            onMouseLeave={() => canvasRef.current?.stopAnim()}
        >
            <div className="relative aspect-[1.8/1] bg-white flex items-center justify-center border-b border-slate-100 overflow-hidden p-1">
                <div className="absolute inset-0 p-1">
                    <BoardPreviewCanvas
                        ref={canvasRef}
                        sport={category.toLowerCase()}
                        boardData={boardData}
                        animate={true}
                    />
                </div>
            </div>
            <div className="flex flex-col gap-0.5 p-2 bg-white relative z-10 w-full min-h-[50px]">
                <div className="flex items-center justify-between">
                    <div className={`flex flex-col flex-1 ${!isRenaming ? "overflow-hidden" : ""} pr-2`}>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-orange-500 truncate">{category}</span>
                        {isRenaming ? (
                            <input
                                autoFocus
                                defaultValue={title}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        onRenameSubmit?.(e.currentTarget.value);
                                    } else if (e.key === 'Escape') {
                                        onRenameSubmit?.(title);
                                    }
                                }}
                                onBlur={(e) => onRenameSubmit?.(e.target.value)}
                                className="text-xs font-bold text-slate-800 bg-orange-50 border border-orange-200 rounded px-1.5 py-0.5 w-full outline-none focus:ring-1 focus:ring-orange-300 min-w-0"
                            />
                        ) : (
                            <h3 className="text-xs font-bold text-slate-800 leading-tight line-clamp-1">{title}</h3>
                        )}
                        {subtitle && !isRenaming && <p className="text-[9px] text-slate-400 mt-0 truncate">{subtitle}</p>}
                    </div>
                    <div className="flex items-center shrink-0 z-20">
                        {onToggleFavorite && (
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onToggleFavorite(e);
                                }}
                                className={`rounded-lg p-1 transition-colors ${isFavorite ? "text-yellow-500 hover:bg-yellow-50" : "text-slate-300 hover:text-yellow-500 hover:bg-slate-100"}`}
                            >
                                <Star className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
                            </button>
                        )}
                        {onOptionsClick && !isRenaming && (
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onOptionsClick(e);
                                }}
                                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                            >
                                <MoreVertical className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    if (href) {
        return (
            <Link href={href} className="no-underline">
                {card}
            </Link>
        );
    }

    return card;
}, (prev, next) => {
    return prev.id === next.id &&
           prev.title === next.title &&
           prev.category === next.category &&
           prev.isFavorite === next.isFavorite &&
           prev.isRenaming === next.isRenaming &&
           prev.href === next.href && 
           prev.type === next.type &&
           prev.subtitle === next.subtitle &&
           prev.boardData === next.boardData;
});

export function DrillCardSkeleton() {
    return (
        <div className="flex w-full flex-col overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm animate-pulse">
            <div className="aspect-[1.8/1] bg-slate-100" />
            <div className="flex flex-col gap-2 p-2">
                <div className="h-2 w-12 rounded bg-slate-100" />
                <div className="h-3 w-3/4 rounded bg-slate-100" />
                <div className="h-2 w-1/2 rounded bg-slate-100" />
            </div>
        </div>
    );
}
