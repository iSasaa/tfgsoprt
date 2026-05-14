"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useVisualViewport } from "~/hooks/useVisualViewport";
import { api } from "~/trpc/react";
import { useCalendarSchedule } from "~/features/dashboard/hooks/useCalendarSchedule";
import type { CalendarEvent, EventType } from "~/features/dashboard/hooks/useCalendarSchedule";
import { BoardPreviewCanvas, type BoardPreviewCanvasRef } from "~/features/dashboard/components/BoardPreviewCanvas";
import { useDashboard } from "~/context/DashboardContext";
import { NativeScrollArea } from "~/components/ui/NativeScrollArea";

interface CalendarAddModalProps {
    isOpen: boolean;
    initialDate?: Date;
    initialTime?: string;
    onClose: () => void;
    onConfirm: (event: Omit<CalendarEvent, "id">, dateKey: string) => Promise<any>;
    isPersonal?: boolean;
}

const EVENT_TYPES: { value: EventType; label: string; color: string }[] = [
    { value: "session", label: "Training Session", color: "bg-orange-500" },
    { value: "match", label: "Match", color: "bg-blue-500" },
    { value: "training", label: "Practice", color: "bg-green-500" },
    { value: "other", label: "Other", color: "bg-purple-500" },
];

function formatDate(dateKey: string): string {
    const [y, m, d] = dateKey.split("-").map(Number);
    const date = new Date(y!, m! - 1, d!);
    return date.toLocaleDateString("en-GB", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
}

function useStylusTap(onTap: () => void, disabled?: boolean) {
    const startPos = useRef({ x: 0, y: 0 });
    const startTime = useRef(0);

    const onPointerDown = (e: React.PointerEvent) => {
        if (disabled) return;
        startPos.current = { x: e.clientX, y: e.clientY };
        startTime.current = Date.now();
    };

    const onPointerUp = (e: React.PointerEvent) => {
        if (disabled) return;
        const dist = Math.sqrt(
            Math.pow(e.clientX - startPos.current.x, 2) +
            Math.pow(e.clientY - startPos.current.y, 2)
        );
        const duration = Date.now() - startTime.current;
        if (dist < 20 && duration < 600) {
            onTap();
        }
    };

    return { onPointerDown, onPointerUp };
}

function DrillPreviewCard({ drill, sport }: { drill: any; sport: string }) {
    const canvasRef = useRef<BoardPreviewCanvasRef>(null);
    return (
        <div
            className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all cursor-default"
            onMouseEnter={() => canvasRef.current?.startAnim()}
            onMouseLeave={() => canvasRef.current?.stopAnim()}
        >
            <div className="relative aspect-[2/1] bg-slate-100 overflow-hidden">
                <BoardPreviewCanvas
                    ref={canvasRef}
                    sport={sport}
                    boardData={drill.boardData ?? drill.data}
                    animate={true}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all" />
            </div>
            <div className="p-2.5 border-t border-slate-100">
                <div className="text-[9px] font-black text-orange-500 uppercase tracking-widest leading-none mb-0.5">{drill.sport || sport}</div>
                <div className="text-xs font-black text-slate-800 truncate uppercase leading-tight">{drill.localTitle || drill.title || "Drill"}</div>
            </div>
        </div>
    );
}

function DrillsSidePanel({ session, onClose }: { session: any; onClose: () => void }) {
    const { data: fullSession } = api.session.getById.useQuery(
        { id: session.id },
        { enabled: !!session.id }
    );

    const drills: any[] = fullSession?.boards ?? [];

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="w-96 bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            style={{ maxHeight: "75vh" }}
        >
            <div className="bg-[#0f2d40] px-5 py-5 flex items-center justify-between flex-shrink-0">
                <div className="min-w-0 flex-1 pr-3">
                    <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-0.5">Drills preview</div>
                    <h3 className="text-sm font-black uppercase italic text-white tracking-tight truncate">{session.title}</h3>
                </div>
                <button onClick={onClose} onPointerDown={(e) => { e.preventDefault(); onClose(); }} className="text-white/40 hover:text-white transition-colors font-black flex-shrink-0 text-lg">✕</button>
            </div>

            <div className="overflow-y-auto flex-1 p-4 custom-scrollbar">
                {!fullSession ? (
                    <div className="space-y-3 mt-1">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
                        ))}
                    </div>
                ) : drills.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-300">
                        <div className="text-3xl font-black italic mb-1">EMPTY</div>
                        <p className="text-[10px] font-bold uppercase tracking-widest">No drills</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        {drills.map((drill: any, i: number) => (
                            <DrillPreviewCard
                                key={drill.id ?? i}
                                drill={drill}
                                sport={session.sport}
                            />
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    );
}

function SessionPickerPopup({
    sport,
    onSelect,
    onClose,
}: {
    sport: string;
    onSelect: (session: any) => void;
    onClose: () => void;
}) {
    const [search, setSearch] = useState("");
    const [previewSession, setPreviewSession] = useState<any | null>(null);
    const { height: vh, offsetTop: vt } = useVisualViewport();

    const { data: sessions = [], isLoading } = api.session.getRecent.useQuery(
        { sport: sport || undefined },
    );

    const filtered = (sessions as any[]).filter((s: any) =>
        s.title.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div
            style={{
                position: 'fixed',
                left: 0,
                right: 0,
                top: `${vt}px`,
                height: vh ? `${vh}px` : '100dvh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 310,
                touchAction: "none"
            }}
            onClick={onClose}
        >
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[-1]" />

            <div
                className="relative z-10 flex items-start gap-3"
                onClick={e => e.stopPropagation()}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 16 }}
                    className="w-96 bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden"
                    style={{ maxHeight: "75vh" }}
                >
                    <div className="bg-[#0f2d40] px-6 py-5 flex-shrink-0">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-0.5">Select Training Session</div>
                                <h3 className="text-lg font-black uppercase italic text-white tracking-tight">{sport} Sessions</h3>
                            </div>
                            <button onClick={onClose} onPointerDown={(e) => { e.preventDefault(); onClose(); }} className="text-white/40 hover:text-white transition-colors text-xl font-black">✕</button>
                        </div>
                        <input
                            autoFocus
                            type="text"
                            placeholder="Search sessions..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full rounded-xl border-0 bg-white/10 px-4 py-2.5 text-base font-bold text-white placeholder:text-white/30 outline-none focus:bg-white/20 transition-all"
                        />
                    </div>

                    <div className="overflow-y-auto flex-1 p-4 space-y-2 custom-scrollbar">
                        {isLoading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="h-16 rounded-2xl bg-slate-100 animate-pulse" />
                            ))
                        ) : filtered.length === 0 ? (
                            <div className="py-16 text-center text-slate-300 text-sm font-bold uppercase tracking-widest">
                                No sessions found
                            </div>
                        ) : (
                            filtered.map((s: any) => (
                                <div
                                    key={s.id}
                                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all ${previewSession?.id === s.id
                                        ? "border-orange-400 bg-orange-50"
                                        : "border-slate-200 bg-white hover:border-orange-300 hover:bg-orange-50"
                                        }`}
                                >
                                    <button
                                        className="flex-1 text-left min-w-0"
                                        onClick={() => { onSelect(s); onClose(); }}
                                        onPointerDown={(e) => { e.preventDefault(); onSelect(s); onClose(); }}
                                    >
                                        <div className="text-[9px] font-black text-orange-500 uppercase tracking-widest leading-none mb-0.5">{s.sport}</div>
                                        <div className="text-sm font-black text-slate-800 uppercase italic truncate">{s.title}</div>
                                        <div className="text-[10px] font-bold text-slate-400 mt-0.5">{s._count?.boards ?? 0} drills</div>
                                    </button>

                                    <button
                                        onClick={() => setPreviewSession(previewSession?.id === s.id ? null : s)}
                                        onPointerDown={(e) => { e.preventDefault(); setPreviewSession(previewSession?.id === s.id ? null : s); }}
                                        className={`flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl transition-all font-black text-xl leading-none ${previewSession?.id === s.id
                                            ? "bg-orange-500 text-white shadow-md"
                                            : "bg-slate-100 text-slate-400 hover:bg-orange-100 hover:text-orange-500"
                                            }`}
                                        title="Preview drills"
                                    >
                                        ›
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </motion.div>

                <AnimatePresence>
                    {previewSession && (
                        <DrillsSidePanel
                            session={previewSession}
                            onClose={() => setPreviewSession(null)}
                        />
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

export function CalendarAddModal({ isOpen, initialDate, initialTime, onClose, onConfirm, isPersonal = false }: CalendarAddModalProps) {
    const [selectedDate, setSelectedDate] = useState<string>("");
    const [title, setTitle] = useState("");
    const [eventType, setEventType] = useState<EventType>("session");
    const [time, setTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [showSessionPicker, setShowSessionPicker] = useState(false);
    const [linkedSession, setLinkedSession] = useState<any | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const { height, offsetTop, isKeyboardOpen } = useVisualViewport();
    const { selectedSport, selectedTeamId, selectedClubId } = useDashboard();
    const { data: clubs = [] } = api.club.getHierarchy.useQuery(undefined, { enabled: isOpen });

    const [targetClubId, setTargetClubId] = useState<string>("");
    const [targetSportId, setTargetSportId] = useState<string>("");
    const [targetTeamId, setTargetTeamId] = useState<string>("");

    const [isSaving, setIsSaving] = useState(false);

    const handleConfirm = async () => {
        if (!title.trim() || isSaving) return;

        const sportName = (() => {
            if (targetSportId && targetClubId && clubs) {
                const club = (clubs as any[]).find(c => c.id === targetClubId);
                const sport = club?.sports?.find((s: any) => s.id === targetSportId);
                return sport?.name.toLowerCase();
            }
            return selectedSport || "hockey";
        })();

        setIsSaving(true);
        try {
            await onConfirm({
                title: title.trim(),
                type: eventType,
                sport: sportName,
                time: time || undefined,
                endTime: endTime || undefined,
                sessionId: linkedSession?.id ?? undefined,
                teamId: targetTeamId || undefined,
                clubId: targetClubId || undefined,
            }, selectedDate);
            onClose();
        } catch (error) {
            console.error("Failed to add event:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const canConfirm = !!title.trim() && !!selectedDate && !isSaving && (!time || (!!endTime && endTime > time)) && (!targetClubId || (!!targetSportId && !!targetTeamId));

    const cancelTapHandlers = useStylusTap(onClose);
    const saveTapHandlers = useStylusTap(handleConfirm, !canConfirm || isSaving);

    useEffect(() => {
        if (isOpen) {
            if (initialDate) {
                const y = initialDate.getFullYear();
                const m = String(initialDate.getMonth() + 1).padStart(2, "0");
                const d = String(initialDate.getDate()).padStart(2, "0");
                setSelectedDate(`${y}-${m}-${d}`);
            } else {
                setSelectedDate("");
            }
            setTitle("");
            setEventType("session");
            setTime(initialTime || "");
            setEndTime("");
            setLinkedSession(null);
            setShowSessionPicker(false);

            setTargetClubId("");
            setTargetTeamId("");
            setTargetSportId("");

            setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 100);
        }
    }, [isOpen, initialDate, initialTime, selectedClubId, selectedTeamId]);

    useEffect(() => {
        if (isOpen && targetClubId && clubs) {
            const club = (clubs as any[]).find(c => c.id === targetClubId);
            if (club && club.sports?.length > 0 && !targetSportId) {
                const matchingSport = club.sports.find((s: any) => s.name.toLowerCase() === selectedSport.toLowerCase());
                setTargetSportId(matchingSport?.id || club.sports[0].id);
            }
        }
    }, [isOpen, targetClubId, clubs, selectedSport]);


    return (
        <AnimatePresence>
            {isOpen && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 200,
                        touchAction: "none"
                    }}
                >
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
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
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-md flex flex-col rounded-3xl bg-white shadow-2xl pointer-events-auto overflow-hidden"
                            style={{
                                maxHeight: 'calc(100% - 2rem)',
                                marginTop: isKeyboardOpen ? '1rem' : '0'
                            }}
                        >
                            <div className="bg-[#0f2d40] px-6 py-6 text-white flex-shrink-0">
                                <div className="text-[10px] font-extrabold uppercase tracking-widest text-white/40 mb-1">Calendar</div>
                                <h3 className="text-xl font-black uppercase tracking-tight italic">📅 Schedule Entry</h3>
                            </div>

                            <NativeScrollArea
                                className="p-6 space-y-4 flex-1"
                                style={{
                                    maxHeight: '100%',
                                }}
                            >
                                {isPersonal && (
                                    <div className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 space-y-3">
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                            <div className="h-1 w-4 bg-orange-400 rounded-full" />
                                            Destination (Optional)
                                        </div>

                                        <div className="grid grid-cols-1 gap-3">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase ml-1">Club</span>
                                                <select
                                                    value={targetClubId}
                                                    onChange={e => {
                                                        setTargetClubId(e.target.value);
                                                        setTargetSportId("");
                                                        setTargetTeamId("");
                                                    }}
                                                    className="w-full bg-white border-2 border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-orange-400 transition-all"
                                                >
                                                    <option value="">No Club (Personal)</option>
                                                    {(clubs as any[]).map(c => (
                                                        <option key={c.id} value={c.id}>{c.name}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase ml-1">Category</span>
                                                    <select
                                                        value={targetSportId}
                                                        disabled={!targetClubId}
                                                        onChange={e => {
                                                            setTargetSportId(e.target.value);
                                                            setTargetTeamId("");
                                                        }}
                                                        className="w-full bg-white border-2 border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-orange-400 transition-all disabled:opacity-50"
                                                    >
                                                        <option value="">Select Category...</option>
                                                        {targetClubId && (clubs as any[]).find(c => c.id === targetClubId)?.sports?.map((s: any) => (
                                                            <option key={s.id} value={s.id}>{s.name}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase ml-1">Team</span>
                                                    <select
                                                        value={targetTeamId}
                                                        disabled={!targetSportId}
                                                        onChange={e => setTargetTeamId(e.target.value)}
                                                        className="w-full bg-white border-2 border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-orange-400 transition-all disabled:opacity-50"
                                                    >
                                                        <option value="">General (No Team)</option>
                                                        {targetSportId && (clubs as any[]).find(c => c.id === targetClubId)?.sports?.find((s: any) => s.id === targetSportId)?.teams?.map((t: any) => (
                                                            <option key={t.id} value={t.id}>{t.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <label className="mb-2 block text-xs font-bold uppercase text-slate-400">Event Title</label>
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        placeholder="e.g. Friday Practice"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        onKeyDown={e => { if (e.key === "Enter" && canConfirm) handleConfirm(); }}
                                        onPointerDown={(e) => e.currentTarget.focus()}
                                        style={{ touchAction: 'manipulation' }}
                                        className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-4 py-3 text-lg font-bold text-slate-900 focus:border-orange-500 focus:outline-none transition-all"
                                    />
                                </div>

                                <div className="w-full">
                                    <label className="mb-2 block text-xs font-bold uppercase text-slate-400">Date *</label>
                                    <input
                                        type="date"
                                        value={selectedDate}
                                        onChange={e => setSelectedDate(e.target.value)}
                                        onPointerDown={(e) => {
                                            try { (e.currentTarget as any).showPicker(); }
                                            catch (err) { e.currentTarget.focus(); e.currentTarget.click(); }
                                        }}
                                        style={{ touchAction: 'manipulation' }}
                                        className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-4 py-2.5 text-base font-bold text-slate-900 focus:border-orange-500 focus:outline-none transition-all appearance-none"
                                    />
                                </div>

                                <div>
                                    {linkedSession ? (
                                        <div className="flex items-center gap-3 rounded-xl border-2 border-orange-200 bg-orange-50 px-4 py-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[9px] font-black text-orange-400 uppercase tracking-widest leading-none mb-0.5">Linked Session</div>
                                                <div className="text-sm font-black text-orange-700 uppercase italic truncate">{linkedSession.title}</div>
                                            </div>
                                            <button
                                                onClick={() => setLinkedSession(null)}
                                                onPointerDown={(e) => { e.preventDefault(); setLinkedSession(null); }}
                                                className="text-orange-300 hover:text-orange-600 font-black text-sm transition-colors"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setShowSessionPicker(true)}
                                            onPointerDown={(e) => { e.preventDefault(); setShowSessionPicker(true); }}
                                            className="w-full flex items-center justify-between rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-400 hover:border-orange-400 hover:text-orange-500 hover:bg-orange-50 transition-all group"
                                        >
                                            <span>+ Load Training Session</span>
                                            <span className="text-xl group-hover:translate-x-0.5 transition-transform">›</span>
                                        </button>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-bold uppercase text-slate-400">Type</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {EVENT_TYPES.map(et => (
                                            <button
                                                key={et.value}
                                                type="button"
                                                onClick={() => setEventType(et.value)}
                                                onPointerDown={(e) => { e.preventDefault(); setEventType(et.value); }}
                                                className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-[11px] font-bold transition-all truncate ${eventType === et.value
                                                    ? "border-orange-500 bg-orange-50 text-orange-600"
                                                    : "border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200"
                                                    }`}
                                            >
                                                <div className={`h-2.5 w-2.5 rounded-full ${et.color} flex-shrink-0`} />
                                                <span className="truncate">{et.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="min-w-0">
                                        <label className="mb-2 block text-xs font-bold uppercase text-slate-400">Start Time</label>
                                        <input
                                            type="time"
                                            value={time}
                                            onChange={e => setTime(e.target.value)}
                                            onPointerDown={(e) => {
                                                try { (e.currentTarget as any).showPicker(); }
                                                catch (err) { e.currentTarget.focus(); e.currentTarget.click(); }
                                            }}
                                            style={{ touchAction: 'manipulation' }}
                                            className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-900 focus:border-orange-500 focus:outline-none transition-all appearance-none"
                                        />
                                    </div>
                                    <div className="min-w-0">
                                        <label className={`mb-2 block text-xs font-bold uppercase ${time ? "text-orange-500" : "text-slate-400"}`}>
                                            End Time {time && "*"}
                                        </label>
                                        <input
                                            type="time"
                                            disabled={!time}
                                            value={endTime}
                                            onChange={e => setEndTime(e.target.value)}
                                            onPointerDown={(e) => {
                                                if (!time) return;
                                                try { (e.currentTarget as any).showPicker(); }
                                                catch (err) { e.currentTarget.focus(); e.currentTarget.click(); }
                                            }}
                                            style={{ touchAction: 'manipulation' }}
                                            className={`w-full rounded-xl border-2 px-3 py-2.5 text-sm font-bold outline-none transition-all appearance-none ${!time ? "bg-slate-50 border-slate-50 text-slate-300 cursor-not-allowed" :
                                                !endTime ? "bg-white border-orange-200 text-slate-900 focus:border-orange-500" :
                                                    "bg-white border-slate-100 text-slate-900 focus:border-orange-500"
                                                }`}
                                        />
                                    </div>
                                </div>
                                {time && !endTime && (
                                    <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest text-center mt-2">End time is required when start time is set</p>
                                )}
                                {time && endTime && endTime <= time && (
                                    <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest text-center mt-2">End time must be after start time</p>
                                )}
                            </NativeScrollArea>

                            <div className="p-6 pt-0 flex gap-3 flex-shrink-0 border-t border-slate-50 bg-white">
                                <button
                                    type="button"
                                    {...cancelTapHandlers}
                                    className="flex-1 rounded-xl bg-slate-100 py-3 font-bold text-slate-500 hover:bg-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    {...saveTapHandlers}
                                    disabled={!canConfirm || isSaving}
                                    className="flex-1 rounded-xl bg-orange-500 py-3 font-bold text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                                >
                                    {isSaving ? (
                                        <>
                                            <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ADDING...
                                        </>
                                    ) : (
                                        "Add to Calendar"
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>

                    <AnimatePresence>
                        {showSessionPicker && (
                            <SessionPickerPopup
                                sport={(selectedSport || "hockey").toLowerCase()}
                                onSelect={s => {
                                    setLinkedSession(s);
                                    if (!title) setTitle(s.title);
                                    setShowSessionPicker(false);
                                }}
                                onClose={() => setShowSessionPicker(false)}
                            />
                        )}
                    </AnimatePresence>
                </div>
            )}
        </AnimatePresence>
    );
}
