"use client";

import { useState, useMemo } from "react";
import { Search, Filter, X } from "lucide-react";
import { api } from "~/trpc/react";
import { DrillCard, DrillCardSkeleton } from "~/features/dashboard/components/DrillCard";
import { SessionCard, SessionCardSkeleton } from "~/features/dashboard/components/SessionCard";
import { Target, ClipboardList } from "lucide-react";

export function PersonalLibrary() {
  const [tab, setTab] = useState<"drills" | "sessions">("drills");
  const [search, setSearch] = useState("");
  const [sport, setSport] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  const { data: clubs = [] } = api.club.getHierarchy.useQuery();
  const userSports = useMemo(() => {
    const names = new Set<string>();
    for (const club of clubs as any[]) {
      for (const s of club.sports ?? []) {
        if (s.name) names.add(s.name as string);
      }
    }
    return Array.from(names).sort();
  }, [clubs]);

  const { data: boards = [], isLoading: loadingBoards } = api.board.getAll.useQuery({
    sport: sport || undefined,
    search: search || undefined,
  });

  const { data: sessions = [], isLoading: loadingSessions } = api.session.getAll.useQuery({
    sport: sport || undefined,
    search: search || undefined,
  });

  const clearFilters = () => { setSearch(""); setSport(""); };
  const hasFilters = !!search || !!sport;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
          {(["drills", "sessions"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${tab === t ? "bg-white shadow-sm text-slate-800" : "text-slate-400 hover:text-slate-600"}`}>
              {t === "drills" ? <><Target size={14} /> Drills</> : <><ClipboardList size={14} /> Sessions</>}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="pl-8 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:outline-none focus:border-orange-400 transition-colors w-44"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={12} />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-black uppercase tracking-widest transition-all ${showFilters || hasFilters ? "bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-200" : "bg-white text-slate-600 border-slate-200 hover:border-orange-300"}`}>
            <Filter size={13} />
            Filters {hasFilters && <span className="bg-white/30 rounded px-1">✓</span>}
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-center gap-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sport:</span>
          {userSports.length === 0 ? (
            <span className="text-xs text-slate-400 italic">No sports configured yet</span>
          ) : (
            userSports.map(s => (
              <button key={s} onClick={() => setSport(prev => prev === s ? "" : s)}
                className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wide border transition-all ${sport === s ? "bg-orange-500 text-white border-orange-500 shadow-md" : "bg-slate-50 text-slate-500 border-slate-200 hover:border-orange-300 hover:text-orange-600"}`}>
                {s}
              </button>
            ))
          )}
          {hasFilters && (
            <button onClick={clearFilters}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black text-red-400 border border-red-200 hover:bg-red-50 transition-colors">
              <X size={11} /> Clear all
            </button>
          )}
        </div>
      )}

      {tab === "drills" ? (
        <div>
          {loadingBoards ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <DrillCardSkeleton key={i} />)}
            </div>
          ) : boards.length === 0 ? (
            <EmptyState
              icon={<Target size={32} className="text-orange-500" />}
              title={hasFilters ? "No drills match filters" : "No drills yet"}
              subtitle={hasFilters ? "Try adjusting the filters" : "Create your first drill from the Drills section"}
              action={hasFilters ? <button onClick={clearFilters} className="px-4 py-2 rounded-xl bg-orange-500 text-white text-xs font-black uppercase hover:bg-orange-600 transition-colors">Clear Filters</button> : undefined}
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {(boards as any[]).map((board: any) => (
                <DrillCard
                  key={board.id}
                  id={board.id}
                  title={board.title}
                  category={board.sport?.toUpperCase() ?? "DRILL"}
                  href={`/whiteboard/${board.id}?returnTo=/dashboard/personal`}
                  subtitle={board.sport}
                  boardData={board.data}
                  isFavorite={board.isFavorite}
                  onOptionsClick={() => { }}
                  onToggleFavorite={() => { }}
                  isRenaming={false}
                  onRenameSubmit={() => { }}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          {loadingSessions ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <SessionCardSkeleton key={i} />)}
            </div>
          ) : sessions.length === 0 ? (
            <EmptyState
              icon={<ClipboardList size={32} className="text-orange-500" />}
              title={hasFilters ? "No sessions match filters" : "No sessions yet"}
              subtitle={hasFilters ? "Try adjusting the filters" : "Create your first training session"}
              action={hasFilters ? <button onClick={clearFilters} className="px-4 py-2 rounded-xl bg-orange-500 text-white text-xs font-black uppercase hover:bg-orange-600 transition-colors">Clear Filters</button> : undefined}
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {(sessions as any[]).map((s: any) => (
                <SessionCard
                  key={s.id}
                  id={s.id}
                  title={s.title}
                  sport={s.sport}
                  notes={s.notes ?? ""}
                  boardCount={s._count?.boards ?? 0}
                  firstBoardData={s.firstBoardData}
                  isFavorite={s.isFavorite}
                  href={`/dashboard/sessions/${s.id}`}
                  onOptionsClick={() => { }}
                  onToggleFavorite={() => { }}
                  isRenaming={false}
                  onRenameSubmit={() => { }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon, title, subtitle, action }: { icon: React.ReactNode; title: string; subtitle: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4">{icon}</div>
      <h3 className="text-sm font-black text-slate-700 uppercase tracking-tight mb-1">{title}</h3>
      <p className="text-xs text-slate-400 mb-4 max-w-xs">{subtitle}</p>
      {action}
    </div>
  );
}
