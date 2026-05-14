"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, X, Clock, Trash2 } from "lucide-react";
import { useCalendarSchedule } from "~/features/dashboard/hooks/useCalendarSchedule";
import type { CalendarEvent } from "~/features/dashboard/hooks/useCalendarSchedule";
import { CalendarAddModal } from "~/features/dashboard/components/CalendarAddModal";
import { useDashboard } from "~/context/DashboardContext";
import { NativeScrollArea } from "~/components/ui/NativeScrollArea";
import { api } from "~/trpc/react";
import { motion, AnimatePresence } from "framer-motion";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

function toDateKey(year: number, month: number, day: number): string {
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${year}-${mm}-${dd}`;
}

function sortEvents(events: CalendarEvent[]): CalendarEvent[] {
    return [...events].sort((a, b) => {
        if (!a.time && !b.time) return 0;
        if (!a.time) return -1;
        if (!b.time) return 1;
        return a.time.localeCompare(b.time);
    });
}

function eventColor(type: CalendarEvent["type"]) {
    switch (type) {
        case "session": return "bg-orange-100 border-orange-300 text-orange-700";
        case "match": return "bg-blue-100 border-blue-300 text-blue-700";
        case "training": return "bg-green-100 border-green-300 text-green-700";
        default: return "bg-purple-100 border-purple-300 text-purple-700";
    }
}

function eventDot(type: CalendarEvent["type"]) {
    switch (type) {
        case "session": return "bg-orange-500";
        case "match": return "bg-blue-500";
        case "training": return "bg-green-500";
        default: return "bg-purple-500";
    }
}

function useStylusTap(onTap: () => void) {
    const startPos = useRef({ x: 0, y: 0 });
    const startTime = useRef(0);

    const onPointerDown = (e: React.PointerEvent) => {
        startPos.current = { x: e.clientX, y: e.clientY };
        startTime.current = Date.now();
    };

    const onPointerUp = (e: React.PointerEvent) => {
        const dist = Math.sqrt(
            Math.pow(e.clientX - startPos.current.x, 2) +
            Math.pow(e.clientY - startPos.current.y, 2)
        );
        const duration = Date.now() - startTime.current;
        if (dist < 10 && duration < 500) {
            onTap();
        }
    };

    return { onPointerDown, onPointerUp };
}

export function PersonalCalendar() {
    const today = new Date();
    const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
    const [view, setView] = useState<'month' | 'week' | 'day'>('month');
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [initialTime, setInitialTime] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [selectedDayForPopup, setSelectedDayForPopup] = useState<string | null>(null);

    const [selectedClubs, setSelectedClubs] = useState<string[]>([]);
    const [selectedSports, setSelectedSports] = useState<string[]>([]);
    const [selectedTeams, setSelectedTeams] = useState<string[]>([]);

    const { addEvent, removeEvent, getEventsForDate, isHydrated } = useCalendarSchedule();

    const { data: clubs = [] } = api.club.getHierarchy.useQuery(undefined, {
        staleTime: 5 * 60 * 1000,
    });

    const teamMeta = useMemo(() => {
        const map = new Map<string, { teamName: string; sportName: string; clubName: string; clubId: string; sportId: string }>();
        for (const club of (clubs as any[])) {
            for (const sport of club.sports ?? []) {
                for (const team of sport.teams ?? []) {
                    map.set(team.id, {
                        teamName: team.name,
                        sportName: sport.name,
                        clubName: club.name,
                        clubId: club.id,
                        sportId: sport.id
                    });
                }
            }
        }
        return map;
    }, [clubs]);

    const filteredGetEventsForDate = (dateKey: string) => {
        const rawEvents = getEventsForDate(dateKey);
        return rawEvents.filter(e => {
            if (!e.teamId) {
                return selectedClubs.length === 0 && selectedSports.length === 0 && selectedTeams.length === 0;
            }
            const meta = teamMeta.get(e.teamId);
            if (!meta) return false;

            const clubMatch = selectedClubs.length === 0 || selectedClubs.includes(meta.clubId);
            const sportMatch = selectedSports.length === 0 || selectedSports.includes(meta.sportId);
            const teamMatch = selectedTeams.length === 0 || selectedTeams.includes(e.teamId);

            return clubMatch && sportMatch && teamMatch;
        });
    };

    const router = useRouter();

    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();

    const handleEventClick = (event: CalendarEvent, dateKey: string) => {
        if (event.type === "session") {
            router.push(`/dashboard/calendar/session/${dateKey}/${event.id}`);
        } else {
            setSelectedEvent(event);
        }
    };

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const startOffset = (firstDayOfMonth + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const trailingCells = 42 - (daysInMonth + startOffset);

    const openModal = (dateKey?: string, time?: string) => {
        if (dateKey) {
            const [y, m, d] = dateKey.split("-").map(Number);
            setSelectedDate(new Date(y!, m! - 1, d!));
        } else {
            setSelectedDate(undefined);
        }
        setInitialTime(time || "");
        setIsModalOpen(true);
    };
    const closeModal = () => setIsModalOpen(false);

    const closePopup = () => setSelectedDayForPopup(null);
    const popupEvents = selectedDayForPopup ? filteredGetEventsForDate(selectedDayForPopup) : [];

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden relative">
            <div className="px-4 py-3 bg-white border-b border-slate-100 flex flex-wrap gap-4 items-center shadow-sm relative z-[80]">
                <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Clubs</span>
                    <div className="flex gap-1 flex-wrap">
                        {(clubs as any[]).map(c => {
                            const active = selectedClubs.includes(c.id);
                            return (
                                <button key={c.id} onClick={() => setSelectedClubs(prev => active ? prev.filter(id => id !== c.id) : [...prev, c.id])}
                                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all border ${active ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}>
                                    {c.name}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Sports</span>
                    <div className="flex gap-1 flex-wrap">
                        {(clubs as any[])
                            .filter(c => selectedClubs.length === 0 || selectedClubs.includes(c.id))
                            .flatMap(c => c.sports || [])
                            .filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i)
                            .map(s => {
                                const active = selectedSports.includes(s.id);
                                return (
                                    <button key={s.id} onClick={() => setSelectedSports(prev => active ? prev.filter(id => id !== s.id) : [...prev, s.id])}
                                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all border ${active ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-slate-500 border-slate-200 hover:border-orange-400'}`}>
                                        {s.name}
                                    </button>
                                );
                            })}
                    </div>
                </div>

                <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Teams</span>
                    <div className="flex gap-1 flex-wrap">
                        {(clubs as any[])
                            .filter(c => selectedClubs.length === 0 || selectedClubs.includes(c.id))
                            .flatMap(c => c.sports || [])
                            .filter(s => selectedSports.length === 0 || selectedSports.includes(s.id))
                            .flatMap(s => s.teams || [])
                            .filter((t, i, arr) => arr.findIndex(x => x.id === t.id) === i)
                            .map(t => {
                                const active = selectedTeams.includes(t.id);
                                return (
                                    <button key={t.id} onClick={() => setSelectedTeams(prev => active ? prev.filter(id => id !== t.id) : [...prev, t.id])}
                                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all border ${active ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-400'}`}>
                                        {t.name}
                                    </button>
                                );
                            })}
                    </div>
                </div>

                {(selectedClubs.length > 0 || selectedSports.length > 0 || selectedTeams.length > 0) && (
                    <button onClick={() => { setSelectedClubs([]); setSelectedSports([]); setSelectedTeams([]); }}
                        className="ml-auto text-[10px] font-black uppercase text-red-400 hover:text-red-500 flex items-center gap-1 bg-red-50 px-3 py-1.5 rounded-full transition-colors">
                        <X size={12} /> Clear Filters
                    </button>
                )}
            </div>

            <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/50 flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-3 shrink-0">
                    <button
                        onClick={() => {
                            const next = new Date(currentDate);
                            if (view === 'month') next.setMonth(next.getMonth() - 1);
                            else if (view === 'week') next.setDate(next.getDate() - 7);
                            else next.setDate(next.getDate() - 1);
                            setCurrentDate(next);
                        }}
                        className="p-2 hover:bg-white rounded-xl border border-slate-200 text-slate-600 transition-all shadow-sm"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <h2 className="text-sm sm:text-lg font-black text-slate-800 uppercase tracking-tight min-w-[120px] sm:min-w-[160px] text-center">
                        {view === 'month' ? `${MONTHS[month]} ${year}` :
                            view === 'week' ? `Week of ${currentDate.getDate()} ${MONTHS[currentDate.getMonth()]}` :
                                `${currentDate.getDate()} ${MONTHS[currentDate.getMonth()]}`}
                    </h2>
                    <button
                        onClick={() => {
                            const next = new Date(currentDate);
                            if (view === 'month') next.setMonth(next.getMonth() + 1);
                            else if (view === 'week') next.setDate(next.getDate() + 7);
                            else next.setDate(next.getDate() + 1);
                            setCurrentDate(next);
                        }}
                        className="p-2 hover:bg-white rounded-xl border border-slate-200 text-slate-600 transition-all shadow-sm"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>

                <div className="hidden md:flex items-center gap-4 px-4 py-1.5 bg-white/50 rounded-xl border border-slate-200/50">
                    {[
                        { label: "Session", dot: "bg-orange-500" },
                        { label: "Match", dot: "bg-blue-500" },
                        { label: "Practice", dot: "bg-green-500" },
                        { label: "Other", dot: "bg-purple-500" }
                    ].map(item => (
                        <div key={item.label} className="flex items-center gap-1.5">
                            <div className={`h-1.5 w-1.5 rounded-full ${item.dot}`} />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.label}</span>
                        </div>
                    ))}
                </div>

                <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm ml-auto">
                    {(['month', 'week', 'day'] as const).map((v) => (
                        <button
                            key={v}
                            onClick={() => setView(v)}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${view === v
                                ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                                }`}
                        >
                            {v}
                        </button>
                    ))}
                    <div className="w-px h-4 bg-slate-100 mx-1" />
                    <button
                        onClick={() => openModal()}
                        className="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2"
                    >
                        <Plus size={14} strokeWidth={3} />
                        Add
                    </button>
                </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
                {view === 'month' && (
                    <div className="grid grid-cols-7 bg-slate-50/30 border-b border-slate-100">
                        {DAYS.map(day => (
                            <div key={day} className="py-2 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {day}
                            </div>
                        ))}
                    </div>
                )}

                {view === 'month' ? (
                    <div className="flex-1 min-h-0 grid grid-cols-7 grid-rows-6 border-collapse overflow-hidden">
                        {Array.from({ length: startOffset }).map((_, i) => (
                            <div key={`pre-${i}`} className="border-b border-r border-slate-50 bg-slate-50/10" />
                        ))}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const dayNum = i + 1;
                            const dateKey = toDateKey(year, month, dayNum);
                            const events = isHydrated ? filteredGetEventsForDate(dateKey) : [];
                            return (
                                <DayCell
                                    key={dateKey}
                                    dateKey={dateKey}
                                    dayNum={dayNum}
                                    isToday={dayNum === today.getDate() && month === today.getMonth() && year === today.getFullYear()}
                                    events={sortEvents(events)}
                                    onAdd={openModal}
                                    onRemove={removeEvent}
                                    teamMeta={teamMeta}
                                    onEventClick={handleEventClick}
                                    onMoreClick={() => setSelectedDayForPopup(dateKey)}
                                />
                            );
                        })}
                        {trailingCells > 0 && Array.from({ length: trailingCells }).map((_, i) => (
                            <div key={`post-${i}`} className="border-b border-r border-slate-50 bg-slate-50/10" />
                        ))}
                    </div>
                ) : (
                    <TimeGridView
                        days={view === 'week' ? Array.from({ length: 7 }).map((_, i) => {
                            const d = new Date(currentDate);
                            const dayOfWeek = d.getDay();
                            const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
                            d.setDate(diff + i);
                            return d;
                        }) : [currentDate]}
                        getEventsForDate={filteredGetEventsForDate}
                        isHydrated={isHydrated}
                        onAdd={openModal}
                        onRemove={removeEvent}
                        teamMeta={teamMeta}
                        onEventClick={handleEventClick}
                    />
                )}
            </div>

            {selectedEvent && (
                <EventDetailModal
                    event={selectedEvent}
                    onClose={() => setSelectedEvent(null)}
                    onRemove={(id: string) => { removeEvent("", id); setSelectedEvent(null); }}
                    teamMeta={teamMeta}
                />
            )}

            <AnimatePresence>
                {selectedDayForPopup && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closePopup} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[80vh]">
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <div>
                                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight italic">
                                        {new Date(selectedDayForPopup).toLocaleDateString('ca-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                                    </h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{popupEvents.length} Events</p>
                                </div>
                                <button onClick={closePopup} className="h-8 w-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-400 transition-colors">
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
                                {popupEvents.map(event => {
                                    const meta = event.teamId ? teamMeta.get(event.teamId) : undefined;
                                    return (
                                        <div key={event.id} onClick={() => { handleEventClick(event, selectedDayForPopup); closePopup(); }} className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-all group cursor-pointer">
                                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${eventColor(event.type)} flex-shrink-0`}>
                                                <div className={`h-2.5 w-2.5 rounded-full ${eventDot(event.type)}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-xs font-black text-slate-800 uppercase truncate">{event.title}</h4>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">
                                                    {event.time}{event.endTime ? ` - ${event.endTime}` : ""} {meta && `• ${meta.teamName}`}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="p-4 bg-slate-50 border-t border-slate-100">
                                <button
                                    onClick={() => { openModal(selectedDayForPopup); closePopup(); }}
                                    className="w-full py-4 bg-orange-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-orange-200 hover:bg-orange-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                >
                                    <Plus size={16} strokeWidth={3} />
                                    Add New Event
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <CalendarAddModal
                isOpen={isModalOpen}
                initialDate={selectedDate}
                initialTime={initialTime}
                onClose={closeModal}
                isPersonal={true}
                onConfirm={async (event, dateKey) => {
                    await addEvent(dateKey, event);
                }}
            />
        </div>
    );
}

function DayCell({ dateKey, dayNum, isToday, events, onAdd, onRemove, teamMeta, onEventClick, onMoreClick }: any) {
    const { onPointerDown, onPointerUp } = useStylusTap(() => onAdd(dateKey));
    const showBadge = events.length > 3;
    const visibleEvents = showBadge ? events.slice(0, 2) : events.slice(0, 3);
    const overflowCount = events.length - visibleEvents.length;

    return (
        <div
            className={`border-b border-r border-slate-100 p-1.5 transition-colors hover:bg-slate-50 group relative flex flex-col h-full min-h-0 overflow-hidden cursor-pointer ${isToday ? "bg-orange-50/30" : ""}`}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
        >
            <div className="flex justify-between items-start mb-1 relative z-10 pointer-events-none">
                <span className={`text-[10px] font-bold flex items-center justify-center h-5 w-5 ${isToday ? "bg-orange-500 text-white rounded-full" : "text-slate-400 group-hover:text-slate-600"}`}>
                    {dayNum}
                </span>
            </div>
            <div className="flex-shrink-0 flex-1 relative z-10 flex flex-col gap-0.5 overflow-hidden">
                {visibleEvents.map((event: any) => {
                    const meta = event.teamId ? teamMeta.get(event.teamId) : undefined;
                    return (
                        <div
                            key={event.id}
                            onPointerDown={(e) => e.stopPropagation()}
                            onPointerUp={(e) => e.stopPropagation()}
                            onClick={(e) => { e.stopPropagation(); onEventClick(event, dateKey); }}
                            className={`flex flex-shrink-0 items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-bold leading-tight group/pill transition-all cursor-pointer ${eventColor(event.type)} hover:scale-[1.02] shadow-sm`}
                        >
                            <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${eventDot(event.type)}`} />
                            <span className="truncate flex-1">{event.title}</span>
                            {meta && (
                                <span className="opacity-40 flex-shrink-0 truncate max-w-[120px] text-[7px] font-black ml-auto border-l border-black/5 pl-1 leading-none text-right uppercase">
                                    {meta.teamName}
                                </span>
                            )}
                        </div>
                    );
                })}
                {overflowCount > 0 && (
                    <div
                        onPointerDown={(e) => e.stopPropagation()}
                        onPointerUp={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); onMoreClick(); }}
                        className="flex-shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded border border-slate-200 bg-slate-100 text-[9px] font-black text-slate-500 cursor-pointer hover:bg-slate-200 transition-colors"
                    >
                        <span className="text-slate-400">+</span>
                        {overflowCount} more
                    </div>
                )}
            </div>
        </div>
    );
}

function TimeGridView({ days, getEventsForDate, isHydrated, onAdd, onRemove, teamMeta, onEventClick }: any) {
    const HOUR_HEIGHT = 80;
    const [now, setNow] = useState(new Date());
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const HOURS = Array.from({ length: 24 }).map((_, i) => `${String(i).padStart(2, "0")}:00`);

    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (scrollContainerRef.current) {
            const h = now.getHours();
            const m = now.getMinutes();
            const top = (h + m / 60) * HOUR_HEIGHT - scrollContainerRef.current.clientHeight / 2;
            scrollContainerRef.current.scrollTop = Math.max(0, top);
        }
    }, []);

    return (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="flex bg-slate-50 flex-shrink-0 z-[60] relative border-b border-slate-200">
                <div className="w-12 border-r border-slate-200 flex-shrink-0" />
                <div className="flex-1 flex flex-col">
                    {days.length > 1 && (
                        <div className="grid grid-cols-7 border-b border-slate-100">
                            {days.map((d: any, i: number) => (
                                <div key={i} className="py-2 text-center border-r border-slate-100 last:border-0">
                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{DAYS[(d.getDay() + 6) % 7]}</div>
                                    <div className={`text-xs font-black ${d.toDateString() === new Date().toDateString() ? 'text-orange-500' : 'text-slate-700'}`}>{d.getDate()}</div>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className={`grid ${days.length > 1 ? 'grid-cols-7' : 'grid-cols-1'} bg-white border-b border-slate-200`}>
                        {days.map((d: any, i: number) => {
                            const dateKey = toDateKey(d.getFullYear(), d.getMonth(), d.getDate());
                            const allDayEvents = (isHydrated ? getEventsForDate(dateKey) : []).filter((e: CalendarEvent) => !e.time);
                            return (
                                <div key={i} className="p-1 border-r border-slate-100 last:border-0 flex flex-col gap-1 min-h-[40px]">
                                    <NativeScrollArea className="flex-shrink-0 flex flex-col gap-1 pr-0.5" style={{ maxHeight: '62px' }}>
                                        {allDayEvents.map((event: CalendarEvent) => {
                                            const meta = event.teamId ? teamMeta.get(event.teamId) : undefined;
                                            return (
                                                <div key={event.id} onClick={() => onEventClick(event, dateKey)} className={`flex-shrink-0 rounded px-2 py-1 border text-[9px] font-bold cursor-pointer ${eventColor(event.type)} shadow-sm truncate flex items-center gap-1`}>
                                                    <span className="truncate flex-1">{event.title}</span>
                                                    {meta && <span className="opacity-40 text-[8px] truncate">{meta.teamName}</span>}
                                                </div>
                                            );
                                        })}
                                    </NativeScrollArea>
                                    {allDayEvents.length === 0 && <div className="h-4" />}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto relative flex bg-white scroll-smooth overscroll-contain">
                <div className="w-12 flex-shrink-0 border-r border-slate-200 bg-slate-50 relative z-40 sticky left-0 pt-8" style={{ height: HOURS.length * HOUR_HEIGHT + 32 }}>
                    {HOURS.map(hour => (
                        <div key={hour} style={{ height: HOUR_HEIGHT }} className="relative bg-slate-50">
                            <span className="absolute -top-2 left-0 w-full text-center text-[9px] font-black text-slate-400 uppercase">{hour}</span>
                        </div>
                    ))}
                </div>

                <div className={`flex-1 grid ${days.length > 1 ? 'grid-cols-7' : 'grid-cols-1'} relative pt-8`} style={{ height: HOURS.length * HOUR_HEIGHT + 32 }}>
                    <div className="absolute inset-0 pointer-events-none pt-8">
                        <div className="border-t border-slate-100 w-full" />
                        {HOURS.map(hour => (
                            <div key={hour} style={{ height: HOUR_HEIGHT }} className="border-b border-slate-100 w-full" />
                        ))}
                    </div>

                    {days.map((d: any, dayIndex: number) => {
                        const dateKey = toDateKey(d.getFullYear(), d.getMonth(), d.getDate());
                        const timedEvents = (isHydrated ? getEventsForDate(dateKey) : []).filter((e: CalendarEvent) => !!e.time);
                        const sorted = [...timedEvents].sort((a, b) => (a.time || "").localeCompare(b.time || ""));
                        const eventLayouts: any[] = [];
                        const clusters: any[] = [];
                        let currentCluster: any[] = [];
                        let clusterEnd = "";

                        sorted.forEach(event => {
                            const startTime = event.time || "";
                            let endTime = event.endTime || `${String(Number(startTime.split(":")[0]) + 1).padStart(2, "0")}:${startTime.split(":")[1]}`;
                            if (startTime < clusterEnd) {
                                currentCluster.push(event);
                                if (endTime > clusterEnd) clusterEnd = endTime;
                            } else {
                                if (currentCluster.length > 0) clusters.push(currentCluster);
                                currentCluster = [event];
                                clusterEnd = endTime;
                            }
                        });
                        if (currentCluster.length > 0) clusters.push(currentCluster);

                        clusters.forEach(cluster => {
                            const columns: any[][] = [];
                            cluster.forEach((event: CalendarEvent) => {
                                let placed = false;
                                for (let i = 0; i < columns.length; i++) {
                                    const col = columns[i]!;
                                    const last = col[col.length - 1]!;
                                    const lastEnd = last.endTime || `${String(Number(last.time.split(":")[0]) + 1).padStart(2, "0")}:${last.time.split(":")[1]}`;
                                    if (lastEnd <= (event.time || "")) {
                                        col.push(event);
                                        placed = true;
                                        break;
                                    }
                                }
                                if (!placed) columns.push([event]);
                            });
                            const totalCols = columns.length;
                            columns.forEach((col, colIndex) => {
                                col.forEach(event => {
                                    eventLayouts.push({ event, left: (colIndex / totalCols) * 100, width: (1 / totalCols) * 100 });
                                });
                            });
                        });

                        return (
                            <div key={dayIndex} className="relative border-r border-slate-100 last:border-0 h-full group">
                                <div className="absolute inset-0 cursor-crosshair" onClick={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const y = e.clientY - rect.top - 32;
                                    const hourFraction = y / HOUR_HEIGHT;
                                    const h = Math.max(0, Math.min(23, Math.floor(hourFraction)));
                                    const m = Math.floor((hourFraction % 1) * 60);
                                    const timeStr = `${String(h).padStart(2, "0")}:${String(Math.floor(m / 5) * 5).padStart(2, "0")}`;
                                    onAdd(dateKey, timeStr);
                                }} />
                                {eventLayouts.map(({ event, left, width }) => {
                                    const [h, m] = event.time!.split(":").map(Number);
                                    const top = (h! + m! / 60) * HOUR_HEIGHT;
                                    const ehRaw = event.endTime?.split(":")[0];
                                    const emRaw = event.endTime?.split(":")[1];
                                    const duration = event.endTime ? (Number(ehRaw) + Number(emRaw) / 60) - (h! + m! / 60) : 1;
                                    const height = Math.max(0.5, duration) * HOUR_HEIGHT;
                                    const meta = event.teamId ? teamMeta.get(event.teamId) : undefined;
                                    return (
                                        <div key={event.id} onClick={() => onEventClick(event, dateKey)} className={`absolute rounded-lg border p-1 shadow-sm transition-all hover:scale-[1.02] hover:z-30 cursor-pointer overflow-hidden ${eventColor(event.type)}`} style={{ top, height, left: `${left}%`, width: `${width}%` }}>
                                            <div className="flex items-center gap-1 mb-0.5">
                                                <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${eventDot(event.type)}`} />
                                                <div className="text-[9px] font-black uppercase truncate flex-1">{event.title}</div>
                                            </div>
                                            <div className="text-[8px] font-black opacity-60 truncate">
                                                {event.time} {meta && `| ${meta.teamName}`}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function EventDetailModal({ event, onClose, onRemove, teamMeta }: any) {
    const meta = event.teamId ? teamMeta.get(event.teamId) : undefined;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl relative" onClick={e => e.stopPropagation()}>
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-orange-500">{event.type}</span>
                        <h3 className="text-lg font-black text-slate-800 uppercase mt-0.5">{event.title}</h3>
                        {meta && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-black uppercase">{meta.clubName}</span>
                                <span className="text-[9px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-black uppercase">{meta.sportName}</span>
                                <span className="text-[9px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-black uppercase">{meta.teamName}</span>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => onRemove(event.id)} className="h-8 w-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100">
                            <Trash2 size={14} />
                        </button>
                        <button onClick={onClose} className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200">
                            <X size={14} />
                        </button>
                    </div>
                </div>
                {event.time && (
                    <div className="flex items-center gap-2 mb-2">
                        <Clock size={14} className="text-slate-400" />
                        <span className="text-sm font-bold text-slate-600">{event.time} {event.endTime ? `- ${event.endTime}` : ""}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
