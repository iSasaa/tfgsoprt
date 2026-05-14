"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { MoreVertical, Star } from "lucide-react";
import { BoardPreviewCanvas } from "./BoardPreviewCanvas";
import type { BoardPreviewCanvasRef } from "./BoardPreviewCanvas";

const ENTRIES_MARKER = "<!--entries:";
const ENTRIES_END = ":entries-->";

function extractHumanNotes(notes: string): string {
    const start = notes.indexOf(ENTRIES_MARKER);
    if (start === -1) return notes;
    return notes.slice(0, start).trimEnd();
}

function extractBoardCount(notes: string): number {
    const start = notes.indexOf(ENTRIES_MARKER);
    const end = notes.indexOf(ENTRIES_END);
    if (start === -1 || end === -1) return 0;
    try {
        const entries = JSON.parse(notes.slice(start + ENTRIES_MARKER.length, end)) as { boardId: string }[];
        return entries.length;
    } catch { return 0; }
}

interface SessionCardProps {
    id: string;
    title: string;
    sport: string;
    notes?: string;
    boardCount: number;
    href?: string;
    firstBoardData?: unknown;
    isFavorite?: boolean;
    isRenaming?: boolean;
    onRenameSubmit?: (newName: string) => void;
    onOptionsClick?: (e: React.MouseEvent) => void;
    onToggleFavorite?: (e: React.MouseEvent) => void;
    onClick?: (e: React.MouseEvent) => void;
}

export const SessionCard = React.memo(function SessionCard({ id, title, sport, notes = "", boardCount, href, firstBoardData, isFavorite, isRenaming, onRenameSubmit, onOptionsClick, onToggleFavorite, onClick }: SessionCardProps) {
    const cardHref = href ?? `/dashboard/sessions/${id}`;
    const humanNotes = extractHumanNotes(notes);
    const entryCount = extractBoardCount(notes) || boardCount;
    const canvasRef = useRef<BoardPreviewCanvasRef>(null);

    const cardContent = (
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
                        sport={sport}
                        boardData={firstBoardData}
                        animate={true}
                    />
                </div>
                <div className="absolute top-2 right-2 bg-orange-100 text-orange-600 text-[8px] font-bold px-1.5 py-0.5 rounded-full z-10">
                    {entryCount} {entryCount === 1 ? "ex" : "ex"}
                </div>
            </div>
            <div className="flex flex-col gap-0.5 p-2 z-10 bg-white relative w-full min-h-[50px]">
                <div className="flex items-center justify-between h-full">
                    <div className={`flex flex-col flex-1 ${!isRenaming ? "overflow-hidden" : ""} pr-2`}>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-orange-500 truncate">{sport}</span>
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
                        {humanNotes && !isRenaming && (
                            <p className="text-[9px] text-slate-400 mt-0 line-clamp-1">{humanNotes}</p>
                        )}
                    </div>
                    <div className="flex items-center shrink-0 z-20">
                        {onToggleFavorite && !isRenaming && (
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

    if (onClick) return cardContent;

    return (
        <Link href={cardHref} className="no-underline">
            {cardContent}
        </Link>
    );
}, (prev, next) => {
    return prev.id === next.id &&
        prev.title === next.title &&
        prev.sport === next.sport &&
        prev.notes === next.notes &&
        prev.boardCount === next.boardCount &&
        prev.isFavorite === next.isFavorite &&
        prev.isRenaming === next.isRenaming &&
        prev.href === next.href &&
        prev.firstBoardData === next.firstBoardData;
});

export function SessionCardSkeleton() {
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
