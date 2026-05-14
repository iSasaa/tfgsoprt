"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Reorder, motion, AnimatePresence, useMotionValue, useTransform, useDragControls, animate } from "framer-motion";
import { User, Plus, Trash2, GripVertical, X } from "lucide-react";
import { useDashboard } from "~/context/DashboardContext";
import { api } from "~/trpc/react";
import { useVisualViewport } from "~/hooks/useVisualViewport";

interface Player {
    id: string;
    name: string;
    surname: string | null;
    position: string | null;
    number: string;
    status: "active" | "injured";
}

export function SidebarRoster() {
    const { selectedTeamId } = useDashboard();
    const utils = api.useUtils();
    const { height, offsetTop, isKeyboardOpen } = useVisualViewport();

    const { data: players, isLoading } = api.player.getAll.useQuery(
        { teamId: selectedTeamId },
        { enabled: !!selectedTeamId }
    );

    const createMutation = api.player.create.useMutation({
        onSuccess: () => utils.player.getAll.invalidate({ teamId: selectedTeamId }),
    });
    const statusMutation = api.player.updateStatus.useMutation({
        onSuccess: () => utils.player.getAll.invalidate({ teamId: selectedTeamId }),
    });
    const deleteMutation = api.player.delete.useMutation({
        onSuccess: () => utils.player.getAll.invalidate({ teamId: selectedTeamId }),
    });
    const reorderMutation = api.player.updateOrder.useMutation({
        onSuccess: () => utils.player.getAll.invalidate({ teamId: selectedTeamId }),
    });

    const [isAdding, setIsAdding] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [localPlayers, setLocalPlayers] = useState<Player[]>([]);
    const [isDragging, setIsDragging] = useState(false);

    const [newName, setNewName] = useState("");
    const [newSurname, setNewSurname] = useState("");
    const [newPosition, setNewPosition] = useState("");
    const [newNumber, setNewNumber] = useState("");

    React.useEffect(() => {
        if (players) {
            setLocalPlayers(players as Player[]);
        } else if (!isLoading) {
            setLocalPlayers([]);
        }
    }, [players, isLoading, selectedTeamId]);

    const toggleStatus = (id: string, currentStatus: "active" | "injured") => {
        const newStatus = currentStatus === "active" ? "injured" : "active";

        setLocalPlayers(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));

        statusMutation.mutate({
            id,
            status: newStatus
        }, {
            onError: () => {
                utils.player.getAll.invalidate({ teamId: selectedTeamId });
            }
        });
    };

    const deletePlayer = (id: string) => {
        setLocalPlayers(prev => prev.filter(p => p.id !== id));

        deleteMutation.mutate({ id }, {
            onError: () => {
                utils.player.getAll.invalidate({ teamId: selectedTeamId });
            }
        });
        setDeleteConfirmId(null);
    };

    const handleReorder = (newOrder: Player[]) => {
        setLocalPlayers(newOrder);
        setIsDragging(true);
    };

    React.useEffect(() => {
        if (!isDragging) return;

        const updates = localPlayers
            .map((p, i) => ({ id: p.id, order: i }))
            .filter((p, i) => players?.[i]?.id !== p.id);

        if (updates.length > 0 && players && players.length > 0) {
            const timer = setTimeout(() => {
                reorderMutation.mutate(updates, {
                    onSuccess: () => setIsDragging(false)
                });
            }, 2000);
            return () => clearTimeout(timer);
        } else {
            setIsDragging(false);
        }
    }, [localPlayers, players, reorderMutation, isDragging]);

    const addPlayer = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName || !newNumber) return;
        if (createMutation.isPending) return;

        if (players?.some(p => p.number === newNumber)) {
            alert(`Squad number ${newNumber} is already taken!`);
            return;
        }

        const name = newName;
        const surname = newSurname;
        const position = newPosition;
        const number = newNumber;

        setNewName("");
        setNewSurname("");
        setNewPosition("");
        setNewNumber("");

        createMutation.mutate({
            name,
            surname,
            position,
            number,
            teamId: selectedTeamId,
        }, {
            onSuccess: () => {
                setIsAdding(false);
            },
            onError: () => {
                setNewName(name);
                setNewSurname(surname);
                setNewPosition(position);
                setNewNumber(number);
            }
        });
    };

    return (
        <div className="flex flex-col bg-white font-sans">
            <div className="px-4 py-4 flex items-center justify-between">
                <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">
                    Team <span className="text-orange-500 font-black">•</span> {players?.length ?? 0}
                </h3>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="h-7 w-7 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-orange-500 hover:text-white transition-all transform active:scale-95 shadow-sm border border-slate-100"
                >
                    {isAdding ? <X size={14} /> : <Plus size={14} />}
                </button>
            </div>

            <AnimatePresence>
                {isAdding && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden px-4 mb-4"
                    >
                        <form onSubmit={addPlayer} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <label className="text-[9px] font-black uppercase text-slate-400 ml-1 mb-1 block">Player Name</label>
                                    <input required placeholder="e.g. John Smith" value={newName} onChange={e => setNewName(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:border-orange-400 transition-colors" />
                                </div>
                                <div className="w-20">
                                    <label className="text-[9px] font-black uppercase text-slate-400 ml-1 mb-1 block">№</label>
                                    <input
                                        required
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        placeholder="00"
                                        value={newNumber}
                                        onChange={e => {
                                            const val = e.target.value;
                                            if (val === '' || /^\d+$/.test(val)) setNewNumber(val);
                                        }}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-center text-orange-500 focus:border-orange-400 transition-colors"
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={createMutation.isPending}
                                className="w-full bg-slate-900 text-white font-black py-3 rounded-xl text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-slate-200 transition-all hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {createMutation.isPending ? (
                                    <>
                                        <span className="h-3 w-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                        Adding...
                                    </>
                                ) : (
                                    "Add to Team"
                                )}
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="px-2">
                {isLoading ? (
                    <div className="py-20 flex flex-col items-center justify-center opacity-30">
                        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                        <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Team...</p>
                    </div>
                ) : !players || players.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center opacity-30 grayscale">
                        <User size={48} strokeWidth={1} />
                        <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Empty Team</p>
                    </div>
                ) : (
                    <Reorder.Group axis="y" values={localPlayers} onReorder={handleReorder} className="space-y-1 pb-32">
                        {localPlayers.map((player) => (
                            <PlayerItem
                                key={player.id}
                                player={player}
                                onToggleStatus={() => toggleStatus(player.id, player.status)}
                                onDelete={() => setDeleteConfirmId(player.id)}
                            />
                        ))}
                    </Reorder.Group>
                )}
            </div>

            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {deleteConfirmId && (
                        <div className="fixed inset-0 z-[1000]" style={{ touchAction: "none" }}>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
                                onClick={() => setDeleteConfirmId(null)}
                            />

                            <div
                                className="fixed inset-0 flex justify-center p-4"
                                style={{
                                    top: `${offsetTop}px`,
                                    height: height ? `${height}px` : '100dvh',
                                    alignItems: isKeyboardOpen ? 'flex-start' : 'center',
                                    pointerEvents: 'none'
                                }}
                            >
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                    className="bg-white rounded-3xl p-8 w-full max-w-[320px] shadow-2xl text-center pointer-events-auto overflow-y-auto no-scrollbar"
                                    style={{ maxHeight: 'calc(100% - 2rem)', marginTop: isKeyboardOpen ? '1rem' : '0' }}
                                >
                                    <div className="h-16 w-16 rounded-full bg-red-50 flex items-center justify-center text-red-500 mx-auto mb-4">
                                        <Trash2 size={28} />
                                    </div>
                                    <h4 className="text-xl font-black text-slate-800 mb-2 uppercase tracking-tight">Remove Player?</h4>
                                    <p className="text-sm text-slate-500 mb-8 leading-relaxed font-medium px-4">This will permanently remove the player from the database.</p>
                                    <div className="flex gap-3">
                                        <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-4 text-xs font-black text-slate-400 hover:text-slate-600 tracking-[0.1em]">CANCEL</button>
                                        <button onClick={() => deletePlayer(deleteConfirmId)} className="flex-1 py-4 bg-red-500 text-white rounded-2xl text-xs font-black shadow-lg shadow-red-200 tracking-[0.1em]">DELETE</button>
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
}

function PlayerItem({ player, onToggleStatus, onDelete }: { player: Player, onToggleStatus: () => void, onDelete: () => void }) {
    const isInjured = player.status === "injured";
    const x = useMotionValue(0);
    const dragControls = useDragControls();

    const DRAG_LIMIT = 80;
    const DELETE_THRESHOLD = -50;
    const INJURE_THRESHOLD = 50;

    const actionLabel = isInjured ? "Recovered" : "Injured";
    const actionColor = isInjured ? "#22c55e" : "#dc2626";
    const actionBg = isInjured ? "#f0fdf4" : "#fef2f2";

    const backgroundColor = useTransform(x, [DELETE_THRESHOLD, 0, INJURE_THRESHOLD], ["#fee2e2", "#ffffff", actionBg]);

    const deleteOpacity = useTransform(x, [-DRAG_LIMIT, -20], [1, 0]);
    const injureOpacity = useTransform(x, [20, DRAG_LIMIT], [0, 1]);

    return (
        <Reorder.Item
            value={player}
            className="relative select-none group"
            style={{ touchAction: "pan-y" }}
            dragListener={false}
            dragControls={dragControls}
        >
            <div className="absolute inset-0 flex items-center justify-between px-4 z-0">
                <motion.div style={{ opacity: injureOpacity }} className="flex items-center gap-1.5">
                    <div className="h-7 w-7 rounded flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: actionColor }}>
                        {isInjured ? <User size={14} strokeWidth={3} /> : <Plus size={16} strokeWidth={4} />}
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-tighter" style={{ color: actionColor }}>{actionLabel}</span>
                </motion.div>
                <motion.div style={{ opacity: deleteOpacity }} className="flex items-center gap-1.5 flex-row-reverse text-right">
                    <div className="h-7 w-7 bg-red-500 rounded flex items-center justify-center text-white shadow-sm">
                        <Trash2 size={14} />
                    </div>
                    <span className="text-[9px] font-black uppercase text-red-500 tracking-tighter">Delete</span>
                </motion.div>
            </div>

            <motion.div
                drag="x"
                dragDirectionLock
                dragConstraints={{ left: -DRAG_LIMIT, right: DRAG_LIMIT }}
                dragElastic={0.08}
                onDragEnd={(_, info) => {
                    if (info.offset.x < DELETE_THRESHOLD) onDelete();
                    else if (info.offset.x > INJURE_THRESHOLD) onToggleStatus();
                    animate(x, 0, { type: "spring", stiffness: 500, damping: 35 });
                }}
                style={{ x, backgroundColor, touchAction: "pan-y" }}
                className={`relative z-10 flex items-center gap-2.5 px-2 py-2.5 bg-white group-hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 ${isInjured ? 'opacity-60 grayscale-[0.3]' : ''}`}
            >
                <div
                    className="text-slate-200 hover:text-orange-400 transition-colors cursor-grab active:cursor-grabbing p-1 -ml-1 touch-none"
                    onPointerDown={(e) => {
                        e.stopPropagation();
                        dragControls.start(e);
                    }}
                >
                    <GripVertical size={14} strokeWidth={3} />
                </div>

                <div className={`h-8 w-8 min-w-[32px] rounded-lg flex items-center justify-center font-black text-[11px] shadow-sm border ${isInjured ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-white text-orange-500 border-orange-100'}`}>
                    {player.number}
                </div>

                <div className="flex flex-col min-w-0 flex-1 ml-1">
                    <span className="font-bold text-slate-800 text-[13px] truncate leading-tight uppercase tracking-tight">
                        {player.name} <span className="opacity-40">{player.surname}</span>
                    </span>
                    {player.position && (
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.1em] truncate mt-0.5">
                            {player.position}
                        </span>
                    )}
                </div>

                {isInjured && (
                    <div className="pr-1">
                        <div className="h-5 w-5 bg-red-600 rounded flex items-center justify-center text-white shadow-sm">
                            <Plus size={12} strokeWidth={5} />
                        </div>
                    </div>
                )}
            </motion.div>
        </Reorder.Item>
    );
}
