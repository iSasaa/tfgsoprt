"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Trash2, Check, X, Users, Shield, ChevronDown, ChevronRight, Edit2, Building2 } from "lucide-react";
import { api } from "~/trpc/react";

interface Player { id: string; name: string; surname: string | null; number: string; position: string | null; status: string; }
interface Team { id: string; name: string; }
interface Sport { id: string; name: string; teams: Team[]; }
interface Club { id: string; name: string; sports: Sport[]; }

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
    const dist = Math.sqrt(Math.pow(e.clientX - startPos.current.x, 2) + Math.pow(e.clientY - startPos.current.y, 2));
    const duration = Date.now() - startTime.current;
    if (dist < 15 && duration < 500) onTap();
  };
  return { onPointerDown, onPointerUp };
}

function StylusButton({ onTap, children, className, style, disabled, title }: { onTap: () => void; children: React.ReactNode; className?: string; style?: React.CSSProperties; disabled?: boolean; title?: string }) {
  const handlers = useStylusTap(onTap, disabled);
  return <button {...handlers} className={className} style={style} title={title}>{children}</button>;
}

function StylusDiv({ onTap, children, className, style, disabled }: { onTap: () => void; children: React.ReactNode; className?: string; style?: React.CSSProperties; disabled?: boolean }) {
  const handlers = useStylusTap(onTap, disabled);
  return <div {...handlers} className={className} style={style}>{children}</div>;
}

function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }: { isOpen: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCancel} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="relative bg-white rounded-3xl shadow-2xl p-6 w-full max-w-xs border-t-4 border-orange-500">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-2">{title}</h3>
        <p className="text-[11px] font-bold text-slate-500 leading-relaxed mb-6">{message}</p>
        <div className="flex gap-2">
          <StylusButton onTap={onConfirm} className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl text-[10px] font-black uppercase transition-all">Confirm</StylusButton>
          <StylusButton onTap={onCancel} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all">Cancel</StylusButton>
        </div>
      </motion.div>
    </div>
  );
}

function InlineEdit({ value, onSave, style, activeColor }: { value: string; onSave: (v: string) => void; style?: React.CSSProperties; activeColor?: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!editing) return (
    <div className="flex items-center gap-2 group/edit">
      <span style={style}>{value}</span>
      <StylusButton onTap={() => { setDraft(value); setEditing(true); }} className={`p-1 rounded hover:bg-slate-100 transition-colors ${activeColor || "text-slate-300"}`}>
        <Edit2 size={11} />
      </StylusButton>
    </div>
  );

  return (
    <span className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
      <input autoFocus value={draft} onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") { onSave(draft); setEditing(false); } if (e.key === "Escape") setEditing(false); }}
        className="border border-orange-400 rounded px-1 py-0.5 text-xs font-bold bg-white w-32 focus:outline-none" />
      <button onClick={() => { onSave(draft); setEditing(false); }} className="text-green-600 hover:text-green-700"><Check size={12} /></button>
      <button onClick={() => setEditing(false)} className="text-slate-400 hover:text-slate-600"><X size={12} /></button>
    </span>
  );
}

const DEFAULT_SPORTS = ["Hockey", "Football", "Basketball", "Handball", "Volleyball", "Futsal", "Rugby", "Waterpolo", "Padel", "Tennis"];

function SportSelector({ onAdd, onCancel }: { onAdd: (name: string) => void; onCancel: () => void }) {
  return (
    <div className="flex flex-col gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl mt-2 animate-in fade-in slide-in-from-top-1">
      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Select Sport</div>
      <div className="grid grid-cols-2 gap-2">
        {DEFAULT_SPORTS.map(s => (
          <button key={s} onClick={() => onAdd(s)}
            className="px-3 py-2 bg-white border border-slate-100 rounded-lg text-[10px] font-black uppercase text-slate-600 hover:border-orange-400 hover:text-orange-500 transition-all text-left">
            {s}
          </button>
        ))}
      </div>
      <button onClick={onCancel} className="w-full mt-1 py-2 text-[9px] font-black uppercase text-slate-400 hover:text-slate-600">Cancel</button>
    </div>
  );
}

function PlayerAddForm({ onAdd, onCancel, existingNumbers }: { onAdd: (p: { name: string; number: string }) => void; onCancel: () => void; existingNumbers: string[] }) {
  const [name, setName] = useState("");
  const [num, setNum] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) { setError("Name required"); return; }
    if (!num.trim()) { setError("# required"); return; }
    if (existingNumbers.includes(num.trim())) { setError(`Number ${num} is taken`); return; }

    onAdd({ name: name.trim(), number: num.trim() });
    setName(""); setNum("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-3 bg-orange-50/50 border border-orange-100 rounded-xl mt-2">
      <div className="text-[9px] font-black uppercase text-orange-400 mb-1">New Player Details</div>
      <div className="flex gap-2">
        <div className="flex-1 flex flex-col gap-1">
          <span className="text-[8px] font-bold text-slate-400 uppercase ml-1">Full Name</span>
          <input autoFocus placeholder="e.g. John Doe" value={name} onChange={e => setName(e.target.value)}
            className="w-full border border-orange-200 rounded-lg px-2 py-1.5 text-xs font-bold focus:outline-none focus:border-orange-400" />
        </div>
        <div className="w-16 flex flex-col gap-1">
          <span className="text-[8px] font-bold text-slate-400 uppercase ml-1"># Number</span>
          <input placeholder="99" value={num} onChange={e => setNum(e.target.value)}
            className="w-full border border-orange-200 rounded-lg px-2 py-1.5 text-xs font-bold text-center focus:outline-none focus:border-orange-400" />
        </div>
      </div>

      {error && <div className="text-[9px] font-black text-red-500 uppercase px-1">{error}</div>}

      <div className="flex gap-2 mt-1">
        <button type="submit" className="flex-1 bg-orange-500 text-white rounded-lg py-1.5 text-[10px] font-black uppercase hover:bg-orange-600 transition-colors">Add Player</button>
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600">Cancel</button>
      </div>
    </form>
  );
}

function InlinePlayerEdit({ player, onSave, onCancel, existingNumbers }: { player: Player; onSave: (data: { name: string; number: string }) => void; onCancel: () => void; existingNumbers: string[] }) {
  const [name, setName] = useState(player.name);
  const [num, setNum] = useState(player.number);
  const [error, setError] = useState("");

  const handleSave = () => {
    if (!name.trim() || !num.trim()) return;
    if (num !== player.number && existingNumbers.includes(num)) {
      setError(`Number ${num} taken`);
      return;
    }
    onSave({ name: name.trim(), number: num.trim() });
  };

  return (
    <div className="flex flex-col gap-1.5 p-2 bg-orange-50 rounded-lg border border-orange-100 animate-in fade-in zoom-in-95 duration-150">
      <div className="flex gap-2">
        <input autoFocus value={num} onChange={e => { setError(""); setNum(e.target.value); }}
          className="w-10 border border-orange-200 rounded px-1 py-0.5 text-[10px] font-black text-center focus:outline-none focus:border-orange-400" />
        <input value={name} onChange={e => setName(e.target.value)}
          className="flex-1 border border-orange-200 rounded px-2 py-0.5 text-[10px] font-bold focus:outline-none focus:border-orange-400" />
      </div>
      {error && <div className="text-[8px] font-black text-red-500 uppercase px-1">{error}</div>}
      <div className="flex gap-1 justify-end">
        <StylusButton onTap={handleSave} className="bg-green-500 text-white p-1 rounded hover:bg-green-600">
          <Check size={10} />
        </StylusButton>
        <StylusButton onTap={onCancel} className="bg-slate-200 text-slate-500 p-1 rounded hover:bg-slate-300">
          <X size={10} />
        </StylusButton>
      </div>
    </div>
  );
}

function TeamPlayerList({ teamId, onConfirmDelete }: { teamId: string; onConfirmDelete: (id: string, name: string) => void }) {
  const utils = api.useUtils();
  const invalidate = () => utils.player.getAll.invalidate({ teamId });

  const { data: players = [], isLoading } = api.player.getAll.useQuery({ teamId });
  const addPlayer = api.player.create.useMutation({ onSuccess: invalidate });
  const updatePlayer = api.player.update.useMutation({ onSuccess: invalidate });

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  if (isLoading) return <div className="py-3 flex justify-center"><div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="mt-2">
      <div className="space-y-1.5">
        {(players as Player[]).map(p => (
          <div key={p.id}>
            {editingId === p.id ? (
              <InlinePlayerEdit
                player={p}
                existingNumbers={players.filter(x => x.id !== p.id).map(x => x.number)}
                onSave={data => { updatePlayer.mutate({ id: p.id, ...data }); setEditingId(null); }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div className="flex items-center gap-2 py-1 group/player">
                <div className={`min-w-[26px] h-6 w-6 rounded flex items-center justify-center text-[10px] font-black border ${p.status === "injured" ? "bg-red-50 text-red-400 border-red-100" : "bg-orange-50 text-orange-500 border-orange-100"}`}>
                  {p.number}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[11px] font-bold text-slate-700 truncate uppercase">{p.name} <span className="opacity-40">{p.surname}</span></span>
                </div>
                <div className="flex items-center gap-1">
                  <StylusButton
                    onTap={() => setEditingId(p.id)}
                    className="p-1 text-slate-300 hover:text-slate-500 transition-all"
                  >
                    <Edit2 size={11} />
                  </StylusButton>
                  <StylusButton
                    onTap={() => onConfirmDelete(p.id, p.name)}
                    className="p-1 text-red-400 hover:text-red-600 transition-all"
                  >
                    <Trash2 size={12} />
                  </StylusButton>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {adding ? (
        <PlayerAddForm
          existingNumbers={players.map(p => p.number)}
          onAdd={data => { addPlayer.mutate({ ...data, teamId }); setAdding(false); }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <StylusButton
          onTap={() => setAdding(true)}
          className="w-full mt-2 py-2 border border-dashed border-slate-200 rounded-lg text-[9px] font-black uppercase text-slate-400 hover:border-orange-300 hover:text-orange-500 transition-all"
        >
          + Add Player
        </StylusButton>
      )}
    </div>
  );
}

function SportSection({ sport, clubId, onDelete, onConfirmDeleteTeam, onConfirmDeletePlayer }: { sport: Sport; clubId: string; onDelete: () => void; onConfirmDeleteTeam: (id: string, name: string) => void; onConfirmDeletePlayer: (id: string, name: string, teamId: string) => void }) {
  const utils = api.useUtils();
  const invalidate = () => utils.club.getHierarchy.invalidate();
  const addTeam = api.club.addTeam.useMutation({ onSuccess: invalidate });
  const updateTeam = api.club.updateTeam.useMutation({ onSuccess: invalidate });
  const updateSport = api.club.updateSport.useMutation({ onSuccess: invalidate });

  const [expanded, setExpanded] = useState<string[]>([]);
  const [addingTeam, setAddingTeam] = useState(false);

  const toggleTeam = (id: string) => setExpanded(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-100">
        <div className="h-2 w-2 rounded-full bg-orange-400 flex-shrink-0" />
        <span className="text-[12px] font-black uppercase tracking-[0.08em] text-slate-600 flex-1">{sport.name}</span>
        <div className="flex items-center gap-1 ml-auto">
          <StylusButton onTap={() => setAddingTeam(true)}
            className="h-6 w-6 rounded flex items-center justify-center text-green-500 hover:bg-green-50 transition-colors" title="Add team">
            <Plus size={12} />
          </StylusButton>
          <StylusButton onTap={onDelete}
            className="h-6 w-6 rounded flex items-center justify-center text-red-400 hover:bg-red-50 transition-colors" title="Delete sport">
            <Trash2 size={12} />
          </StylusButton>
        </div>
      </div>

      <div className="px-4 py-2 space-y-1">
        {sport.teams.map(team => (
          <div key={team.id} className="rounded-lg border border-slate-100 overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-slate-50 cursor-pointer group transition-colors"
              onClick={() => toggleTeam(team.id)}>
              {expanded.includes(team.id) ? <ChevronDown size={12} className="text-slate-400" /> : <ChevronRight size={12} className="text-slate-400" />}
              <Shield size={11} className="text-slate-300 flex-shrink-0" />
              <InlineEdit value={team.name}
                style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#475569", flex: 1 }}
                onSave={name => updateTeam.mutate({ id: team.id, name })} />
              <StylusButton onTap={() => onConfirmDeleteTeam(team.id, team.name)}
                className="h-5 w-5 rounded flex items-center justify-center text-red-400 hover:bg-red-50 transition-all">
                <Trash2 size={10} />
              </StylusButton>
            </div>
            <AnimatePresence>
              {expanded.includes(team.id) && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="px-4 pb-3 border-t border-slate-50">
                    <TeamPlayerList teamId={team.id} onConfirmDelete={(pid, pname) => onConfirmDeletePlayer(pid, pname, team.id)} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}

        {addingTeam && (
          <form onSubmit={e => {
            e.preventDefault();
            const name = (e.currentTarget.elements.namedItem("teamName") as HTMLInputElement).value;
            if (name) { addTeam.mutate({ sportId: sport.id, clubId, name }); setAddingTeam(false); }
          }} className="flex items-center gap-2 mt-2">
            <input name="teamName" autoFocus placeholder="Team name..." className="flex-1 border border-orange-300 rounded-lg px-2 py-1.5 text-xs font-bold bg-white focus:outline-none focus:border-orange-500" />
            <button type="submit" className="bg-orange-500 text-white rounded-lg px-2 py-1.5 hover:bg-orange-600"><Check size={12} /></button>
            <button type="button" onClick={() => setAddingTeam(false)} className="text-slate-400 hover:text-slate-600"><X size={12} /></button>
          </form>
        )}

        {sport.teams.length === 0 && !addingTeam && (
          <p className="text-[10px] text-slate-300 italic py-1 px-2">No teams — click + to add one</p>
        )}
      </div>
    </div>
  );
}

export function PersonalTeamsTree() {
  const utils = api.useUtils();
  const { data: clubs = [], isLoading } = api.club.getHierarchy.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });
  const [activeClubId, setActiveClubId] = useState<string | null>(null);
  const [addingClub, setAddingClub] = useState(false);
  const [addingSport, setAddingSport] = useState(false);

  const invalidate = () => utils.club.getHierarchy.invalidate();
  const createClub = api.club.create.useMutation({ onSuccess: (c) => { invalidate(); setActiveClubId(c.id); setAddingClub(false); } });
  const updateClub = api.club.updateClub.useMutation({ onSuccess: invalidate });
  const deleteClub = api.club.deleteClub.useMutation({ onSuccess: () => { invalidate(); setActiveClubId(null); } });
  const deleteTeam = api.club.deleteTeam.useMutation({ onSuccess: invalidate });
  const addSport = api.club.addSport.useMutation({ onSuccess: invalidate });
  const deleteSport = api.club.deleteSport.useMutation({ onSuccess: invalidate });
  const deletePlayer = api.player.delete.useMutation({ onSuccess: () => utils.player.getAll.invalidate() });

  const [confirm, setConfirm] = useState<{ title: string; msg: string; action: () => void } | null>(null);

  const typedClubs = clubs as Club[];

  const effectiveClubId = activeClubId ?? typedClubs[0]?.id ?? null;
  const activeClub = typedClubs.find(c => c.id === effectiveClubId) ?? null;

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center py-16 opacity-40">
      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      <p className="mt-4 text-xs font-black uppercase tracking-widest text-slate-400">Loading...</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div style={{ display: "flex", flexDirection: "row", gap: "8px", flexWrap: "wrap" }}>
        {typedClubs.map(club => {
          const isActive = club.id === effectiveClubId;
          return (
            <StylusDiv
              key={club.id}
              onTap={() => setActiveClubId(club.id)}
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: "8px",
                padding: "10px 16px",
                borderRadius: "12px",
                border: isActive ? "2px solid #f97316" : "2px solid #e2e8f0",
                background: isActive ? "linear-gradient(135deg, #1e293b, #0f172a)" : "#fff",
                cursor: "pointer",
                transition: "all 0.15s ease",
                userSelect: "none",
                boxShadow: isActive ? "0 4px 16px rgba(15,23,42,0.2)" : "0 1px 4px rgba(0,0,0,0.05)",
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: "16px", color: isActive ? "#fff" : "#94a3b8" }}>
                <Building2 size={16} />
              </span>
              <InlineEdit
                value={club.name}
                activeColor={isActive ? "text-white/40" : "text-slate-300"}
                style={{
                  fontSize: 12,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: isActive ? "#fff" : "#334155",
                }}
                onSave={name => updateClub.mutate({ id: club.id, name })}
              />
              {isActive && (
                <StylusButton
                  onTap={() => setConfirm({ title: "Delete Club", msg: `Are you sure you want to delete "${club.name}"?`, action: () => deleteClub.mutate({ id: club.id }) })}
                  style={{ marginLeft: 4, color: "#f87171", flexShrink: 0 }}
                  className="hover:opacity-70 transition-opacity"
                >
                  <Trash2 size={12} />
                </StylusButton>
              )}
            </StylusDiv>
          );
        })}

        {addingClub ? (
          <form onSubmit={e => { e.preventDefault(); const n = (e.currentTarget.elements.namedItem("name") as HTMLInputElement).value; if (n) createClub.mutate({ name: n }); }} className="flex items-center gap-2">
            <input name="name" autoFocus placeholder="Club name..." className="border border-orange-300 rounded-lg px-2 py-1.5 text-xs font-bold focus:outline-none" />
            <button type="submit" className="bg-orange-500 text-white rounded-lg px-2 py-1.5"><Check size={12} /></button>
            <button type="button" onClick={() => setAddingClub(false)} className="text-slate-400"><X size={12} /></button>
          </form>
        ) : (
          <StylusButton
            onTap={() => setAddingClub(true)}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "10px 16px", borderRadius: "12px",
              border: "2px solid #f97316",
              background: "linear-gradient(135deg, #fff7ed, #fff)",
              cursor: "pointer", color: "#ea580c", transition: "all 0.15s ease",
              fontSize: 11, fontWeight: 900, letterSpacing: "0.08em",
              textTransform: "uppercase",
              boxShadow: "0 2px 8px rgba(249,115,22,0.2)",
            }}
            className="hover:bg-orange-500 hover:text-white hover:shadow-lg hover:shadow-orange-500/30 hover:border-orange-500"
          >
            <Plus size={14} /> Add Club
          </StylusButton>
        )}
      </div>

      {activeClub && (
        <motion.div
          key={activeClub.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-3"
        >
          {activeClub.sports.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-slate-400">
              <p className="text-xs font-bold uppercase">No sports yet</p>
              <p className="text-[10px] mt-1">Add a sport to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
              {activeClub.sports.map(sport => (
                <SportSection key={sport.id} sport={sport} clubId={activeClub.id}
                  onDelete={() => setConfirm({ title: "Delete Sport", msg: `Delete all teams in ${sport.name}?`, action: () => deleteSport.mutate({ id: sport.id }) })}
                  onConfirmDeleteTeam={(tid, tname) => setConfirm({ title: "Delete Team", msg: `Delete team ${tname} and its players?`, action: () => deleteTeam.mutate({ id: tid }) })}
                  onConfirmDeletePlayer={(pid, pname) => setConfirm({ title: "Remove Player", msg: `Remove ${pname} from roster?`, action: () => deletePlayer.mutate({ id: pid }) })}
                />
              ))}
            </div>
          )}

          {addingSport ? (
            <SportSelector
              onCancel={() => setAddingSport(false)}
              onAdd={name => { addSport.mutate({ clubId: activeClub.id, name }); setAddingSport(false); }}
            />
          ) : (
            <StylusButton
              onTap={() => setAddingSport(true)}
              className="flex items-center gap-2 w-full px-4 py-3 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-orange-300 hover:text-orange-500 transition-all"
            >
              <Plus size={14} />
              <span className="text-[11px] font-black uppercase tracking-widest">Add Sport</span>
            </StylusButton>
          )}
        </motion.div>
      )}

      {!activeClub && !isLoading && (
        <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-slate-400">
          <p className="text-xs font-bold uppercase">No clubs yet</p>
          <p className="text-[10px] mt-1">Click "Add Club" to get started</p>
        </div>
      )}

      <AnimatePresence>
        {confirm && (
          <ConfirmModal
            isOpen={!!confirm}
            title={confirm.title}
            message={confirm.msg}
            onConfirm={() => { confirm.action(); setConfirm(null); }}
            onCancel={() => setConfirm(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
