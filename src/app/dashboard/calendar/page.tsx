"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, X, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useCalendarSchedule } from "~/features/dashboard/hooks/useCalendarSchedule";
import type { CalendarEvent } from "~/features/dashboard/hooks/useCalendarSchedule";
import { CalendarAddModal } from "~/features/dashboard/components/CalendarAddModal";
import { useDashboard } from "~/context/DashboardContext";
import { NativeScrollArea } from "~/components/ui/NativeScrollArea";
import { format } from "date-fns";

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
        case "session":  return "bg-orange-100 border-orange-300 text-orange-700";
        case "match":    return "bg-blue-100 border-blue-300 text-blue-700";
        case "training": return "bg-green-100 border-green-300 text-green-700";
        default:         return "bg-purple-100 border-purple-300 text-purple-700";
    }
}

function eventDot(type: CalendarEvent["type"]) {
    switch (type) {
        case "session":  return "bg-orange-500";
        case "match":    return "bg-blue-500";
        case "training": return "bg-green-500";
        default:         return "bg-purple-500";
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

function CalendarEventItem({ event, dateKey, onRemove }: { event: any; dateKey: string; onRemove: (dk: string, id: string) => void }) {
    return (
        <Link
            href={event.type === "session" ? `/dashboard/calendar/session/${dateKey}/${event.id}` : "#"}
            onClick={e => { if(event.type !== "session") e.preventDefault(); }}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            className={`flex flex-shrink-0 items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-bold leading-tight group/pill transition-all ${eventColor(event.type)} ${event.type === "session" ? "hover:scale-[1.03] hover:shadow-md hover:border-white cursor-pointer" : "cursor-default"}`}
        >
            <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${eventDot(event.type)}`} />
            <span className="truncate flex-1">{event.title}</span>
            {event.time && (
                <span className="opacity-60 flex-shrink-0 text-[9px] font-black">
                    {event.time}{event.endTime ? ` - ${event.endTime}` : ""}
                </span>
            )}
            <button onClick={e => { e.stopPropagation(); e.preventDefault(); onRemove(dateKey, event.id); }} className="opacity-0 group-hover/pill:opacity-100 flex-shrink-0 transition-opacity text-[10px] leading-none font-black hover:text-red-600 pl-1 py-0.5">✕</button>
        </Link>
    );
}

function DayCell({ dateKey, dayNum, isToday, events, onAdd, onRemove, onMoreClick }: { dateKey: string; dayNum: number; isToday: boolean; events: any[]; onAdd: (dk: string) => void; onRemove: (dk: string, id: string) => void; onMoreClick: () => void }) {
    const { onPointerDown, onPointerUp } = useStylusTap(() => onAdd(dateKey));

    return (
        <div 
            className={`border-b border-r border-slate-100 p-2 transition-colors hover:bg-slate-50 group relative flex flex-col h-full min-h-0 overflow-hidden cursor-pointer ${isToday ? "bg-orange-50/30" : ""}`}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
        >
            <div className="flex justify-between items-start mb-1 relative z-10 pointer-events-none">
                <span className={`text-sm font-bold flex items-center justify-center ${isToday ? "bg-orange-500 text-white h-7 w-7 rounded-full" : "text-slate-400 group-hover:text-slate-600"}`}>
                    {dayNum}
                </span>
            </div>
            <div 
                className="flex-shrink-0 flex-1 relative z-10 flex flex-col gap-1 overflow-hidden"
            >
                {events.length > 3 ? (
                    <>
                        {events.slice(0, 2).map(event => (
                            <CalendarEventItem key={event.id} event={event} dateKey={dateKey} onRemove={onRemove} />
                        ))}
                        <div 
                            onPointerDown={(e) => e.stopPropagation()}
                            onPointerUp={(e) => e.stopPropagation()}
                            onClick={(e) => { e.stopPropagation(); onMoreClick(); }}
                            className="flex-shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-slate-200 bg-slate-100 text-[10px] font-black text-slate-500 cursor-pointer hover:bg-slate-200 transition-colors"
                        >
                            <span className="text-slate-400 font-bold">+</span>
                            {events.length - 2} more
                        </div>
                    </>
                ) : (
                    events.map(event => (
                        <CalendarEventItem key={event.id} event={event} dateKey={dateKey} onRemove={onRemove} />
                    ))
                )}
            </div>
        </div>
    );
}

export default function CalendarPage() {
    const today = new Date();
    const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
    const [view, setView] = useState<'month' | 'week' | 'day'>('month');
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [initialTime, setInitialTime] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDayForPopup, setSelectedDayForPopup] = useState<string | null>(null);

    const { selectedTeamId, selectedSport, selectedClubId } = useDashboard();
    const { addEvent, removeEvent, getEventsForDate, isHydrated } = useCalendarSchedule(selectedTeamId, selectedSport, selectedClubId || undefined);
    const router = useRouter();

    const handleEventClick = (event: CalendarEvent, dateKey: string) => {
        if (event.type === "session") {
            router.push(`/dashboard/calendar/session/${dateKey}/${event.id}`);
        }
    };

    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const startOffset = (firstDayOfMonth + 6) % 7; // Monday-first offset
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

    return (
        <div className="h-full flex flex-col overflow-hidden relative" style={{ touchAction: 'auto' }}>
            {/* Header */}
            <div className="relative h-48 w-full px-8 flex items-center overflow-hidden flex-shrink-0">
                <div className="relative z-10 w-full flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="h-12 w-2 bg-orange-400 transform -skew-x-12" />
                        <h1 className="text-5xl font-extrabold uppercase text-white tracking-tighter italic drop-shadow-lg">
                            Team <br />
                            <span className="text-orange-400">Calendar</span>
                        </h1>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                        <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/20">
                            <button
                                onClick={() => {
                                    const next = new Date(currentDate);
                                    if (view === 'month') next.setMonth(next.getMonth() - 1);
                                    else if (view === 'week') next.setDate(next.getDate() - 7);
                                    else next.setDate(next.getDate() - 1);
                                    setCurrentDate(next);
                                }}
                                className="p-2 hover:bg-white/20 rounded-lg text-white transition-colors"
                            >
                                <ChevronLeft size={24} />
                            </button>
                            <span className="text-xl font-bold text-white min-w-[160px] text-center">
                                {view === 'month' ? `${MONTHS[month]} ${year}` : 
                                 view === 'week' ? `Week of ${currentDate.getDate()} ${MONTHS[currentDate.getMonth()]}` :
                                 `${currentDate.getDate()} ${MONTHS[currentDate.getMonth()]}`}
                            </span>
                            <button
                                onClick={() => {
                                    const next = new Date(currentDate);
                                    if (view === 'month') next.setMonth(next.getMonth() + 1);
                                    else if (view === 'week') next.setDate(next.getDate() + 7);
                                    else next.setDate(next.getDate() + 1);
                                    setCurrentDate(next);
                                }}
                                className="p-2 hover:bg-white/20 rounded-lg text-white transition-colors"
                            >
                                <ChevronRight size={24} />
                            </button>
                        </div>

                        <div className="flex gap-2 bg-white/10 backdrop-blur-md p-1 rounded-lg border border-white/20">
                            <button 
                                onClick={() => openModal()}
                                className="px-4 py-1.5 rounded-md bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all flex items-center gap-2"
                            >
                                <Plus size={14} strokeWidth={3} />
                                Add Event
                            </button>
                            <div className="w-px bg-white/20 my-1" />
                            {(['month', 'week', 'day'] as const).map((v) => (
                                <button
                                    key={v}
                                    onClick={() => setView(v)}
                                    className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${
                                        view === v 
                                        ? "bg-white/20 text-white shadow-inner" 
                                        : "text-white/60 hover:text-white hover:bg-white/10"
                                    }`}
                                >
                                    {v}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col px-6 pb-6 -mt-8 relative z-20">
                <div className="flex-1 min-h-0 bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">

                    {view === 'month' && (
                        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
                            {DAYS.map(day => (
                                <div key={day} className="py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    {day}
                                </div>
                            ))}
                        </div>
                    )}

                    {view === 'month' && (
                        <div className="flex-1 min-h-0 grid grid-cols-7 grid-rows-6 border-collapse overflow-hidden">
                            {/* Leading empty cells */}
                            {Array.from({ length: startOffset }).map((_, i) => (
                                <div key={`pre-${i}`} className="border-b border-r border-slate-100 bg-slate-50/10" />
                            ))}

                            {/* Day cells */}
                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                const dayNum = i + 1;
                                const dateKey = toDateKey(year, month, dayNum);
                                const events = isHydrated ? getEventsForDate(dateKey) : [];
                                return (
                                    <DayCell 
                                        key={dateKey} 
                                        dateKey={dateKey} 
                                        dayNum={dayNum} 
                                        isToday={dayNum === today.getDate() && month === today.getMonth() && year === today.getFullYear()} 
                                        events={sortEvents(events)} 
                                        onAdd={openModal} 
                                        onRemove={removeEvent}
                                        onMoreClick={() => setSelectedDayForPopup(dateKey)}
                                    />
                                );
                            })}

                            {/* Trailing empty cells */}
                            {trailingCells > 0 && Array.from({ length: trailingCells }).map((_, i) => (
                                <div key={`post-${i}`} className="border-b border-r border-slate-100 bg-slate-50/10" />
                            ))}
                        </div>
                    )}

                    {view === 'week' && (
                        <TimeGridView 
                            days={Array.from({ length: 7 }).map((_, i) => {
                                const d = new Date(currentDate);
                                const dayOfWeek = d.getDay();
                                const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
                                d.setDate(diff + i);
                                return d;
                            })}
                            getEventsForDate={getEventsForDate}
                            isHydrated={isHydrated}
                            onAdd={openModal}
                            onRemove={removeEvent}
                        />
                    )}

                    {view === 'day' && (
                        <TimeGridView 
                            days={[currentDate]}
                            getEventsForDate={getEventsForDate}
                            isHydrated={isHydrated}
                            onAdd={openModal}
                            onRemove={removeEvent}
                        />
                    )}
                </div>

                <div className="flex-shrink-0 mt-4 flex flex-wrap gap-6 items-center justify-center text-slate-500">
                    {[
                        { color: "bg-orange-500", label: "Training Session" },
                        { color: "bg-blue-500",   label: "Match" },
                        { color: "bg-green-500",  label: "Practice" },
                        { color: "bg-purple-500", label: "Other" },
                    ].map(({ color, label }) => (
                        <div key={label} className="flex items-center gap-2">
                            <div className={`h-3 w-3 rounded-full ${color}`} />
                            <span className="text-sm font-bold">{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <CalendarAddModal
                isOpen={isModalOpen}
                initialDate={selectedDate}
                initialTime={initialTime}
                onClose={closeModal}
                onConfirm={async (event, dateKey) => {
                    await addEvent(dateKey, event);
                }}
            />

            <AnimatePresence>
                {selectedDayForPopup && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedDayForPopup(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[80vh]">
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <div>
                                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight italic">
                                        {format(new Date(selectedDayForPopup), "eeee, MMM do")}
                                    </h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{getEventsForDate(selectedDayForPopup).length} Events</p>
                                </div>
                                <button onClick={() => setSelectedDayForPopup(null)} className="h-8 w-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-400 transition-colors">
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
                                {getEventsForDate(selectedDayForPopup).map(event => (
                                    <div key={event.id} onClick={() => { handleEventClick(event, selectedDayForPopup); setSelectedDayForPopup(null); }} className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-all group cursor-pointer">
                                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${eventColor(event.type)} flex-shrink-0`}>
                                            <div className={`h-2.5 w-2.5 rounded-full ${eventDot(event.type)}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-xs font-black text-slate-800 uppercase truncate">{event.title}</h4>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">
                                                {event.time}{event.endTime ? ` - ${event.endTime}` : ""}
                                            </p>
                                        </div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); removeEvent(selectedDayForPopup, event.id); }}
                                            className="h-8 w-8 rounded-lg hover:bg-red-50 text-slate-200 hover:text-red-500 transition-all flex items-center justify-center"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="p-4 bg-slate-50 border-t border-slate-100">
                                <button 
                                    onClick={() => { openModal(selectedDayForPopup); setSelectedDayForPopup(null); }}
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
        </div>
    );
}

function TimeGridView({ days, getEventsForDate, isHydrated, onAdd, onRemove }: { days: Date[]; getEventsForDate: (dk: string) => CalendarEvent[]; isHydrated: boolean; onAdd: (dk: string, time?: string) => void; onRemove: (dk: string, id: string) => void }) {
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

    const getCurrentTimeTop = () => {
        const h = now.getHours();
        const m = now.getMinutes();
        return (h + m / 60) * HOUR_HEIGHT;
    };

    return (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="flex bg-slate-50 flex-shrink-0 z-[60] relative border-b border-slate-200">
                <div className="w-16 border-r border-slate-200 flex-shrink-0" />
                <div className="flex-1 flex flex-col">
                    {days.length > 1 && (
                        <div className="grid grid-cols-7 border-b border-slate-100">
                            {days.map((d, i) => (
                                <div key={i} className="py-2 text-center border-r border-slate-100 last:border-0">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{DAYS[(d.getDay() + 6) % 7]}</div>
                                    <div className={`text-sm font-black ${d.toDateString() === new Date().toDateString() ? 'text-orange-500' : 'text-slate-700'}`}>{d.getDate()}</div>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className={`grid ${days.length > 1 ? 'grid-cols-7' : 'grid-cols-1'} bg-white border-b border-slate-200`}>
                        {days.map((d, i) => {
                            const dateKey = toDateKey(d.getFullYear(), d.getMonth(), d.getDate());
                            const allDayEvents = (isHydrated ? getEventsForDate(dateKey) : []).filter(e => !e.time);
                            return (
                                <div key={i} className="p-1 border-r border-slate-100 last:border-0 flex flex-col gap-1 min-h-[40px]">
                                    <NativeScrollArea 
                                        className="flex-shrink-0 flex flex-col gap-1 pr-0.5"
                                        style={{ maxHeight: '62px' }}
                                    >
                                        {allDayEvents.map(event => (
                                            <div key={event.id} className={`flex-shrink-0 rounded px-2 py-1 border text-[9px] font-bold ${eventColor(event.type)} shadow-sm truncate`}>
                                                {event.title}
                                            </div>
                                        ))}
                                    </NativeScrollArea>
                                    {allDayEvents.length === 0 && <div className="h-4" />}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div 
                ref={scrollContainerRef} 
                className="flex-1 overflow-y-auto relative flex bg-white scroll-smooth overscroll-contain"
                style={{ 
                    WebkitOverflowScrolling: 'touch',
                }}
            >
                <div className="w-16 flex-shrink-0 border-r border-slate-200 bg-slate-50 relative z-40 sticky left-0 pt-8" style={{ height: HOURS.length * HOUR_HEIGHT + 32 }}>
                    {HOURS.map(hour => (
                        <div key={hour} style={{ height: HOUR_HEIGHT }} className="relative bg-slate-50">
                            <span className="absolute -top-2 left-0 w-full text-center text-[10px] font-black text-slate-400 uppercase">{hour}</span>
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

                    <div 
                        className="absolute left-0 w-full border-t-2 border-red-500 z-30 pointer-events-none flex items-center"
                        style={{ top: getCurrentTimeTop() + 32 }} 
                    >
                        <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                    </div>

                    {days.map((d, dayIndex) => {
                        const dateKey = toDateKey(d.getFullYear(), d.getMonth(), d.getDate());
                        const timedEvents = (isHydrated ? getEventsForDate(dateKey) : []).filter(e => !!e.time);

                        const sorted = [...timedEvents].sort((a, b) => (a.time || "").localeCompare(b.time || ""));
                        const eventLayouts: { event: CalendarEvent, left: number, width: number }[] = [];
                        const clusters: CalendarEvent[][] = [];
                        let currentCluster: CalendarEvent[] = [];
                        let clusterEnd = "";

                        sorted.forEach(event => {
                            const startTime = event.time || "";
                            let endTime = event.endTime;
                            if (!endTime) {
                                const [h, m] = startTime.split(":").map(Number);
                                endTime = `${String(h! + 1).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
                            }

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
                            const columns: CalendarEvent[][] = [];
                            cluster.forEach(event => {
                                let placed = false;
                                for (let i = 0; i < columns.length; i++) {
                                    const col = columns[i]!;
                                    const lastInCol = col[col.length - 1]!;
                                    
                                    const lastEndTime = lastInCol.endTime || (() => {
                                        const [h, m] = lastInCol.time!.split(":").map(Number);
                                        return `${String(h! + 1).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
                                    })();

                                    if (lastEndTime <= (event.time || "")) {
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
                                    eventLayouts.push({
                                        event,
                                        left: (colIndex / totalCols) * 100,
                                        width: (1 / totalCols) * 100
                                    });
                                });
                            });
                        });

                        return (
                            <div key={dayIndex} className="relative border-r border-slate-100 last:border-0 h-full group">
                                <div className="absolute inset-0 cursor-crosshair touch-none" onPointerDown={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const y = e.clientY - rect.top - 32; // -32 for top padding
                                    const hourFraction = y / HOUR_HEIGHT;
                                    const h = Math.max(0, Math.min(23, Math.floor(hourFraction)));
                                    const m = Math.floor((hourFraction % 1) * 60);
                                    const timeStr = `${String(h).padStart(2, "0")}:${String(Math.floor(m / 5) * 5).padStart(2, "0")}`; // Round to 5 min
                                    onAdd(dateKey, timeStr);
                                }} />
                                
                                {eventLayouts.map(({ event, left, width }) => {
                                    const [h, m] = event.time!.split(":").map(Number);
                                    const top = (h! + m! / 60) * HOUR_HEIGHT;
                                    
                                    let duration = 1; // default 1 hour
                                    if (event.endTime) {
                                        const [eh, em] = event.endTime.split(":").map(Number);
                                        duration = (eh! + em! / 60) - (h! + m! / 60);
                                    }
                                    const height = Math.max(0.5, duration) * HOUR_HEIGHT;

                                    return (
                                        <div
                                            key={event.id}
                                            className={`absolute rounded-xl border p-2 shadow-sm transition-all hover:scale-[1.02] hover:z-30 cursor-pointer overflow-hidden ${eventColor(event.type)}`}
                                            style={{ 
                                                top, 
                                                height, 
                                                left: `${left}%`, 
                                                width: `${width}%`,
                                                padding: width < 30 ? '4px' : '8px' // Less padding if very narrow
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (event.type === 'session') window.location.href = `/dashboard/calendar/session/${dateKey}/${event.id}`;
                                            }}
                                        >
                                            <div className={`flex items-center gap-2 mb-1 ${width < 30 ? 'flex-col items-start' : ''}`}>
                                                <div className={`h-2 w-2 rounded-full flex-shrink-0 ${eventDot(event.type)}`} />
                                                <div className="text-[10px] font-black uppercase tracking-tight truncate flex-1">{event.title}</div>
                                                {width > 40 && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); onRemove(dateKey, event.id); }}
                                                        className="opacity-40 hover:opacity-100 hover:text-red-500 font-black"
                                                    >✕</button>
                                                )}
                                            </div>
                                            <div className="text-[9px] font-black opacity-60 uppercase truncate">
                                                {event.time} - {event.endTime || "..."}
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
