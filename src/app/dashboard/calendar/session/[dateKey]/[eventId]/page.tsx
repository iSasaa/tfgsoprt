"use client";

import { useState, useRef, use } from "react";
import Link from "next/link";
import { useCalendarSchedule } from "~/features/dashboard/hooks/useCalendarSchedule";
import { BoardPreviewCanvas, type BoardPreviewCanvasRef } from "~/features/dashboard/components/BoardPreviewCanvas";
import { api } from "~/trpc/react";
import { useDashboard } from "~/context/DashboardContext";
import { FolderExplorer } from "~/features/dashboard/components/FolderExplorer";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function LocalAddModal({ sport, excludeIds, onAddExisting, onCreateRepo, onCreateSessionOnly, onClose }: {
    sport: string;
    excludeIds: string[];
    onAddExisting: (board: any) => Promise<any>;
    onCreateRepo: (title: string) => Promise<any>;
    onCreateSessionOnly: (title: string) => Promise<any>;
    onClose: () => void;
}) {
    const [view, setView] = useState<"repo" | "new_repo" | "session_only">("repo");
    const [newTitle, setNewTitle] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-[2.5rem] shadow-2xl flex flex-col max-h-[80vh] overflow-hidden transition-all" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="bg-white border-b border-slate-100 flex-shrink-0">
                    <div className="p-8 pb-4 flex items-center justify-between relative">
                        <div>
                            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">ADD DRILL</h2>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">SPORT: {sport}</p>
                        </div>
                        <button onClick={onClose} className="text-slate-300 hover:text-slate-600 font-black text-xl transition-all">✕</button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex px-8 gap-6 border-b border-slate-100 bg-white flex-shrink-0">
                    <button 
                        onClick={() => setView("repo")}
                        className={`py-4 text-[10px] font-black uppercase tracking-[0.12em] transition-all border-b-2 ${view === "repo" || view === "new_repo" ? "border-orange-500 text-orange-500" : "border-transparent text-slate-400 hover:text-slate-600"}`}
                    >
                        REPOSITORY
                    </button>
                    <button 
                        onClick={() => setView("session_only")}
                        className={`py-4 text-[10px] font-black uppercase tracking-[0.12em] transition-all border-b-2 ${view === "session_only" ? "border-orange-500 text-orange-500" : "border-transparent text-slate-400 hover:text-slate-600"}`}
                    >
                        SESSION ONLY
                    </button>
                </div>

                {view === "repo" ? (
                    <div className="overflow-y-auto flex-1 bg-white min-h-0 custom-scrollbar p-6 space-y-6">
                        <FolderExplorer 
                            type="board" 
                            sport={sport} 
                            hideOptions={true}
                            excludeIds={excludeIds}
                            onSelect={async (id, bTitle, board) => { 
                                if (isSaving) return;
                                setIsSaving(true);
                                try {
                                    await onAddExisting(board); 
                                    onClose(); 
                                } finally {
                                    setIsSaving(false);
                                }
                            }}
                            onNewClick={() => setView("new_repo")}
                        />
                    </div>
                ) : view === "new_repo" ? (
                    <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
                        <div className="max-w-xl mx-auto w-full space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Drill</h3>
                                <button onClick={() => setView("repo")} className="text-[10px] font-black text-orange-500 uppercase tracking-widest hover:underline">← Back</button>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Repo Board Title</label>
                                <input
                                    autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)}
                                    onKeyDown={e => { if(e.key === "Enter" && newTitle.trim()) { onCreateRepo(newTitle); onClose(); }}}
                                    placeholder="New Global Repository Drill..."
                                    className="w-full border-2 border-slate-100 rounded-2xl px-6 py-4 text-lg font-black text-slate-800 placeholder:text-slate-300 outline-none focus:border-orange-400 transition-all bg-slate-50"
                                />
                            </div>
                            <div className="p-5 rounded-2xl border border-orange-100 bg-orange-50 text-orange-700">
                                <p className="text-[10px] font-black uppercase leading-relaxed tracking-wider px-2">
                                    This will add the board to your permanent repository for future use.
                                </p>
                            </div>
                            <button 
                                disabled={!newTitle.trim() || isSaving}
                                onClick={async () => { 
                                    setIsSaving(true);
                                    try {
                                        await onCreateRepo(newTitle); 
                                        onClose(); 
                                    } finally {
                                        setIsSaving(false);
                                    }
                                }}
                                className="w-full py-5 rounded-2xl bg-orange-500 text-white font-black uppercase text-xs tracking-widest shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                            >
                                {isSaving ? (
                                    <>
                                        <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        SAVING...
                                    </>
                                ) : (
                                    "Save to Repository →"
                                )}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
                        <div className="max-w-xl mx-auto w-full space-y-6">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Session Exclusive Drill</h3>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Session Board Title</label>
                                <input
                                    autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)}
                                    onKeyDown={e => { if(e.key === "Enter" && newTitle.trim()) { onCreateSessionOnly(newTitle); onClose(); }}}
                                    placeholder="Session Exclusive Drill..."
                                    className="w-full border-2 border-slate-100 rounded-2xl px-6 py-4 text-lg font-black text-slate-800 placeholder:text-slate-300 outline-none focus:border-orange-400 transition-all bg-slate-50"
                                />
                            </div>
                            <div className="p-5 rounded-2xl border border-amber-100 bg-amber-50 text-amber-700">
                                <p className="text-[10px] font-black uppercase leading-relaxed tracking-wider px-2">
                                    This board will NOT be saved to your repository. It will only exist within this specific training instance.
                                </p>
                            </div>
                            <button 
                                disabled={!newTitle.trim() || isSaving}
                                onClick={async () => { 
                                    setIsSaving(true);
                                    try {
                                        await onCreateSessionOnly(newTitle); 
                                        onClose(); 
                                    } finally {
                                        setIsSaving(false);
                                    }
                                }}
                                className="w-full py-5 rounded-2xl bg-orange-500 text-white font-black uppercase text-xs tracking-widest shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                            >
                                {isSaving ? (
                                    <>
                                        <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        CREATING...
                                    </>
                                ) : (
                                    "Create Session Board →"
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function RepoBoardGridCard({ board, onClick, isSaving }: { board: any, onClick: () => void, isSaving?: boolean }) {
    const canvasRef = useRef<BoardPreviewCanvasRef>(null);

    return (
        <button
            onClick={onClick}
            onMouseEnter={() => canvasRef.current?.startAnim()}
            onMouseLeave={() => canvasRef.current?.stopAnim()}
            className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white hover:border-orange-400 transition-all text-left shadow-sm hover:shadow-xl hover:-translate-y-0.5 flex-shrink-0"
        >
            <div className="h-28 relative overflow-hidden bg-slate-100 flex-shrink-0">
                <BoardPreviewCanvas 
                    ref={canvasRef}
                    sport={board.sport} 
                    boardData={board.data} 
                    animate={true} 
                />
                <div className={`absolute inset-0 transition-all flex items-center justify-center ${isSaving ? "bg-white/60" : "bg-black/0 group-hover:bg-black/5"}`}>
                    {isSaving && <div className="w-6 h-6 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />}
                </div>
            </div>
            <div className="p-3 border-t border-slate-100 min-w-0 flex-shrink-0">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{board.sport}</div>
                <div className="text-xs font-black text-slate-800 truncate uppercase leading-tight">{board.title}</div>
            </div>
        </button>
    );
}

export default function LocalSessionPage({ params }: { params: Promise<{ dateKey: string; eventId: string }> }) {
    const { dateKey, eventId } = use(params);
    const { selectedTeamId, selectedSport } = useDashboard();
    const { getEventsForDate, updateEvent, isHydrated } = useCalendarSchedule(selectedTeamId);

    const [isEditingHeader, setIsEditingHeader] = useState(false);
    const [isReorderMode, setIsReorderMode] = useState(false);
    const [editTitle, setEditTitle] = useState("");
    const [editTime, setEditTime] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);

    const event = isHydrated ? getEventsForDate(dateKey).find(e => e.id === eventId) : undefined;

    const { data: allBoards = [] } = api.board.getAll.useQuery({ 
        sport: event?.sport || selectedSport || undefined 
    });
    const createBoard = api.board.create.useMutation();

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    if (!isHydrated) return (
        <div className="h-full flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    if (!event) return (
        <div className="h-full flex flex-col items-center justify-center gap-3 bg-slate-100">
            <p className="text-slate-500 font-bold">Event not found</p>
            <Link href="/dashboard/calendar" className="text-orange-500 font-black uppercase text-xs hover:underline">← Back to Calendar</Link>
        </div>
    );

    const drills = event.drills ?? [];
    const totalDuration = drills.reduce((sum, d) => sum + (d.durationMin ?? 10), 0);

    const saveHeader = () => {
        updateEvent(dateKey, eventId, { title: editTitle, time: editTime });
        setIsEditingHeader(false);
    };

    const moveDrill = (idx: number, dir: -1 | 1) => {
        const newDrills = [...drills];
        const swap = idx + dir;
        if (swap < 0 || swap >= newDrills.length) return;
        [newDrills[idx], newDrills[swap]] = [newDrills[swap]!, newDrills[idx]!];
        updateEvent(dateKey, eventId, { drills: newDrills });
    };

    const removeDrill = (idx: number) => {
        const newDrills = drills.filter((_, i) => i !== idx);
        updateEvent(dateKey, eventId, { drills: newDrills });
    };

    const updateDrillEntry = (idx: number, updates: any) => {
        const newDrills = drills.map((d, i) => i === idx ? { ...d, ...updates } : d);
        updateEvent(dateKey, eventId, { drills: newDrills });
    };

    const handleDragEnd = (event: DragEndEvent) => {
        if (!event.over || event.active.id === event.over.id) return;
        const over = event.over;

        const oldIndex = drills.findIndex((_, i) => `drill-${i}` === event.active.id);
        const newIndex = drills.findIndex((_, i) => `drill-${i}` === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
            const newDrills = arrayMove(drills, oldIndex, newIndex);
            updateEvent(dateKey, eventId, { drills: newDrills });
        }
    };

    const addSnapshotDrill = async (board: any) => {
        const newDrills = [...drills, {
            boardId: board.id,
            localTitle: board.title,
            durationMin: 10,
            boardData: board.data,
            sport: board.sport || event?.sport || selectedSport || "hockey",
            order: drills.length
        }];
        return await updateEvent(dateKey, eventId, { drills: newDrills });
    };

    return (
        <div className="min-h-[calc(100vh-3rem)] lg:h-[calc(100vh-3rem)] flex flex-col overflow-y-auto lg:overflow-hidden relative custom-scrollbar bg-slate-100 overscroll-none">
            
            {/* Header */}
            <div className="relative h-64 w-full px-8 flex items-center overflow-hidden flex-shrink-0">
                <div className="relative z-10 w-full flex items-end justify-between pb-28 h-full pt-16">
                    <div className="flex-1">
                        <Link href="/dashboard/calendar" className="inline-flex items-center gap-1 text-white/60 hover:text-white text-[10px] font-black uppercase tracking-widest mb-4 transition-all">
                            ← Calendar
                        </Link>
                        
                        {isEditingHeader ? (
                            <div className="space-y-3 max-w-xl">
                                <input
                                    value={editTitle}
                                    onChange={e => setEditTitle(e.target.value)}
                                    className="w-full text-4xl font-extrabold bg-transparent border-b-2 border-orange-400 text-white outline-none italic uppercase tracking-tighter"
                                />
                                <div className="flex items-center gap-3">
                                    <input
                                        type="time"
                                        value={editTime}
                                        onChange={e => setEditTime(e.target.value)}
                                        className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:bg-white/20"
                                    />
                                    <button onClick={saveHeader} className="rounded-xl bg-orange-500 px-6 py-2 text-xs font-black text-white hover:bg-orange-600 transition-all shadow-lg">SAVE CHANGES</button>
                                    <button onClick={() => setIsEditingHeader(false)} className="rounded-xl bg-white/10 px-6 py-2 text-xs font-black text-white/60 hover:bg-white/20 transition-all">CANCEL</button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-14 w-2 bg-orange-500 transform -skew-x-12" />
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400 mb-1">
                                            {event.time ? `SCHEDULED @ ${event.time}` : "LOCAL SESSION INSTANCE"}
                                        </div>
                                        <h1 className="text-5xl font-black uppercase text-white tracking-tighter italic drop-shadow-xl leading-none">
                                            {event.title}
                                        </h1>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => { setEditTitle(event.title); setEditTime(event.time || ""); setIsEditingHeader(true); }}
                                    className="px-6 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all"
                                >
                                    Edit Header
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 flex flex-col px-8 relative z-20 -mt-20 pb-12">
                <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6">
                    <div className="flex-1 min-h-0 flex flex-col">
                        <div className="flex-1 min-h-0 bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden flex flex-col">
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white flex-shrink-0">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">SESSION DRILLS</h3>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setIsReorderMode(!isReorderMode)}
                                        className={`flex items-center gap-1.5 rounded-xl border-2 px-4 py-2 text-xs font-black transition-all shadow-sm ${isReorderMode ? 'bg-orange-500 border-orange-500 text-white shadow-orange-200' : 'bg-white border-slate-100 text-slate-600 hover:border-orange-400'}`}
                                    >
                                        {isReorderMode ? "DONE" : "REORDER"}
                                    </button>
                                    <button
                                        onClick={() => setShowAddModal(true)}
                                        className="flex items-center gap-1.5 rounded-xl border-2 border-slate-100 bg-white px-4 py-2 text-xs font-black text-slate-600 hover:border-orange-400 hover:text-orange-500 transition-all shadow-sm"
                                    >
                                        + ADD DRILL
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                                {drills.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center py-20 grayscale opacity-40">
                                        <div className="text-6xl mb-4 text-slate-300 italic font-black">EMPTY</div>
                                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">No drills assigned for this day</p>
                                    </div>
                                ) : (
                                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                        <SortableContext items={drills.map((_, i) => `drill-${i}`)} strategy={rectSortingStrategy}>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {drills.map((drill, idx) => (
                                                    <SortableDrillItem key={`drill-${idx}`} id={`drill-${idx}`} disabled={!isReorderMode}>
                                                        <LocalDrillCard
                                                            drill={drill}
                                                            index={idx}
                                                            total={drills.length}
                                                            isReorderMode={isReorderMode}
                                                            onMoveUp={() => moveDrill(idx, -1)}
                                                            onMoveDown={() => moveDrill(idx, 1)}
                                                            onRemove={() => removeDrill(idx)}
                                                            onUpdate={(u) => updateDrillEntry(idx, u)}
                                                        />
                                                    </SortableDrillItem>
                                                ))}

                                                {!isReorderMode && (
                                                    <button
                                                        onClick={() => setShowAddModal(true)}
                                                        className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 aspect-[2/1] transition-all hover:border-orange-400 hover:bg-orange-50 active:scale-95"
                                                    >
                                                        <div className="w-14 h-14 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-300 group-hover:text-orange-500 group-hover:scale-110 transition-all font-black text-3xl">
                                                            +
                                                        </div>
                                                        <div className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-orange-600 italic">
                                                            Add Training Drill
                                                        </div>
                                                    </button>
                                                )}
                                            </div>
                                        </SortableContext>
                                    </DndContext>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="w-full lg:w-72 flex flex-col gap-4 flex-shrink-0">
                        <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-slate-200">
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Instance Summary</div>
                            <div className="space-y-4">
                                <div>
                                    <div className="text-[9px] font-black text-orange-500 uppercase mb-0.5">Total Time</div>
                                    <div className="text-3xl font-black text-slate-800 italic">{totalDuration} <span className="text-sm font-bold text-slate-400 ml-1">MIN</span></div>
                                </div>
                                <div className="h-px bg-slate-100" />
                                <div>
                                    <div className="text-[9px] font-black text-orange-500 uppercase mb-0.5">Drills Count</div>
                                    <div className="text-3xl font-black text-slate-800 italic">{drills.length}</div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-orange-500 rounded-[2rem] p-6 shadow-xl text-white">
                            <div className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-2">Instructions</div>
                            <p className="text-xs font-bold leading-relaxed opacity-90 italic">
                                Changes made here are local to this specific calendar day. They will not affect the original session in your repository.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {showAddModal && (
                <LocalAddModal 
                    sport={(event.sport || selectedSport || "hockey").toUpperCase()}
                    excludeIds={drills.map(d => d.boardId).filter((id): id is string => !!id)}
                    onAddExisting={addSnapshotDrill}
                    onCreateRepo={async (title) => {
                        const board = await createBoard.mutateAsync({ 
                            title, 
                            sport: (event.sport || selectedSport || "hockey").toLowerCase()
                        });
                        return await addSnapshotDrill(board);
                    }}
                    onCreateSessionOnly={async (title) => {
                        const newDrills = [...drills, {
                            boardId: null,
                            localTitle: title,
                            durationMin: 10,
                            boardData: {},
                            sport: (event.sport || selectedSport || "hockey").toLowerCase(),
                            order: drills.length
                        }];
                        return await updateEvent(dateKey, eventId, { drills: newDrills });
                    }}
                    onClose={() => setShowAddModal(false)}
                />
            )}
        </div>
    );
}

function SortableDrillItem({ id, children, disabled }: { id: string, children: React.ReactNode, disabled: boolean }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 1,
        opacity: isDragging ? 0.5 : 1,
    };
    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={disabled ? "touch-auto" : "touch-none"}>
            {children}
        </div>
    );
}

function LocalDrillCard({ drill, index, total, isReorderMode, onMoveUp, onMoveDown, onRemove, onUpdate }: {
    drill: any;
    index: number;
    total: number;
    isReorderMode: boolean;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onRemove: () => void;
    onUpdate: (u: any) => void;
}) {
    const canvasRef = useRef<BoardPreviewCanvasRef>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [localTitle, setLocalTitle] = useState(drill.localTitle || "");
    const [duration, setDuration] = useState(drill.durationMin || 10);

    return (
        <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
            <div className="absolute top-3 left-3 z-10 w-8 h-8 rounded-full bg-orange-500 text-white text-[11px] font-black flex items-center justify-center shadow-lg transform -skew-x-12">
                #{index + 1}
            </div>

            <div className={`absolute top-3 right-3 z-10 flex items-center gap-1.5 transition-all ${isReorderMode ? 'opacity-100 scale-110' : 'opacity-0 group-hover:opacity-100'}`}>
                <button onClick={onMoveUp} disabled={index === 0} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/90 text-slate-600 hover:text-orange-500 shadow-md transition-all disabled:opacity-20 border border-slate-100"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" /></svg></button>
                <button onClick={onMoveDown} disabled={index === total - 1} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/90 text-slate-600 hover:text-orange-500 shadow-md transition-all disabled:opacity-20 border border-slate-100"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg></button>
                <button onClick={() => confirm("Remove drill from this day?") && onRemove()} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/90 text-red-500 hover:bg-red-50 shadow-md transition-all font-black border border-slate-100">✕</button>
            </div>

            <div 
                className="w-full aspect-[2/1] bg-slate-50 relative overflow-hidden"
                onMouseEnter={() => canvasRef.current?.startAnim()}
                onMouseLeave={() => canvasRef.current?.stopAnim()}
            >
                {drill.boardData ? (
                    <BoardPreviewCanvas
                        ref={canvasRef}
                        boardData={drill.boardData}
                        sport={drill.sport}
                        animate
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 italic font-black text-xs">DRILL DATA MISSING</div>
                )}
                
                {drill.id || drill.boardId ? (
                    <Link 
                        href={`/whiteboard/${drill.id || drill.boardId}?returnTo=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname + window.location.search : '')}`}
                        className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all"
                    >
                        <span className="px-6 py-2 bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-xl transform group-hover:scale-110 transition-transform">View Whiteboard →</span>
                    </Link>
                ) : (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="px-6 py-2 bg-slate-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl animate-pulse">Saving...</span>
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-white">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="text-[9px] font-black uppercase tracking-widest text-orange-500 leading-none mb-1">{drill.sport || "General"}</div>
                        {isEditing ? (
                            <input
                                autoFocus
                                value={localTitle}
                                onChange={e => setLocalTitle(e.target.value)}
                                onBlur={() => { onUpdate({ localTitle }); setIsEditing(false); }}
                                onKeyDown={e => { if (e.key === "Enter") { onUpdate({ localTitle }); setIsEditing(false); } }}
                                className="w-full border-b-2 border-orange-400 text-slate-800 text-sm font-black outline-none bg-transparent py-0.5 uppercase italic"
                            />
                        ) : (
                            <button onClick={() => setIsEditing(true)} className="text-left w-full hover:text-orange-600 transition-colors">
                                <span className="text-sm font-black text-slate-800 uppercase italic leading-none">{localTitle || "DRILL"}</span>
                                <span className="ml-2 text-[9px] text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">✎</span>
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <svg className="w-3.5 h-3.5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <input
                            type="number"
                            value={duration}
                            min={1}
                            onChange={e => setDuration(Number(e.target.value))}
                            onBlur={() => onUpdate({ durationMin: duration })}
                            className="w-12 text-center text-xs font-black text-slate-700 bg-slate-50 border border-slate-200 py-1 rounded-lg outline-none focus:border-orange-400"
                        />
                        <span className="text-[10px] font-black text-slate-400 uppercase">min</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
