"use client";

import { useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/react";
import { BoardPreviewCanvas, type BoardPreviewCanvasRef } from "~/features/dashboard/components/BoardPreviewCanvas";
import { FolderExplorer } from "~/features/dashboard/components/FolderExplorer";

interface SessionEntry {
    boardId: string;
    localTitle?: string;
    durationMin?: number;
    sessionOnly?: boolean;
}

const ENTRIES_MARKER = "<!--entries:";
const ENTRIES_END = ":entries-->";

function extractEntries(notes: string): SessionEntry[] {
    const start = notes.indexOf(ENTRIES_MARKER);
    const end = notes.indexOf(ENTRIES_END);
    if (start === -1 || end === -1) return [];
    try {
        return JSON.parse(notes.slice(start + ENTRIES_MARKER.length, end)) as SessionEntry[];
    } catch { return []; }
}

function extractHumanNotes(notes: string): string {
    const start = notes.indexOf(ENTRIES_MARKER);
    if (start === -1) return notes;
    return notes.slice(0, start).trimEnd();
}

export default function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    const { data: session, refetch, isLoading } = api.session.getById.useQuery({ id });
    const { data: allBoards = [] } = api.board.getAll.useQuery(
        { sport: session?.sport },
        { enabled: !!session }
    );

    const [showAddModal, setShowAddModal] = useState(false);
    const [isEditingHeader, setIsEditingHeader] = useState(false);
    const [editTitle, setEditTitle] = useState("");
    const [editNotes, setEditNotes] = useState("");

    const updateSession = api.session.update.useMutation({ onSuccess: () => void refetch() });
    const addBoard = api.session.addBoard.useMutation({ onSuccess: () => { void refetch(); setShowAddModal(false); } });
    const removeBoard = api.session.removeBoard.useMutation({ onSuccess: () => void refetch() });
    const updateEntry = api.session.updateEntry.useMutation({ onSuccess: () => void refetch() });
    const reorderBoards = api.session.reorderBoards.useMutation({ onSuccess: () => void refetch() });
    const createForSession = api.board.createForSession.useMutation({
        onSuccess: async (board) => {
            await addBoard.mutateAsync({ sessionId: id, boardId: board.id });
            void refetch();
        }
    });
    const deleteSession = api.session.delete.useMutation({ onSuccess: () => router.push("/dashboard/sessions") });

    if (isLoading) return (
        <div className="h-full flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    if (!session) return (
        <div className="h-full flex flex-col items-center justify-center gap-3 bg-slate-100">
            <p className="text-slate-500 font-bold">Session not found</p>
            <Link href="/dashboard/sessions" className="text-orange-500 font-black uppercase text-xs hover:underline">← Back to Sessions</Link>
        </div>
    );

    const entries = extractEntries(session.notes ?? "");
    const humanNotes = extractHumanNotes(session.notes ?? "");
    const orderedBoards = entries
        .map(entry => {
            const board = session.boards.find(b => b.id === entry.boardId);
            return board ? { board, entry } : null;
        })
        .filter(Boolean) as { board: typeof session.boards[0]; entry: SessionEntry }[];

    const totalDuration = entries.reduce((sum, e) => sum + (e.durationMin ?? 10), 0);
    const sport = session.sport;

    const saveHeader = () => {
        updateSession.mutate({ id, title: editTitle, notes: editNotes, entries });
        setIsEditingHeader(false);
    };

    const moveBoard = (idx: number, dir: -1 | 1) => {
        const newEntries = [...entries];
        const swap = idx + dir;
        if (swap < 0 || swap >= newEntries.length) return;
        [newEntries[idx], newEntries[swap]] = [newEntries[swap]!, newEntries[idx]!];
        reorderBoards.mutate({ sessionId: id, boardIds: newEntries.map(e => e.boardId) });
    };

    return (
        <div className="min-h-full flex flex-col relative">

            <div className="relative h-64 w-full px-8 flex items-center overflow-hidden flex-shrink-0">
                <div className="relative z-10 w-full flex items-end justify-between pb-28 h-full pt-16">
                    <div className="flex-1">
                        <Link href="/dashboard/sessions" className="inline-flex items-center gap-1 text-white/60 hover:text-white text-[10px] font-black uppercase tracking-widest mb-4 transition-all">
                            ← Sessions
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
                                        value={editNotes}
                                        onChange={e => setEditNotes(e.target.value)}
                                        placeholder="Add description..."
                                        className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white text-sm outline-none focus:bg-white/20 flex-1"
                                    />
                                    <button onClick={saveHeader} className="rounded-xl bg-orange-500 px-6 py-2 text-xs font-black text-white hover:bg-orange-600 transition-all shadow-lg">SAVE CHANGES</button>
                                    <button onClick={() => setIsEditingHeader(false)} className="rounded-xl bg-white/10 px-6 py-2 text-xs font-black text-white/60 hover:bg-white/20 transition-all">CANCEL</button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="h-14 w-2 bg-orange-500 transform -skew-x-12" />
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400">
                                                {sport} SESSION
                                            </div>
                                            {humanNotes && (
                                                <span className="text-[10px] font-bold text-white/40 italic truncate max-w-xs">
                                                    — {humanNotes}
                                                </span>
                                            )}
                                        </div>
                                        <h1 className="text-5xl font-black uppercase text-white tracking-tighter italic drop-shadow-xl leading-none">
                                            {session.title}
                                        </h1>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => { setEditTitle(session.title); setEditNotes(humanNotes); setIsEditingHeader(true); }}
                                        className="px-6 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all"
                                    >
                                        Edit Details
                                    </button>
                                    <button
                                        onClick={() => { if (confirm("Delete this session from repository?")) deleteSession.mutate({ id }); }}
                                        className="px-6 py-3 rounded-2xl bg-red-500/20 backdrop-blur-md border border-red-500/30 text-red-300 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/40 transition-all"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col px-8 pb-8 -mt-20 relative z-20">
                <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6">
                    <div className="flex-1 min-h-0 flex flex-col">
                        <div className="flex-1 min-h-0 bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden flex flex-col">
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white flex-shrink-0">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">SESSION DRILLS</h3>
                                <button
                                    onClick={() => setShowAddModal(true)}
                                    className="flex items-center gap-1.5 rounded-xl border-2 border-slate-100 bg-white px-4 py-2 text-xs font-black text-slate-600 hover:border-orange-400 hover:text-orange-500 transition-all shadow-sm"
                                >
                                    + ADD DRILL
                                </button>
                            </div>

                            <div className="flex-1 p-6 space-y-4">
                                {orderedBoards.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center py-20 grayscale opacity-40">
                                        <div className="text-6xl mb-4 text-slate-300 italic font-black">EMPTY</div>
                                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">No drills assigned to this session</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {orderedBoards.map(({ board, entry }, idx) => (
                                            <ExerciseCard
                                                key={`${board.id}-${idx}`}
                                                board={board}
                                                entry={entry}
                                                index={idx}
                                                total={orderedBoards.length}
                                                onMoveUp={() => moveBoard(idx, -1)}
                                                onMoveDown={() => moveBoard(idx, 1)}
                                                onRemove={() => removeBoard.mutate({ sessionId: id, boardId: board.id })}
                                                onUpdateEntry={(data) => updateEntry.mutate({ sessionId: id, boardId: board.id, ...data })}
                                            />
                                        ))}

                                        <button
                                            onClick={() => setShowAddModal(true)}
                                            className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 aspect-[2/1] transition-all hover:border-orange-400 hover:bg-orange-50 active:scale-95"
                                        >
                                            <div className="w-14 h-14 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-300 group-hover:text-orange-500 group-hover:scale-110 transition-all font-black text-3xl">
                                                +
                                            </div>
                                            <div className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-orange-600 italic">
                                                Add Session Drill
                                            </div>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="w-full lg:w-72 flex flex-col gap-4 flex-shrink-0">
                        <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-slate-200">
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Session Summary</div>
                            <div className="space-y-4">
                                <div>
                                    <div className="text-[9px] font-black text-orange-500 uppercase mb-0.5">Total Duration</div>
                                    <div className="text-3xl font-black text-slate-800 italic">{totalDuration} <span className="text-sm font-bold text-slate-400 ml-1">MIN</span></div>
                                </div>
                                <div className="h-px bg-slate-100" />
                                <div>
                                    <div className="text-[9px] font-black text-orange-500 uppercase mb-0.5">Exercises</div>
                                    <div className="text-3xl font-black text-slate-800 italic">{entries.length}</div>
                                </div>
                                <div className="h-px bg-slate-100" />
                                <div>
                                    <div className="text-[9px] font-black text-orange-500 uppercase mb-0.5">Average Time</div>
                                    <div className="text-3xl font-black text-slate-800 italic">{entries.length > 0 ? Math.round(totalDuration / entries.length) : 0} <span className="text-sm font-bold text-slate-400 ml-1">MIN</span></div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-orange-500 rounded-[2rem] p-6 shadow-xl text-white">
                            <div className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-2">Repository Tip</div>
                            <p className="text-xs font-bold leading-relaxed opacity-90 italic">
                                This session is stored in your global repository. Any changes made here will be visible when you assign it to the calendar.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {showAddModal && (
                <UnifiedAddModal
                    sport={sport}
                    excludeIds={entries.map(e => e.boardId)}
                    onAddExisting={(boardId, title) => addBoard.mutate({ sessionId: id, boardId, localTitle: title })}
                    onCreateRepo={(title) => createForSession.mutate({ title, sport, sessionId: id, sessionOnly: false })}
                    onCreateSessionOnly={(title) => createForSession.mutate({ title, sport, sessionId: id, sessionOnly: true })}
                    onClose={() => setShowAddModal(false)}
                />
            )}
        </div>
    );
}

function ExerciseCard({ board, entry, index, total, onMoveUp, onMoveDown, onRemove, onUpdateEntry }: {
    board: { id: string; title: string; sport: string; data: unknown };
    entry: SessionEntry;
    index: number;
    total: number;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onRemove: () => void;
    onUpdateEntry: (data: { localTitle?: string; durationMin?: number }) => void;
}) {
    const canvasRef = useRef<BoardPreviewCanvasRef>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [localTitle, setLocalTitle] = useState(entry.localTitle || "");
    const [duration, setDuration] = useState(entry.durationMin || 10);

    return (
        <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
            <div className="absolute top-3 left-3 z-10 w-8 h-8 rounded-full bg-orange-500 text-white text-[11px] font-black flex items-center justify-center shadow-lg transform -skew-x-12">
                #{index + 1}
            </div>

            <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={onMoveUp} disabled={index === 0} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/90 text-slate-600 hover:text-orange-500 shadow-md transition-all disabled:opacity-20"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" /></svg></button>
                <button onClick={onMoveDown} disabled={index === total - 1} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/90 text-slate-600 hover:text-orange-500 shadow-md transition-all disabled:opacity-20"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg></button>
                <button onClick={() => confirm("Remove drill from this session?") && onRemove()} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/90 text-red-500 hover:bg-red-50 shadow-md transition-all font-black">✕</button>
            </div>

            <div
                className="w-full aspect-[2/1] bg-slate-50 relative overflow-hidden"
                onMouseEnter={() => canvasRef.current?.startAnim()}
                onMouseLeave={() => canvasRef.current?.stopAnim()}
            >
                <BoardPreviewCanvas
                    ref={canvasRef}
                    boardData={(board as any).data}
                    sport={board.sport}
                    animate
                />

                <Link
                    href={`/whiteboard/${board.id}?returnTo=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname + window.location.search : '')}`}
                    className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all"
                >
                    <span className="px-6 py-2 bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-xl transform group-hover:scale-110 transition-transform">View Whiteboard →</span>
                </Link>
            </div>

            <div className="p-4 border-t border-slate-100 bg-white">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="text-[9px] font-black uppercase tracking-widest text-orange-500 leading-none mb-1">{board.sport}</div>
                        {isEditing ? (
                            <input
                                autoFocus
                                value={localTitle}
                                onChange={e => setLocalTitle(e.target.value)}
                                onBlur={() => { onUpdateEntry({ localTitle }); setIsEditing(false); }}
                                onKeyDown={e => { if (e.key === "Enter") { onUpdateEntry({ localTitle }); setIsEditing(false); } }}
                                className="w-full border-b-2 border-orange-400 text-slate-800 text-sm font-black outline-none bg-transparent py-0.5 uppercase italic"
                                placeholder={board.title}
                            />
                        ) : (
                            <button onClick={() => setIsEditing(true)} className="text-left w-full hover:text-orange-600 transition-colors">
                                <span className="text-sm font-black text-slate-800 uppercase italic leading-none">{localTitle || board.title}</span>
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
                            onBlur={() => onUpdateEntry({ durationMin: duration })}
                            className="w-12 text-center text-xs font-black text-slate-700 bg-slate-50 border border-slate-200 py-1 rounded-lg outline-none focus:border-orange-400"
                        />
                        <span className="text-[10px] font-black text-slate-400 uppercase">min</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function RepoBoardGridCard({ board, onClick }: { board: any, onClick: () => void }) {
    const canvasRef = useRef<BoardPreviewCanvasRef>(null);

    return (
        <button
            onClick={onClick}
            onMouseEnter={() => canvasRef.current?.startAnim()}
            onMouseLeave={() => canvasRef.current?.stopAnim()}
            className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white hover:border-orange-400 transition-all text-left shadow-sm hover:shadow-xl hover:-translate-y-0.5"
        >
            <div className="h-28 relative overflow-hidden bg-slate-100 flex-shrink-0">
                <BoardPreviewCanvas
                    ref={canvasRef}
                    sport={board.sport}
                    boardData={board.data}
                    animate={true}
                />
                <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-all" />
            </div>
            <div className="p-3 border-t border-slate-100 min-w-0 flex-shrink-0">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{board.sport}</div>
                <div className="text-xs font-black text-slate-800 truncate uppercase tracking-tight">{board.title}</div>
            </div>
        </button>
    );
}

function UnifiedAddModal({ sport, excludeIds, onAddExisting, onCreateRepo, onCreateSessionOnly, onClose }: {
    sport: string;
    excludeIds: string[];
    onAddExisting: (boardId: string, title: string) => void;
    onCreateRepo: (title: string) => void;
    onCreateSessionOnly: (title: string) => void;
    onClose: () => void;
}) {
    const [tab, setTab] = useState<"repo" | "new_repo" | "session_only">("repo");
    const [title, setTitle] = useState("");



    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] transition-all" onClick={e => e.stopPropagation()}>

                <div className="bg-white border-b border-slate-100 flex-shrink-0">
                    <div className="p-8 pb-4 flex items-center justify-between relative">
                        <div>
                            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">ADD DRILL</h2>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">SPORT: {sport}</p>
                        </div>
                        <button onClick={onClose} className="text-slate-300 hover:text-slate-600 font-black text-xl transition-all">✕</button>
                    </div>
                </div>

                <div className="flex px-8 gap-10 border-b border-slate-100 bg-white flex-shrink-0">
                    <button
                        onClick={() => setTab("repo")}
                        className={`py-4 text-[10px] font-black uppercase tracking-[0.15em] transition-all border-b-2 ${tab === "repo" || tab === "new_repo" ? "border-orange-500 text-orange-500" : "border-transparent text-slate-400 hover:text-slate-600"}`}
                    >
                        REPOSITORY
                    </button>
                    <button
                        onClick={() => setTab("session_only")}
                        className={`py-4 text-[10px] font-black uppercase tracking-[0.15em] transition-all border-b-2 ${tab === "session_only" ? "border-orange-500 text-orange-500" : "border-transparent text-slate-400 hover:text-slate-600"}`}
                    >
                        SESSION ONLY
                    </button>
                </div>

                {tab === "repo" ? (
                    <div className="overflow-y-auto flex-1 bg-white min-h-0 custom-scrollbar p-6 space-y-6">
                        <FolderExplorer
                            type="board"
                            sport={sport}
                            hideOptions={true}
                            excludeIds={excludeIds}
                            onSelect={(id, bTitle) => onAddExisting(id, bTitle)}
                            onNewClick={() => setTab("new_repo")}
                        />
                    </div>
                ) : tab === "new_repo" ? (
                    <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
                        <div className="max-w-xl mx-auto w-full space-y-8">
                            <div className="flex items-center justify-between">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">New Global Drill</h3>
                                <button onClick={() => setTab("repo")} className="text-[10px] font-black text-orange-500 uppercase tracking-widest hover:underline">← Back</button>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Repo Drill Title</label>
                                <input
                                    autoFocus value={title} onChange={e => setTitle(e.target.value)}
                                    onKeyDown={e => { if (e.key === "Enter" && title.trim()) { onCreateRepo(title); onClose(); } }}
                                    placeholder="e.g. 2vs2 attacking drill"
                                    className="w-full border-2 border-slate-100 rounded-[2rem] px-8 py-5 text-lg font-black text-slate-800 placeholder:text-slate-300 outline-none focus:border-orange-400 transition-all bg-slate-50"
                                />
                            </div>

                            <div className="p-6 rounded-[2rem] border border-orange-100 bg-orange-50 text-orange-700">
                                <p className="text-[10px] font-black uppercase leading-relaxed tracking-wider px-2">
                                    This will add the board to your permanent repository so you can reuse it in future sessions.
                                </p>
                            </div>

                            <button
                                disabled={!title.trim()}
                                onClick={() => { onCreateRepo(title); onClose(); }}
                                className="w-full py-6 rounded-[2rem] bg-orange-500 text-white font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-orange-500/20 hover:bg-orange-600 transition-all hover:-translate-y-1 active:translate-y-0 disabled:opacity-40"
                            >
                                Save to Repository →
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
                        <div className="max-w-xl mx-auto w-full space-y-8">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">New Session Exclusive Drill</h3>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Session Drill Title</label>
                                <input
                                    autoFocus value={title} onChange={e => setTitle(e.target.value)}
                                    onKeyDown={e => { if (e.key === "Enter" && title.trim()) { onCreateSessionOnly(title); onClose(); } }}
                                    placeholder="Exclusive to this session..."
                                    className="w-full border-2 border-slate-100 rounded-[2rem] px-8 py-5 text-lg font-black text-slate-800 placeholder:text-slate-300 outline-none focus:border-orange-400 transition-all bg-slate-50"
                                />
                            </div>

                            <div className="p-6 rounded-[2rem] border border-amber-100 bg-amber-50 text-amber-700">
                                <p className="text-[10px] font-black uppercase leading-relaxed tracking-wider px-2">
                                    This board will NOT be saved to your repository. It will only exist within this specific training session.
                                </p>
                            </div>

                            <button
                                disabled={!title.trim()}
                                onClick={() => { onCreateSessionOnly(title); onClose(); }}
                                className="w-full py-6 rounded-[2rem] bg-orange-500 text-white font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-orange-500/20 hover:bg-orange-600 transition-all hover:-translate-y-1 active:translate-y-0 disabled:opacity-40"
                            >
                                Create Session Board →
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
